// Core runtime API
export { I18nProvider, useI18nContext } from "./components/I18nProvider.js";
export type {
  I18nProviderProps,
  I18nContextType,
  NamespaceTranslations,
  NamespaceLoader,
} from "./components/I18nProvider.js";

// Runtime-neutral message formatter boundary
export type {
  MessageFormatContext,
  MessageFormatRequest,
  MessageFormatRichTag,
  MessageFormatRichValues,
  MessageFormatter,
  MessageFormatterValues,
} from "./utils/message-formatter.js";

export { createFormatter } from "./utils/formatter.js";
export type { I18nFormatter } from "./utils/formatter.js";

// Hooks
export { useTranslation, useLanguageSwitcher } from "./hooks/useTranslation.js";
export { useFormatter } from "./hooks/useFormatter.js";
export type {
  TranslationVariables,
  TranslationStyles,
  VariableStyle,
  TranslationFunction,
  TranslationFunctionWithRich,
  TranslationRichValues,
  UseTranslationReturn,
  UseLanguageSwitcherReturn,
} from "./hooks/useTranslation.js";

// Advanced typed API
export { createI18n } from "./utils/createI18n.js";
export type {
  I18nTranslations,
  CreateI18nOptions,
  CreateI18nInstance,
  CreateI18nUseTranslationReturn,
} from "./utils/createI18n.js";

// Provider configuration types
export type {
  LanguageConfig,
  LanguageManagerOptions,
} from "./utils/languageManager.js";

// Config type helpers
export { defineConfig } from "./utils/types.js";
export type { ExtractLanguages, I18nexusConfig } from "./utils/types.js";

// URL localization helpers
export {
  getLanguageFromUrl,
  localizeUrl,
  removeLanguageFromUrl,
} from "./utils/url.js";
export type { LocalizedUrlOptions, LocalizedUrlStrategy } from "./utils/url.js";

// Devtools are available from "i18nexus/devtools".
// Server utilities are available only from "i18nexus/server".
// import { getTranslation } from "i18nexus/server";
// They are not exported from the package root to avoid bundling Node fs APIs.
