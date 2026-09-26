"use client";

import React, { ReactNode } from "react";
import {
  LanguageManager,
  LanguageConfig,
  LanguageManagerOptions,
} from "../utils/languageManager.js";
import type { MessageFormatter } from "../utils/message-formatter.js";

/** 번역 객체에서 키 추출 */
export type ExtractI18nKeys<T extends Record<string, Record<string, string>>> =
  keyof T[keyof T] & string;

/** 네임스페이스별 번역 구조 */
export type NamespaceTranslations = Record<
  string, // namespace
  Record<
    string, // language
    Record<string, string> // key: value
  >
>;

/** Lazy loading용 네임스페이스 로더 타입 */
export type NamespaceLoader = (
  namespace: string,
  language: string
) => Promise<Record<string, string>>;

/** 네임스페이스에서 키 추출 */
export type ExtractNamespaceKeys<
  TTranslations extends NamespaceTranslations,
  NS extends keyof TTranslations,
> =
  TTranslations[NS] extends Record<string, infer Translations>
    ? Translations extends Record<string, string>
      ? keyof Translations & string
      : never
    : never;

/** Fallback 네임스페이스 포함 키 추출 */
export type ExtractKeysWithFallback<
  TTranslations extends NamespaceTranslations,
  NS extends keyof TTranslations,
  Fallback extends keyof TTranslations,
> =
  | ExtractNamespaceKeys<TTranslations, NS>
  | ExtractNamespaceKeys<TTranslations, Fallback>;

export interface I18nContextType<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
> {
  currentLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  availableLanguages: LanguageConfig[];
  languageManager: LanguageManager;
  isLoading: boolean;
  /** 네임스페이스별 번역 데이터 (타입 추론에 사용) */
  namespaceTranslations: TTranslations;
  /** 로드된 네임스페이스 (런타임 데이터) */
  loadedNamespaces: Map<string, Record<string, Record<string, string>>>;
  /** 현재 로드 중인 네임스페이스 */
  loadingNamespaces: Set<string>;
  /** Load failures are retained until an explicit retry succeeds. */
  namespaceErrors: Map<string, Error>;
  retryNamespace: (namespace: string) => Promise<void>;
  /** Lazy loading용 네임스페이스 로드 보장 함수 */
  ensureNamespaceLoaded: (namespace: string) => Promise<void>;
  /** Lazy loading 활성화 여부 */
  lazy?: boolean;
  /** 네임스페이스 로더 함수 */
  loadNamespace?: NamespaceLoader;
  /** Fallback 네임스페이스 */
  fallbackNamespace?: keyof TTranslations;
  /** Optional runtime-neutral formatter for ICU-capable translation catalogs */
  messageFormatter?: MessageFormatter;
  /** 타입 정보 (런타임에는 사용하지 않음) */
  _type?: TTranslations;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const I18nContext = React.createContext<I18nContextType<any> | null>(
  null
);

export const useI18nContext = <
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
>(): I18nContextType<TTranslations> => {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error("useI18nContext must be used within an I18nProvider");
  }
  return context as I18nContextType<TTranslations>;
};

export interface I18nProviderProps<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
> {
  children: ReactNode;
  languageManagerOptions?: LanguageManagerOptions;
  /** 네임스페이스별 번역 구조 (타입 추론에 사용, lazy일 경우 빈 객체 가능) */
  translations?: TTranslations;
  onLanguageChange?: (language: string) => void;
  /** 서버 측 초기 언어 (SSR/Next.js App Router용, hydration 불일치 방지) */
  initialLanguage?: string;
  /** Lazy loading용 네임스페이스 로더 (제공 시 자동으로 lazy=true) */
  loadNamespace?: NamespaceLoader;
  /** Fallback 네임스페이스 (lazy 모드에서 자동 프리로드) */
  fallbackNamespace?: keyof TTranslations;
  /** 추가로 미리 로드할 네임스페이스 목록 */
  preloadNamespaces?: Array<keyof TTranslations>;
  /** ICU 등 확장 메시지 문법을 처리하는 선택적 formatter */
  messageFormatter?: MessageFormatter;
}

const EMPTY_TRANSLATIONS: NamespaceTranslations = {};

