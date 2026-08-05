#!/usr/bin/env node

/**
 * i18n-wrapper-swc-worker CLI
 *
 * SWC + Worker Threads를 사용한 고성능 번역 래퍼
 * - 병렬 처리로 10-12배 성능 향상
 * - 멀티코어 CPU 활용
 */

import { loadConfig } from "../../config-loader";
import { wrapTranslations } from "./wrapper";
import {
  applyWrapperCliOptions,
  createWrapperConfig,
  WRAPPER_CLI_OPTIONS_HELP,
} from "../common/cli-options";

export async function runCli(args = process.argv.slice(2)): Promise<void> {
  const config = createWrapperConfig(loadConfig(), "swc");

  if (applyWrapperCliOptions(args, config).showHelp) {
    console.log(`
i18n-wrapper-swc-worker - High-Performance Translation Wrapper

Usage: i18n-wrapper-swc-worker [options]

${WRAPPER_CLI_OPTIONS_HELP}
      `);
    return;
  }

  console.log("🚀 Starting i18n-wrapper-swc-worker...\n");

  const result = await wrapTranslations(config);
  const timeInSeconds = (result.totalTime / 1000).toFixed(2);
  console.log("\n✅ Processing complete!");
  console.log("═══════════════════════════════════════");
  console.log(`⏱️  Total time: ${timeInSeconds}s`);
  console.log(`📊 Total files: ${result.stats.totalFiles}`);
  console.log(`✏️  Modified: ${result.stats.modifiedFiles}`);
  console.log(`⏭️  Skipped: ${result.stats.skippedFiles}`);
  console.log(`❌ Errors: ${result.stats.errorFiles}`);
  console.log(
    `⚡ Average per file: ${result.stats.averageTimePerFile.toFixed(2)}ms`
  );
  console.log("═══════════════════════════════════════");
  console.log(
    `\n🔧 Workers: ${result.stats.workerStats.totalWorkers} | Completed: ${result.stats.workerStats.completedTasks} | Failed: ${result.stats.workerStats.failedTasks}`
  );
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { wrapTranslations };
