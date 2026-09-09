import {
  hasMessageBraces,
  isLegacyInterpolationOnly,
  toI18nMessageFormatError,
  type MessageFormatter,
} from "./message-formatter.js";

export type TranslationVariables = Record<string, unknown>;

export type PureTranslationFunction = (
  key: string,
  variables?: TranslationVariables | string,
  fallback?: string
) => string;

export interface PureTranslationOptions {
  messageFormatter?: MessageFormatter;
  onMissingKey?: (key: string, dictionary: Record<string, string>) => void;
}

export const interpolateTranslation = (
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

const formatTranslation = (
  text: string,
  key: string,
  language: string,
  variables: TranslationVariables | undefined,
  messageFormatter: MessageFormatter
): string => {
  if (!hasMessageBraces(text)) {
    return interpolateTranslation(text, variables);
  }

  const context = { locale: language, message: text, key };
  try {
    const result = messageFormatter.format({ ...context, values: variables });
    if (typeof result !== "string") {
      throw toI18nMessageFormatError(
        "rich-result",
        context,
        new Error("Server translations cannot return rich content. Use a client t.rich call.")
      );
    }
    return result;
  } catch (error) {
    if (isLegacyInterpolationOnly(text)) {
      return interpolateTranslation(text, variables);
    }
    throw toI18nMessageFormatError("format", context, error);
  }
};

export function createTranslation(
  language: string,
  translations: Record<string, unknown>,
  options: PureTranslationOptions = {}
): PureTranslationFunction {
  const dictionary = getTranslationDictionary(language, translations);

  return (key, variables, fallback) => {
    const hasTranslation = Object.prototype.hasOwnProperty.call(dictionary, key);
    if (!hasTranslation) {
      options.onMissingKey?.(key, dictionary);
    }

    if (typeof variables === "string") {
      return hasTranslation ? dictionary[key] : variables;
    }

    const message = hasTranslation ? dictionary[key] : (fallback ?? key);
    if (!options.messageFormatter) {
      return interpolateTranslation(message, variables);
    }

    return formatTranslation(
      message,
      key,
      language,
      variables,
      options.messageFormatter
    );
  };
}

export const isStringRecord = (
  value: unknown
): value is Record<string, string> =>
  !!value &&
  typeof value === "object" &&
  Object.values(value).every((item) => typeof item === "string");

const isLanguageCodeKey = (key: string): boolean =>
  /^[a-z]{2}(?:-[a-z0-9]{2,})?$/i.test(key);

const getFirstStringRecord = (
  value: unknown
): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  return Object.values(value as Record<string, unknown>).find(isStringRecord);
};

/** Select a language dictionary from legacy, namespaced, or flat catalogs. */
export function getTranslationDictionary<T extends Record<string, unknown>>(
  language: string,
  translations: T
): Record<string, string> {
  const entries = Object.entries(translations as Record<string, unknown>);
  if (entries.length === 0) {
    return {};
  }

  const directLanguage = (translations as Record<string, unknown>)[language];
  if (isStringRecord(directLanguage)) {
    return { ...directLanguage };
  }

  const flatStringEntries = entries.filter(([, value]) =>
    isStringRecord(value)
  );
  const allKeysLookLikeLanguageCodes =
    flatStringEntries.length > 0 &&
    flatStringEntries.every(([key]) => isLanguageCodeKey(key));

  if (allKeysLookLikeLanguageCodes) {
    const english = (translations as Record<string, unknown>).en;
    if (isStringRecord(english)) {
      return { ...english };
    }

    const firstLanguage = flatStringEntries[0]?.[1];
    return isStringRecord(firstLanguage) ? { ...firstLanguage } : {};
  }

  const mergedByNamespace: Record<string, string> = {};
  let hasNamespacedLanguageData = false;
  for (const [, value] of entries) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const namespaceLanguages = value as Record<string, unknown>;
    const selected = isStringRecord(namespaceLanguages[language])
      ? namespaceLanguages[language]
      : isStringRecord(namespaceLanguages.en)
        ? namespaceLanguages.en
        : getFirstStringRecord(namespaceLanguages);

    if (selected) {
      hasNamespacedLanguageData = true;
      Object.assign(mergedByNamespace, selected);
    }
  }

  if (hasNamespacedLanguageData) {
    return mergedByNamespace;
  }

  const mergedFlat: Record<string, string> = {};
  for (const [, value] of flatStringEntries) {
    Object.assign(mergedFlat, value);
  }
  return mergedFlat;
}
