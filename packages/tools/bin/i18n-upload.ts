#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import {
  GoogleSheetsManager,
  resolveSafeChildPath,
} from "../scripts/google-sheets";
import { loadConfig } from "../scripts/config-loader";

export interface UploadConfig {
  credentialsPath?: string;
  spreadsheetId?: string;
  localesDir?: string;
  sheetName?: string;
  autoTranslate?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

const DEFAULT_CONFIG: Required<UploadConfig> = {
  credentialsPath: "./credentials.json",
  spreadsheetId: "",
  localesDir: "./locales",
  sheetName: "Translations",
  autoTranslate: false,
  force: false,
  dryRun: false,
};

export async function uploadTranslations(
  dir: string,
  config: Required<UploadConfig>
) {
  console.log("\n📤 Starting Google Sheets upload process...\n");

  // Validate configuration
  if (!config.spreadsheetId) {
    throw new Error(
      "Spreadsheet ID is required. Provide it via config or --spreadsheet-id."
    );
  }

  // 모든 네임스페이스 자동 감지
  const namespaces = detectNamespaces(dir);

  if (namespaces.length === 0) {
    // 네임스페이스 미사용: default 시트로 업로드
    console.log("📝 No namespaces detected, uploading to 'default' sheet\n");
    const sheetsManager = new GoogleSheetsManager({
      credentialsPath: config.credentialsPath,
      spreadsheetId: config.spreadsheetId,
      sheetName: "default",
    });

    await sheetsManager.authenticate();
    await sheetsManager.uploadTranslations(
      dir,
      config.autoTranslate,
      config.force,
      config.dryRun
    );
  } else {
    // 각 네임스페이스를 별도 시트로 업로드
    console.log(
      `📦 Detected ${namespaces.length} namespace(s): ${namespaces.join(", ")}\n`
    );

    for (const namespace of namespaces) {
      console.log(
        `📤 Uploading namespace '${namespace}' to sheet '${namespace}'...`
      );

      const sheetsManager = new GoogleSheetsManager({
        credentialsPath: config.credentialsPath,
        spreadsheetId: config.spreadsheetId,
        sheetName: namespace,
        namespace: namespace,
      });

      await sheetsManager.authenticate();
      if (!config.dryRun) {
        await sheetsManager.ensureWorksheet();
      }
      await sheetsManager.uploadTranslations(
        dir,
        config.autoTranslate,
        config.force,
        config.dryRun
      );

      console.log(`✅ Completed upload for namespace '${namespace}'\n`);
    }
  }
}

/**
 * locales 디렉토리에서 모든 네임스페이스 감지
 * 네임스페이스 구조: locales/[namespace]/[lang].json
 * 레거시 구조: locales/[lang].json (빈 배열 반환)
 */
function detectNamespaces(localesDir: string): string[] {
  if (!fs.existsSync(localesDir)) {
    return [];
  }

  const items = fs.readdirSync(localesDir);
  const namespaces: string[] = [];

  for (const item of items) {
    const itemPath = resolveSafeChildPath(localesDir, item, "namespace");
    const stat = fs.statSync(itemPath);

    // 디렉토리이고, 그 안에 JSON 파일이 있으면 네임스페이스로 간주
    if (stat.isDirectory() && item !== "types") {
      const files = fs.readdirSync(itemPath);
      const hasJsonFiles = files.some((file) => file.endsWith(".json"));

      if (hasJsonFiles) {
        namespaces.push(item);
      }
    }
  }

  return namespaces;
}

// CLI 실행 부분
if (require.main === module) {
  // i18nexus.config.json에서 설정 로드
  const userConfig = loadConfig();

  const args = process.argv.slice(2);
  const config: Partial<UploadConfig> = {
    // config 파일에서 Google Sheets 설정 가져오기
    credentialsPath: userConfig.googleSheets?.credentialsPath,
    spreadsheetId: userConfig.googleSheets?.spreadsheetId,
    localesDir: userConfig.localesDir,
    sheetName: userConfig.googleSheets?.sheetName,
  };

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
        break;
      case "--auto-translate":
      case "-a":
        config.autoTranslate = true;
        break;
      case "--force":
      case "-f":
        config.force = true;
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: i18n-upload [options]

Upload translations from ALL namespace folders to Google Sheets automatically.
Each namespace folder becomes a sheet (e.g., locales/common/ → "common" sheet).

Options:
  -c, --credentials <path>     Path to Google Sheets credentials file (default: "./credentials.json")
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory (default: "./locales")
  -a, --auto-translate         Enable auto-translation mode (English uses GOOGLETRANSLATE formula)
  -f, --force                  Force mode: Clear all existing data and re-upload everything
  --dry-run                    Preview without changing Google Sheets
  -h, --help                   Show this help message

Examples:
  # Basic upload (text only, only new keys)
  i18n-upload -s "your-spreadsheet-id"
  
  # Auto-translate mode (Korean as text, English as GOOGLETRANSLATE formula)
  i18n-upload -s "your-spreadsheet-id" --auto-translate
  
  # Force mode: Clear and re-upload all translations
  i18n-upload -s "your-spreadsheet-id" --force
  
  # With custom paths
  i18n-upload -c "./my-creds.json" -s "your-spreadsheet-id" -l "./translations"

How it works:
  - Automatically detects all namespace folders in locales directory
  - Each namespace folder becomes a sheet (auto-creates if not exists)
  - locales/common/ → "common" sheet
  - locales/dashboard/ → "dashboard" sheet
  - No need to specify sheet names in config!
        `);
        process.exit(0);
        break;
    }
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  uploadTranslations(finalConfig.localesDir, finalConfig).catch((error) => {
    console.error("❌ Upload failed:", error);
    process.exitCode = 1;
  });
}
