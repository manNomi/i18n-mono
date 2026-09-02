import { createFormatter, type I18nFormatter } from "./formatter.js";
import { getServerLanguage } from "./locale-negotiation.js";
import type { LanguageNegotiationOptions } from "./locale-negotiation.js";
import {
  createTranslation,
  getTranslationDictionary,
  type PureTranslationFunction,
  type TranslationVariables,
} from "./pure-translation.js";
import type { MessageFormatter } from "./message-formatter.js";

export {
  getServerLanguage,
  parseAcceptLanguage,
  parseCookies,
} from "./locale-negotiation.js";
export type {
  LanguageNegotiationOptions,
  ParsedLanguageRange,
} from "./locale-negotiation.js";

export type EdgeTranslationVariables = TranslationVariables;
export type EdgeTranslationFunction = PureTranslationFunction;

export interface EdgeTranslationOptions extends LanguageNegotiationOptions {
  messageFormatter?: MessageFormatter;
}

export interface EdgeTranslationReturn<
  TTranslations extends Record<string, unknown> = Record<string, unknown>,
> {
  t: EdgeTranslationFunction;
  format: I18nFormatter;
  language: string;
  lng: string;
  translations: TTranslations;
  dict: Record<string, string>;
}

/** Create an Edge-safe translation context for an explicit language. */
export function createEdgeTranslation<
  TTranslations extends Record<string, unknown>,
>(
  language: string,
  translations: TTranslations,
  options: EdgeTranslationOptions = {}
): EdgeTranslationReturn<TTranslations> {
  return {
    t: createTranslation(language, translations, options),
    format: createFormatter(language),
    language,
    lng: language,
    translations,
    dict: getTranslationDictionary(language, translations),
  };
}

/** Negotiate an Edge request language and create its translation context. */
export function getEdgeTranslation<
  TTranslations extends Record<string, unknown>,
>(
  headers: Headers,
  translations: TTranslations,
  options: EdgeTranslationOptions = {}
): EdgeTranslationReturn<TTranslations> {
  return createEdgeTranslation(
    getServerLanguage(headers, options),
    translations,
    options
  );
}
