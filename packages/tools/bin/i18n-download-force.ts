#!/usr/bin/env node

import { downloadTranslations, DownloadConfig } from "./i18n-download";
import { loadConfig } from "../scripts/config-loader";

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
        "⚠️  --sheet-name is ignored because force download reads every sheet as a namespace."
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
Usage: i18n-download-force [options]

Force download all translations from Google Sheets, overwriting existing files.

Options:
  -c, --credentials <path>     Path to Google Sheets credentials file (default: "./credentials.json")
  -s, --spreadsheet-id <id>    Google Spreadsheet ID (required)
  -l, --locales-dir <path>     Path to locales directory (default: "./locales")
  -n, --sheet-name <name>      Deprecated and ignored; all sheets are downloaded
  --languages <langs>          Comma-separated list of languages (default: "en,ko")
  --dry-run                    Print target plan without authentication, network, or writes
  -h, --help                   Show this help message

Examples:
  i18n-download-force -s "your-spreadsheet-id"
  i18n-download-force -c "./my-creds.json" -s "your-spreadsheet-id" -l "./translations"
  i18n-download-force -s "your-spreadsheet-id" --languages "en,ko,ja"
  i18n-download-force -s "your-spreadsheet-id" --dry-run
      `);
      process.exit(0);
      break;
  }
}

// force 옵션을 true로 설정하여 다운로드
downloadTranslations(config, { force: true, dryRun }).catch(() => {
  process.exitCode = 1;
});
