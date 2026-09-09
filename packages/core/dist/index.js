// Core runtime API
export { I18nProvider, useI18nContext } from "./components/I18nProvider.js";
export { createFormatter } from "./utils/formatter.js";
// Hooks
export { useTranslation, useLanguageSwitcher } from "./hooks/useTranslation.js";
export { useFormatter } from "./hooks/useFormatter.js";
// Advanced typed API
export { createI18n } from "./utils/createI18n.js";
// Config type helpers
export { defineConfig } from "./utils/types.js";
// URL localization helpers
export { getLanguageFromUrl, localizeUrl, removeLanguageFromUrl, } from "./utils/url.js";
// Devtools are available from "i18nexus/devtools".
// Server utilities are available only from "i18nexus/server".
// import { getTranslation } from "i18nexus/server";
// They are not exported from the package root to avoid bundling Node fs APIs.
//# sourceMappingURL=index.js.map