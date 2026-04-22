import {
  createI18n,
  type CreateI18nInstance,
  type CreateI18nOptions,
  type LegacyNamespaceTranslations,
} from "./createI18n";
import { loadI18nexusConfig } from "./config-loader";

export function createI18nWithConfig<
  TTranslations extends LegacyNamespaceTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
>(
  translations: TTranslations,
  options: CreateI18nOptions<TTranslations, FallbackNamespace> = {},
): CreateI18nInstance<TTranslations, FallbackNamespace> {
  const config = loadI18nexusConfig("i18nexus.config.json", { silent: true });

  const fallbackNamespace = (options.fallbackNamespace ??
    config?.fallbackNamespace) as FallbackNamespace | undefined;
  const enableFallback =
    options.enableFallback ?? config?.enableFallback ?? true;

  return createI18n(translations, {
    fallbackNamespace,
    enableFallback,
  });
}
