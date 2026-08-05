#!/usr/bin/env node

import { wrapTranslations } from "../scripts/t-wrapper/wrapper";
import { loadConfig } from "../scripts/config-loader";
import {
  applyWrapperCliOptions,
  createWrapperConfig,
  WRAPPER_CLI_OPTIONS_HELP,
} from "../scripts/t-wrapper/common/cli-options";

const args = process.argv.slice(2);

// i18nexus.config.js에서 설정 로드
const projectConfig = loadConfig();
const config = createWrapperConfig(projectConfig);

try {
  if (applyWrapperCliOptions(args, config).showHelp) {
    console.log(`
Usage: i18n-wrapper [options]

Wrap hardcoded source text and opt-in key-first JSX text with t().

Options:
${WRAPPER_CLI_OPTIONS_HELP}

Examples:
  i18n-wrapper -p "app/**/*.tsx"
  i18n-wrapper --key-first
  i18n-wrapper --key-first-pattern "feature\\.[a-zA-Z0-9_.-]+"
    `);
    process.exit(0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

wrapTranslations(config).catch((error) => {
  console.error("❌ Translation wrapper failed:", error);
  process.exit(1);
});
