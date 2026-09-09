import * as fs from "fs";
import * as path from "path";
import { loadConfigSilently, I18nexusConfig } from "./config-loader";
import {
  readExtractedTranslations,
  validateTranslationsForTypeGeneration,
} from "./extractor/type-generator";

export type DoctorIssueLevel = "error" | "warning" | "info";
export type DoctorStatus = "healthy" | "warning" | "failed";

export interface DoctorIssue {
  level: DoctorIssueLevel;
  code: string;
  message: string;
  fix?: string;
}

export interface DoctorReport {
  ok: boolean;
  status: DoctorStatus;
  config: I18nexusConfig;
  issues: DoctorIssue[];
  summary: {
    localesDir: string;
    namespaces: string[];
    languages: string[];
    generatedTypesPath: string;
    localeEntrypointPath: string;
    typescriptModuleResolution?: string;
  };
}

function readJsonFile(filePath: string): Record<string, any> | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(stripJsonComments(content));
  } catch {
    return null;
  }
}

function stripJsonComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function getPackageDependencyVersion(
  packageJson: Record<string, any> | null,
  packageName: string
): string | undefined {
  if (!packageJson) {
    return undefined;
  }

  return (
    packageJson.dependencies?.[packageName] ||
    packageJson.devDependencies?.[packageName] ||
    packageJson.peerDependencies?.[packageName]
  );
}

function getMajorVersion(versionRange: string | undefined): number | null {
  if (!versionRange) {
    return null;
  }

  const match = versionRange.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function resolveProjectPath(projectRoot: string, maybeRelativePath: string) {
  return path.isAbsolute(maybeRelativePath)
    ? maybeRelativePath
    : path.resolve(projectRoot, maybeRelativePath);
}

function hasJsonLanguageFiles(dir: string): boolean {
  if (!fs.existsSync(dir)) {
    return false;
  }

  return fs.readdirSync(dir).some((file) => /^[A-Za-z0-9-]+\.json$/.test(file));
}

function getDoctorStatus(issues: DoctorIssue[]): DoctorStatus {
  if (issues.some((issue) => issue.level === "error")) {
    return "failed";
  }

  if (issues.some((issue) => issue.level === "warning")) {
    return "warning";
  }

  return "healthy";
}

function readTsConfig(projectRoot: string): Record<string, any> | null {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  return fs.existsSync(tsconfigPath) ? readJsonFile(tsconfigPath) : null;
}

const MODERN_MODULE_RESOLUTIONS = new Set(["bundler", "node16", "nodenext"]);
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);
const IGNORED_SCAN_DIRS = new Set([
  ".git",
  ".next",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);

function hasSourceImport(
  projectRoot: string,
  importText: string,
  maxFiles = 500
): boolean {
  let scannedFiles = 0;

  function scanDirectory(dir: string): boolean {
    if (scannedFiles >= maxFiles) {
      return false;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (IGNORED_SCAN_DIRS.has(entry.name)) {
          continue;
        }
        if (scanDirectory(entryPath)) {
          return true;
        }
        continue;
      }

      if (!entry.isFile() || !SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
        continue;
      }

      scannedFiles += 1;
      try {
        if (fs.readFileSync(entryPath, "utf-8").includes(importText)) {
          return true;
        }
      } catch {
        // Ignore unreadable files and continue with other project files.
      }
    }

    return false;
  }

  return scanDirectory(projectRoot);
}

function shouldCheckServerResolution(
  config: I18nexusConfig,
  projectRoot: string
): boolean {
  return (
    config.mode === "server" ||
    config.framework === "nextjs" ||
    hasSourceImport(projectRoot, "i18nexus/server")
  );
}

function getPackageExportTarget(
  packageJson: Record<string, any>,
  subpath: "." | "./server" | "./devtools"
): string | undefined {
  const exportConfig = packageJson.exports?.[subpath];

  if (typeof exportConfig === "string") {
    return exportConfig;
  }

  if (exportConfig && typeof exportConfig === "object") {
    return exportConfig.import || exportConfig.default || exportConfig.require;
  }

  if (subpath === ".") {
    return packageJson.module || packageJson.main;
  }

  return undefined;
}

