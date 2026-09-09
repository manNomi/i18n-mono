#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import {
  GoogleSheetsManager,
  validateGoogleSheetsLanguages,
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
  languages?: string[];
}

const DEFAULT_CONFIG: Required<UploadConfig> = {
  credentialsPath: "./credentials.json",
  spreadsheetId: "",
  localesDir: "./locales",
  sheetName: "Translations",
  autoTranslate: false,
  force: false,
  dryRun: false,
  languages: ["en", "ko"],
};

export async function uploadTranslations(
  dir: string,
  config: Required<UploadConfig>
) {
  console.log("\n📤 Starting Google Sheets upload process...\n");

  // Validate configuration
  if (!config.spreadsheetId) {
    console.error("❌ Error: Spreadsheet ID is required");
    console.error(
      "Please provide it via config file or --spreadsheet-id flag\n"
    );
    process.exit(1);
  }
  validateGoogleSheetsLanguages(config.languages);

  // 모든 네임스페이스 자동 감지
  const namespaces = detectNamespaces(dir);

  if (config.dryRun) {
    const sheets =
      namespaces.length > 0 ? namespaces : [config.sheetName || "default"];
    console.log(
      `🔍 Dry run: would upload ${sheets.length} sheet(s): ${sheets.join(", ")}`
    );
    console.log(
      "🔒 No authentication, network requests, or writes were performed."
    );
    return;
  }

  if (namespaces.length === 0) {
    // 네임스페이스 미사용: default 시트로 업로드
    const sheetName = config.sheetName || "default";
    console.log(
      `📝 No namespaces detected, uploading to '${sheetName}' sheet\n`
    );
    const sheetsManager = new GoogleSheetsManager({
      credentialsPath: config.credentialsPath,
      spreadsheetId: config.spreadsheetId,
      sheetName,
      languages: config.languages,
    });

    await sheetsManager.preflightUpload(dir);
    await sheetsManager.authenticate();
    await sheetsManager.uploadTranslations(
      dir,
      config.autoTranslate,
      config.force
    );
  } else {
    // 각 네임스페이스를 별도 시트로 업로드
    console.log(
      `📦 Detected ${namespaces.length} namespace(s): ${namespaces.join(", ")}\n`
    );

    const namespaceManagers = namespaces.map((namespace) => ({
      namespace,
      sheetsManager: new GoogleSheetsManager({
        credentialsPath: config.credentialsPath,
        spreadsheetId: config.spreadsheetId,
        sheetName: namespace,
        namespace,
        languages: config.languages,
      }),
    }));

    for (const { sheetsManager } of namespaceManagers) {
      await sheetsManager.preflightUpload(dir);
    }

    for (const { namespace, sheetsManager } of namespaceManagers) {
      console.log(
        `📤 Uploading namespace '${namespace}' to sheet '${namespace}'...`
      );

      await sheetsManager.authenticate();
      await sheetsManager.uploadTranslations(
        dir,
        config.autoTranslate,
        config.force
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
    const itemPath = path.join(localesDir, item);
    const stat = fs.lstatSync(itemPath);

    // 디렉토리이고, 그 안에 JSON 파일이 있으면 네임스페이스로 간주
    if (stat.isDirectory() && !stat.isSymbolicLink() && item !== "types") {
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
    // 환경 변수는 JSON 설정을 덮어쓰고, 명시적인 CLI 옵션은 아래에서 다시 덮어씁니다.
    credentialsPath:
      process.env.GOOGLE_CREDENTIALS_PATH ||
      userConfig.googleSheets?.credentialsPath,
    spreadsheetId:
      process.env.GOOGLE_SPREADSHEET_ID ||
      userConfig.googleSheets?.spreadsheetId,
    localesDir: userConfig.localesDir,
    sheetName: userConfig.googleSheets?.sheetName,
    languages: userConfig.languages,
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
      case "--languages":
        config.languages = args[++i]
          .split(",")
          .map((language) => language.trim())
          .filter(Boolean);
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
  --languages <langs>          Comma-separated language columns (default: "en,ko")
  -f, --force                  Force mode: Clear all existing data and re-upload everything
  --dry-run                    Print source/sheet plan without authentication or writes
  -h, --help                   Show this help message

Examples:
  # Basic upload (text only, only new keys)
  i18n-upload -s "your-spreadsheet-id"
  
  # Auto-translate mode (Korean as text, English as GOOGLETRANSLATE formula)
  i18n-upload -s "your-spreadsheet-id" --auto-translate
  
  # Force mode: Clear and re-upload all translations
  i18n-upload -s "your-spreadsheet-id" --force

  # Config-only preview; performs no authentication or network requests
  i18n-upload -s "your-spreadsheet-id" --dry-run
  
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
