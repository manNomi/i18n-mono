#!/usr/bin/env node

import { runTranslationExtractor, ExtractorConfig } from "../scripts/extractor";
import { loadConfig } from "../scripts/config-loader";
import {
  isTranslationImportSourceOption,
  readRequiredOptionValue,
} from "./cli-option-utils";

const args = process.argv.slice(2);

// i18nexus.config.js에서 설정 로드
const projectConfig = loadConfig();
const config: Partial<ExtractorConfig> = {
  sourcePattern: projectConfig.sourcePattern,
  outputDir: projectConfig.localesDir,
  languages: projectConfig.languages,
  defaultLanguage: projectConfig.defaultLanguage,
  sourceLanguage: projectConfig.sourceLanguage,
  fallbackNamespace: projectConfig.fallbackNamespace,
  translationImportSource: projectConfig.translationImportSource,
  useNamespaceStructure: projectConfig.useNamespaceStructure,
  namespacing: projectConfig.namespacing,
  namespaceStrategy: projectConfig.namespaceStrategy,
  generateTypes: projectConfig.generateTypes,
  typesOutputPath: projectConfig.typesOutputPath,
  strictTypeGeneration: projectConfig.strictTypeGeneration,
  staticKeyExtraction: projectConfig.staticKeyExtraction,
  staticKeyContainerPatterns: projectConfig.staticKeyContainerPatterns,
};

for (let i = 0; i < args.length; i++) {
  const option = args[i];

  if (isTranslationImportSourceOption(option)) {
    config.translationImportSource = readRequiredOptionValue(args, i, option);
    i++;
    continue;
  }

  switch (option) {
    case "--pattern":
    case "-p":
      config.sourcePattern = args[++i];
      break;
    case "--output":
    case "-o":
      config.outputFile = args[++i];
      break;
    case "--output-dir":
    case "-d":
      config.outputDir = args[++i];
      break;
    case "--format":
    case "-f": {
      const format = args[++i];
      if (format !== "json" && format !== "csv") {
        console.error(`Invalid format: ${format}. Use 'json' or 'csv'`);
        process.exit(1);
      }
      config.outputFormat = format as "json" | "csv";
      break;
    }
    case "--languages":
    case "-l":
      config.languages = args[++i].split(",").map((l) => l.trim());
      break;
    case "--source-language":
      config.sourceLanguage = args[++i];
      break;
    case "--force":
      config.force = true;
      break;
    case "--flat":
      config.useNamespaceStructure = false;
      config.namespacing = {
        enabled: false,
        basePath: "",
        defaultNamespace: config.fallbackNamespace || "common",
      };
      break;
    case "--dry-run":
      config.dryRun = true;
      break;
    case "--no-types":
      config.generateTypes = false;
      break;
    case "--types-output":
      config.typesOutputPath = args[++i];
      break;
    case "--strict-types":
      config.strictTypeGeneration = true;
      break;
    case "--static-key-extraction": {
      const mode = args[++i];
      if (mode !== "off" && mode !== "safe" && mode !== "aggressive") {
        console.error(
          `Invalid static key extraction mode: ${mode}. Use 'off', 'safe', or 'aggressive'`
        );
        process.exit(1);
      }
      config.staticKeyExtraction = mode;
      break;
    }
    case "--help":
    case "-h":
      console.log(`
Usage: i18n-extractor [options]

t() 함수 호출에서 번역 키를 추출하여 언어별 JSON 파일 또는 CSV 파일을 생성합니다.

Options:
  -p, --pattern <pattern>     소스 파일 패턴 (기본값: "src/**/*.{js,jsx,ts,tsx}")
  -o, --output <file>         CSV 출력 파일명 (기본값: "extracted-translations.json")
  -d, --output-dir <dir>      출력 디렉토리 (기본값: "./locales")
  -f, --format <format>       출력 형식: json|csv (기본값: "json")
  -l, --languages <langs>     언어 목록 (쉼표로 구분, 기본값: "en,ko")
  --source-language <lang>     추출된 원문 문자열을 채울 언어 (기본값: defaultLanguage)
  --force                     Force 모드: 기존 번역을 모두 덮어씀 (기본: 새 키만 추가)
  --flat                      legacy flat 구조(locales/en.json)를 사용
  --dry-run                   실제 파일 생성 없이 미리보기
  --no-types                  타입 자동 생성을 건너뜀
  --types-output <path>       타입 정의 출력 경로 (기본: locales/types/i18nexus.d.ts)
  --strict-types              타입 생성 시 누락/빈 번역을 오류로 처리
  --translation-import-source <source>
                              생성 타입이 보강할 라이브러리 모듈 (기본값: i18nexus)
  --library, --lib <source>   --translation-import-source 별칭
  --static-key-extraction <mode>
                              정적 상수 키 추출: off|safe|aggressive (기본값: safe)
  -h, --help                  도움말 표시

Examples:
  i18n-extractor                                  # locales/[namespace]/[lang].json 및 core v4 entrypoint 생성
  i18n-extractor --flat                           # en.json, ko.json에 새 키만 추가
  i18n-extractor --force                          # 모든 키를 덮어쓰기
  i18n-extractor -p "app/**/*.tsx"                # App 디렉토리에서 추출
  i18n-extractor -l "en,ko,ja"                    # 3개 언어 파일 생성
  i18n-extractor --source-language en             # 영어 원문 앱은 en.json에 원문 채움
  i18n-extractor -f csv -o "translations.csv"     # 구글 시트용 CSV 형식으로 출력
  i18n-extractor --dry-run                        # 추출 결과 미리보기
  i18n-extractor --library react-i18next          # react-i18next용 타입 생성
  i18n-extractor --static-key-extraction aggressive # 정적 const 객체/배열까지 적극 추출
  
Features:
  - t() 함수 호출에서 번역 키 자동 추출
  - JSON: core v4 권장 네임스페이스 구조 생성 (locales/[namespace]/[lang].json)
  - 기본 모드: 기존 번역 유지하며 새 키만 추가
  - Force 모드: 모든 번역을 새로 추출된 키로 덮어씀
  - CSV: 언어 설정 순서에 맞는 구글 시트 호환 형식 출력
  - 중복 키 감지 및 보고
  - i18nexus core v4용 locales/index.ts 및 타입 자동 생성
      `);
      process.exit(0);
      break;
    default:
      console.error(`Unknown option: ${args[i]}`);
      process.exit(1);
  }
}

runTranslationExtractor(config).catch((error) => {
  console.error("❌ Translation extraction failed:", error);
  process.exit(1);
});
