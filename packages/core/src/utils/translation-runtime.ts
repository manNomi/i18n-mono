import React from "react";
import {
  ensureMessageFormatter,
  hasMessageBraces,
  isLegacyInterpolationOnly,
  toI18nMessageFormatError,
  type MessageFormatter,
  type MessageFormatterValues,
} from "./message-formatter.js";

export type TranslationVariables = Record<string, string | number>;
export type VariableStyle = React.CSSProperties;
export type TranslationStyles = Record<string, VariableStyle>;

export type RuntimeNamespaceTranslations = {
  readonly [namespace: string]: {
    readonly [language: string]: {
      readonly [key: string]: string;
    };
  };
};

export type LoadedNamespaces = Map<
  string,
  Record<string, Record<string, string>>
>;

export type StaticResolutionMode = "namespace" | "flattened";
export type StaticMergeMode = "when-empty" | "before-loaded";

export interface NamespaceReadiness {
  hasStaticNamespace: boolean;
  isNamespaceLoaded: boolean;
  isNamespaceLoading: boolean;
  isNamespaceReady: boolean;
}

export interface TranslationSnapshotOptions {
  namespace?: string;
  staticTranslations: RuntimeNamespaceTranslations;
  currentLanguage: string;
  fallbackLanguage: string;
  fallbackNamespace?: string;
  loadedNamespaces: LoadedNamespaces;
  staticResolutionMode: StaticResolutionMode;
  staticMergeMode: StaticMergeMode;
}

export interface TranslationFormatOptions {
  messageFormatter?: MessageFormatter;
  locale?: string;
}

export const interpolate = (
  text: string,
  variables?: TranslationVariables
): string => {
  if (!variables) {
    return text;
  }

  return text.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
    const value = variables[variableName];
    return value !== undefined ? String(value) : match;
  });
};

export const interpolateWithStyles = (
  text: string,
  variables: TranslationVariables,
  styles: TranslationStyles
): React.ReactElement => {
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
            String(value)
          )
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
};

export const translateFromSnapshot = (
  translations: Record<string, string>,
  key: string,
  variables?: TranslationVariables,
  styles?: TranslationStyles,
  formatOptions?: TranslationFormatOptions
): string | React.ReactElement => {
  const translatedText = Object.prototype.hasOwnProperty.call(translations, key)
    ? translations[key]
    : key;

  const formatted = formatMessageIfAvailable(
    translatedText,
    key,
    variables,
    formatOptions
  );

  if (formatted !== undefined) {
    if (typeof formatted !== "string") {
      throw toI18nMessageFormatError(
        "rich-result",
        createMessageFormatContext(translatedText, key, formatOptions),
        new Error(
          "This ICU message returns rich content. Use t.rich(key, values)."
        )
      );
    }

    return formatted;
  }

  if (styles && variables) {
    return interpolateWithStyles(translatedText, variables, styles);
  }

  return interpolate(translatedText, variables);
};

export const translateRichFromSnapshot = (
  translations: Record<string, string>,
  key: string,
  variables?: MessageFormatterValues,
  formatOptions?: TranslationFormatOptions
): unknown => {
  const translatedText = Object.prototype.hasOwnProperty.call(translations, key)
    ? translations[key]
    : key;
  const context = createMessageFormatContext(
    translatedText,
    key,
    formatOptions
  );
  const formatter = ensureMessageFormatter(
    formatOptions?.messageFormatter,
    context
  );

  try {
    return formatter.format({
      ...context,
      values: variables,
    });
  } catch (error) {
    if (isLegacyInterpolationOnly(translatedText)) {
      return interpolate(translatedText, variables as TranslationVariables);
    }

    throw toI18nMessageFormatError("format", context, error);
  }
};

const createMessageFormatContext = (
  message: string,
  key: string,
  options?: TranslationFormatOptions
) => ({
  locale: options?.locale || "en",
  message,
  key,
});

