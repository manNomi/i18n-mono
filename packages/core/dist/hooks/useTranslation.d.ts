import React from "react";
import { NamespaceTranslations, ExtractNamespaceKeys, ExtractKeysWithFallback } from "../components/I18nProvider.js";
import type { LanguageConfig } from "../utils/languageManager.js";
import { type I18nFormatter } from "../utils/formatter.js";
import { type TranslationStyles, type TranslationVariables } from "../utils/translation-runtime.js";
export type TranslationRichValues = Record<string, unknown>;
export type { TranslationVariables, TranslationStyles, VariableStyle, } from "../utils/translation-runtime.js";
/** 타입 안전한 번역 함수 오버로드 */
export interface TranslationFunction<K extends string = string> {
    /** 스타일 포함 번역 (React 요소 반환) */
    (key: K, variables: TranslationVariables, styles: TranslationStyles): React.ReactElement;
    /** 스타일 없는 번역 (문자열 반환) */
    (key: K, variables?: TranslationVariables): string;
}
export interface TranslationFunctionWithRich<K extends string = string> extends TranslationFunction<K> {
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
export declare function useTranslation<K extends string = string>(namespace?: string): UseTranslationReturn<K>;
export declare function useTranslation<TTranslations extends NamespaceTranslations, NS extends keyof TTranslations & string, Fallback extends keyof TTranslations & string = never>(namespace: NS): UseTranslationReturn<[
    Fallback
] extends [never] ? ExtractNamespaceKeys<TTranslations, NS> : ExtractKeysWithFallback<TTranslations, NS, Fallback>>;
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
export declare const useLanguageSwitcher: () => UseLanguageSwitcherReturn;
//# sourceMappingURL=useTranslation.d.ts.map