function getInstalledCorePackage(projectRoot: string): {
  packageJson: Record<string, any>;
  packageRoot: string;
} | null {
  const packagePath = path.join(
    projectRoot,
    "node_modules",
    "i18nexus",
    "package.json"
  );

  if (!fs.existsSync(packagePath)) {
    return null;
  }

  const packageJson = readJsonFile(packagePath);
  if (!packageJson) {
    return null;
  }

  return {
    packageJson,
    packageRoot: path.dirname(packagePath),
  };
}

function localeEntrypointImportsCreateI18n(
  localeEntrypointPath: string
): boolean {
  if (!fs.existsSync(localeEntrypointPath)) {
    return false;
  }

  try {
    return fs
      .readFileSync(localeEntrypointPath, "utf-8")
      .includes("createI18n");
  } catch {
    return false;
  }
}

function installedRootExportsCreateI18n(
  packageRoot: string,
  packageJson: Record<string, any>
): boolean {
  const rootTarget = getPackageExportTarget(packageJson, ".");
  if (!rootTarget) {
    return false;
  }

  const candidatePaths = [
    path.resolve(packageRoot, rootTarget),
    path.resolve(
      packageRoot,
      rootTarget.replace(/\.js$/, ".d.ts").replace(/\.mjs$/, ".d.ts")
    ),
  ];

  return candidatePaths.some((candidatePath) => {
    if (!fs.existsSync(candidatePath)) {
      return false;
    }

    try {
      return fs.readFileSync(candidatePath, "utf-8").includes("createI18n");
    } catch {
      return false;
    }
  });
}