export function I18nProvider<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
>({
  children,
  languageManagerOptions,
  translations = EMPTY_TRANSLATIONS as TTranslations,
  onLanguageChange,
  initialLanguage,
  loadNamespace,
  fallbackNamespace,
  preloadNamespaces,
  messageFormatter,
}: I18nProviderProps<TTranslations>) {
  // Lazy mode is automatically enabled if loadNamespace is provided
  const lazy = !!loadNamespace;
  const defaultTranslations = translations;
  const [languageManager] = React.useState(
    () => new LanguageManager(languageManagerOptions)
  );

  const getInitialLanguage = () => {
    if (initialLanguage) {
      return initialLanguage;
    }
    return languageManagerOptions?.defaultLanguage || "en";
  };

  const [currentLanguage, setCurrentLanguage] =
    React.useState<string>(getInitialLanguage());
  const [isLoading, setIsLoading] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Lazy loading을 위한 로드된 네임스페이스 추적 (state로 변경하여 리렌더링 트리거)
  const [loadedNamespaces, setLoadedNamespaces] = React.useState<
    Map<string, Record<string, Record<string, string>>>
  >(() => new Map());
  const [loadingNamespaces, setLoadingNamespaces] = React.useState<Set<string>>(
    () => new Set()
  );
  const [namespaceErrors, setNamespaceErrors] = React.useState<
    Map<string, Error>
  >(() => new Map());
  const failedNamespacesRef = React.useRef(new Set<string>());
  const loadedNamespacesRef = React.useRef(loadedNamespaces);
  const namespaceLoadPromisesRef = React.useRef<Map<string, Promise<void>>>(
    new Map()
  );

  React.useEffect(
    function synchronizeLoadedNamespaces() {
      loadedNamespacesRef.current = loadedNamespaces;
    },
    [loadedNamespaces]
  );

  const loadNamespaceForAllLanguages = React.useCallback(
    async (namespaceKey: string): Promise<void> => {
      if (!loadNamespace) {
        return;
      }

      const languages = languageManager.getAvailableLanguageCodes();
      const results = await Promise.all(
        languages.map(async (lang) => {
          try {
            const data = await loadNamespace(namespaceKey, lang);
            return { lang, data };
          } catch (error) {
            console.warn(
              `Failed to load namespace "${namespaceKey}" for language "${lang}":`,
              error
            );
            return { lang, data: undefined, error };
          }
        })
      );

      const namespaceData: Record<string, Record<string, string>> = {};
      results.forEach(({ lang, data }) => {
        if (data) {
          namespaceData[lang] = data;
        }
      });

      const failures = results.filter((result) => result.data === undefined);
      if (failures.length > 0) {
        failedNamespacesRef.current.add(namespaceKey);
        setNamespaceErrors((prev) =>
          new Map(prev).set(
            namespaceKey,
            new Error(
              `Failed to load namespace "${namespaceKey}" for: ${failures.map(({ lang }) => lang).join(", ")}`
            )
          )
        );
      }
      if (Object.keys(namespaceData).length === 0) return;

      setLoadedNamespaces((prev) => {
        const next = new Map(prev);
        next.set(namespaceKey, { ...prev.get(namespaceKey), ...namespaceData });
        loadedNamespacesRef.current = next;
        return next;
      });
    },
    [languageManager, loadNamespace]
  );

  const ensureNamespaceLoaded = React.useCallback(
    (namespace: string, retry = false): Promise<void> => {
      const namespaceKey = String(namespace);

      if (
        !lazy ||
        !loadNamespace ||
        (!retry &&
          (loadedNamespacesRef.current.has(namespaceKey) ||
            failedNamespacesRef.current.has(namespaceKey)))
      ) {
        return Promise.resolve();
      }

      const currentLoad = namespaceLoadPromisesRef.current.get(namespaceKey);
      if (currentLoad) {
        return currentLoad;
      }

      failedNamespacesRef.current.delete(namespaceKey);
      setNamespaceErrors((prev) => {
        const next = new Map(prev);
        next.delete(namespaceKey);
        return next;
      });
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

          failedNamespacesRef.current.add(namespaceKey);
          setNamespaceErrors((prev) =>
            new Map(prev).set(
              namespaceKey,
              error instanceof Error ? error : new Error(String(error))
            )
          );
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
    },
    [languageManager, lazy, loadNamespace, loadNamespaceForAllLanguages]
  );

  const retryNamespace = React.useCallback(
    (namespace: string) => ensureNamespaceLoaded(namespace, true),
    [ensureNamespaceLoaded]
  );

  // Preload namespaces (fallback + additional preload namespaces)
  React.useEffect(
    function preloadTranslations() {
      if (!lazy || !loadNamespace) return;

      const namespacesToPreload = new Set<string>();

      // Always preload fallback namespace
      if (fallbackNamespace) {
        namespacesToPreload.add(String(fallbackNamespace));
      }

      // Add additional preload namespaces
      preloadNamespaces?.forEach((ns) => namespacesToPreload.add(String(ns)));

      // Preload all namespaces
      namespacesToPreload.forEach((nsKey) => {
        if (!Object.prototype.hasOwnProperty.call(defaultTranslations, nsKey)) {
          void ensureNamespaceLoaded(nsKey);
        }
      });
    },
    [
      lazy,
      loadNamespace,
      fallbackNamespace,
      preloadNamespaces,
      defaultTranslations,
      ensureNamespaceLoaded,
    ]
  );

  const changeLanguage = async (lang: string): Promise<void> => {
    if (lang === currentLanguage) {
      return;
    }

    setIsLoading(true);
    try {
      const success = languageManager.setLanguage(lang);
      if (!success) {
        throw new Error(`Failed to set language to ${lang}`);
      }

      setCurrentLanguage(lang);
      onLanguageChange?.(lang);
    } catch (error) {
      console.error("Failed to change language:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    setIsHydrated(true);

    if (!initialLanguage) {
      const actualLanguage = languageManager.getCurrentLanguage();
      if (actualLanguage !== currentLanguage) {
        setCurrentLanguage(actualLanguage);
        onLanguageChange?.(actualLanguage);
      }
    }
  }, []);

  React.useEffect(() => {
    if (!isHydrated) return;

    const removeListener = languageManager.addLanguageChangeListener((lang) => {
      if (lang !== currentLanguage) {
        setCurrentLanguage(lang);
        onLanguageChange?.(lang);
      }
    });

    return removeListener;
  }, [languageManager, currentLanguage, onLanguageChange, isHydrated]);

  const contextValue: I18nContextType<TTranslations> = {
    currentLanguage,
    changeLanguage,
    availableLanguages: languageManager.getAvailableLanguages(),
    languageManager,
    isLoading,
    namespaceTranslations: defaultTranslations,
    loadedNamespaces,
    loadingNamespaces,
    namespaceErrors,
    retryNamespace,
    ensureNamespaceLoaded,
    lazy,
    loadNamespace,
    fallbackNamespace,
    messageFormatter,
  };

  return (
    <I18nContext.Provider value={contextValue as I18nContextType<any>}>
      {children}
    </I18nContext.Provider>
  );
}
