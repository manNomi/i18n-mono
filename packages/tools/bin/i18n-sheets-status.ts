#!/usr/bin/env node

import * as path from "path";
import { loadConfig } from "../scripts/config-loader";
import { GoogleSheetsManager } from "../scripts/google-sheets";

const config = loadConfig();
const args = process.argv.slice(2);
let credentialsPath =
  config.googleSheets?.credentialsPath ?? "./credentials.json";
let spreadsheetId = config.googleSheets?.spreadsheetId ?? "";
let localesDir = config.localesDir;
let languages = config.languages;

for (let index = 0; index < args.length; index++) {
  switch (args[index]) {
    case "--credentials":
      credentialsPath = args[++index];
      break;
    case "--spreadsheet-id":
      spreadsheetId = args[++index];
      break;
    case "--locales-dir":
      localesDir = args[++index];
      break;
    case "--languages":
      languages = args[++index].split(",");
      break;
    case "--help":
    case "-h":
      console.log(
        "Usage: i18n-sheets-status [--credentials path] [--spreadsheet-id id] [--locales-dir path] [--languages en,ko]"
      );
      process.exit(0);
  }
}

async function main(): Promise<void> {
  if (!spreadsheetId) throw new Error("Spreadsheet ID is required.");
  const manager = new GoogleSheetsManager({
    credentialsPath: path.resolve(credentialsPath),
    spreadsheetId,
  });
  await manager.authenticate();
  const status = await manager.getAllNamespacesStatus(
    path.resolve(localesDir),
    languages
  );
  console.log(JSON.stringify({ namespaces: status }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
