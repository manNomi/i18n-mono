/**
 * 출력 생성 로직
 */

import * as fs from "fs";
import * as pathLib from "path";
import { ExtractedKey } from "./key-extractor";
import { escapeCsvValue } from "./extractor-utils";
import {
  CONSOLE_MESSAGES,
  STRING_CONSTANTS,
  CSV_CONSTANTS,
  FILE_EXTENSIONS,
} from "./constants";

export interface OutputConfig {
  sortKeys?: boolean;
  outputFormat?: "json" | "csv";
  languages?: string[];
  outputDir?: string;
  outputFile?: string;
  sourceLanguage?: string;
  force?: boolean;
  dryRun?: boolean;
}

const LANGUAGE_COLUMN_LABELS: Record<string, string> = {
  en: "English",
  ko: "Korean",
};

function getSourceLanguage(config: OutputConfig): string {
  return config.sourceLanguage || STRING_CONSTANTS.DEFAULT_LANG_KO;
}

function getSourceValue(key: string, value: string | undefined): string {
  return value || key;
}

function getInitialTranslationValue(
  key: string,
  value: string | undefined,
  language: string,
  config: OutputConfig
): string {
  return language === getSourceLanguage(config)
    ? getSourceValue(key, value)
    : STRING_CONSTANTS.EMPTY_STRING;
}

function getCsvColumnLabel(language: string): string {
  return LANGUAGE_COLUMN_LABELS[language] || language;
}

/**
 * 출력 데이터 생성
 */
export function generateOutputData(
  keys: ExtractedKey[],
  config: OutputConfig
): any {
  const sortedKeys = config.sortKeys
    ? [...keys].sort((a, b) => a.key.localeCompare(b.key))
    : keys;

  if (config.outputFormat === "csv") {
    return generateGoogleSheetsCSV(sortedKeys, config);
  }

  // JSON 형식 - 단순화된 구조
  const result: { [key: string]: string } = {};

  sortedKeys.forEach(({ key, defaultValue }) => {
    // key를 그대로 사용하고, defaultValue가 있으면 사용, 없으면 key를 기본값으로
    result[key] = defaultValue || key;
  });

  return result;
}

/**
 * Google Sheets CSV 생성
 */
export function generateGoogleSheetsCSV(
  keys: ExtractedKey[],
  config: OutputConfig = {}
): string {
  const languages = config.languages || [
    STRING_CONSTANTS.DEFAULT_LANG_EN,
    STRING_CONSTANTS.DEFAULT_LANG_KO,
  ];
  const header = ["Key", ...languages.map(getCsvColumnLabel)]
    .map(escapeCsvValue)
    .join(CSV_CONSTANTS.SEPARATOR);
  const csvLines: string[] = [header];

  keys.forEach(({ key, defaultValue }) => {
    const values = languages.map((language) =>
      getInitialTranslationValue(key, defaultValue, language, config)
    );
    const escapedValues = [key, ...values].map(escapeCsvValue);
    csvLines.push(escapedValues.join(CSV_CONSTANTS.SEPARATOR));
  });

  return csvLines.join(CSV_CONSTANTS.NEWLINE);
}

/**
 * index.ts 파일 생성 (레거시 모드)
 */
export function generateIndexFile(
  languages: string[],
  outputDir: string,
  dryRun: boolean
): void {
  const indexPath = pathLib.join(outputDir, STRING_CONSTANTS.INDEX_FILE);

  // Import 문 생성
  const imports = languages
    .map((lang) => `import ${lang} from "./${lang}.json";`)
    .join("\n");

  // Export 객체 생성
  const exportObj = languages.map((lang) => `  ${lang}: ${lang},`).join("\n");

  const content = `${imports}

export const translations = {
${exportObj}
};
`;

  if (!dryRun) {
    fs.writeFileSync(indexPath, content, "utf-8");
  }
}

/**
 * 네임스페이스 모드용 index.ts 파일 생성
 * 모든 네임스페이스를 import하고 createI18n으로 i18n 객체 생성
 */
