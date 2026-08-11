#!/usr/bin/env node

import * as path from "path";
import { loadConfig } from "../scripts/config-loader";
import { importTranslationsFromCsv } from "../scripts/translation-csv";

const config = loadConfig();
const args = process.argv.slice(2);
let localesDir = config.localesDir;
let csvFilePath = "./translations.csv";
let languages: string[] | undefined;
let force = false;
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
    case "--force":
      force = true;
      break;
    case "--dry-run":
      dryRun = true;
      break;
    case "--help":
    case "-h":
      console.log(
        "Usage: i18n-csv-to-json [--locales-dir path] [--csv-file path] [--languages en,ko] [--force] [--dry-run]"
      );
      process.exit(0);
  }
}

try {
  const result = importTranslationsFromCsv({
    localesDir: path.resolve(localesDir),
    csvFilePath: path.resolve(csvFilePath),
    languages,
    force,
    dryRun,
  });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
