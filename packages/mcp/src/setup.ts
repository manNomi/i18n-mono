import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { analyzeProject } from "./project-analysis";
import type {
  I18nexusConfig,
  PackageManager,
  PlannedFileChange,
  ProjectAnalysis,
  SetupOptions,
  SetupResult,
} from "./types";

const I18N_SCRIPTS = {
  "i18n:wrap": "i18n-wrapper",
  "i18n:extract": "i18n-extractor",
  "i18n:type": "i18n-type",
  "i18n:doctor": "i18n-doctor",
} as const;

interface InstallCommand {
  command: string;
  args: string[];
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function writeFileAtomically(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`
  );
  try {
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
  }
}

function safeProjectPath(projectPath: string, configuredPath: string): string {
  const absolutePath = path.resolve(projectPath, configuredPath);
  const relativePath = path.relative(projectPath, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      `Configured path escapes the project directory: ${configuredPath}`
    );
  }
  let existingAncestor = absolutePath;
  while (!fs.existsSync(existingAncestor)) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) break;
    existingAncestor = parent;
  }
  const realProjectPath = fs.realpathSync(projectPath);
  const realPath = path.resolve(
    fs.realpathSync(existingAncestor),
    path.relative(existingAncestor, absolutePath)
  );
  const realRelativePath = path.relative(realProjectPath, realPath);
  if (
    realRelativePath.startsWith("..") ||
    path.isAbsolute(realRelativePath)
  ) {
    throw new Error(
      `Configured path resolves outside the project directory: ${configuredPath}`
    );
  }
  return absolutePath;
}

function validateRegex(pattern: string, label: string): void {
  try {
    new RegExp(pattern);
  } catch {
    throw new Error(`${label} must be a valid regular expression: ${pattern}`);
  }
}

function validateSourcePattern(pattern: string): void {
  if (
    path.isAbsolute(pattern) ||
    pattern.split(/[\\/]/).includes("..") ||
    pattern.includes("\0")
  ) {
    throw new Error("sourcePattern must stay inside the project directory.");
  }
}

function validateLanguages(
  languages: string[],
  defaultLanguage: string,
  sourceLanguage: string
): void {
  if (languages.length === 0) {
    throw new Error("languages must include at least one language.");
  }
  if (new Set(languages).size !== languages.length) {
    throw new Error("languages must not contain duplicates.");
  }
  for (const language of languages) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(language)) {
      throw new Error(`Invalid language identifier: ${language}`);
    }
  }
  if (!languages.includes(defaultLanguage)) {
    throw new Error("defaultLanguage must be included in languages.");
  }
  if (!languages.includes(sourceLanguage)) {
    throw new Error("sourceLanguage must be included in languages.");
  }
}

function buildConfig(
  analysis: ProjectAnalysis,
  options: SetupOptions
): I18nexusConfig {
  if (
    analysis.existingConfig.exists &&
    !analysis.existingConfig.valid &&
    !options.overwriteExistingConfig
  ) {
    throw new Error(
      "Existing i18nexus.config.json is invalid. Fix it or pass overwriteExistingConfig: true."
    );
  }

  const existing = analysis.existingConfig.valid
    ? (analysis.existingConfig.value ?? {})
    : {};
  const suggested = analysis.suggestedConfig;
  const merged: Record<string, unknown> = options.overwriteExistingConfig
    ? { ...existing, ...suggested }
    : { ...suggested, ...existing };

  if (options.languages) {
    merged.languages = options.languages;
    if (
      !options.defaultLanguage &&
      typeof merged.defaultLanguage === "string" &&
      !options.languages.includes(merged.defaultLanguage)
    ) {
      merged.defaultLanguage = options.languages[0];
    }
    if (
      !options.sourceLanguage &&
      typeof merged.sourceLanguage === "string" &&
      !options.languages.includes(merged.sourceLanguage)
    ) {
      merged.sourceLanguage = merged.defaultLanguage;
    }
  }
  if (options.defaultLanguage) merged.defaultLanguage = options.defaultLanguage;
  if (options.sourceLanguage) merged.sourceLanguage = options.sourceLanguage;
  const scalarOptions: Array<keyof SetupOptions> = [
    "sourcePattern",
    "localesDir",
    "translationImportSource",
    "framework",
    "mode",
    "serverTranslationFunction",
    "fallbackNamespace",
    "namespaceLocation",
    "useNamespaceStructure",
    "namespaceStrategy",
    "generateTypes",
    "strictTypeGeneration",
    "typesOutputPath",
    "staticKeyExtraction",
    "staticKeyContainerPatterns",
    "namespacing",
    "lazy",
  ];
  for (const key of scalarOptions) {
    if (options[key] !== undefined) merged[key] = options[key];
  }
  if (options.keyFirst) {
    merged.keyFirst = {
      ...((merged.keyFirst as Record<string, unknown> | undefined) ?? {}),
      ...options.keyFirst,
    };
  }
  if (options.googleSheets) {
    merged.googleSheets = {
      ...((merged.googleSheets as Record<string, unknown> | undefined) ?? {}),
      ...options.googleSheets,
    };
  }

  const languages = merged.languages;
  const defaultLanguage = merged.defaultLanguage;
  if (
    !Array.isArray(languages) ||
    !languages.every((language) => typeof language === "string")
  ) {
    throw new Error("languages must be an array of language identifiers.");
  }
  if (typeof defaultLanguage !== "string") {
    throw new Error("defaultLanguage must be a string.");
  }
  if (typeof merged.sourceLanguage !== "string") {
    throw new Error("sourceLanguage must be a string.");
  }
  validateLanguages(languages, defaultLanguage, merged.sourceLanguage);
  if (typeof merged.localesDir !== "string" || merged.localesDir.length === 0) {
    throw new Error("localesDir must be a non-empty string.");
  }
  if (
    typeof merged.sourcePattern !== "string" ||
    merged.sourcePattern.length === 0
  ) {
    throw new Error("sourcePattern must be a non-empty string.");
  }
  if (
    typeof merged.fallbackNamespace !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(merged.fallbackNamespace)
  ) {
    throw new Error(
      "fallbackNamespace must be a path-safe namespace identifier."
    );
  }

  validateSourcePattern(merged.sourcePattern);
  if (
    typeof merged.translationImportSource !== "string" ||
    !/^[A-Za-z0-9@_./-]+$/.test(merged.translationImportSource)
  ) {
    throw new Error("translationImportSource contains unsafe characters.");
  }
  if (
    typeof merged.serverTranslationFunction === "string" &&
    !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(merged.serverTranslationFunction)
  ) {
    throw new Error("serverTranslationFunction must be a JavaScript identifier.");
  }
  if (merged.keyFirst && typeof merged.keyFirst === "object") {
    const keyFirst = merged.keyFirst as { enabled?: unknown; pattern?: unknown };
    if (typeof keyFirst.enabled !== "boolean") {
      throw new Error("keyFirst.enabled must be a boolean.");
    }
    if (typeof keyFirst.pattern === "string") {
      validateRegex(keyFirst.pattern, "keyFirst.pattern");
    }
  }
  if (Array.isArray(merged.staticKeyContainerPatterns)) {
    merged.staticKeyContainerPatterns.forEach((pattern, index) => {
      if (typeof pattern !== "string") {
        throw new Error("staticKeyContainerPatterns must contain strings.");
      }
      validateRegex(pattern, `staticKeyContainerPatterns[${index}]`);
    });
  }
  if (merged.namespacing && typeof merged.namespacing === "object") {
    const namespacing = merged.namespacing as Record<string, unknown>;
    if (typeof namespacing.basePath === "string") {
      safeProjectPath(analysis.projectPath, namespacing.basePath);
    }
    if (Array.isArray(namespacing.ignorePatterns)) {
      namespacing.ignorePatterns.forEach((pattern, index) => {
        if (typeof pattern !== "string") {
          throw new Error("namespacing.ignorePatterns must contain strings.");
        }
        validateRegex(pattern, `namespacing.ignorePatterns[${index}]`);
      });
    }
  }
  if (merged.googleSheets && typeof merged.googleSheets === "object") {
    const sheets = merged.googleSheets as Record<string, unknown>;
    for (const key of ["spreadsheetId", "credentialsPath", "sheetName"]) {
      if (typeof sheets[key] !== "string" || sheets[key].length === 0) {
        throw new Error(`googleSheets.${key} must be a non-empty string.`);
      }
    }
  }

  safeProjectPath(analysis.projectPath, merged.localesDir);
  if (typeof merged.typesOutputPath === "string") {
    safeProjectPath(analysis.projectPath, merged.typesOutputPath);
  }
  if (typeof merged.namespaceLocation === "string") {
    safeProjectPath(analysis.projectPath, merged.namespaceLocation);
  }
  return merged as I18nexusConfig;
}

function fileAction(
  filePath: string,
  content: string
): PlannedFileChange["action"] {
  if (!fs.existsSync(filePath)) return "create";
  return fs.readFileSync(filePath, "utf8") === content ? "unchanged" : "update";
}

function localePaths(projectPath: string, config: I18nexusConfig): string[] {
  return config.languages.map((language) => {
    const configuredLocalePath = config.useNamespaceStructure
      ? path.join(
          config.localesDir,
          config.fallbackNamespace,
          `${language}.json`
        )
      : path.join(config.localesDir, `${language}.json`);
    return safeProjectPath(projectPath, configuredLocalePath);
  });
}

function packageJsonChange(
  analysis: ProjectAnalysis,
  enabled: boolean
): { content?: string; change?: PlannedFileChange } {
  if (!enabled) return {};
  if (!analysis.packageJsonExists || !analysis.packageJsonValid) {
    throw new Error(
      "A valid package.json is required when updatePackageScripts is enabled."
    );
  }

  const packageJson = readJsonObject(analysis.packageJsonPath);
  const existingScripts = packageJson.scripts;
  if (
    existingScripts !== undefined &&
    (!existingScripts ||
      Array.isArray(existingScripts) ||
      typeof existingScripts !== "object")
  ) {
    throw new Error("package.json scripts must be an object.");
  }
  packageJson.scripts = {
    ...I18N_SCRIPTS,
    ...(existingScripts as Record<string, unknown> | undefined),
  };
  const content = stableJson(packageJson);
  return {
    content,
    change: {
      path: analysis.packageJsonPath,
      action: fileAction(analysis.packageJsonPath, content),
    },
  };
}

function installCommands(packageManager: PackageManager): InstallCommand[] {
  if (packageManager === "pnpm") {
    return [
      { command: "pnpm", args: ["add", "i18nexus"] },
      { command: "pnpm", args: ["add", "--save-dev", "i18nexus-tools"] },
    ];
  }
  if (packageManager === "yarn") {
    return [
      { command: "yarn", args: ["add", "i18nexus"] },
      { command: "yarn", args: ["add", "--dev", "i18nexus-tools"] },
    ];
  }
  return [
    { command: "npm", args: ["install", "i18nexus"] },
    { command: "npm", args: ["install", "--save-dev", "i18nexus-tools"] },
  ];
}

function commandText(command: InstallCommand): string {
  return [command.command, ...command.args].join(" ");
}

function runCommand(command: InstallCommand, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      cwd,
      env: process.env,
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${commandText(command)} failed with exit code ${code}. ${stderr.trim()}`
          )
        );
      }
    });
  });
}