const formatMessageIfAvailable = (
  message: string,
  key: string,
  variables: TranslationVariables | undefined,
  options?: TranslationFormatOptions
): unknown | undefined => {
  if (!hasMessageBraces(message)) {
    return undefined;
  }

  const formatter = options?.messageFormatter;
  if (!formatter) {
    return undefined;
  }

  const context = createMessageFormatContext(message, key, options);
  try {
    return formatter.format({
      ...context,
      values: variables,
    });
  } catch (error) {
    if (isLegacyInterpolationOnly(message)) {
      return undefined;
    }

    throw toI18nMessageFormatError("format", context, error);
  }
};

export const hasOwnNamespace = (
  translations: RuntimeNamespaceTranslations,
  namespace?: string
): boolean => {
  if (!namespace) {
    return true;
  }

  return Object.prototype.hasOwnProperty.call(translations || {}, namespace);
};

export const resolveNamespaceForLanguage = (
  translations: RuntimeNamespaceTranslations,
  namespace: string,
  language: string,
  fallbackLanguage: string
): Record<string, string> => {
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
};

export const flattenTranslationsForLanguage = (
  translations: RuntimeNamespaceTranslations,
  language: string,
  fallbackLanguage: string
): Record<string, string> => {
  const merged: Record<string, string> = {};

  for (const namespace of Object.keys(translations || {})) {
    Object.assign(
      merged,
      resolveNamespaceForLanguage(
        translations,
        namespace,
        language,
        fallbackLanguage
      )
    );
  }

  return merged;
};

const resolveLoadedTranslations = ({
  namespace,
  currentLanguage,
  fallbackLanguage,
  fallbackNamespace,
  loadedNamespaces,
}: Pick<
  TranslationSnapshotOptions,
  | "namespace"
  | "currentLanguage"
  | "fallbackLanguage"
  | "fallbackNamespace"
  | "loadedNamespaces"
>): Record<string, string> => {
  let result: Record<string, string> = {};

  if (fallbackNamespace) {
    result = resolveLoadedNamespaceForLanguage(
      loadedNamespaces,
      String(fallbackNamespace),
      currentLanguage,
      fallbackLanguage
    );
  }

  if (namespace) {
    result = {
      ...result,
      ...resolveLoadedNamespaceForLanguage(
        loadedNamespaces,
        namespace,
        currentLanguage,
        fallbackLanguage
      ),
    };
  }

  return result;
};

