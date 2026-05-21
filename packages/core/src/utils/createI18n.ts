import React from "react";
import {
  I18nProvider as BaseI18nProvider,
  useI18nContext,
  type I18nProviderProps,
} from "../components/I18nProvider";
import type {
  TranslationStyles,
  TranslationVariables,
} from "../hooks/useTranslation";

export type LegacyNamespaceTranslations = {
  readonly [namespace: string]: {
    readonly [language: string]: {
      readonly [key: string]: string;
    };
  };
};

type KeysOfNamespace<
  TTranslations extends LegacyNamespaceTranslations,
  NS extends keyof TTranslations,
> = {
  [L in keyof TTranslations[NS]]: keyof TTranslations[NS][L] & string;
}[keyof TTranslations[NS]] &
  string;

type AllTranslationKeys<TTranslations extends LegacyNamespaceTranslations> = {
  [NS in keyof TTranslations]: KeysOfNamespace<TTranslations, NS>;
}[keyof TTranslations] &
  string;

type FallbackKeys<
  TTranslations extends LegacyNamespaceTranslations,
  FallbackNamespace extends keyof TTranslations | never,
> = [FallbackNamespace] extends [never]
  ? never
  : FallbackNamespace extends keyof TTranslations
    ? KeysOfNamespace<TTranslations, FallbackNamespace>
    : never;

export interface CreateI18nOptions<
  TTranslations extends LegacyNamespaceTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  fallbackNamespace?: FallbackNamespace;
  enableFallback?: boolean;
}

export interface LegacyUseTranslationReturn<K extends string = string> {
  t: {
    (
      key: K,
      variables: TranslationVariables,
      styles: TranslationStyles,
    ): React.ReactElement;
    (key: K, variables?: TranslationVariables): string;
  };
  currentLanguage: string;
  isReady: boolean;
}

export interface CreateI18nInstance<
  TTranslations extends LegacyNamespaceTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  I18nProvider: React.ComponentType<
    Omit<
      I18nProviderProps<TTranslations>,
      "translations" | "fallbackNamespace"
    > & {
      translations?: TTranslations;
    }
  >;
  useTranslation: {
    (): LegacyUseTranslationReturn<AllTranslationKeys<TTranslations>>;
    <NS extends keyof TTranslations & string>(
      namespace: NS,
    ): LegacyUseTranslationReturn<
      | KeysOfNamespace<TTranslations, NS>
      | FallbackKeys<TTranslations, FallbackNamespace>
    >;
  };
  translations: TTranslations;
  options: {
    fallbackNamespace?: FallbackNamespace;
    enableFallback: boolean;
  };
}

function interpolate(
  text: string,
  variables?: Record<string, string | number>,
): string {
  if (!variables) {
    return text;
  }

  return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];
    return value !== undefined ? String(value) : match;
  });
}

function interpolateWithStyles(
  text: string,
  variables: TranslationVariables,
  styles: TranslationStyles,
): React.ReactElement {
  const parts: Array<string | React.ReactElement> = [];
  let lastIndex = 0;
  const regex = /\{\{(\w+)\}\}/g;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const variableName = match[1];
    const value = variables[variableName];
    const style = styles[variableName];

    if (value !== undefined) {
      if (style) {
        parts.push(
          React.createElement(
            "span",
            { key: `var-${key++}`, style },
            String(value),
          ),
        );
      } else {
        parts.push(String(value));
      }
    } else {
      parts.push(match[0]);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return React.createElement(React.Fragment, null, ...parts);
}

function resolveNamespaceForLanguage(
  translations: LegacyNamespaceTranslations,
  namespace: string,
  language: string,
  fallbackLanguage: string,
): Record<string, string> {
  const namespaceData = translations[namespace];
  if (!namespaceData || typeof namespaceData !== "object") {
    return {};
  }

  const current = namespaceData[language];
  if (current && typeof current === "object") {
    return current as Record<string, string>;
  }

  const fallback = namespaceData[fallbackLanguage];
  if (fallback && typeof fallback === "object") {
    return fallback as Record<string, string>;
  }

  const first = Object.values(namespaceData)[0];
  if (first && typeof first === "object") {
    return first as Record<string, string>;
  }

  return {};
}

function flattenTranslationsForLanguage(
  translations: LegacyNamespaceTranslations,
  language: string,
  fallbackLanguage: string,
): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const namespace of Object.keys(translations)) {
    Object.assign(
      merged,
      resolveNamespaceForLanguage(
        translations,
        namespace,
        language,
        fallbackLanguage,
      ),
    );
  }

  return merged;
}

