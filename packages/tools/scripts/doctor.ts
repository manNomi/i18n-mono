import * as fs from "fs";
import * as path from "path";
import { loadConfigSilently, I18nexusConfig } from "./config-loader";
import {
  readExtractedTranslations,
  validateTranslationsForTypeGeneration,
} from "./extractor/type-generator";

export type DoctorIssueLevel = "error" | "warning" | "info";

export interface DoctorIssue {
  level: DoctorIssueLevel;
  code: string;
  message: string;
  fix?: string;
}

export interface DoctorReport {
  ok: boolean;
  config: I18nexusConfig;
  issues: DoctorIssue[];
  summary: {
    localesDir: string;
    namespaces: string[];
    languages: string[];
    generatedTypesPath: string;
    localeEntrypointPath: string;
  };
}

function readJsonFile(filePath: string): Record<string, any> | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getPackageDependencyVersion(
  packageJson: Record<string, any> | null,
  packageName: string,
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

export function runDoctor(projectRoot: string = process.cwd()): DoctorReport {
  const previousCwd = process.cwd();
  process.chdir(projectRoot);

  try {
    const config = loadConfigSilently();
    const issues: DoctorIssue[] = [];
    const localesDir = resolveProjectPath(projectRoot, config.localesDir);
    const generatedTypesPath = resolveProjectPath(
      projectRoot,
      config.typesOutputPath ||
        path.join(config.localesDir, "types", "i18nexus.d.ts"),
    );
    const localeEntrypointPath = path.join(localesDir, "index.ts");
    const packageJsonPath = path.join(projectRoot, "package.json");
    const packageJson = fs.existsSync(packageJsonPath)
      ? readJsonFile(packageJsonPath)
      : null;
    const i18nexusVersion = getPackageDependencyVersion(
      packageJson,
      "i18nexus",
    );
    const i18nexusMajor = getMajorVersion(i18nexusVersion);

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
          Object.keys(translations[namespace] || {}),
        ),
      ),
    ].sort();
    const fallbackNamespace = config.fallbackNamespace || "common";

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

    return {
      ok: !issues.some((issue) => issue.level === "error"),
      config,
      issues,
      summary: {
        localesDir,
        namespaces,
        languages,
        generatedTypesPath,
        localeEntrypointPath,
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
    }`,
  );
  console.log(
    `Languages: ${
      report.summary.languages.length > 0
        ? report.summary.languages.join(", ")
        : "none"
    }`,
  );
  console.log(`Types: ${report.summary.generatedTypesPath}`);
  console.log(`Entrypoint: ${report.summary.localeEntrypointPath}`);

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
    console.log("\n✅ No blocking errors found.");
  } else {
    console.log("\n❌ Blocking errors found.");
  }
}