const resolveLoadedNamespaceForLanguage = (
  loadedNamespaces: LoadedNamespaces,
  namespace: string,
  language: string,
  fallbackLanguage: string
): Record<string, string> => {
  const namespaceData = loadedNamespaces.get(namespace);
  if (!namespaceData || typeof namespaceData !== "object") {
    return {};
  }

  const current = namespaceData[language];
  if (current && typeof current === "object") {
    return current;
  }

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

const resolveNamespaceStaticTranslations = ({
  namespace,
  staticTranslations,
  currentLanguage,
  fallbackLanguage,
  fallbackNamespace,
}: Omit<
  TranslationSnapshotOptions,
  "loadedNamespaces" | "staticResolutionMode" | "staticMergeMode"
>): Record<string, string> => {
  if (!namespace) {
    return flattenTranslationsForLanguage(
      staticTranslations,
      currentLanguage,
      fallbackLanguage
    );
  }

  let result: Record<string, string> = {};

  if (fallbackNamespace) {
    result = {
      ...result,
      ...resolveNamespaceForLanguage(
        staticTranslations,
        String(fallbackNamespace),
        currentLanguage,
        fallbackLanguage
      ),
    };
  }

  const requested = resolveNamespaceForLanguage(
    staticTranslations,
    namespace,
    currentLanguage,
    fallbackLanguage
  );

  if (Object.keys(requested).length > 0) {
    return { ...result, ...requested };
  }

  return {
    ...result,
    ...flattenTranslationsForLanguage(
      staticTranslations,
      currentLanguage,
      fallbackLanguage
    ),
  };
};

const resolveStaticTranslations = (
  options: Omit<
    TranslationSnapshotOptions,
    "loadedNamespaces" | "staticMergeMode"
  >
): Record<string, string> => {
  if (options.staticResolutionMode === "flattened") {
    return flattenTranslationsForLanguage(
      options.staticTranslations,
      options.currentLanguage,
      options.fallbackLanguage
    );
  }

  return resolveNamespaceStaticTranslations(options);
};

export const resolveTranslationSnapshot = (
  options: TranslationSnapshotOptions
): Record<string, string> => {
  if (
    options.staticResolutionMode === "namespace" &&
    options.staticMergeMode === "when-empty"
  ) {
    return resolveNamespaceTranslationSnapshot(options);
  }

  const loadedTranslations = resolveLoadedTranslations(options);
  const hasLoadedTranslations = Object.keys(loadedTranslations).length > 0;

  if (options.staticMergeMode === "when-empty") {
    return hasLoadedTranslations
      ? loadedTranslations
      : resolveStaticTranslations(options);
  }

  return {
    ...resolveStaticTranslations(options),
    ...loadedTranslations,
  };
};

const resolveNamespaceTranslationSnapshot = (
  options: TranslationSnapshotOptions
): Record<string, string> => {
  const staticFallback = options.fallbackNamespace
    ? resolveNamespaceForLanguage(
        options.staticTranslations,
        String(options.fallbackNamespace),
        options.currentLanguage,
        options.fallbackLanguage
      )
    : {};
  const loadedFallback = options.fallbackNamespace
    ? resolveLoadedNamespaceForLanguage(
        options.loadedNamespaces,
        String(options.fallbackNamespace),
        options.currentLanguage,
        options.fallbackLanguage
      )
    : {};

  if (!options.namespace) {
    return {
      ...flattenTranslationsForLanguage(
        options.staticTranslations,
        options.currentLanguage,
        options.fallbackLanguage
      ),
      ...loadedFallback,
    };
  }

  const staticRequested = resolveNamespaceForLanguage(
    options.staticTranslations,
    options.namespace,
    options.currentLanguage,
    options.fallbackLanguage
  );
  const loadedRequested = resolveLoadedNamespaceForLanguage(
    options.loadedNamespaces,
    options.namespace,
    options.currentLanguage,
    options.fallbackLanguage
  );
  const staticRequestedLayer =
    Object.keys(staticRequested).length > 0
      ? staticRequested
      : flattenTranslationsForLanguage(
          options.staticTranslations,
          options.currentLanguage,
          options.fallbackLanguage
        );

  return {
    ...staticFallback,
    ...loadedFallback,
    ...staticRequestedLayer,
    ...loadedRequested,
  };
};

export const getNamespaceReadiness = ({
  namespace,
  staticTranslations,
  loadedNamespaces,
  loadingNamespaces,
}: {
  namespace?: string;
  staticTranslations: RuntimeNamespaceTranslations;
  loadedNamespaces: LoadedNamespaces;
  loadingNamespaces: Set<string>;
}): NamespaceReadiness => {
  const hasStaticNamespace = hasOwnNamespace(staticTranslations, namespace);
  const isNamespaceLoaded = namespace ? loadedNamespaces.has(namespace) : true;
  const isNamespaceLoading = namespace
    ? loadingNamespaces.has(namespace)
    : false;

  return {
    hasStaticNamespace,
    isNamespaceLoaded,
    isNamespaceLoading,
    isNamespaceReady: namespace
      ? isNamespaceLoaded || hasStaticNamespace
      : true,
  };
};

export const shouldLoadNamespace = ({
  namespace,
  lazy,
  hasStaticNamespace,
  isNamespaceLoaded,
}: {
  namespace?: string;
  lazy?: boolean;
  hasStaticNamespace: boolean;
  isNamespaceLoaded: boolean;
}): boolean => {
  return !!namespace && !!lazy && !hasStaticNamespace && !isNamespaceLoaded;
};

export const resolveTranslationReady = ({
  isLoading,
  isNamespaceLoading,
  isNamespaceReady,
}: {
  isLoading: boolean;
  isNamespaceLoading: boolean;
  isNamespaceReady: boolean;
}): boolean => {
  return !isLoading && !isNamespaceLoading && isNamespaceReady;
};
