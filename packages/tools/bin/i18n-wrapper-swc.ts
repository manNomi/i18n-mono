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
const config = createWrapperConfig(projectConfig, "swc");

try {
  if (applyWrapperCliOptions(args, config).showHelp) {
    console.log(`
Usage: i18n-wrapper-swc [options]

Experimental wrapper command with the same transformation options as i18n-wrapper.

Options:
${WRAPPER_CLI_OPTIONS_HELP}

Examples:
  i18n-wrapper-swc --key-first
  i18n-wrapper-swc --no-key-first
    `);
    process.exit(0);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

console.log("⚠️  Running with SWC parser (experimental mode)");
console.log(
  "⚠️  Note: SWC may be slower than Babel due to AST conversion overhead."
);
console.log(
  "⚠️  For best performance, use the default Babel parser: npx i18n-wrapper"
);

wrapTranslations(config).catch((error) => {
  console.error("❌ Translation wrapper failed:", error);
  process.exit(1);
});
