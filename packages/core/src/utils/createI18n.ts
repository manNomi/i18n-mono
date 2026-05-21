import React from "react";
import {
  I18nProvider as BaseI18nProvider,
  useI18nContext,
  type I18nProviderProps,
} from "../components/I18nProvider";
import {
  getNamespaceReadiness,
  resolveTranslationReady,
  resolveTranslationSnapshot,
  shouldLoadNamespace,
  translateFromSnapshot,
  type RuntimeNamespaceTranslations,
  TranslationStyles,
  TranslationVariables,
} from "./translation-runtime";

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
    ) as RuntimeNamespaceTranslations;
    const {
      hasStaticNamespace,
      isNamespaceLoaded,
      isNamespaceLoading,
      isNamespaceReady,
    } = React.useMemo(
      () =>
        getNamespaceReadiness({
          namespace,
          staticTranslations: source,
          loadedNamespaces: context.loadedNamespaces,
          loadingNamespaces: context.loadingNamespaces,
        }),
      [namespace, source, context.loadedNamespaces, context.loadingNamespaces],
    );

    React.useEffect(() => {
      if (
        !namespace ||
        !shouldLoadNamespace({
          namespace,
          lazy: context.lazy,
          hasStaticNamespace,
          isNamespaceLoaded,
        })
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

    const currentTranslations = React.useMemo(
      () =>
        resolveTranslationSnapshot({
          namespace,
          staticTranslations: source,
          currentLanguage: context.currentLanguage,
          fallbackLanguage,
          fallbackNamespace: context.fallbackNamespace
            ? String(context.fallbackNamespace)
            : undefined,
          loadedNamespaces: context.loadedNamespaces,
          staticResolutionMode: "flattened",
          staticMergeMode: "before-loaded",
        }),
      [
        namespace,
        source,
        context.currentLanguage,
        fallbackLanguage,
        context.fallbackNamespace,
        context.loadedNamespaces,
      ],
    );

    const t = React.useCallback(
      ((
        key: string,
        variables?: TranslationVariables,
        styles?: TranslationStyles,
      ): string | React.ReactElement => {
        return translateFromSnapshot(
          currentTranslations,
          key,
          variables,
          styles,
        );
      }) as LegacyUseTranslationReturn<string>["t"],
      [currentTranslations],
    );

    return {
      t,
      currentLanguage: context.currentLanguage,
      isReady: resolveTranslationReady({
        isLoading: context.isLoading,
        isNamespaceLoading,
        isNamespaceReady,
      }),
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
