"use client";
import React from "react";
import { useI18nContext, } from "../components/I18nProvider";
/** 번역 문자열의 변수 치환 */
const interpolate = (text, variables) => {
    if (!variables) {
        return text;
    }
    return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
        const value = variables[variableName];
        return value !== undefined ? String(value) : match;
    });
};
/** 스타일이 적용된 React 요소로 변수 치환 */
const interpolateWithStyles = (text, variables, styles) => {
    const parts = [];
    let lastIndex = 0;
    const regex = /\{\{(\w+)\}\}/g;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        const variableName = match[1];
        const value = variables[variableName];
        const style = styles[variableName];
        if (value !== undefined) {
            if (style) {
                parts.push(React.createElement("span", { key: `var-${key++}`, style: style }, String(value)));
            }
            else {
                parts.push(String(value));
            }
        }
        else {
            parts.push(match[0]);
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    return React.createElement(React.Fragment, null, ...parts);
};
// 실제 구현
export function useTranslation(namespace) {
    const context = useI18nContext();
    const { currentLanguage, isLoading, loadedNamespaces, fallbackNamespace, namespaceTranslations, languageManager, } = context;
    const getStaticNamespaceTranslations = (namespaceKey) => {
        const namespaceData = namespaceTranslations?.[namespaceKey];
        if (!namespaceData || typeof namespaceData !== "object") {
            return {};
        }
        const current = namespaceData[currentLanguage];
        if (current && typeof current === "object") {
            return current;
        }
        const fallbackLanguage = languageManager.getDefaultLanguage();
        const fallback = namespaceData[fallbackLanguage];
        if (fallback && typeof fallback === "object") {
            return fallback;
        }
        const first = Object.values(namespaceData)[0];
        if (first && typeof first === "object") {
            return first;
        }
        return {};
    };
    // 번역 데이터 가져오기 (I18nProvider에서 로드된 데이터만 사용)
    const getCurrentTranslations = () => {
        let result = {};
        // Fallback namespace 먼저 로드
        if (fallbackNamespace) {
            const fallbackNs = loadedNamespaces.get(String(fallbackNamespace))?.[currentLanguage];
            if (fallbackNs) {
                result = { ...fallbackNs };
            }
        }
        // 요청된 namespace 로드 (fallback 덮어쓰기)
        if (namespace) {
            const requestedNs = loadedNamespaces.get(namespace)?.[currentLanguage];
            if (requestedNs) {
                result = { ...result, ...requestedNs };
            }
        }
        // Static translations fallback (non-lazy mode compatibility)
        if (Object.keys(result).length === 0) {
            if (namespace) {
                if (fallbackNamespace) {
                    result = {
                        ...result,
                        ...getStaticNamespaceTranslations(String(fallbackNamespace)),
                    };
                }
                const requested = getStaticNamespaceTranslations(namespace);
                if (Object.keys(requested).length > 0) {
                    result = { ...result, ...requested };
                }
                else {
                    // Legacy behavior: if namespace is invalid, expose flattened keys.
                    for (const nsKey of Object.keys(namespaceTranslations || {})) {
                        result = { ...result, ...getStaticNamespaceTranslations(nsKey) };
                    }
                }
            }
            else {
                for (const nsKey of Object.keys(namespaceTranslations || {})) {
                    result = { ...result, ...getStaticNamespaceTranslations(nsKey) };
                }
            }
        }
        return result;
    };
    const currentTranslations = getCurrentTranslations();
    const translate = ((key, variables, styles) => {
        const translatedText = currentTranslations[key] || key;
        if (styles && variables) {
            return interpolateWithStyles(translatedText, variables, styles);
        }
        return interpolate(translatedText, variables);
    });
    // 네임스페이스가 로드되었는지 확인
    const hasStaticNamespace = namespace
        ? Object.prototype.hasOwnProperty.call(namespaceTranslations || {}, namespace)
        : true;
    const isNamespaceReady = namespace
        ? loadedNamespaces.has(namespace) || hasStaticNamespace
        : true;
    return {
        t: translate,
        currentLanguage,
        lng: currentLanguage, // Alias for react-i18next compatibility
        isReady: !isLoading && isNamespaceReady,
    };
}
/** 언어 전환 기능 접근 훅 */
export const useLanguageSwitcher = () => {
    const { currentLanguage, changeLanguage, availableLanguages, languageManager, isLoading, } = useI18nContext();
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
        const prevIndex = currentIndex === 0 ? languageCodes.length - 1 : currentIndex - 1;
        const prevLanguage = languageCodes[prevIndex];
        await changeLanguage(prevLanguage);
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
        switchToNextLanguage,
        switchToPreviousLanguage,
        getLanguageConfig,
        detectBrowserLanguage,
        resetLanguage,
        isLoading,
    };
};
//# sourceMappingURL=useTranslation.js.map