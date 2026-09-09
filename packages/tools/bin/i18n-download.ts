#!/usr/bin/env node

import * as fs from "fs";
import {
  GoogleSheetsManager,
  validateGoogleSheetsLanguages,
} from "../scripts/google-sheets";
import { loadConfig } from "../scripts/config-loader";

export interface DownloadConfig {
  credentialsPath?: string;
  spreadsheetId?: string;
  localesDir?: string;
  sheetName?: string;
  languages?: string[];
}

const DEFAULT_CONFIG: Required<DownloadConfig> = {
  credentialsPath: "./credentials.json",
  spreadsheetId: "",
  localesDir: "./locales",
  sheetName: "Translations",
  languages: ["en", "ko"],
};

export async function downloadTranslations(
  config: Partial<DownloadConfig> = {},
  options: { force?: boolean; dryRun?: boolean } = {}
) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    console.log("📥 Starting translation download from Google Sheets...");

    // 설정 유효성 검사
    if (!finalConfig.spreadsheetId) {
      throw new Error("Spreadsheet ID is required");
    }
    validateGoogleSheetsLanguages(finalConfig.languages);

    if (options.dryRun) {
      console.log(
        `🔍 Dry run: would ${options.force ? "force " : ""}download all sheets to ${finalConfig.localesDir} for ${finalConfig.languages.join(", ")}.`
      );
      console.log(
        "🔒 No authentication, network requests, or local writes were performed."
      );
      return;
    }

    if (!fs.existsSync(finalConfig.credentialsPath)) {
      throw new Error(
        `Credentials file not found: ${finalConfig.credentialsPath}`
      );
    }

    // Google Sheets Manager 초기화
    const sheetsManager = new GoogleSheetsManager({
      credentialsPath: finalConfig.credentialsPath,
      spreadsheetId: finalConfig.spreadsheetId,
      sheetName: finalConfig.sheetName,
      languages: finalConfig.languages,
    });

    // 인증
    await sheetsManager.authenticate();

    // 모든 시트 자동 다운로드 (sheetName 무시)
    console.log("📥 Downloading all sheets automatically...");
    await sheetsManager.downloadAllSheets(
      finalConfig.localesDir,
      finalConfig.languages,
      { force: options.force }
    );

    // Note: 이전에는 단일 시트만 다운로드했지만, 이제는 모든 시트를 자동으로 다운로드합니다.
    // force 옵션은 개별 시트 다운로드 시 적용되며, 각 시트는 locales/[namespace]/ 폴더에 저장됩니다.

    // index.tsx 생성 (선택사항)
    console.log("✅ Translation download completed successfully");
  } catch (error) {
    console.error("❌ Download failed:", error);
    throw error;
  }
}

// CLI 실행 부분
if (require.main === module) {
  // i18nexus.config.json에서 설정 로드
  const userConfig = loadConfig();

  const args = process.argv.slice(2);
  const config: Partial<DownloadConfig> = {
    // config 파일에서 Google Sheets 설정 가져오기
    credentialsPath: userConfig.googleSheets?.credentialsPath,
    spreadsheetId: userConfig.googleSheets?.spreadsheetId,
    localesDir: userConfig.localesDir,
    sheetName: userConfig.googleSheets?.sheetName,
    languages: userConfig.languages,
  };
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--credentials":
      case "-c":
        config.credentialsPath = args[++i];
        break;
      case "--spreadsheet-id":
      case "-s":
        config.spreadsheetId = args[++i];
        break;
      case "--locales-dir":
      case "-l":
        config.localesDir = args[++i];
        break;
      case "--sheet-name":
      case "-n":
        config.sheetName = args[++i];
        console.warn(
          "⚠️  --sheet-name is ignored because download reads every sheet as a namespace."
        );
        break;
      case "--languages":
        config.languages = args[++i]
          .split(",")
          .map((language) => language.trim())
          .filter(Boolean);
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: i18n-download [options]

Download translations from ALL sheets in Google Spreadsheet automatically.
Each sheet becomes a namespace folder (e.g., "common" sheet → locales/common/).

Options:
  -c, --credentials <path>     Path to Google Sheets credentials file (default: "./credentials.json")
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory (default: "./locales")
  --languages <langs>          Comma-separated list of languages (default: "en,ko")
  --dry-run                    Print target plan without authentication, network, or writes
  -h, --help                   Show this help message

Examples:
  i18n-download -s "your-spreadsheet-id"
  i18n-download -c "./my-creds.json" -s "your-spreadsheet-id" -l "./translations"
  i18n-download -s "your-spreadsheet-id" --languages "en,ko,ja"
  i18n-download -s "your-spreadsheet-id" --dry-run

How it works:
  - Automatically detects all sheets in the spreadsheet
  - Each sheet name becomes a namespace (folder)
  - "common" sheet → locales/common/en.json, locales/common/ko.json
  - "dashboard" sheet → locales/dashboard/en.json, locales/dashboard/ko.json
  - No need to specify sheet names in config!
        `);
        process.exit(0);
        break;
    }
  }

  downloadTranslations(config, { dryRun }).catch(() => {
    process.exitCode = 1;
  });
}
