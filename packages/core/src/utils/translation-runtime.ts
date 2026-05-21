import React from "react";

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

export const interpolate = (
  text: string,
  variables?: TranslationVariables,
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
  styles: TranslationStyles,
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
};

export const translateFromSnapshot = (
  translations: Record<string, string>,
  key: string,
  variables?: TranslationVariables,
  styles?: TranslationStyles,
): string | React.ReactElement => {
  const translatedText = translations[key] || key;

  if (styles && variables) {
    return interpolateWithStyles(translatedText, variables, styles);
  }

  return interpolate(translatedText, variables);
};

export const hasOwnNamespace = (
  translations: RuntimeNamespaceTranslations,
  namespace?: string,
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
  fallbackLanguage: string,
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
  fallbackLanguage: string,
): Record<string, string> => {
  const merged: Record<string, string> = {};

  for (const namespace of Object.keys(translations || {})) {
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
};

const resolveLoadedTranslations = ({
  namespace,
  currentLanguage,
  fallbackNamespace,
  loadedNamespaces,
}: Pick<
  TranslationSnapshotOptions,
  "namespace" | "currentLanguage" | "fallbackNamespace" | "loadedNamespaces"
>): Record<string, string> => {
  let result: Record<string, string> = {};

  if (fallbackNamespace) {
    const fallbackTranslations = loadedNamespaces.get(
      String(fallbackNamespace),
    )?.[currentLanguage];
    if (fallbackTranslations) {
      result = { ...fallbackTranslations };
    }
  }

  if (namespace) {
    const namespaceTranslations =
      loadedNamespaces.get(namespace)?.[currentLanguage];
    if (namespaceTranslations) {
      result = { ...result, ...namespaceTranslations };
    }
  }

  return result;
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
      fallbackLanguage,
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
        fallbackLanguage,
      ),
    };
  }

  const requested = resolveNamespaceForLanguage(
    staticTranslations,
    namespace,
    currentLanguage,
    fallbackLanguage,
  );

  if (Object.keys(requested).length > 0) {
    return { ...result, ...requested };
  }

  return {
    ...result,
    ...flattenTranslationsForLanguage(
      staticTranslations,
      currentLanguage,
      fallbackLanguage,
    ),
  };
};

const resolveStaticTranslations = (
  options: Omit<
    TranslationSnapshotOptions,
    "loadedNamespaces" | "staticMergeMode"
  >,
): Record<string, string> => {
  if (options.staticResolutionMode === "flattened") {
    return flattenTranslationsForLanguage(
      options.staticTranslations,
      options.currentLanguage,
      options.fallbackLanguage,
    );
  }

  return resolveNamespaceStaticTranslations(options);
};

export const resolveTranslationSnapshot = (
  options: TranslationSnapshotOptions,
): Record<string, string> => {
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