export function generateNamespaceIndexFile(
  namespaces: string[],
  languages: string[],
  outputDir: string,
  fallbackNamespace: string,
  dryRun: boolean,
  useI18nexusLibrary: boolean = true,
  useGeneratedTypes: boolean = true,
  typesOutputPath?: string
): void {
  // useI18nexusLibrary가 false이면 index.ts를 생성하지 않음
  if (!useI18nexusLibrary) {
    if (!dryRun) {
      console.log(`ℹ️  Skipping runtime index.ts generation`);
    }
    return;
  }

  if (namespaces.length === 0) {
    if (!dryRun) {
      console.log(`ℹ️  Skipping index.ts generation (no namespaces found)`);
    }
    return;
  }

  const indexPath = pathLib.join(outputDir, "index.ts");
  const sortedNamespaces = [...new Set([...namespaces, fallbackNamespace])]
    .filter((namespace) => namespace.trim().length > 0)
    .sort();
  const sortedLanguages = [...new Set(languages)].sort();
  const namespaceUnion = sortedNamespaces.map((ns) => `"${ns}"`).join(" | ");
  const languageUnion = sortedLanguages.map((lang) => `"${lang}"`).join(" | ");
  const languagesLiteral = sortedLanguages
    .map((lang) => `"${lang}"`)
    .join(", ");
  const namespacesLiteral = sortedNamespaces
    .map((namespace) => `"${namespace}"`)
    .join(", ");
  const generatedTypeImportPath = getGeneratedTypeImportPath(
    outputDir,
    typesOutputPath
  );
  const generatedTypeImport = useGeneratedTypes
    ? `import type {
  I18nexusGeneratedClientTranslationFunction,
  I18nexusGeneratedTranslationFunction,
  I18nexusGeneratedTranslationKeys,
  I18nexusGeneratedTranslations,
} from "${generatedTypeImportPath}";\n`
    : "";
  const generatedTypeFallback = useGeneratedTypes
    ? ""
    : `type I18nexusGeneratedTranslations = Record<AppNamespace, Record<AppLanguage, Record<string, string>>>;
type I18nexusGeneratedTranslationKeys<NS extends AppNamespace = AppNamespace> = string;
type I18nexusGeneratedTranslationFunction<NS extends AppNamespace = AppNamespace> = (
  key: string,
  variables?: Record<string, string | number>,
  fallback?: string
) => string;
type I18nexusGeneratedClientTranslationFunction<NS extends AppNamespace = AppNamespace> = (
  key: string,
  variables?: Record<string, string | number>
) => string;
`;

  // v3: core v4와 직접 맞물리는 lazy + typed entrypoint 생성
  const content = `/**
 * Auto-generated i18nexus locale entrypoint.
 *
 * This file is designed for i18nexus core v4:
 * - lazy namespace loading via I18nProvider.loadNamespace
 * - typed createI18n helper for advanced namespace/key inference
 * - fallback namespace metadata shared by tools and runtime
 *
 * Regenerate with:
 *   npx i18n-extractor
 */
import {
  createI18n,
  type CreateI18nUseTranslationReturn,
  type NamespaceLoader,
} from "i18nexus";
${generatedTypeImport}
export const languages = [${languagesLiteral}] as const;
export const namespaces = [${namespacesLiteral}] as const;
export const fallbackNamespace = "${fallbackNamespace}" as const;

export type AppLanguage = ${languageUnion || "string"};
export type AppNamespace = ${namespaceUnion || "string"};
${generatedTypeFallback}
export type AppTranslationKeys<NS extends AppNamespace = AppNamespace> =
  I18nexusGeneratedTranslationKeys<NS>;
export type AppTranslationFunction<NS extends AppNamespace = AppNamespace> =
  I18nexusGeneratedTranslationFunction<NS>;
export type AppServerTranslationFunction<NS extends AppNamespace = AppNamespace> =
  I18nexusGeneratedTranslationFunction<NS>;
export type AppClientTranslationFunction<NS extends AppNamespace = AppNamespace> =
  I18nexusGeneratedClientTranslationFunction<NS>;
export type AppUseTranslationReturn<NS extends AppNamespace = AppNamespace> =
  CreateI18nUseTranslationReturn<AppTranslationKeys<NS>>;

export const loadNamespace: NamespaceLoader = async (namespace, language) => {
  const module = await import(\`./\${namespace}/\${language}.json\`);
  return module.default;
};

export const i18n = createI18n({} as I18nexusGeneratedTranslations, {
  fallbackNamespace,
});

export const I18nProvider = i18n.I18nProvider;
export const useTranslation = i18n.useTranslation;

/**
 * Beginner API:
 *   import { I18nProvider } from "i18nexus";
 *   import { loadNamespace, fallbackNamespace } from "./locales";
 *
 * Advanced typed API:
 *   import { I18nProvider, useTranslation } from "./locales";
 *
 * Next.js App Router:
 *   Keep I18nProvider in a "use client" wrapper.
 *   Call router.refresh() after changeLanguage() when server components
 *   also use getTranslation().
 */
`;

  if (!dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(indexPath, content, "utf-8");
    console.log(`✅ Generated core v4 locale entrypoint`);
  }
}

