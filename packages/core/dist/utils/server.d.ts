/** Next.js App Router 서버 컴포넌트용 유틸리티 */
import { type I18nFormatter } from "./formatter.js";
import { getTranslationDictionary } from "./pure-translation.js";
import type { MessageFormatter } from "./message-formatter.js";
export { createFormatter } from "./formatter.js";
export type { I18nFormatter } from "./formatter.js";
export { getServerLanguage, parseAcceptLanguage, parseCookies, } from "./locale-negotiation.js";
export type { LanguageNegotiationOptions } from "./locale-negotiation.js";
/** 서버 번역에서 사용하는 변수 타입 */
export type ServerTranslationVariables = Record<string, string | number>;
export interface ServerTranslationOptions {
    messageFormatter?: MessageFormatter;
}
/** 서버 컴포넌트용 번역 함수 생성 */
export declare function createServerTranslation(language: string, translations: Record<string, unknown>, options?: ServerTranslationOptions): (key: string, variables?: ServerTranslationVariables | string, fallback?: string) => string;
/** 타입 안전한 서버 번역 객체 반환 */
export declare const getServerTranslations: typeof getTranslationDictionary;
/** 디렉토리에서 번역 JSON 파일 로드 */
export declare function loadTranslations(localesDir: string): Promise<Record<string, Record<string, string>>>;
/** 서버 번역 컨텍스트 생성 (설정 자동 로드, 헤더 자동 감지) */
export interface GetTranslationOptions {
    /** Force specific language (bypasses header/cookie detection) */
    language?: string;
    localesDir?: string;
    cookieName?: string;
    defaultLanguage?: string;
    availableLanguages?: string[];
    /** Disable automatic namespace inference */
    disableAutoInference?: boolean;
    /** Use fallback namespace on error */
    useFallbackOnError?: boolean;
    /** Disable caching (useful for development) */
    disableCache?: boolean;
    /** Optional runtime-neutral formatter for ICU-capable translation catalogs */
    messageFormatter?: MessageFormatter;
}
export interface GetTranslationReturn<NS extends string = string, K extends string = string> {
    /** Type-safe translation function */
    t: (key: K, variables?: Record<string, string | number>, fallback?: string) => string;
    /** Formatter bound to the resolved language */
    format: I18nFormatter;
    /** Current language */
    language: string;
    /** Language alias (react-i18next compatibility) */
    lng: string;
    /** Current namespace */
    namespace: NS;
    /** Translations object */
    translations: Record<string, Record<string, string>>;
    /** Current language dictionary */
    dict: Record<string, string>;
}
/**
 * Get server-side translation function with namespace support
 *
 * Features:
 * - Automatic namespace inference from file path
 * - Falls back to config.fallbackNamespace if inference fails
 * - Translation caching for performance
 * - Clear error messages
 *
 * @example
 * ```tsx
 * // Automatic namespace inference
 * export default async function Page() {
 *   const { t } = await getTranslation();
 *   return <h1>{t("title")}</h1>;
 * }
 *
 * // Explicit namespace
 * export default async function Page() {
 *   const { t } = await getTranslation<"home">("home");
 *   return <h1>{t("title")}</h1>;
 * }
 * ```
 */
export declare function getTranslation<NS extends string = string, K extends string = string>(namespace?: NS, options?: GetTranslationOptions): Promise<GetTranslationReturn<NS, K>>;
/**
 * Invalidate translation cache
 * Useful for development or when translations are updated
 */
export declare function invalidateCache(namespace?: string, language?: string): void;
/** 미리 로드된 번역으로 서버 i18n 컨텍스트 생성 */
export declare function createServerI18nWithTranslations(headers: Headers, translations: Record<string, Record<string, string>>, options?: {
    cookieName?: string;
    defaultLanguage?: string;
    availableLanguages?: string[];
    messageFormatter?: MessageFormatter;
}): {
    t: (key: string, variables?: ServerTranslationVariables | string, fallback?: string) => string;
    format: I18nFormatter;
    language: string;
    translations: Record<string, Record<string, string>>;
    dict: Record<string, string>;
};
//# sourceMappingURL=server.d.ts.map