#!/usr/bin/env node

import { wrapTranslations } from "../scripts/t-wrapper/wrapper";
import { ScriptConfig } from "../scripts/common/default-config";
import { loadConfig } from "../scripts/config-loader";

const args = process.argv.slice(2);

// i18nexus.config.js에서 설정 로드
const projectConfig = loadConfig();
const config: Partial<ScriptConfig> = {
  sourcePattern: projectConfig.sourcePattern,
  translationImportSource: projectConfig.translationImportSource,
  sourceLanguage: projectConfig.sourceLanguage,
  mode: projectConfig.mode,
  framework: projectConfig.framework,
  serverTranslationFunction: projectConfig.serverTranslationFunction,
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case "--pattern":
    case "-p":
      config.sourcePattern = args[++i];
      break;
    case "--source-language":
      config.sourceLanguage = args[++i];
      break;
    case "--dry-run":
      config.dryRun = true;
      break;
    case "--help":
    case "-h":
      console.log(`
Usage: i18n-wrapper [options]

자동으로 하드코딩된 한국어 문자열을 t() 함수로 래핑하고 useTranslation 훅을 추가합니다.

Options:
  -p, --pattern <pattern>              소스 파일 패턴 (기본값: "src/**/*.{js,jsx,ts,tsx}")
  --source-language <lang>             원문 언어: ko|en|auto (기본값: config sourceLanguage/defaultLanguage)
  --dry-run                            변경 대상만 계산하고 파일은 수정하지 않음
  -h, --help                           도움말 표시

Examples:
  i18n-wrapper                                    # 기본 패턴으로 처리
  i18n-wrapper -p "app/**/*.tsx"                 # 커스텀 패턴
  i18n-wrapper --source-language en              # 영어 원문 JSX 텍스트 래핑
  i18n-wrapper --dry-run                         # 파일 수정 없이 대상 확인
  
Features:
  - sourceLanguage에 따른 한국어/영어 문자열 감지 및 t() 래핑
  - useTranslation() 훅 자동 추가 (i18nexus)
  - 기존 t() 호출 및 import 보존
      `);
      process.exit(0);
      break;
    default:
      console.error(`Unknown option: ${args[i]}`);
      process.exit(1);
  }
}

wrapTranslations(config)
  .then((result) => {
    if (result.stats?.errorFiles) {
      throw new Error(
        `Translation wrapper failed for ${result.stats.errorFiles} file(s)`
      );
    }
    if (config.dryRun) {
      console.log(
        `🔍 Dry run: ${result.processedFiles.length} file(s) would change; no files were written.`
      );
    }
  })
  .catch((error) => {
    console.error("❌ Translation wrapper failed:", error);
    process.exit(1);
  });
