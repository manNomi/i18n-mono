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
  getNamespaceReadiness,
  resolveTranslationReady,
  resolveTranslationSnapshot,
  shouldLoadNamespace,
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

/** 타입 안전한 번역 함수 오버로드 */
export interface TranslationFunction<K extends string = string> {
  /** 스타일 포함 번역 (React 요소 반환) */
  (
    key: K,
    variables: TranslationVariables,
    styles: TranslationStyles,
  ): React.ReactElement;

  /** 스타일 없는 번역 (문자열 반환) */
  (key: K, variables?: TranslationVariables): string;
}

/** useTranslation 훅 반환 타입 */
export interface UseTranslationReturn<K extends string = string> {
  /** 타입 가드가 있는 번역 함수 (스타일 제공 시 React 요소, 없으면 문자열) */
  t: TranslationFunction<K>;
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
  namespace?: string,
): UseTranslationReturn<K>;

// 오버로드 2: Context에서 타입 자동 추론 (v3.1 신기능)
export function useTranslation<
  TTranslations extends NamespaceTranslations,
  NS extends keyof TTranslations & string,
  Fallback extends keyof TTranslations & string = never,
>(
  namespace: NS,
): UseTranslationReturn<
  [Fallback] extends [never]
    ? ExtractNamespaceKeys<TTranslations, NS>
    : ExtractKeysWithFallback<TTranslations, NS, Fallback>
>;

// 실제 구현
export function useTranslation(namespace?: string): UseTranslationReturn<any> {
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
    [namespace, staticTranslations, loadedNamespaces, loadingNamespaces],
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

    void ensureNamespaceLoaded(namespace);
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
    ],
  );

  const translate = React.useCallback(
    ((
      key: string,
      variables?: TranslationVariables,
      styles?: TranslationStyles,
    ): string | React.ReactElement => {
      return translateFromSnapshot(currentTranslations, key, variables, styles);
    }) as TranslationFunction<string>,
    [currentTranslations],
  );

  return {
    t: translate,
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
export interface UseLanguageSwitcherReturn {
  /** 현재 언어 코드 */
  currentLanguage: string;
  /** 사용 가능한 언어 설정 목록 */
  availableLanguages: LanguageConfig[];
  /** 언어 변경 */
  changeLanguage: (lang: string) => Promise<void>;
  /** changeLanguage 별칭 */
  switchLng: (lang: string) => Promise<void>;
  /** 다음 언어로 전환 */
  switchToNextLanguage: () => Promise<void>;
  /** 이전 언어로 전환 */
  switchToPreviousLanguage: () => Promise<void>;
  /** 언어 설정 조회 */
  getLanguageConfig: (code?: string) => LanguageConfig | undefined;
  /** 브라우저 언어 감지 */
  detectBrowserLanguage: () => string | null;
  /** 기본 언어로 리셋 */
  resetLanguage: () => void;
  /** 언어 변경 중 여부 */
  isLoading: boolean;
}

/** 언어 전환 기능 접근 훅 */
export const useLanguageSwitcher = (): UseLanguageSwitcherReturn => {
  const {
    currentLanguage,
    changeLanguage,
    availableLanguages,
    languageManager,
    isLoading,
  } = useI18nContext();

  const switchToNextLanguage = async () => {
    const languageCodes = availableLanguages.map((lang) => lang.code);
    const currentIndex = languageCodes.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % languageCodes.length;
    const nextLanguage = languageCodes[nextIndex];
    await changeLanguage(nextLanguage);
  };

  const switchToPreviousLanguage = async () => {
    const languageCodes = availableLanguages.map((lang) => lang.code);
    const currentIndex = languageCodes.indexOf(currentLanguage);
    const prevIndex =
      currentIndex === 0 ? languageCodes.length - 1 : currentIndex - 1;
    const prevLanguage = languageCodes[prevIndex];
    await changeLanguage(prevLanguage);
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
    switchToNextLanguage,
    switchToPreviousLanguage,
    getLanguageConfig,
    detectBrowserLanguage,
    resetLanguage,
    isLoading,
  };
};