export function runDoctor(projectRoot: string = process.cwd()): DoctorReport {
  const previousCwd = process.cwd();
  process.chdir(projectRoot);

  try {
    const configPath = path.join(projectRoot, "i18nexus.config.json");
    const config = loadConfigSilently();
    const issues: DoctorIssue[] = [];
    const localesDir = resolveProjectPath(projectRoot, config.localesDir);
    const generatedTypesPath = resolveProjectPath(
      projectRoot,
      config.typesOutputPath ||
        path.join(config.localesDir, "types", "i18nexus.d.ts")
    );
    const localeEntrypointPath = path.join(localesDir, "index.ts");
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = fs.existsSync(packageJsonPath)
      ? readJsonFile(packageJsonPath)
      : null;
    const i18nexusVersion = getPackageDependencyVersion(
      packageJson,
      "i18nexus"
    );
    const i18nexusMajor = getMajorVersion(i18nexusVersion);
    const tsconfig = readTsConfig(projectRoot);
    const moduleResolution =
      tsconfig?.compilerOptions?.moduleResolution?.toString();
    const installedCore = getInstalledCorePackage(projectRoot);

    if (!fs.existsSync(configPath)) {
      issues.push({
        level: "error",
        code: "CONFIG_MISSING",
        message: "i18nexus.config.json을 찾을 수 없습니다.",
        fix: "npx i18n-sheets init",
      });
    } else if (!readJsonFile(configPath)) {
      issues.push({
        level: "error",
        code: "CONFIG_INVALID",
        message: "i18nexus.config.json이 유효한 JSON이 아닙니다.",
        fix: "Fix the JSON syntax, then run npx i18n-doctor again.",
      });
    }

    if (!packageJson) {
      issues.push({
        level: "warning",
        code: "PACKAGE_JSON_MISSING",
        message:
          "package.json을 찾을 수 없어 i18nexus 버전을 확인하지 못했습니다.",
      });
    } else if (!i18nexusVersion) {
      issues.push({
        level: "warning",
        code: "CORE_DEPENDENCY_MISSING",
        message: "package.json에 i18nexus 의존성이 없습니다.",
        fix: "npm install i18nexus",
      });
    } else if (i18nexusMajor !== null && i18nexusMajor < 4) {
      issues.push({
        level: "error",
        code: "CORE_VERSION_OUTDATED",
        message: `i18nexus ${i18nexusVersion}는 tools v3 권장 대상인 core v4보다 낮습니다.`,
        fix: "npm install i18nexus@latest",
      });
    }

    if (i18nexusVersion && !installedCore) {
      issues.push({
        level: "warning",
        code: "CORE_PACKAGE_NOT_INSTALLED_LOCALLY",
        message:
          "node_modules에서 i18nexus 패키지를 확인하지 못해 package exports smoke check를 건너뜁니다.",
        fix: "npm install",
      });
    }

    if (config.translationImportSource !== "i18nexus") {
      issues.push({
        level: "warning",
        code: "NON_CORE_IMPORT_SOURCE",
        message: `translationImportSource가 "${config.translationImportSource}"입니다. core v4 companion 모드는 "i18nexus"를 기준으로 최적화됩니다.`,
      });
    }

    if (!fs.existsSync(localesDir)) {
      issues.push({
        level: "error",
        code: "LOCALES_DIR_MISSING",
        message: `localesDir을 찾을 수 없습니다: ${config.localesDir}`,
        fix: "npx i18n-extractor",
      });
    }

    const translations = fs.existsSync(localesDir)
      ? readExtractedTranslations(localesDir, {
          fallbackNamespace: config.fallbackNamespace || "common",
        })
      : {};
    const namespaces = Object.keys(translations).sort();
    const languages = [
      ...new Set(
        namespaces.flatMap((namespace) =>
          Object.keys(translations[namespace] || {})
        )
      ),
    ].sort();
    const fallbackNamespace = config.fallbackNamespace || "common";

    if (shouldCheckServerResolution(config, projectRoot)) {
      if (!tsconfig) {
        issues.push({
          level: "warning",
          code: "TSCONFIG_MISSING",
          message:
            "tsconfig.json을 찾지 못해 i18nexus/server subpath resolution을 확인하지 못했습니다.",
          fix: 'Add tsconfig.json with compilerOptions.moduleResolution: "bundler".',
        });
      } else if (
        moduleResolution &&
        !MODERN_MODULE_RESOLUTIONS.has(moduleResolution.toLowerCase())
      ) {
        issues.push({
          level: "warning",
          code: "TSCONFIG_MODULE_RESOLUTION_LEGACY",
          message: `moduleResolution "${moduleResolution}"은 i18nexus/server package exports 해석에 실패할 수 있습니다.`,
          fix: 'Set "compilerOptions.moduleResolution" to "bundler", "node16", or "nodenext".',
        });
      } else if (!moduleResolution) {
        issues.push({
          level: "warning",
          code: "TSCONFIG_MODULE_RESOLUTION_MISSING",
          message:
            "tsconfig.json에 moduleResolution이 없어 i18nexus/server subpath exports 해석이 환경별로 달라질 수 있습니다.",
          fix: 'Set "compilerOptions.moduleResolution" to "bundler".',
        });
      }
    }

    if (fs.existsSync(localesDir) && namespaces.length === 0) {
      issues.push({
        level: "warning",
        code: "NO_TRANSLATIONS",
        message: "번역 JSON을 찾지 못했습니다.",
        fix: "npx i18n-wrapper && npx i18n-extractor",
      });
    }

    if (namespaces.length > 0 && !translations[fallbackNamespace]) {
      issues.push({
        level: "warning",
        code: "FALLBACK_NAMESPACE_MISSING",
        message: `fallbackNamespace "${fallbackNamespace}" 번역 폴더가 없습니다.`,
        fix: `mkdir -p ${path.join(config.localesDir, fallbackNamespace)}`,
      });
    }

    if (namespaces.length > 0 && !fs.existsSync(localeEntrypointPath)) {
      issues.push({
        level: "warning",
        code: "LOCALE_ENTRYPOINT_MISSING",
        message: "core v4용 locales/index.ts entrypoint가 없습니다.",
        fix: "npx i18n-extractor",
      });
    }

    if (namespaces.length > 0 && !fs.existsSync(generatedTypesPath)) {
      issues.push({
        level: "warning",
        code: "GENERATED_TYPES_MISSING",
        message: "생성된 타입 정의 파일이 없습니다.",
        fix: "npx i18n-type",
      });
    }

    if (
      fs.existsSync(localesDir) &&
      !hasJsonLanguageFiles(localesDir) &&
      namespaces.length > 0 &&
      config.useNamespaceStructure === false
    ) {
      issues.push({
        level: "warning",
        code: "NAMESPACE_STRUCTURE_DETECTED",
        message:
          "네임스페이스 폴더 구조가 감지됐지만 useNamespaceStructure가 false입니다.",
        fix: 'Set "useNamespaceStructure": true in i18nexus.config.json.',
      });
    }

    const validationIssues =
      validateTranslationsForTypeGeneration(translations);
    if (validationIssues.length > 0) {
      issues.push({
        level: config.strictTypeGeneration ? "error" : "warning",
        code: "TRANSLATION_COMPLETENESS",
        message: `언어별 누락/빈 번역이 ${validationIssues.length}개 있습니다.`,
        fix: "npx i18n-type -- strict mode를 쓰는 경우 모든 언어 파일을 채워주세요.",
      });
    }

    if (installedCore) {
      for (const subpath of [".", "./server", "./devtools"] as const) {
        if (!getPackageExportTarget(installedCore.packageJson, subpath)) {
          issues.push({
            level: "error",
            code: "CORE_PACKAGE_EXPORT_MISSING",
            message: `설치된 i18nexus 패키지에 ${subpath} export가 없습니다.`,
            fix: "npm install i18nexus@latest",
          });
        }
      }

      if (
        localeEntrypointImportsCreateI18n(localeEntrypointPath) &&
        !installedRootExportsCreateI18n(
          installedCore.packageRoot,
          installedCore.packageJson
        )
      ) {
        issues.push({
          level: "error",
          code: "CORE_CREATE_I18N_EXPORT_MISSING",
          message:
            "생성된 locales/index.ts가 createI18n을 import하지만 설치된 i18nexus root export에서 확인되지 않습니다.",
          fix: "npm install i18nexus@latest && npx i18n-doctor",
        });
      }
    }

    const status = getDoctorStatus(issues);

    return {
      ok: status !== "failed",
      status,
      config,
      issues,
      summary: {
        localesDir,
        namespaces,
        languages,
        generatedTypesPath,
        localeEntrypointPath,
        typescriptModuleResolution: moduleResolution,
      },
    };
  } finally {
    process.chdir(previousCwd);
  }
}

