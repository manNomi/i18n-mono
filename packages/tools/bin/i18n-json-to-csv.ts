#!/usr/bin/env node

import * as path from "path";
import { loadConfig } from "../scripts/config-loader";
import { exportTranslationsToCsv } from "../scripts/translation-csv";

const config = loadConfig();
const args = process.argv.slice(2);
let localesDir = config.localesDir;
let csvFilePath = "./translations.csv";
let languages: string[] | undefined = config.languages;
let dryRun = false;

for (let index = 0; index < args.length; index++) {
  switch (args[index]) {
    case "--locales-dir":
      localesDir = args[++index];
      break;
    case "--csv-file":
      csvFilePath = args[++index];
      break;
    case "--languages":
      languages = args[++index].split(",");
      break;
    case "--dry-run":
      dryRun = true;
      break;
    case "--help":
    case "-h":
      console.log(
        "Usage: i18n-json-to-csv [--locales-dir path] [--csv-file path] [--languages en,ko] [--dry-run]"
      );
      process.exit(0);
  }
}

try {
  const result = exportTranslationsToCsv({
    localesDir: path.resolve(localesDir),
    csvFilePath: path.resolve(csvFilePath),
    languages,
    dryRun,
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
