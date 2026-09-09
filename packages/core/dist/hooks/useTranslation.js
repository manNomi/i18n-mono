"use client";
import React from "react";
import { useI18nContext, } from "../components/I18nProvider.js";
import { createFormatter, } from "../utils/formatter.js";
import { getNamespaceReadiness, resolveTranslationReady, resolveTranslationSnapshot, shouldLoadNamespace, translateRichFromSnapshot, translateFromSnapshot, } from "../utils/translation-runtime.js";
// 실제 구현
export function useTranslation(namespace) {
    const context = useI18nContext();
    const { currentLanguage, isLoading, loadedNamespaces, loadingNamespaces, ensureNamespaceLoaded, fallbackNamespace, namespaceTranslations, languageManager, lazy, messageFormatter, } = context;
    const staticTranslations = namespaceTranslations;
    const fallbackLanguage = languageManager.getDefaultLanguage();
    const { hasStaticNamespace, isNamespaceLoaded, isNamespaceLoading, isNamespaceReady, } = React.useMemo(() => getNamespaceReadiness({
        namespace,
        staticTranslations,
        loadedNamespaces,
        loadingNamespaces,
    }), [namespace, staticTranslations, loadedNamespaces, loadingNamespaces]);
    React.useEffect(() => {
        if (!namespace ||
            !shouldLoadNamespace({
                namespace,
                lazy,
                hasStaticNamespace,
                isNamespaceLoaded,
            })) {
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
    const currentTranslations = React.useMemo(() => resolveTranslationSnapshot({
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
    }), [
        namespace,
        staticTranslations,
        currentLanguage,
        fallbackLanguage,
        fallbackNamespace,
        loadedNamespaces,
    ]);
    const translate = React.useMemo(() => {
        const t = ((key, variables, styles) => {
            return translateFromSnapshot(currentTranslations, key, variables, styles, {
                messageFormatter,
                locale: currentLanguage,
            });
        });
        t.rich = (key, variables) => {
            return translateRichFromSnapshot(currentTranslations, key, variables, {
                messageFormatter,
                locale: currentLanguage,
            });
        };
        return t;
    }, [currentTranslations, currentLanguage, messageFormatter]);
    const format = React.useMemo(() => createFormatter(currentLanguage), [currentLanguage]);
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
/** 언어 전환 기능 접근 훅 */
export const useLanguageSwitcher = () => {
    const { currentLanguage, changeLanguage, availableLanguages, languageManager, isLoading, } = useI18nContext();
    const switchLanguage = (direction) => {
        const languageCodes = availableLanguages.map((lang) => lang.code);
        if (languageCodes.length === 0) {
            return Promise.resolve();
        }
        const currentIndex = languageCodes.indexOf(currentLanguage);
        const targetIndex = currentIndex < 0
            ? direction === 1
                ? 0
                : languageCodes.length - 1
            : (currentIndex + direction + languageCodes.length) %
                languageCodes.length;
        return changeLanguage(languageCodes[targetIndex]);
    };
    const getLanguageConfig = (code) => {
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
//# sourceMappingURL=useTranslation.js.map