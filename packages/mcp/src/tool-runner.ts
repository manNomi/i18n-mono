import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod/v4";
import { resolveProjectPath } from "./project-analysis";
import type {
  I18nexusToolAction,
  I18nexusToolRunResult,
  RunI18nexusToolOptions,
} from "./types";

const MAX_OUTPUT_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 120_000;
const MINIMUM_TOOLS_VERSION = [3, 2, 1] as const;
const TOOL_ENV_KEYS = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SystemRoot",
  "ComSpec",
  "PATHEXT",
  "APPDATA",
  "LOCALAPPDATA",
  "TEMP",
  "TMP",
  "TMPDIR",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "TERM",
  "NO_COLOR",
  "FORCE_COLOR",
  "CI",
  "NODE_ENV",
  "I18N_PERF_MONITOR",
] as const;

const runToolOptionsSchema = z
  .object({
    projectPath: z.string().min(1),
    tool: z.enum([
      "doctor",
      "wrapper",
      "extractor",
      "type",
      "clean-legacy",
      "upload",
      "download",
    ]),
    applyChanges: z.boolean().optional(),
    pattern: z.string().min(1).max(4_096).optional(),
    languages: z
      .array(z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/))
      .min(1)
      .optional(),
    sourceLanguage: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
      .optional(),
    outputDir: z.string().min(1).optional(),
    outputFormat: z.enum(["json", "csv"]).optional(),
    outputFile: z.string().min(1).optional(),
    localesDir: z.string().min(1).optional(),
    translationImportSource: z.string().min(1).optional(),
    typesOutputPath: z.string().min(1).optional(),
    staticKeyExtraction: z.enum(["off", "safe", "aggressive"]).optional(),
    force: z.boolean().optional(),
    flat: z.boolean().optional(),
    generateTypes: z.boolean().optional(),
    strictTypes: z.boolean().optional(),
    keyFirst: z.boolean().optional(),
    keyFirstPattern: z.string().min(1).max(4_096).optional(),
    backup: z.boolean().optional(),
    spreadsheetId: z.string().min(1).optional(),
    credentialsPath: z.string().min(1).optional(),
    autoTranslate: z.boolean().optional(),
    timeoutMs: z.number().int().min(1_000).max(300_000).optional(),
  })
  .strict();

const BIN_NAMES: Record<I18nexusToolAction, string> = {
  doctor: "i18n-doctor",
  wrapper: "i18n-wrapper",
  extractor: "i18n-extractor",
  type: "i18n-type",
  "clean-legacy": "i18n-clean-legacy",
  upload: "i18n-upload",
  download: "i18n-download",
};

const COMMON_OPTIONS = new Set([
  "projectPath",
  "tool",
  "applyChanges",
  "timeoutMs",
]);
const TOOL_OPTIONS: Record<
  I18nexusToolAction,
  Set<keyof RunI18nexusToolOptions>
> = {
  doctor: new Set(),
  wrapper: new Set([
    "pattern",
    "sourceLanguage",
    "keyFirst",
    "keyFirstPattern",
  ]),
  extractor: new Set([
    "pattern",
    "languages",
    "sourceLanguage",
    "outputDir",
    "outputFormat",
    "outputFile",
    "translationImportSource",
    "typesOutputPath",
    "staticKeyExtraction",
    "force",
    "flat",
    "generateTypes",
    "strictTypes",
  ]),
  type: new Set(["translationImportSource"]),
  "clean-legacy": new Set(["pattern", "languages", "localesDir", "backup"]),
  upload: new Set([
    "spreadsheetId",
    "credentialsPath",
    "localesDir",
    "autoTranslate",
    "force",
  ]),
  download: new Set([
    "spreadsheetId",
    "credentialsPath",
    "localesDir",
    "languages",
    "force",
  ]),
};

interface InstalledBin {
  name: string;
  path: string;
  packageVersion: string;
}