function nextCommands(packageManager: PackageManager): string[] {
  if (packageManager === "pnpm") {
    return [
      "pnpm exec i18n-doctor",
      "pnpm exec i18n-extractor",
      "pnpm exec i18n-type",
    ];
  }
  if (packageManager === "yarn") {
    return ["yarn i18n-doctor", "yarn i18n-extractor", "yarn i18n-type"];
  }
  return ["npx i18n-doctor", "npx i18n-extractor", "npx i18n-type"];
}

export async function setupProject(
  options: SetupOptions
): Promise<SetupResult> {
  const analysis = analyzeProject(options.projectPath);
  const dryRun = options.dryRun ?? true;
  const updatePackageScripts = options.updatePackageScripts ?? true;
  const createLocaleFiles = options.createLocaleFiles ?? true;
  const installDependencies = options.installDependencies ?? false;
  const packageManager = options.packageManager ?? analysis.packageManager.name;

  if (
    installDependencies &&
    analysis.packageManager.ambiguous &&
    !options.packageManager
  ) {
    throw new Error(
      "Multiple lockfiles were found. Pass packageManager explicitly before installing dependencies."
    );
  }
  if (
    installDependencies &&
    (!analysis.packageJsonExists || !analysis.packageJsonValid)
  ) {
    throw new Error(
      "A valid package.json is required to install dependencies."
    );
  }

  const config = buildConfig(analysis, options);
  const configContent = stableJson(config);
  const files: PlannedFileChange[] = [
    {
      path: analysis.existingConfig.path,
      action: fileAction(analysis.existingConfig.path, configContent),
    },
  ];
  const packageChange = packageJsonChange(analysis, updatePackageScripts);
  if (packageChange.change) files.push(packageChange.change);

  const initialLocalePaths = createLocaleFiles
    ? localePaths(analysis.projectPath, config)
    : [];
  for (const localePath of initialLocalePaths) {
    files.push({
      path: localePath,
      action: fs.existsSync(localePath) ? "unchanged" : "create",
    });
  }

  const commands = installCommands(packageManager);
  if (!dryRun) {
    if (files[0].action !== "unchanged") {
      writeFileAtomically(analysis.existingConfig.path, configContent);
    }
    if (packageChange.content && packageChange.change?.action !== "unchanged") {
      writeFileAtomically(analysis.packageJsonPath, packageChange.content);
    }
    for (const localePath of initialLocalePaths) {
      if (!fs.existsSync(localePath)) {
        writeFileAtomically(localePath, "{}\n");
      }
    }
    if (installDependencies) {
      for (const command of commands) {
        await runCommand(command, analysis.projectPath);
      }
    }
  }

  const warnings = [...analysis.warnings];
  if (!installDependencies) {
    if (!analysis.dependencies.i18nexus.declared) {
      warnings.push(
        "i18nexus is not declared. Enable installDependencies or install it manually."
      );
    }
    if (!analysis.dependencies.i18nexusTools.declared) {
      warnings.push(
        "i18nexus-tools is not declared. Enable installDependencies or install it manually."
      );
    }
  }

  return {
    projectPath: analysis.projectPath,
    dryRun,
    analysis,
    config,
    files,
    dependencyInstall: {
      requested: installDependencies,
      packageManager,
      commands: commands.map(commandText),
      completed: installDependencies && !dryRun,
    },
    nextCommands: nextCommands(packageManager),
    warnings,
  };
}
