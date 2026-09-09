import {
  createIcuMessageFormatter,
  type IcuMessageFormatter,
} from "./icu-formatter.js";
import {
  hasMessageBraces,
  isLegacyInterpolationOnly,
  type MessageFormatterValues,
  toI18nMessageFormatError,
} from "./message-formatter.js";

export interface CreateIcuServerTranslationOptions<
  TValues extends object = MessageFormatterValues,
> {
  messageFormatter?: IcuMessageFormatter<TValues, unknown>;
}

const interpolateLegacyMessage = (
  message: string,
  variables?: Record<string, unknown>
): string => {
  if (!variables) return message;
  return message.replace(/\{\{(\w+)\}\}/g, (token, variableName) => {
    const value = variables[variableName];
    return value === undefined ? token : String(value);
  });
};

const isStringRecord = (value: unknown): value is Record<string, string> =>
  !!value &&
  typeof value === "object" &&
  Object.values(value).every((item) => typeof item === "string");

const getFirstStringRecord = (
  value: unknown
): Record<string, string> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  return Object.values(value as Record<string, unknown>).find(isStringRecord);
};

const isLanguageCodeKey = (key: string): boolean =>
  /^[a-z]{2}(?:-[a-z0-9]{2,})?$/i.test(key);

const getIcuServerTranslations = (
  language: string,
  translations: Record<string, unknown>
): Record<string, string> => {
  const entries = Object.entries(translations);
  if (entries.length === 0) return {};
  if (isStringRecord(translations[language]))
    return { ...translations[language] };
  const flatEntries = entries.filter(([, value]) => isStringRecord(value));
  if (
    flatEntries.length > 0 &&
    flatEntries.every(([key]) => isLanguageCodeKey(key))
  ) {
    const fallback = isStringRecord(translations.en)
      ? translations.en
      : flatEntries[0]?.[1];
    return isStringRecord(fallback) ? { ...fallback } : {};
  }
  const namespaced: Record<string, string> = {};
  let foundNamespace = false;
  for (const [, value] of entries) {
    if (!value || typeof value !== "object") continue;
    const namespace = value as Record<string, unknown>;
    const selected = isStringRecord(namespace[language])
      ? namespace[language]
      : isStringRecord(namespace.en)
        ? namespace.en
        : getFirstStringRecord(namespace);
    if (selected) {
      foundNamespace = true;
      Object.assign(namespaced, selected);
    }
  }
  if (foundNamespace) return namespaced;
  return Object.assign({}, ...flatEntries.map(([, value]) => value));
};

export function createIcuServerTranslation<
  TValues extends object = MessageFormatterValues,
>(
  language: string,
  translations: Record<string, unknown>,
  options: CreateIcuServerTranslationOptions<TValues> = {}
) {
  const dictionary = getIcuServerTranslations(language, translations);
  const formatter =
    options.messageFormatter || createIcuMessageFormatter<TValues>();
  return (
    key: string,
    variables?: TValues | string,
    fallback?: string
  ): string => {
    const hasTranslation = Object.prototype.hasOwnProperty.call(
      dictionary,
      key
    );
    if (typeof variables === "string") {
      return hasTranslation ? dictionary[key] : variables;
    }
    const message = hasTranslation ? dictionary[key] : (fallback ?? key);
    if (!hasMessageBraces(message)) {
      return interpolateLegacyMessage(
        message,
        variables as Record<string, unknown> | undefined
      );
    }
    const context = { locale: language, message, key };
    try {
      const result = formatter.format({ ...context, values: variables });
      if (typeof result !== "string") {
        throw toI18nMessageFormatError(
          "rich-result",
          context,
          new Error(
            "Server translations cannot return rich content. Use a client t.rich call."
          )
        );
      }
      return result;
    } catch (error) {
      if (isLegacyInterpolationOnly(message)) {
        return interpolateLegacyMessage(
          message,
          variables as Record<string, unknown> | undefined
        );
      }
      throw toI18nMessageFormatError("format", context, error);
    }
  };
}
