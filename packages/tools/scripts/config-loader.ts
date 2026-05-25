#!/usr/bin/env node

import * as fs from "fs";
import * as pathLib from "path";
import {
  COMMON_DEFAULTS,
  GOOGLE_SHEETS_DEFAULTS,
} from "./common/default-config";

export interface I18nexusConfig {
  languages: string[];
  defaultLanguage: string;
  localesDir: string;
  sourcePattern: string;
  translationImportSource: string;
  /**
   * 번역 함수 모드 (기능적 선택)
   * - 'client': useTranslation() 사용
   * - 'server': getServerTranslation() 사용
   * - 생략 시 기존 판단 로직 유지
   *
   * ⚠️ 주의: 이 옵션은 번역 함수 선택만 담당합니다.
   * "use client" 디렉티브는 framework 옵션과 함께 결정됩니다.
   */
  mode?: "client" | "server";
  /**
   * 프레임워크 타입
   * - 'nextjs': Next.js App Router 환경
   *   → mode="client"일 때 "use client" 디렉티브 자동 추가
   * - 'react': React 일반 환경 (Vite, CRA 등)
   *   → "use client" 디렉티브 추가 안 함
   * - 'other' 또는 미지정: 프레임워크 감지 안 함
   *   → "use client" 디렉티브 추가 안 함
   */
  framework?: "nextjs" | "react" | "other";
  /**
   * 서버 변환 시 사용할 함수명 (라이브러리별 상이)
   * 예: "getServerTranslation", "getServerT" 등
   */
  serverTranslationFunction?: string;
  googleSheets?: {
    spreadsheetId: string;
    credentialsPath: string;
    sheetName: string;
  };
  /**
   * 네임스페이스 자동화 설정
   */
  namespacing?: {
    enabled: boolean;
    basePath: string; // 페이지/라우트의 기준이 되는 폴더 (예: "src/app", "src/pages")
    defaultNamespace: string; // basePath 외부 파일의 기본 네임스페이스 (예: "common")
    framework?:
      | "nextjs-app"
      | "nextjs-pages"
      | "tanstack-file"
      | "tanstack-folder"
      | "react-router"
      | "remix"
      | "other";
    ignorePatterns?: string[]; // 사용자 정의 무시 패턴 (정규식)
    /**
     * 네임스페이스 추론 전략
     * - "first-folder": 첫 번째 폴더명만 사용 (기본값)
     *   예: gallery/folder/page.tsx → "gallery"
     * - "full-path": 전체 경로를 kebab-case로 변환
     *   예: gallery/folder/page.tsx → "gallery-folder"
     * - "last-folder": 마지막 폴더명 사용
     *   예: gallery/folder/page.tsx → "folder"
     */
    strategy?: "first-folder" | "full-path" | "last-folder";
  };
  /**
   * 네임스페이스 위치 설정 (간편 설정)
   * 이 위치의 최상위 폴더가 네임스페이스가 됩니다.
   * @example "/src/pages" - pages 하위의 최상위 폴더가 네임스페이스가 됩니다.
   * @example "src/app/(routes)" - (routes) 하위의 최상위 폴더가 네임스페이스가 됩니다.
   *
   * 이 옵션이 설정되면 namespacing.basePath로 자동 변환됩니다.
   */
  namespaceLocation?: string;
  /**
   * Fallback 네임스페이스 설정
   * createI18n에서 네임스페이스를 지정하지 않을 때 사용할 기본 네임스페이스
   * @example "common"
   */
  fallbackNamespace?: string;
  /**
   * 네임스페이스 구조 사용 여부
   * true: 네임스페이스별 폴더 구조 (locales/common/en.json, locales/home/en.json)
   * false: 플랫 구조 (locales/en.json, locales/ko.json)
   * @default true (useI18nexusLibrary가 true일 때), false (useI18nexusLibrary가 false일 때)
   */
  useNamespaceStructure?: boolean;
  /**
   * 네임스페이스 전략
   * - "full": 완전히 분리된 네임스페이스 (페이지별 + 기능별)
   * - "page-based": 페이지 기반으로만 분리, 나머지는 common에 통합
   * - "single": 모든 번역을 하나의 파일(common)에 통합
   * @default "full"
   */
  namespaceStrategy?: "full" | "page-based" | "single";
  /**
   * i18n-type 실행 시 번역 완전성 엄격 검증 활성화 여부
   * true일 경우 언어별 key 누락 또는 빈 문자열 value가 있으면 타입 생성을 실패시킵니다.
   * @default false
   */
  strictTypeGeneration?: boolean;
}

const DEFAULT_CONFIG: I18nexusConfig = {
  languages: [...COMMON_DEFAULTS.languages],
  defaultLanguage: COMMON_DEFAULTS.defaultLanguage,
  localesDir: COMMON_DEFAULTS.localesDir,
  sourcePattern: COMMON_DEFAULTS.sourcePattern,
  translationImportSource: COMMON_DEFAULTS.translationImportSource,
  mode: undefined,
  serverTranslationFunction: "getServerTranslation",
  googleSheets: {
    spreadsheetId: GOOGLE_SHEETS_DEFAULTS.spreadsheetId,
    credentialsPath: GOOGLE_SHEETS_DEFAULTS.credentialsPath,
    sheetName: GOOGLE_SHEETS_DEFAULTS.sheetName,
  },
  useNamespaceStructure: true,
  strictTypeGeneration: false,
};

function isHelpOrVersionCommand(): boolean {
  return process.argv.some((arg) =>
    ["--help", "-h", "--version", "-v", "-V"].includes(arg),
  );
}

/**
 * i18nexus.config.json 파일을 로드합니다.
 * 파일이 없으면 기본 설정을 반환합니다.
 */
export function loadConfig(
  configPath: string = "i18nexus.config.json",
  options?: { silent?: boolean },
): I18nexusConfig {
  const absolutePath = pathLib.resolve(process.cwd(), configPath);
  const shouldLog = !options?.silent && !isHelpOrVersionCommand();

  if (!fs.existsSync(absolutePath)) {
    if (shouldLog) {
      console.log(
        "⚠️  i18nexus.config.json not found, using default configuration",
      );
      console.log("💡 Run 'i18n-sheets init' to create a config file");
    }
    return DEFAULT_CONFIG;
  }

  try {
    // JSON 파일 로드
    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const config = JSON.parse(fileContent);

    // namespaceLocation이 설정되어 있으면 namespacing.basePath로 변환
    let finalConfig = { ...config };
    if (config.namespaceLocation) {
      finalConfig.namespacing = {
        enabled: true,
        basePath: config.namespaceLocation,
        defaultNamespace: config.namespacing?.defaultNamespace || "common",
        framework: config.namespacing?.framework || "nextjs-app",
        ignorePatterns: config.namespacing?.ignorePatterns || [],
        ...config.namespacing,
      };
    }

    // 기본값과 병합
    return {
      ...DEFAULT_CONFIG,
      ...finalConfig,
      googleSheets: {
        ...DEFAULT_CONFIG.googleSheets,
        ...(finalConfig.googleSheets || {}),
      },
    };
  } catch (error) {
    if (shouldLog) {
      console.warn(
        `⚠️  Failed to load ${configPath}, using default configuration:`,
        error,
      );
    }
    return DEFAULT_CONFIG;
  }
}

/**
 * i18nexus.config.json 파일을 조용히 로드합니다 (로그 출력 없음).
 * 서버 환경에서 사용하기 적합합니다.
 */
export function loadConfigSilently(
  configPath: string = "i18nexus.config.json",
): I18nexusConfig {
  return loadConfig(configPath, { silent: true });
}
