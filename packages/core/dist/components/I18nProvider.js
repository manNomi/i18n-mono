"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { LanguageManager, } from "../utils/languageManager.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const I18nContext = React.createContext(null);
export const useI18nContext = () => {
    const context = React.useContext(I18nContext);
    if (!context) {
        throw new Error("useI18nContext must be used within an I18nProvider");
    }
    return context;
};
export function I18nProvider({ children, languageManagerOptions, translations = {}, onLanguageChange, initialLanguage, loadNamespace, fallbackNamespace, preloadNamespaces, messageFormatter, }) {
    // Lazy mode is automatically enabled if loadNamespace is provided
    const lazy = !!loadNamespace;
    const defaultTranslations = translations;
    const getInitialLanguage = () => {
        if (initialLanguage) {
            return initialLanguage;
        }
        return languageManagerOptions?.defaultLanguage || "en";
    };
    const [currentLanguage, setCurrentLanguage] = React.useState(getInitialLanguage());
    const onLanguageChangeRef = React.useRef(onLanguageChange);
    onLanguageChangeRef.current = onLanguageChange;
    const [{ languageManager, removeLanguageChangeListener }] = React.useState(() => {
        const manager = new LanguageManager(languageManagerOptions);
        const removeListener = manager.addLanguageChangeListener((language) => {
            setCurrentLanguage(language);
            onLanguageChangeRef.current?.(language);
        });
        return {
            languageManager: manager,
            removeLanguageChangeListener: removeListener,
        };
    });
    const [isLoading, setIsLoading] = React.useState(false);
    React.useEffect(() => removeLanguageChangeListener, [removeLanguageChangeListener]);
    // Lazy loading을 위한 로드된 네임스페이스 추적 (state로 변경하여 리렌더링 트리거)
    const [loadedNamespaces, setLoadedNamespaces] = React.useState(() => new Map());
    const [loadingNamespaces, setLoadingNamespaces] = React.useState(() => new Set());
    const loadedNamespacesRef = React.useRef(loadedNamespaces);
    const namespaceLoadPromisesRef = React.useRef(new Map());
    React.useEffect(() => {
        loadedNamespacesRef.current = loadedNamespaces;
    }, [loadedNamespaces]);
    const loadNamespaceForAllLanguages = React.useCallback(async (namespaceKey) => {
        if (!loadNamespace) {
            return;
        }
        const languages = languageManager.getAvailableLanguageCodes();
        const results = await Promise.all(languages.map(async (lang) => {
            const data = await loadNamespace(namespaceKey, lang);
            return { lang, data };
        }));
        const namespaceData = {};
        results.forEach(({ lang, data }) => {
            if (data) {
                namespaceData[lang] = data;
            }
        });
        setLoadedNamespaces((prev) => {
            if (prev.has(namespaceKey)) {
                loadedNamespacesRef.current = prev;
                return prev;
            }
            const next = new Map(prev);
            next.set(namespaceKey, namespaceData);
            loadedNamespacesRef.current = next;
            return next;
        });
    }, [languageManager, loadNamespace]);
    const ensureNamespaceLoaded = React.useCallback((namespace) => {
        const namespaceKey = String(namespace);
        if (!lazy ||
            !loadNamespace ||
            loadedNamespacesRef.current.has(namespaceKey)) {
            return Promise.resolve();
        }
        const currentLoad = namespaceLoadPromisesRef.current.get(namespaceKey);
        if (currentLoad) {
            return currentLoad;
        }
        setLoadingNamespaces((prev) => {
            if (prev.has(namespaceKey)) {
                return prev;
            }
            const next = new Set(prev);
            next.add(namespaceKey);
            return next;
        });
        const loadPromise = loadNamespaceForAllLanguages(namespaceKey)
            .catch((error) => {
            console.warn(`Failed to load namespace "${namespaceKey}":`, error);
            throw error;
        })
            .finally(() => {
            namespaceLoadPromisesRef.current.delete(namespaceKey);
            setLoadingNamespaces((prev) => {
                if (!prev.has(namespaceKey)) {
                    return prev;
                }
                const next = new Set(prev);
                next.delete(namespaceKey);
                return next;
            });
        });
        namespaceLoadPromisesRef.current.set(namespaceKey, loadPromise);
        return loadPromise;
    }, [lazy, loadNamespace, loadNamespaceForAllLanguages]);
    // Preload namespaces (fallback + additional preload namespaces)
    React.useEffect(() => {
        if (!lazy || !loadNamespace)
            return;
        const namespacesToPreload = new Set();
        // Always preload fallback namespace
        if (fallbackNamespace) {
            namespacesToPreload.add(String(fallbackNamespace));
        }
        // Add additional preload namespaces
        preloadNamespaces?.forEach((ns) => namespacesToPreload.add(String(ns)));
        // Preload all namespaces
        namespacesToPreload.forEach((nsKey) => {
            void ensureNamespaceLoaded(nsKey).catch(() => undefined);
        });
    }, [
        lazy,
        loadNamespace,
        fallbackNamespace,
        preloadNamespaces,
        ensureNamespaceLoaded,
    ]);
    const changeLanguage = async (lang) => {
        if (lang === currentLanguage) {
            return;
        }
        setIsLoading(true);
        try {
            const success = languageManager.setLanguage(lang);
            if (!success) {
                throw new Error(`Failed to set language to ${lang}`);
            }
        }
        catch (error) {
            console.error("Failed to change language:", error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    };
    React.useEffect(() => {
        if (!initialLanguage) {
            const actualLanguage = languageManager.getCurrentLanguage();
            if (actualLanguage !== currentLanguage) {
                setCurrentLanguage(actualLanguage);
                onLanguageChange?.(actualLanguage);
            }
        }
    }, []);
    const contextValue = {
        currentLanguage,
        changeLanguage,
        availableLanguages: languageManager.getAvailableLanguages(),
        languageManager,
        isLoading,
        namespaceTranslations: defaultTranslations,
        loadedNamespaces,
        loadingNamespaces,
        ensureNamespaceLoaded,
        lazy,
        loadNamespace,
        fallbackNamespace,
        messageFormatter,
    };
    return (_jsx(I18nContext.Provider, { value: contextValue, children: children }));
}
//# sourceMappingURL=I18nProvider.js.map