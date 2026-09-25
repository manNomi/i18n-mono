export const DEFAULT_DEMO_LANGUAGE = "en";
export const DEMO_LANGUAGE_COOKIE = "i18n-language";
export function resolveDemoLanguage(value?: string): "en" | "ko" {
  return value === "ko" ? "ko" : DEFAULT_DEMO_LANGUAGE;
}