interface CapturedOutput {
  value: string;
  truncated: boolean;
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function assertCompatibleToolsVersion(version: unknown): string {
  if (typeof version !== "string") {
    throw new Error("Installed i18nexus-tools does not declare a version.");
  }
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/);
  if (!match) {
    throw new Error(
      `Cannot parse installed i18nexus-tools version: ${version}`
    );
  }
  const installed = match.slice(1).map(Number);
  for (let index = 0; index < MINIMUM_TOOLS_VERSION.length; index += 1) {
    if (installed[index] > MINIMUM_TOOLS_VERSION[index]) return version;
    if (installed[index] < MINIMUM_TOOLS_VERSION[index]) {
      throw new Error(
        `i18nexus-tools ${version} is not supported. Install i18nexus-tools >= ${MINIMUM_TOOLS_VERSION.join(".")}.`
      );
    }
  }
  return version;
}

function isWithin(basePath: string, targetPath: string): boolean {
  const relativePath = path.relative(basePath, targetPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function pathEntryExists(targetPath: string): boolean {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveThroughExistingAncestor(targetPath: string): string {
  let existingAncestor = targetPath;
  while (!pathEntryExists(existingAncestor)) {
    const parentPath = path.dirname(existingAncestor);
    if (parentPath === existingAncestor) {
      throw new Error(`Cannot resolve path: ${targetPath}`);
    }
    existingAncestor = parentPath;
  }

  let realAncestor: string;
  try {
    realAncestor = fs.realpathSync(existingAncestor);
  } catch {
    throw new Error(`Cannot resolve symlink path: ${existingAncestor}`);
  }
  return path.resolve(
    realAncestor,
    path.relative(existingAncestor, targetPath)
  );
}

function assertProjectPath(
  projectPath: string,
  configuredPath: string,
  label: string
): void {
  if (configuredPath.includes("\0")) {
    throw new Error(`${label} contains a null byte.`);
  }
  const targetPath = path.resolve(projectPath, configuredPath);
  const resolvedTargetPath = resolveThroughExistingAncestor(targetPath);
  if (
    !isWithin(projectPath, targetPath) ||
    !isWithin(projectPath, resolvedTargetPath)
  ) {
    throw new Error(
      `${label} escapes the project directory: ${configuredPath}`
    );
  }
}

function assertProjectPattern(
  projectPath: string,
  pattern: string,
  label: string
): void {
  if (
    pattern.includes("\0") ||
    path.isAbsolute(pattern) ||
    /^[A-Za-z]:[\\/]/.test(pattern) ||
    /(^|[\\/])\.\.([\\/]|$)/.test(pattern)
  ) {
    throw new Error(`${label} escapes the project directory: ${pattern}`);
  }

  const magicIndex = pattern.search(/[?*\[\]{}()!]/);
  const literalPrefix =
    magicIndex === -1 ? pattern : pattern.slice(0, magicIndex);
  const basePath =
    literalPrefix.endsWith("/") || literalPrefix.endsWith("\\")
      ? literalPrefix
      : path.dirname(literalPrefix);
  if (basePath && basePath !== ".") {
    assertProjectPath(projectPath, basePath, label);
  }
}

function assertOptionValue(value: string, label: string): void {
  if (
    !value.trim() ||
    value.length > 4_096 ||
    value.startsWith("-") ||
    value.includes("\0")
  ) {
    throw new Error(`${label} must be a non-empty option value.`);
  }
}

function assertFileName(value: string, label: string): void {
  assertOptionValue(value, label);
  if (path.basename(value) !== value || value === "." || value === "..") {
    throw new Error(`${label} must be a file name without directory segments.`);
  }
}

function assertLanguages(languages: string[] | undefined): void {
  if (!languages) return;
  if (
    languages.length === 0 ||
    new Set(languages).size !== languages.length ||
    languages.some((language) => !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(language))
  ) {
    throw new Error("languages must contain unique path-safe identifiers.");
  }
}

function assertTranslationImportSource(value: string | undefined): void {
  if (!value) return;
  assertOptionValue(value, "translationImportSource");
  if (/[\u0000-\u001f\u007f'"`\\]/.test(value)) {
    throw new Error("translationImportSource contains unsafe characters.");
  }
}

function readEffectiveConfig(projectPath: string): Record<string, unknown> {
  const configPath = path.join(projectPath, "i18nexus.config.json");
  if (!fs.existsSync(configPath)) return {};
  try {
    return readJsonObject(configPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Cannot run tools with an invalid i18nexus config: ${message}`
    );
  }
}

function optionalString(
  value: unknown,
  fallback: string | undefined
): string | undefined {
  return typeof value === "string" ? value : fallback;
}

function validateEffectivePaths(
  projectPath: string,
  options: RunI18nexusToolOptions
): void {
  const config = readEffectiveConfig(projectPath);
  const googleSheetsConfig =
    config.googleSheets &&
    !Array.isArray(config.googleSheets) &&
    typeof config.googleSheets === "object"
      ? (config.googleSheets as Record<string, unknown>)
      : {};
  const pattern = optionalString(
    options.pattern,
    optionalString(config.sourcePattern, undefined)
  );
  const localesDir = optionalString(
    options.localesDir ?? options.outputDir,
    optionalString(config.localesDir, "./locales")
  );
  const typesOutputPath = optionalString(
    options.typesOutputPath,
    optionalString(config.typesOutputPath, undefined)
  );
  const translationImportSource = optionalString(
    options.translationImportSource,
    optionalString(config.translationImportSource, undefined)
  );
  const credentialsPath = optionalString(
    options.credentialsPath,
    optionalString(googleSheetsConfig.credentialsPath, undefined)
  );
  const configuredLanguages = config.languages;
  const effectiveLanguages = options.languages ?? configuredLanguages;

  if (effectiveLanguages !== undefined) {
    if (
      !Array.isArray(effectiveLanguages) ||
      effectiveLanguages.some((language) => typeof language !== "string")
    ) {
      throw new Error("languages must be an array of path-safe identifiers.");
    }
    assertLanguages(effectiveLanguages as string[]);
  }

  if (
    ["wrapper", "extractor", "clean-legacy"].includes(options.tool) &&
    pattern
  ) {
    assertProjectPattern(projectPath, pattern, "sourcePattern");
  }
  if (
    [
      "doctor",
      "extractor",
      "type",
      "clean-legacy",
      "upload",
      "download",
    ].includes(options.tool) &&
    localesDir
  ) {
    assertProjectPath(projectPath, localesDir, "localesDir");
  }
  if (
    ["doctor", "extractor", "type"].includes(options.tool) &&
    typesOutputPath
  ) {
    assertProjectPath(projectPath, typesOutputPath, "typesOutputPath");
  }
  if (options.outputFile) assertFileName(options.outputFile, "outputFile");
  if (["upload", "download"].includes(options.tool) && credentialsPath) {
    assertProjectPath(projectPath, credentialsPath, "credentialsPath");
  }
  if (["extractor", "type"].includes(options.tool)) {
    assertTranslationImportSource(translationImportSource);
  }
}

function assertSupportedOptions(options: RunI18nexusToolOptions): void {
  const allowed = TOOL_OPTIONS[options.tool];
  const unsupported = Object.entries(options)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .filter(
      (key) =>
        !COMMON_OPTIONS.has(key) &&
        !allowed.has(key as keyof RunI18nexusToolOptions)
    );
  if (unsupported.length > 0) {
    throw new Error(
      `${options.tool} does not support these options: ${unsupported.join(", ")}`
    );
  }
}

function resolveInstalledBin(
  projectPath: string,
  tool: I18nexusToolAction,
  force: boolean
): InstalledBin {
  const packageLink = path.join(projectPath, "node_modules", "i18nexus-tools");
  const packageJsonPath = path.join(packageLink, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      "i18nexus-tools is not installed in the target project's node_modules. Run setup or install dependencies first."
    );
  }

  const packageRoot = fs.realpathSync(packageLink);
  const packageJson = readJsonObject(path.join(packageRoot, "package.json"));
  const packageVersion = assertCompatibleToolsVersion(packageJson.version);
  const bin = packageJson.bin;
  const name =
    tool === "download" && force ? "i18n-download-force" : BIN_NAMES[tool];
  if (!bin || Array.isArray(bin) || typeof bin !== "object") {
    throw new Error(
      "Installed i18nexus-tools does not declare executable bins."
    );
  }
  const entry = (bin as Record<string, unknown>)[name];
  if (typeof entry !== "string" || !entry) {
    throw new Error(`Installed i18nexus-tools does not provide ${name}.`);
  }

  const candidatePath = path.resolve(packageRoot, entry);
  if (!isWithin(packageRoot, candidatePath) || !fs.existsSync(candidatePath)) {
    throw new Error(
      `${name} resolves outside the installed package or does not exist.`
    );
  }
  const executablePath = fs.realpathSync(candidatePath);
  if (!isWithin(packageRoot, executablePath)) {
    throw new Error(
      `${name} resolves outside the installed i18nexus-tools package.`
    );
  }
  return { name, path: executablePath, packageVersion };
}

function pushValue(args: string[], option: string, value: string): void {
  assertOptionValue(value, option);
  args.push(option, value);
}

function buildArgs(
  options: RunI18nexusToolOptions,
  preview: boolean
): string[] {
  const args: string[] = [];
  if (options.pattern) pushValue(args, "--pattern", options.pattern);
  if (options.languages)
    pushValue(args, "--languages", options.languages.join(","));
  if (options.sourceLanguage)
    pushValue(args, "--source-language", options.sourceLanguage);

  if (options.tool === "wrapper") {
    if (options.keyFirstPattern) {
      pushValue(args, "--key-first-pattern", options.keyFirstPattern);
    } else if (options.keyFirst === true) {
      args.push("--key-first");
    } else if (options.keyFirst === false) {
      args.push("--no-key-first");
    }
  }

  if (options.tool === "extractor") {
    if (options.outputDir) pushValue(args, "--output-dir", options.outputDir);
    if (options.outputFormat) pushValue(args, "--format", options.outputFormat);
    if (options.outputFile) pushValue(args, "--output", options.outputFile);
    if (options.translationImportSource) {
      pushValue(
        args,
        "--translation-import-source",
        options.translationImportSource
      );
    }
    if (options.typesOutputPath) {
      pushValue(args, "--types-output", options.typesOutputPath);
    }
    if (options.staticKeyExtraction) {
      pushValue(args, "--static-key-extraction", options.staticKeyExtraction);
    }
    if (options.force) args.push("--force");
    if (options.flat) args.push("--flat");
    if (options.generateTypes === false) args.push("--no-types");
    if (options.strictTypes) args.push("--strict-types");
    if (preview) args.push("--dry-run");
  }

  if (options.tool === "type" && options.translationImportSource) {
    pushValue(
      args,
      "--translation-import-source",
      options.translationImportSource
    );
  }

  if (options.tool === "clean-legacy") {
    if (options.localesDir)
      pushValue(args, "--locales-dir", options.localesDir);
    if (options.backup === false) args.push("--no-backup");
    if (preview) args.push("--dry-run");
  }

  if (options.tool === "upload" || options.tool === "download") {
    if (options.spreadsheetId)
      pushValue(args, "--spreadsheet-id", options.spreadsheetId);
    if (options.credentialsPath)
      pushValue(args, "--credentials", options.credentialsPath);
    if (options.localesDir)
      pushValue(args, "--locales-dir", options.localesDir);
    if (options.tool === "upload" && options.autoTranslate)
      args.push("--auto-translate");
    if (options.tool === "upload" && options.force) args.push("--force");
    if (preview) args.push("--dry-run");
  }

  return args;
}

function appendOutput(current: CapturedOutput, chunk: Buffer): CapturedOutput {
  if (current.truncated) return current;
  const remaining = MAX_OUTPUT_BYTES - Buffer.byteLength(current.value);
  if (remaining <= 0) return { ...current, truncated: true };
  const value = chunk.toString("utf8");
  const buffer = Buffer.from(value);
  if (buffer.length <= remaining) {
    return { value: current.value + value, truncated: false };
  }
  return {
    value: current.value + buffer.subarray(0, remaining).toString("utf8"),
    truncated: true,
  };
}

function toolEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  for (const key of TOOL_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  return environment;
}

function killProcessTree(
  child: ReturnType<typeof spawn>,
  force: boolean
): void {
  if (!child.pid) return;
  if (process.platform === "win32") {
    const args = ["/pid", String(child.pid), "/T"];
    if (force) args.push("/F");
    const killer = spawn("taskkill", args, {
      shell: false,
      stdio: "ignore",
    });
    killer.unref();
    return;
  }

  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch {
    child.kill(force ? "SIGKILL" : "SIGTERM");
  }
}

function executeBin(
  executablePath: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<I18nexusToolRunResult["execution"]> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [executablePath, ...args], {
      cwd,
      env: toolEnvironment(),
      detached: process.platform !== "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout: CapturedOutput = { value: "", truncated: false };
    let stderr: CapturedOutput = { value: "", truncated: false };
    let timedOut = false;
    let forceKillTimer: NodeJS.Timeout | undefined;

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.once("error", reject);

    const timeout = setTimeout(() => {
      timedOut = true;
      killProcessTree(child, false);
      forceKillTimer = setTimeout(() => killProcessTree(child, true), 1_000);
      forceKillTimer.unref();
    }, timeoutMs);
    timeout.unref();

    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      const status = timedOut
        ? "timed-out"
        : code === 0
          ? "completed"
          : "failed";
      resolve({
        status,
        ok: status === "completed",
        ...(code === null ? {} : { exitCode: code }),
        ...(signal ? { signal } : {}),
        stdout: stdout.value,
        stderr: stderr.value,
        stdoutTruncated: stdout.truncated,
        stderrTruncated: stderr.truncated,
      });
    });
  });
}

function executionPolicy(tool: I18nexusToolAction): {
  mutatesLocalFiles: boolean;
  usesNetwork: boolean;
  nativeDryRun: boolean;
  note: string;
} {
  if (tool === "doctor") {
    return {
      mutatesLocalFiles: false,
      usesNetwork: false,
      nativeDryRun: false,
      note: "Runs the target project's installed doctor code without writing project files.",
    };
  }
  if (tool === "extractor" || tool === "clean-legacy") {
    return {
      mutatesLocalFiles: true,
      usesNetwork: false,
      nativeDryRun: true,
      note: "Preview executes the installed tool with its native dry-run option.",
    };
  }
  if (tool === "upload" || tool === "download") {
    return {
      mutatesLocalFiles: tool === "download",
      usesNetwork: true,
      nativeDryRun: true,
      note:
        tool === "upload"
          ? "Preview authenticates, reads Google Sheets, and reports exact upload changes without changing the sheet."
          : "Preview reads Google Sheets and reports planned local translation changes without writing files.",
    };
  }
  return {
    mutatesLocalFiles: true,
    usesNetwork: false,
    nativeDryRun: false,
    note: "Preview returns a command plan because this installed tool has no native dry-run mode.",
  };
}

export async function runI18nexusTool(
  input: RunI18nexusToolOptions
): Promise<I18nexusToolRunResult> {
  const options = runToolOptionsSchema.parse(input) as RunI18nexusToolOptions;
  assertSupportedOptions(options);
  assertLanguages(options.languages);
  if (
    options.timeoutMs !== undefined &&
    (!Number.isInteger(options.timeoutMs) ||
      options.timeoutMs < 1_000 ||
      options.timeoutMs > 300_000)
  ) {
    throw new Error("timeoutMs must be an integer between 1000 and 300000.");
  }
  const projectPath = resolveProjectPath(options.projectPath);
  validateEffectivePaths(projectPath, options);
  const applyChanges = options.applyChanges ?? false;
  const preview = !applyChanges;
  const policy = executionPolicy(options.tool);
  const bin = resolveInstalledBin(
    projectPath,
    options.tool,
    options.force ?? false
  );
  const args = buildArgs(options, preview);
  const mode =
    options.tool === "doctor" ? "inspect" : preview ? "preview" : "apply";

  const shouldExecute =
    options.tool === "doctor" || applyChanges || policy.nativeDryRun;
  const execution = shouldExecute
    ? await executeBin(
        bin.path,
        args,
        projectPath,
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      )
    : {
        status: "planned" as const,
        ok: true,
        stdout: "",
        stderr: "",
        stdoutTruncated: false,
        stderrTruncated: false,
      };

  return {
    projectPath,
    tool: options.tool,
    mode,
    command: { name: bin.name, packageVersion: bin.packageVersion, args },
    safety: {
      executesProjectCode: true,
      sandboxed: false,
      ...policy,
    },
    execution,
  };
}