export function createI18n<
  TTranslations extends LegacyNamespaceTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
>(
  translations: TTranslations,
  options: CreateI18nOptions<TTranslations, FallbackNamespace> = {},
): CreateI18nInstance<TTranslations, FallbackNamespace> {
  const normalizedOptions: {
    fallbackNamespace?: FallbackNamespace;
    enableFallback: boolean;
  } = {
    fallbackNamespace: options.fallbackNamespace,
    enableFallback: options.enableFallback ?? true,
  };

  const I18nProvider: CreateI18nInstance<
    TTranslations,
    FallbackNamespace
  >["I18nProvider"] = (providerProps) => {
    const { translations: overrideTranslations, ...props } = providerProps;
    const runtimeTranslations =
      (overrideTranslations as TTranslations | undefined) || translations;

    return React.createElement(BaseI18nProvider as any, {
      ...(props as I18nProviderProps<TTranslations>),
      translations: runtimeTranslations as any,
      fallbackNamespace: normalizedOptions.enableFallback
        ? normalizedOptions.fallbackNamespace
        : undefined,
    });
  };

  const useTranslationImpl = (namespace?: string) => {
    const context = useI18nContext<TTranslations>();
    const fallbackLanguage = context.languageManager.getDefaultLanguage();
    const source = (
      context.namespaceTranslations &&
      Object.keys(context.namespaceTranslations).length > 0
        ? context.namespaceTranslations
        : translations
    ) as LegacyNamespaceTranslations;

    const hasStaticNamespace = namespace
      ? Object.prototype.hasOwnProperty.call(source, namespace)
      : true;
    const isNamespaceLoaded = namespace
      ? context.loadedNamespaces.has(namespace)
      : true;
    const isNamespaceLoading = namespace
      ? context.loadingNamespaces.has(namespace)
      : false;

    React.useEffect(() => {
      if (
        !namespace ||
        !context.lazy ||
        hasStaticNamespace ||
        isNamespaceLoaded
      ) {
        return;
      }

      void context.ensureNamespaceLoaded(namespace);
    }, [
      context.ensureNamespaceLoaded,
      context.lazy,
      hasStaticNamespace,
      isNamespaceLoaded,
      namespace,
    ]);

    let currentTranslations = flattenTranslationsForLanguage(
      source,
      context.currentLanguage,
      fallbackLanguage,
    );

    if (context.fallbackNamespace) {
      const fallbackTranslations = context.loadedNamespaces.get(
        String(context.fallbackNamespace),
      )?.[context.currentLanguage];

      if (fallbackTranslations) {
        currentTranslations = {
          ...currentTranslations,
          ...fallbackTranslations,
        };
      }
    }

    if (namespace) {
      const namespaceTranslations =
        context.loadedNamespaces.get(namespace)?.[context.currentLanguage];

      if (namespaceTranslations) {
        currentTranslations = {
          ...currentTranslations,
          ...namespaceTranslations,
        };
      }
    }

    const t = ((
      key: string,
      variables?: TranslationVariables,
      styles?: TranslationStyles,
    ): string | React.ReactElement => {
      const translatedText = currentTranslations[key] || key;

      if (styles && variables) {
        return interpolateWithStyles(translatedText, variables, styles);
      }

      return interpolate(translatedText, variables);
    }) as LegacyUseTranslationReturn<string>["t"];

    return {
      t,
      currentLanguage: context.currentLanguage,
      isReady:
        !context.isLoading &&
        !isNamespaceLoading &&
        (!namespace || hasStaticNamespace || isNamespaceLoaded),
    };
  };

  const useTranslation = ((namespace?: string) => {
    return useTranslationImpl(namespace);
  }) as CreateI18nInstance<TTranslations, FallbackNamespace>["useTranslation"];

  return {
    I18nProvider,
    useTranslation,
    translations,
    options: normalizedOptions,
  };
}
