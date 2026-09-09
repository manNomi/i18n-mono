#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { TranslationExtractor } from "./extractor/index";
import { COMMON_DEFAULTS } from "./common/default-config";

export interface CleanLegacyConfig {
  sourcePattern?: string;
  localesDir?: string;
  languages?: string[];
  dryRun?: boolean;
  backup?: boolean;
}

const DEFAULT_CONFIG: Required<CleanLegacyConfig> = {
  sourcePattern: COMMON_DEFAULTS.sourcePattern,
  localesDir: COMMON_DEFAULTS.localesDir,
  languages: [...COMMON_DEFAULTS.languages],
  dryRun: false,
  backup: true,
};

interface CleanStats {
  totalUsedInCode: number;
  totalKeysPerLanguage: Map<string, number>;
  keptKeys: number;
  removedUnused: number;
  removedInvalidValue: number;
  missingKeys: number;
}

interface CleanIssues {
  unusedKeys: string[];
  invalidValueKeys: string[];
  missingKeys: string[];
}

export class LegacyCleaner {
  private config: Required<CleanLegacyConfig>;

  constructor(config: Partial<CleanLegacyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private findNamespacedLocaleDirs(): string[] {
    if (!fs.existsSync(this.config.localesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.config.localesDir)
      .filter((entry) => entry !== "types")
      .filter((entry) => {
        const entryPath = path.join(this.config.localesDir, entry);
        if (!fs.statSync(entryPath).isDirectory()) {
          return false;
        }

        return fs.readdirSync(entryPath).some((file) => file.endsWith(".json"));
      });
  }

  private assertLegacyFlatLocales(): void {
    const namespacedDirs = this.findNamespacedLocaleDirs();
    if (namespacedDirs.length === 0) {
      return;
    }

    throw new Error(
      [
        "i18n-clean-legacy only supports legacy flat locale files like locales/en.json.",
        `Detected namespaced locale directories: ${namespacedDirs.join(", ")}.`,
        "Refusing to modify files because namespaced cleanup needs namespace-aware extraction.",
      ].join(" ")
    );
  }

  /**
   * 백업 파일 생성
   */
  private createBackup(filePath: string): void {
    if (!this.config.backup) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = filePath.replace(/\.json$/, `.backup-${timestamp}.json`);

    try {
      fs.copyFileSync(filePath, backupPath);
      console.log(`💾 Backup created: ${backupPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to create backup for ${filePath}:`, error);
    }
  }

  /**
   * JSON 파일 읽기
   */
  private readJsonFile(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}, creating empty object`);
      return {};
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Failed to read ${filePath}:`, error);
      return {};
    }
  }

  /**
   * JSON 파일 쓰기
   */
  private writeJsonFile(filePath: string, data: Record<string, string>): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * 값이 유효한지 검사
   */
  private isValidValue(value: string): boolean {
    const invalidValues = ["_N/A", "N/A", "", null, undefined];
    return !invalidValues.includes(value);
  }

  /**
   * 레거시 키 정리 실행
   */
  async clean(): Promise<{
    stats: CleanStats;
    issues: CleanIssues;
  }> {
    console.log("🧹 Starting legacy translation keys cleanup...");
    console.log(`📂 Source pattern: ${this.config.sourcePattern}`);
    console.log(`📂 Locales directory: ${this.config.localesDir}`);
    console.log(`🌍 Languages: ${this.config.languages.join(", ")}`);

    this.assertLegacyFlatLocales();

    // Step 1: 코드에서 실제 사용중인 키 추출
    console.log("\n📥 Step 1: Extracting keys from source code...");
    const extractor = new TranslationExtractor({
      sourcePattern: this.config.sourcePattern,
      dryRun: true, // 파일 쓰지 않고 메모리에만 저장
    });

    const extractedKeys = await extractor.extractKeysOnly();
    const usedKeys = new Set(extractedKeys.map((k) => k.key));

    console.log(`✅ Found ${usedKeys.size} keys used in code`);

    // Step 2: 각 언어별 locale 파일 읽기
    console.log("\n📥 Step 2: Reading locale files...");
    const localeData: Map<string, Record<string, string>> = new Map();

    for (const lang of this.config.languages) {
      const filePath = path.join(this.config.localesDir, `${lang}.json`);
      const data = this.readJsonFile(filePath);
      localeData.set(lang, data);
      console.log(`  - ${lang}.json: ${Object.keys(data).length} keys`);
    }

    // Step 3: 분석 및 정리
    console.log("\n🔍 Step 3: Analyzing and cleaning...");

    const stats: CleanStats = {
      totalUsedInCode: usedKeys.size,
      totalKeysPerLanguage: new Map(),
      keptKeys: 0,
      removedUnused: 0,
      removedInvalidValue: 0,
      missingKeys: 0,
    };

    const issues: CleanIssues = {
      unusedKeys: [],
      invalidValueKeys: [],
      missingKeys: [],
    };

    // 기준 언어: 유효한 번역 값이 가장 많은 언어를 우선 사용
    const primaryLang =
      this.config.languages
        .map((lang) => {
          const data = localeData.get(lang) || {};
          const validValueCount = Object.values(data).filter((value) =>
            this.isValidValue(value as string)
          ).length;

          return { lang, validValueCount, totalKeys: Object.keys(data).length };
        })
        .sort((a, b) => {
          if (b.validValueCount !== a.validValueCount) {
            return b.validValueCount - a.validValueCount;
          }
          return b.totalKeys - a.totalKeys;
        })[0]?.lang || this.config.languages[0];
    const primaryData = localeData.get(primaryLang) || {};
    stats.totalKeysPerLanguage.set(
      primaryLang,
      Object.keys(primaryData).length
    );

    const cleanedData: Map<string, Record<string, string>> = new Map();
    this.config.languages.forEach((lang) => {
      cleanedData.set(lang, {});
    });

    // 코드에서 사용하는 키 기준으로 검사
    for (const key of Array.from(usedKeys)) {
      const primaryValue = primaryData[key];

      if (primaryValue === undefined) {
        // 키가 코드에는 있지만 locale 파일에 없음
        stats.missingKeys++;
        issues.missingKeys.push(key);
      } else if (!this.isValidValue(primaryValue)) {
        // 값이 유효하지 않음 (N/A, 빈 문자열 등)
        stats.removedInvalidValue++;
        issues.invalidValueKeys.push(key);
      } else {
        // 유효한 키 - 모든 언어에 추가
        stats.keptKeys++;
        for (const lang of this.config.languages) {
          const langData = localeData.get(lang) || {};
          cleanedData.get(lang)![key] = langData[key] || "";
        }
      }
    }

    // locale 파일에는 있지만 코드에서 사용하지 않는 키 찾기
    for (const key in primaryData) {
      if (!usedKeys.has(key)) {
        stats.removedUnused++;
        issues.unusedKeys.push(key);
      }
    }

    // Step 4: 파일 쓰기
    if (!this.config.dryRun) {
      console.log("\n💾 Step 4: Writing cleaned files...");

      for (const lang of this.config.languages) {
        const filePath = path.join(this.config.localesDir, `${lang}.json`);

        // 백업 생성
        if (fs.existsSync(filePath)) {
          this.createBackup(filePath);
        }

        // 정리된 데이터 쓰기
        this.writeJsonFile(filePath, cleanedData.get(lang)!);
        console.log(`  ✅ ${lang}.json updated`);
      }
    } else {
      console.log("\n🔍 Dry run mode - no files were modified");
    }

    return { stats, issues };
  }

  /**
   * 결과 리포트 출력
   */
  printReport(stats: CleanStats, issues: CleanIssues): void {
    console.log("\n" + "=".repeat(60));
    console.log("📊 CLEANUP REPORT");
    console.log("=".repeat(60));

    console.log("\n📈 Statistics:");
    console.log(`  • Keys used in code: ${stats.totalUsedInCode}`);
    console.log(`  • Keys kept: ${stats.keptKeys}`);
    console.log(`  • Keys removed (unused): ${stats.removedUnused}`);
    console.log(
      `  • Keys removed (invalid value): ${stats.removedInvalidValue}`
    );
    console.log(`  • Keys missing from locale: ${stats.missingKeys}`);

    if (issues.missingKeys.length > 0) {
      console.log("\n⚠️  MISSING KEYS (need translation):");
      issues.missingKeys.slice(0, 20).forEach((key) => {
        console.log(`  - ${key}`);
      });
      if (issues.missingKeys.length > 20) {
        console.log(`  ... and ${issues.missingKeys.length - 20} more`);
      }
    }

    if (issues.invalidValueKeys.length > 0) {
      console.log("\n🔴 REMOVED (invalid values):");
      issues.invalidValueKeys.slice(0, 20).forEach((key) => {
        console.log(`  - ${key}`);
      });
      if (issues.invalidValueKeys.length > 20) {
        console.log(`  ... and ${issues.invalidValueKeys.length - 20} more`);
      }
    }

    if (issues.unusedKeys.length > 0) {
      console.log("\n🗑️  REMOVED (unused in code):");
      issues.unusedKeys.slice(0, 20).forEach((key) => {
        console.log(`  - ${key}`);
      });
      if (issues.unusedKeys.length > 20) {
        console.log(`  ... and ${issues.unusedKeys.length - 20} more`);
      }
    }

    if (
      issues.missingKeys.length === 0 &&
      issues.invalidValueKeys.length === 0 &&
      issues.unusedKeys.length === 0
    ) {
      console.log("\n✨ No issues found! Your locale files are clean.");
    }

    console.log("\n" + "=".repeat(60));
  }
}

export async function runCleanLegacy(
  config: Partial<CleanLegacyConfig> = {}
): Promise<void> {
  const cleaner = new LegacyCleaner(config);

  try {
    const { stats, issues } = await cleaner.clean();
    cleaner.printReport(stats, issues);

    console.log("\n✅ Legacy cleanup completed successfully");
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    throw error;
  }
}
