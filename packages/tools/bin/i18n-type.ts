#!/usr/bin/env node

import * as path from "path";
import {
  readExtractedTranslations,
  generateTypeDefinitions,
} from "../scripts/extractor/type-generator";
import { loadConfig } from "../scripts/config-loader";
import {
  isTranslationImportSourceOption,
  readRequiredOptionValue,
} from "./cli-option-utils";

/**
 * i18n-type: 타입 정의 파일 생성 전용 명령어
 *
 * locales 폴더의 JSON 파일들을 읽어서 TypeScript 타입 정의를 생성합니다.
 * Extractor와 독립적으로 실행 가능합니다.
 */

// CLI 실행 부분
if (require.main === module) {
  const args = process.argv.slice(2);
  let translationImportSourceOverride: string | undefined;

  // 도움말 처리
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: i18n-type [options]

Generate TypeScript type definitions from translation files.
This command reads JSON files from locales directory and generates type-safe definitions.

Options:
  -h, --help                   Show this help message
  --translation-import-source <source>
                               Module to augment for generated types
                               (default: config translationImportSource or "i18nexus")
  --library, --lib <source>     Alias for --translation-import-source

Examples:
  # Generate types from locales directory
  npx i18n-type
  npx i18n-type --library react-i18next

How it works:
  1. Reads all translation JSON files from locales directory
  2. Generates TypeScript type definitions in locales/types/i18nexus.d.ts
  3. Includes fallback namespace support (if configured)
  4. Provides type-safe translation keys for useTranslation() and getTranslation()

Config (i18nexus.config.json):
  {
    "localesDir": "./locales",
    "fallbackNamespace": "common",  // Keys from fallback namespace are included in all namespaces
    "translationImportSource": "i18nexus",
    "strictTypeGeneration": false,   // When true, fail if any key/value is missing
    "typesOutputPath": "./locales/types/i18nexus.d.ts"
  }

Output:
  - locales/types/i18nexus.d.ts  (TypeScript declaration file)

Note: Run this command after extracting translations or modifying JSON files.
    `);
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    const option = args[i];

    if (isTranslationImportSourceOption(option)) {
      translationImportSourceOverride = readRequiredOptionValue(
        args,
        i,
        option
      );
      i++;
      continue;
    }

    if (option.startsWith("-")) {
      console.error(`Unknown option: ${option}`);
      process.exit(1);
    }
  }

  // 설정 로드
  const config = loadConfig();

  console.log("📝 Generating TypeScript type definitions...\n");

  try {
    // 1. locales 디렉토리에서 번역 데이터 읽기
    const translations = readExtractedTranslations(config.localesDir, {
      fallbackNamespace: config.fallbackNamespace || "common",
    });

    if (Object.keys(translations).length === 0) {
      console.warn("⚠️  No translation files found in locales directory");
      console.log(`   Locales directory: ${config.localesDir}`);
      process.exit(1);
    }

    // 2. 타입 정의 생성
    const outputPath =
      config.typesOutputPath ||
      path.join(config.localesDir, "types", "i18nexus.d.ts");
    generateTypeDefinitions(translations, {
      outputPath,
      fallbackNamespace: config.fallbackNamespace,
      translationImportSource:
        translationImportSourceOverride ||
        config.translationImportSource ||
        "i18nexus",
      includeJsDocs: true,
      strictValidation: config.strictTypeGeneration,
    });

    console.log("\n✅ Type definitions generated successfully!");
    console.log(`   Output: ${outputPath}`);

    if (config.fallbackNamespace) {
      console.log(
        `   Fallback namespace: "${config.fallbackNamespace}" (keys included in all namespaces)`
      );
    }

    if (config.strictTypeGeneration) {
      console.log(
        `   Strict validation: enabled (missing key/value will fail generation)`
      );
    }

    console.log(
      `   Import source: "${
        translationImportSourceOverride ||
        config.translationImportSource ||
        "i18nexus"
      }"`
    );
  } catch (error) {
    console.error("❌ Failed to generate type definitions:", error);
    process.exit(1);
  }
}
