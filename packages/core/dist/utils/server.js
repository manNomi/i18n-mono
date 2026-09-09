/** Next.js App Router 서버 컴포넌트용 유틸리티 */
import * as fs from "fs";
import * as path from "path";
import { inferNamespaceFromCallSite } from "./callsite-inference.js";
import { getCachedTranslations, cacheTranslations, invalidateCache as invalidateTranslationCache, } from "./translation-cache.js";
import { createFormatter } from "./formatter.js";
import { createTranslation } from "./pure-translation.js";
export { createFormatter } from "./formatter.js";
const UNSUPPORTED_SERVER_CONFIG_FILES = [
    "i18nexus.config.js",
    "i18nexus.config.mjs",
    "i18nexus.config.cjs",
    "i18nexus.config.ts",
];
let hasWarnedUnsupportedServerConfig = false;
function warnUnsupportedServerConfig(configPath) {
    if (hasWarnedUnsupportedServerConfig) {
        return;
    }
    hasWarnedUnsupportedServerConfig = true;
    console.warn(`[i18nexus] ${path.basename(configPath)} is ignored by i18nexus/server to avoid Next.js dynamic import warnings. Use i18nexus.config.json or pass getTranslation() options instead.`);
}
/** 프로젝트 루트에서 i18nexus 설정 파일 로드 (조용히) - config 디렉토리 경로도 반환 */
async function loadConfigSilently() {
    try {
        const configPath = path.resolve(process.cwd(), "i18nexus.config.json");
        if (fs.existsSync(configPath)) {
            const raw = await fs.promises.readFile(configPath, "utf8");
            try {
                const config = JSON.parse(raw);
                return { config, configDir: path.dirname(configPath) };
            }
            catch {
                return { config: null, configDir: process.cwd() };
            }
        }
        // Server utilities intentionally avoid importing JS/TS config files.
        // Expression-based dynamic imports trigger Next.js bundler warnings.
        const unsupportedConfigPath = UNSUPPORTED_SERVER_CONFIG_FILES.map((fileName) => path.resolve(process.cwd(), fileName)).find((candidate) => fs.existsSync(candidate));
        if (unsupportedConfigPath) {
            warnUnsupportedServerConfig(unsupportedConfigPath);
        }
        return { config: null, configDir: process.cwd() };
    }
    catch {
        return { config: null, configDir: process.cwd() };
    }
}
/** Accept-Language 헤더 파싱하여 가장 적합한 언어 반환 */
export function parseAcceptLanguage(acceptLanguage, availableLanguages) {
    if (!acceptLanguage || !availableLanguages.length) {
        return null;
    }
    const languages = acceptLanguage
        .split(",")
        .map((lang) => {
        const parts = lang.trim().split(";");
        const code = parts[0].toLowerCase();
        const quality = parts[1] ? parseFloat(parts[1].split("=")[1]) : 1.0;
        return { code, quality };
    })
        .sort((a, b) => b.quality - a.quality);
    for (const { code } of languages) {
        if (availableLanguages.includes(code)) {
            return code;
        }
        const primaryLang = code.split("-")[0];
        if (availableLanguages.includes(primaryLang)) {
            return primaryLang;
        }
        const match = availableLanguages.find((lang) => lang.toLowerCase().startsWith(primaryLang));
        if (match) {
            return match;
        }
    }
    return null;
}
/** 서버 컴포넌트에서 쿠키/헤더로 언어 감지 */
export function getServerLanguage(headers, options) {
    const cookieName = options?.cookieName || "i18n-language";
    const defaultLanguage = options?.defaultLanguage || "en";
    const availableLanguages = options?.availableLanguages || [];
    const cookieHeader = headers.get("cookie");
    if (cookieHeader) {
        const cookies = cookieHeader.split(";");
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (decodeURIComponent(name) === cookieName) {
                const cookieLanguage = decodeURIComponent(value);
                if (availableLanguages.length === 0 ||
                    availableLanguages.includes(cookieLanguage)) {
                    return cookieLanguage;
                }
            }
        }
    }
    if (availableLanguages.length > 0) {
        const acceptLanguage = headers.get("accept-language");
        if (acceptLanguage) {
            const detectedLang = parseAcceptLanguage(acceptLanguage, availableLanguages);
            if (detectedLang) {
                return detectedLang;
            }
        }
    }
    return defaultLanguage;
}
/** 쿠키 헤더 문자열 파싱 */
export function parseCookies(cookieHeader) {
    if (!cookieHeader) {
        return {};
    }
    const cookies = {};
    const cookieArray = cookieHeader.split(";");
    for (const cookie of cookieArray) {
        const [name, value] = cookie.trim().split("=");
        if (name && value) {
            cookies[decodeURIComponent(name)] = decodeURIComponent(value);
        }
    }
    return cookies;
}
function isStringRecord(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    return Object.values(value).every((item) => typeof item === "string");
}
function isLanguageCodeKey(key) {
    return /^[a-z]{2}(?:-[a-z0-9]{2,})?$/i.test(key);
}
function getFirstStringRecord(value) {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    for (const nested of Object.values(value)) {
        if (isStringRecord(nested)) {
            return nested;
        }
    }
    return undefined;
}
/** 서버 컴포넌트용 번역 함수 생성 */
export function createServerTranslation(language, translations, options = {}) {
    return createTranslation(language, translations, {
        ...options,
        onMissingKey: (key, dictionary) => {
            if (process.env.NODE_ENV === "development") {
                console.warn(`[i18nexus] Translation key not found: "${key}". Available keys: ${Object.keys(dictionary).slice(0, 5).join(", ")}...`);
            }
        },
    });
}
/** 타입 안전한 서버 번역 객체 반환 */
export function getServerTranslations(language, translations) {
    const entries = Object.entries(translations);
    if (entries.length === 0) {
        return {};
    }
    // 1) Legacy language map: { en: {...}, ko: {...} }
    const directLanguage = translations[language];
    if (isStringRecord(directLanguage)) {
        return { ...directLanguage };
    }
    const flatStringEntries = entries.filter(([, value]) => isStringRecord(value));
    const allKeysLookLikeLanguageCodes = flatStringEntries.length > 0 &&
        flatStringEntries.every(([key]) => isLanguageCodeKey(key));
    if (allKeysLookLikeLanguageCodes) {
        const english = translations["en"];
        if (isStringRecord(english)) {
            return { ...english };
        }
        const firstLanguage = flatStringEntries[0]?.[1];
        return isStringRecord(firstLanguage) ? { ...firstLanguage } : {};
    }
    // 2) Namespace + language map: { common: { en: {...}, ko: {...} }, ... }
    const mergedByNamespace = {};
    let hasNamespacedLanguageData = false;
    for (const [, value] of entries) {
        if (!value || typeof value !== "object") {
            continue;
        }
        const namespaceLangMap = value;
        const langDict = namespaceLangMap[language];
        const fallbackDict = namespaceLangMap["en"];
        const firstDict = getFirstStringRecord(namespaceLangMap);
        const selected = isStringRecord(langDict)
            ? langDict
            : isStringRecord(fallbackDict)
                ? fallbackDict
                : firstDict;
        if (selected) {
            hasNamespacedLanguageData = true;
            Object.assign(mergedByNamespace, selected);
        }
    }
    if (hasNamespacedLanguageData) {
        return mergedByNamespace;
    }
    // 3) Namespace flat map: { common: {...}, menu: {...} }
    const mergedFlat = {};
    for (const [, value] of flatStringEntries) {
        Object.assign(mergedFlat, value);
    }
    return mergedFlat;
}
async function readJsonFile(filePath) {
    try {
        const fileContent = await fs.promises.readFile(filePath, "utf8");
        return JSON.parse(fileContent);
    }
    catch (error) {
        console.warn(`Failed to load translation file ${filePath}:`, error);
        return null;
    }
}
/** 디렉토리에서 번역 JSON 파일 로드 */
export async function loadTranslations(localesDir) {
    const resolvedLocalesDir = localesDir.startsWith("/")
        ? localesDir
        : path.resolve(process.cwd(), localesDir);
    if (!fs.existsSync(resolvedLocalesDir)) {
        return {};
    }
    const translations = {};
    const entries = await fs.promises.readdir(resolvedLocalesDir, {
        withFileTypes: true,
    });
    for (const entry of entries) {
        const entryPath = path.join(resolvedLocalesDir, entry.name);
        if (entry.isFile() && entry.name.endsWith(".json")) {
            const language = path.basename(entry.name, ".json");
            const data = await readJsonFile(entryPath);
            if (data) {
                translations[language] = data;
            }
            continue;
        }
        if (!entry.isDirectory()) {
            continue;
        }
        const languageFiles = await fs.promises.readdir(entryPath, {
            withFileTypes: true,
        });
        const namespaceTranslations = {};
        for (const languageFile of languageFiles) {
            if (!languageFile.isFile() || !languageFile.name.endsWith(".json")) {
                continue;
            }
            const language = path.basename(languageFile.name, ".json");
            const data = await readJsonFile(path.join(entryPath, languageFile.name));
            if (data) {
                namespaceTranslations[language] = data;
            }
        }
        if (Object.keys(namespaceTranslations).length > 0) {
            translations[entry.name] = namespaceTranslations;
        }
    }
    return translations;
}
async function readNamespaceTranslationFile(resolvedLocalesDir, namespace, language) {
    const translationFilePath = path.join(resolvedLocalesDir, namespace, `${language}.json`);
    if (!fs.existsSync(translationFilePath)) {
        throw new Error(`File not found: ${translationFilePath}`);
    }
    const fileContent = await fs.promises.readFile(translationFilePath, "utf8");
    return JSON.parse(fileContent);
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
export async function getTranslation(namespace, options) {
    // 1. Load config (with config directory path)
    let config;
    let configDir;
    try {
        const result = await loadConfigSilently();
        config = result.config;
        configDir = result.configDir;
    }
    catch {
        config = null;
        configDir = process.cwd();
    }
    const localesDir = options?.localesDir || config?.localesDir || "./locales";
    // config 파일 위치를 기준으로 locales 경로 계산 (더 안정적)
    const resolvedLocalesDir = localesDir.startsWith("/")
        ? localesDir
        : path.resolve(configDir, localesDir);
    const defaultLanguage = options?.defaultLanguage || config?.defaultLanguage || "en";
    const cookieName = options?.cookieName || "i18n-language";
    const availableLanguages = options?.availableLanguages || [];
    // 2. Get current language
    let language;
    // If language is explicitly provided, use it (for static export or dynamic routes)
    if (options?.language) {
        language = options.language;
    }
    else {
        // Otherwise, detect from headers
        let headersInstance;
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const { headers } = await import("next/headers");
            headersInstance = await headers();
        }
        catch {
            headersInstance = new Headers();
        }
        language = getServerLanguage(headersInstance, {
            cookieName,
            defaultLanguage,
            availableLanguages,
        });
    }
    // 3. Determine namespace (priority order)
    let resolvedNamespace = namespace;
    // Try automatic inference if no namespace provided
    if (!resolvedNamespace && !options?.disableAutoInference) {
        try {
            const inferred = inferNamespaceFromCallSite(config);
            if (inferred) {
                resolvedNamespace = inferred;
            }
        }
        catch (error) {
            // Inference failed, continue to fallback
            console.warn("⚠️  Failed to infer namespace from call site:", error);
        }
    }
    // Fallback to config.fallbackNamespace
    if (!resolvedNamespace && config?.fallbackNamespace) {
        resolvedNamespace = config.fallbackNamespace;
    }
    // Final fallback to "common"
    if (!resolvedNamespace) {
        resolvedNamespace = "common";
    }
    // 4. Check cache first
    if (!options?.disableCache) {
        const cached = getCachedTranslations(resolvedNamespace, language);
        if (cached) {
            const t = createServerTranslation(language, cached, {
                messageFormatter: options?.messageFormatter,
            });
            const dict = getServerTranslations(language, cached);
            return {
                t,
                format: createFormatter(language),
                language,
                lng: language,
                namespace: resolvedNamespace,
                translations: cached,
                dict,
            };
        }
    }
    // 5. Load translations
    let translations;
    try {
        const translationData = await readNamespaceTranslationFile(resolvedLocalesDir, resolvedNamespace, language);
        translations = {};
        if (config?.fallbackNamespace &&
            config.fallbackNamespace !== resolvedNamespace) {
            try {
                const fallbackData = await readNamespaceTranslationFile(resolvedLocalesDir, config.fallbackNamespace, language);
                translations[config.fallbackNamespace] = fallbackData;
            }
            catch (fallbackError) {
                if (process.env.NODE_ENV === "development") {
                    console.warn(`[i18nexus] Failed to load fallback namespace '${config.fallbackNamespace}':`, fallbackError);
                }
            }
        }
        translations[resolvedNamespace] = translationData;
        // 디버깅: 개발 환경에서 번역 파일 로드 확인
        if (process.env.NODE_ENV === "development") {
            const keyCount = Object.keys(translationData).length;
            console.log(`[i18nexus] Loaded ${keyCount} translations for namespace '${resolvedNamespace}'`);
        }
    }
    catch (error) {
        // Handle namespace not found
        if (options?.useFallbackOnError &&
            config?.fallbackNamespace &&
            config.fallbackNamespace !== resolvedNamespace) {
            console.warn(`⚠️  Namespace '${resolvedNamespace}' not found, using fallback '${config.fallbackNamespace}'`);
            try {
                const fallbackData = await readNamespaceTranslationFile(resolvedLocalesDir, config.fallbackNamespace, language);
                translations = {
                    [config.fallbackNamespace]: fallbackData,
                };
                resolvedNamespace = config.fallbackNamespace;
            }
            catch (fallbackError) {
                throw new Error(`Failed to load namespace '${resolvedNamespace}' and fallback '${config.fallbackNamespace}':\n` +
                    `  Primary error: ${error}\n` +
                    `  Fallback error: ${fallbackError}\n\n` +
                    `Please ensure the namespace files exist at:\n` +
                    `  - ${resolvedLocalesDir}/${resolvedNamespace}/${language}.json\n` +
                    `  - ${resolvedLocalesDir}/${config.fallbackNamespace}/${language}.json`);
            }
        }
        else {
            throw new Error(`Failed to load namespace '${resolvedNamespace}' for language '${language}':\n` +
                `  Error: ${error}\n\n` +
                `Please ensure the file exists at:\n` +
                `  ${resolvedLocalesDir}/${resolvedNamespace}/${language}.json\n\n` +
                `Tips:\n` +
                `  - Run 'npx i18n-extractor' to generate translation files\n` +
                `  - Check that the namespace name matches your folder structure\n` +
                `  - Set fallbackNamespace in i18nexus.config.json for automatic fallback`);
        }
    }
    // 6. Cache translations
    if (!options?.disableCache) {
        cacheTranslations(resolvedNamespace, language, translations);
    }
    // 7. Create translation function
    const t = createServerTranslation(language, translations, {
        messageFormatter: options?.messageFormatter,
    });
    const dict = getServerTranslations(language, translations);
    return {
        t,
        format: createFormatter(language),
        language,
        lng: language,
        namespace: resolvedNamespace,
        translations,
        dict,
    };
}
/**
 * Invalidate translation cache
 * Useful for development or when translations are updated
 */
export function invalidateCache(namespace, language) {
    invalidateTranslationCache(namespace, language);
}
/** 미리 로드된 번역으로 서버 i18n 컨텍스트 생성 */
export function createServerI18nWithTranslations(headers, translations, options) {
    const language = getServerLanguage(headers, options);
    const t = createServerTranslation(language, translations, {
        messageFormatter: options?.messageFormatter,
    });
    const dict = getServerTranslations(language, translations);
    return {
        t,
        format: createFormatter(language),
        language,
        translations,
        dict,
    };
}
//# sourceMappingURL=server.js.map