function getGeneratedTypeImportPath(
  outputDir: string,
  typesOutputPath?: string
): string {
  const effectiveTypesOutputPath =
    typesOutputPath && typesOutputPath.trim().length > 0
      ? typesOutputPath
      : pathLib.join(outputDir, "types", "i18nexus.d.ts");
  const relativePath = pathLib
    .relative(
      pathLib.resolve(outputDir),
      pathLib.resolve(effectiveTypesOutputPath)
    )
    .replace(/\\/g, "/")
    .replace(/(\.d)?\.tsx?$/, "");

  return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

/**
 * kebab-case를 PascalCase로 변환
 * 예: "admin-dashboard" -> "AdminDashboard"
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_.]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * 네임스페이스별 출력 파일 작성 (도메인 우선 구조)
 */
export function writeOutputFileWithNamespace(
  data: any,
  config: OutputConfig & { namespace: string }
): void {
  // 디렉토리가 없으면 생성
  if (!config.dryRun && !fs.existsSync(config.outputDir!)) {
    fs.mkdirSync(config.outputDir!, { recursive: true });
  }

  if (config.outputFormat === "csv") {
    // CSV는 네임스페이스별로 저장하지 않음 (레거시 호환)
    const csvFileName = `${config.namespace}.csv`;
    const outputPath = pathLib.join(config.outputDir!, csvFileName);
    const content = data; // CSV는 이미 문자열

    if (!config.dryRun) {
      fs.writeFileSync(outputPath, content);
    }
  } else {
    // JSON 파일로 출력 - 도메인 우선 구조: locales/[namespace]/[lang].json
    // 네임스페이스별 디렉토리 생성
    const namespaceDir = pathLib.join(config.outputDir!, config.namespace);
    if (!config.dryRun && !fs.existsSync(namespaceDir)) {
      fs.mkdirSync(namespaceDir, { recursive: true });
    }

    config.languages!.forEach((lang) => {
      const langFile = pathLib.join(namespaceDir, `${lang}.json`);

      // 기존 번역 파일 읽기 (있다면)
      let existingTranslations: { [key: string]: string } = {};
      if (fs.existsSync(langFile)) {
        try {
          const existingContent = fs.readFileSync(langFile, "utf-8");
          existingTranslations = JSON.parse(existingContent);
        } catch (error) {
          console.warn(CONSOLE_MESSAGES.PARSE_EXISTING_FAILED(langFile));
        }
      }

      let mergedTranslations: { [key: string]: string };

      if (config.force) {
        // Force 모드: 기존 값을 모두 덮어씀
        mergedTranslations = {};

        Object.keys(data).forEach((key) => {
          mergedTranslations[key] = getInitialTranslationValue(
            key,
            data[key],
            lang,
            config
          );
        });
      } else {
        // 기본 모드: 기존 번역을 유지하고 새로운 키만 추가
        mergedTranslations = { ...existingTranslations };

        let newKeysCount = 0;
        Object.keys(data).forEach((key) => {
          if (!mergedTranslations.hasOwnProperty(key)) {
            newKeysCount++;
            mergedTranslations[key] = getInitialTranslationValue(
              key,
              data[key],
              lang,
              config
            );
          }
        });
      }

      const content = JSON.stringify(mergedTranslations, null, 2);

      if (!config.dryRun) {
        fs.writeFileSync(langFile, content);
      }
    });
  }
}

/**
 * 출력 파일 작성 (레거시 모드)
 */
export function writeOutputFile(data: any, config: OutputConfig): void {
  // 디렉토리가 없으면 생성
  if (!config.dryRun && !fs.existsSync(config.outputDir!)) {
    fs.mkdirSync(config.outputDir!, { recursive: true });
  }

  if (config.outputFormat === "csv") {
    // CSV 파일로 출력
    const csvFileName = config.outputFile!.replace(
      FILE_EXTENSIONS.JSON,
      FILE_EXTENSIONS.CSV
    );
    const outputPath = pathLib.join(config.outputDir!, csvFileName);
    const content = data; // CSV는 이미 문자열

    if (!config.dryRun) {
      fs.writeFileSync(outputPath, content);
    }
  } else {
    // JSON 파일로 출력 - 각 언어별로 파일 생성
    config.languages!.forEach((lang) => {
      const langFile = pathLib.join(config.outputDir!, `${lang}.json`);

      // 기존 번역 파일 읽기 (있다면)
      let existingTranslations: { [key: string]: string } = {};
      if (fs.existsSync(langFile)) {
        try {
          const existingContent = fs.readFileSync(langFile, "utf-8");
          existingTranslations = JSON.parse(existingContent);
        } catch (error) {
          console.warn(CONSOLE_MESSAGES.PARSE_EXISTING_FAILED(langFile));
        }
      }

      let mergedTranslations: { [key: string]: string };

      if (config.force) {
        // Force 모드: 기존 값을 모두 덮어씀
        mergedTranslations = {};

        Object.keys(data).forEach((key) => {
          mergedTranslations[key] = getInitialTranslationValue(
            key,
            data[key],
            lang,
            config
          );
        });
      } else {
        // 기본 모드: 기존 번역을 유지하고 새로운 키만 추가
        mergedTranslations = { ...existingTranslations };

        let newKeysCount = 0;
        Object.keys(data).forEach((key) => {
          if (!mergedTranslations.hasOwnProperty(key)) {
            newKeysCount++;
            mergedTranslations[key] = getInitialTranslationValue(
              key,
              data[key],
              lang,
              config
            );
          }
        });
      }

      const content = JSON.stringify(mergedTranslations, null, 2);

      if (!config.dryRun) {
        fs.writeFileSync(langFile, content);
      }
    });

    // index.ts 파일 생성
    generateIndexFile(config.languages!, config.outputDir!, config.dryRun!);
  }
}
