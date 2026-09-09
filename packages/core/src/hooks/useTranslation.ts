"use client";

import React from "react";
import {
  useI18nContext,
  NamespaceTranslations,
  ExtractNamespaceKeys,
  ExtractKeysWithFallback,
} from "../components/I18nProvider.js";
import type { LanguageConfig } from "../utils/languageManager.js";
import {
  createFormatter,
  type I18nFormatter,
} from "../utils/formatter.js";
import {
  getNamespaceReadiness,
  resolveTranslationReady,
  resolveTranslationSnapshot,
  shouldLoadNamespace,
  translateRichFromSnapshot,
  translateFromSnapshot,
  type RuntimeNamespaceTranslations,
  type TranslationStyles,
  type TranslationVariables,
} from "../utils/translation-runtime.js";

export type {
  TranslationVariables,
  TranslationStyles,
  VariableStyle,
} from "../utils/translation-runtime.js";

export type TranslationRichValues = Record<string, unknown>;

/** 타입 안전한 번역 함수 오버로드 */
export interface TranslationFunction<K extends string = string> {
  /** 스타일 포함 번역 (React 요소 반환) */
  (
    key: K,
    variables: TranslationVariables,
    styles: TranslationStyles
  ): React.ReactElement;

  /** 스타일 없는 번역 (문자열 반환) */
  (key: K, variables?: TranslationVariables): string;
}

export interface TranslationFunctionWithRich<
  K extends string = string,
> extends TranslationFunction<K> {
  /** ICU 태그 콜백을 포함한 rich text 번역 */
  rich(key: K, variables?: TranslationRichValues): React.ReactNode;
}

/** useTranslation 훅 반환 타입 */
export interface UseTranslationReturn<K extends string = string> {
  /** 타입 가드가 있는 번역 함수 (스타일 제공 시 React 요소, 없으면 문자열) */
  t: TranslationFunctionWithRich<K>;
  /** 현재 언어용 native Intl formatter */
  format: I18nFormatter;
  /** 현재 언어 코드 */
  currentLanguage: string;
  /** 현재 언어 코드 (react-i18next 호환성을 위한 별칭) */
  lng: string;
  /** 번역 준비 여부 */
  isReady: boolean;
}

/** 번역 함수 및 현재 언어 접근 훅 (오버로드) */
// 오버로드 1: 타입 명시 없이 사용 (기본 동작, 하위 호환성)
export function useTranslation<K extends string = string>(
  namespace?: string
): UseTranslationReturn<K>;

// 오버로드 2: Context에서 타입 자동 추론 (v3.1 신기능)
export function useTranslation<
  TTranslations extends NamespaceTranslations,
  NS extends keyof TTranslations & string,
  Fallback extends keyof TTranslations & string = never,
>(
  namespace: NS
): UseTranslationReturn<
  [Fallback] extends [never]
    ? ExtractNamespaceKeys<TTranslations, NS>
    : ExtractKeysWithFallback<TTranslations, NS, Fallback>
>;