export function printDoctorReport(report: DoctorReport): void {
  console.log("🩺 i18nexus doctor");
  console.log("─".repeat(80));
  console.log(`Locales: ${report.summary.localesDir}`);
  console.log(
    `Namespaces: ${
      report.summary.namespaces.length > 0
        ? report.summary.namespaces.join(", ")
        : "none"
    }`
  );
  console.log(
    `Languages: ${
      report.summary.languages.length > 0
        ? report.summary.languages.join(", ")
        : "none"
    }`
  );
  console.log(`Types: ${report.summary.generatedTypesPath}`);
  console.log(`Entrypoint: ${report.summary.localeEntrypointPath}`);
  console.log(`Status: ${report.status}`);

  if (report.issues.length === 0) {
    console.log("\n✅ Core v4 companion setup looks healthy.");
    return;
  }

  console.log("\nFindings:");
  for (const issue of report.issues) {
    const prefix =
      issue.level === "error" ? "❌" : issue.level === "warning" ? "⚠️" : "ℹ️";
    console.log(`${prefix} [${issue.code}] ${issue.message}`);
    if (issue.fix) {
      console.log(`   Fix: ${issue.fix}`);
    }
  }

  if (report.ok) {
    console.log(
      report.status === "warning"
        ? "\n⚠️  No blocking errors found, but warnings need attention."
        : "\n✅ No blocking errors found."
    );
  } else {
    console.log("\n❌ Blocking errors found.");
  }
}