// 실제 구현
export function useTranslation(
  namespace?: string
): UseTranslationReturn<string> {
  const context = useI18nContext();
  const {
    currentLanguage,
    isLoading,
    loadedNamespaces,
    loadingNamespaces,
    ensureNamespaceLoaded,
    fallbackNamespace,
    namespaceTranslations,
    languageManager,
    lazy,
    messageFormatter,
  } = context;

  const staticTranslations =
    namespaceTranslations as RuntimeNamespaceTranslations;
  const fallbackLanguage = languageManager.getDefaultLanguage();
  const {
    hasStaticNamespace,
    isNamespaceLoaded,
    isNamespaceLoading,
    isNamespaceReady,
  } = React.useMemo(
    () =>
      getNamespaceReadiness({
        namespace,
        staticTranslations,
        loadedNamespaces,
        loadingNamespaces,
      }),
    [namespace, staticTranslations, loadedNamespaces, loadingNamespaces]
  );

  React.useEffect(() => {
    if (
      !namespace ||
      !shouldLoadNamespace({
        namespace,
        lazy,
        hasStaticNamespace,
        isNamespaceLoaded,
      })
    ) {
      return;
    }

    void ensureNamespaceLoaded(namespace).catch(() => undefined);
  }, [
    namespace,
    lazy,
    hasStaticNamespace,
    isNamespaceLoaded,
    ensureNamespaceLoaded,
  ]);

  const currentTranslations = React.useMemo(
    () =>
      resolveTranslationSnapshot({
        namespace,
        staticTranslations,
        currentLanguage,
        fallbackLanguage,
        fallbackNamespace: fallbackNamespace
          ? String(fallbackNamespace)
          : undefined,
        loadedNamespaces,
        staticResolutionMode: "namespace",
        staticMergeMode: "when-empty",
      }),
    [
      namespace,
      staticTranslations,
      currentLanguage,
      fallbackLanguage,
      fallbackNamespace,
      loadedNamespaces,
    ]
  );

  const translate = React.useMemo(() => {
    const t = ((
      key: string,
      variables?: TranslationVariables,
      styles?: TranslationStyles
    ): string | React.ReactElement => {
      return translateFromSnapshot(
        currentTranslations,
        key,
        variables,
        styles,
        {
          messageFormatter,
          locale: currentLanguage,
        }
      );
    }) as TranslationFunctionWithRich<string>;

    t.rich = (key: string, variables?: TranslationRichValues) => {
      return translateRichFromSnapshot(currentTranslations, key, variables, {
        messageFormatter,
        locale: currentLanguage,
      }) as React.ReactNode;
    };

    return t;
  }, [currentTranslations, currentLanguage, messageFormatter]);
  const format = React.useMemo(
    () => createFormatter(currentLanguage),
    [currentLanguage]
  );

  return {
    t: translate,
    format,
    currentLanguage,
    lng: currentLanguage, // Alias for react-i18next compatibility
    isReady: resolveTranslationReady({
      isLoading,
      isNamespaceLoading,
      isNamespaceReady,
    }),
  };
}

/** useLanguageSwitcher 훅 반환 타입 */
export interface UseLanguageSwitcherReturn<TLanguage extends string = string> {
  /** 현재 언어 코드 */
  currentLanguage: string;
  /** 사용 가능한 언어 설정 목록 */
  availableLanguages: LanguageConfig[];
  /** 언어 변경 */
  changeLanguage: (lang: TLanguage) => Promise<void>;
  /** changeLanguage 별칭 */
  switchLng: (lang: TLanguage) => Promise<void>;
  /** 다음 언어로 전환 */
  switchToNextLanguage: () => Promise<void>;
  /** 이전 언어로 전환 */
  switchToPreviousLanguage: () => Promise<void>;
  /** 언어 설정 조회 */
  getLanguageConfig: (code?: TLanguage) => LanguageConfig | undefined;
  /** 브라우저 언어 감지 */
  detectBrowserLanguage: () => string | null;
  /** 기본 언어로 리셋 */
  resetLanguage: () => void;
  /** 언어 변경 중 여부 */
  isLoading: boolean;
}

/** 언어 전환 기능 접근 훅 */
export const useLanguageSwitcher = <
  TLanguage extends string = string,
>(): UseLanguageSwitcherReturn<TLanguage> => {
  const {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    languageManager,
    isLoading,
  } = useI18nContext();

  const switchLanguage = (direction: 1 | -1): Promise<void> => {
    const languageCodes = availableLanguages.map((lang) => lang.code);
    if (languageCodes.length === 0) {
      return Promise.resolve();
    }
    const currentIndex = languageCodes.indexOf(currentLanguage);
    const targetIndex =
      currentIndex < 0
        ? direction === 1
          ? 0
          : languageCodes.length - 1
        : (currentIndex + direction + languageCodes.length) %
          languageCodes.length;
    return changeLanguage(languageCodes[targetIndex]);
  };

  const getLanguageConfig = (code?: string) => {
    return languageManager.getLanguageConfig(code || currentLanguage);
  };

  const detectBrowserLanguage = () => {
    return languageManager.detectBrowserLanguage();
  };

  const resetLanguage = () => {
    languageManager.reset();
  };

  return {
    currentLanguage,
    availableLanguages,
    changeLanguage,
    switchLng: changeLanguage,
    switchToNextLanguage: () => switchLanguage(1),
    switchToPreviousLanguage: () => switchLanguage(-1),
    getLanguageConfig,
    detectBrowserLanguage,
    resetLanguage,
    isLoading,
  };
};
