# createI18n DX Necessity Audit

## Summary

`createI18n` should not be treated as removed. It still provides meaningful
type-inference value, and several core tests already rely on it as the typed
API layer.

Recommended direction:

- Keep `I18nProvider` and `useTranslation` as the beginner API.
- Reposition `createI18n` as the advanced typed API.
- Keep the package root focused on core runtime APIs.
- Move devtools to `i18nexus/devtools`.

## Current API Map

Current root exports from `i18nexus`:

- `I18nProvider`
- `useI18nContext`
- `useTranslation`
- `useLanguageSwitcher`
- `createI18n`
- `defineConfig`
- core public setup types such as `I18nTranslations`, `NamespaceLoader`,
  `LanguageConfig`, and `LanguageManagerOptions`

Current inconsistency:

- Historical docs and release notes may mention removed utilities.
- Current docs should point new users to the beginner API, `createI18n`, the
  `i18nexus/server` subpath, and the `i18nexus/devtools` subpath.

## Base API DX

The base API is the right beginner path.

Strengths:

- Smallest mental model: one Provider and one hook.
- Current root import works today.
- Good fit for gradual adoption and generated locale type imports.
- Lazy namespace loading works after the recent stabilization work.
- Easy to explain in README quick starts and LLM setup prompts.

Weaknesses:

- Namespace/key inference is weaker unless users import generated key types or
  manually provide generics.
- The README examples imply type safety, but do not show the full type source
  needed for autocomplete.
- Users can confuse runtime namespace loading with compile-time key inference.

Current supported example:

```tsx
import { I18nProvider, useTranslation } from "i18nexus";

function App({ children }: { children: React.ReactNode }) {
  return <I18nProvider initialLanguage="en">{children}</I18nProvider>;
}

function HomeTitle() {
  const { t, isReady } = useTranslation("home");

  if (!isReady) return null;
  return <h1>{t("title")}</h1>;
}
```

## createI18n DX

`createI18n` is useful when a project can provide a strongly typed translation
shape at setup time.

Strengths:

- Infers valid namespaces from the translation object.
- Narrows keys by namespace in `i18n.useTranslation("namespace")`.
- Encodes fallback namespace keys into the returned `t` type.
- Gives a cohesive typed bundle: `i18n.I18nProvider`, `i18n.useTranslation`,
  `i18n.translations`, and `i18n.options`.
- Now has lazy namespace parity with the base API.

Weaknesses:

- It is an advanced path, so it should not crowd the beginner quick start.
- Its current static runtime behavior remains legacy-flattened for backward
  compatibility, so type narrowing can be stricter than runtime lookup.
- Lazy-only users may need a type-only translation shape, which is less obvious
  than the beginner API.
- The `Legacy*` type names make the API feel deprecated even though the runtime
  path is still maintained.

Current package-root example:

```tsx
import { createI18n } from "i18nexus";

const translations = {
  common: {
    en: { welcome: "Welcome" },
    ko: { welcome: "환영합니다" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const;

const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

function HomeTitle() {
  const { t } = i18n.useTranslation("home");
  return <h1>{t("title")}</h1>;
}
```

## createI18nWithConfig DX

`createI18nWithConfig` added less user-facing value than `createI18n` and has
been removed during the core API diet.

Strengths:

- Reads `fallbackNamespace` and `enableFallback` from `i18nexus.config.json`.
- Can reduce duplicated setup when those options are already in config.

Weaknesses:

- It only reads a narrow subset of config.
- It can hide behavior behind a file-system read, which is less obvious in
  client runtime examples.
- It does not solve the main typing problem better than `createI18n`.
- It should not be promoted until the config/runtime boundary is more clearly
  documented.

Recommendation: do not reintroduce it unless a future config/runtime design
proves a clear advantage over explicit `createI18n` setup.

## Recommendation

Keep `createI18n`, but reposition it.

Decision:

- Beginner API: `I18nProvider` and root `useTranslation`.
- Advanced typed API: `createI18n`.
- Devtools API: `i18nexus/devtools` subpath.
- Server API: `i18nexus/server` subpath.

Why keep `createI18n`:

- It provides better namespace/key inference than the base API by default.
- It gives a clear place to bind app-specific translation types once.
- It is already actively tested and now shares the stabilized runtime path.

Why not make it the beginner API:

- It requires users to understand translation object/type shape up front.
- Lazy-only users may not have runtime translations in memory.
- Base API is still easier for quick starts, Next.js layouts, and LLM setup.

## Follow-Up Plan

Recommended next implementation step:

1. Keep testing root exports so removed utilities do not drift back into the
   public surface.
2. Add release notes that call out the breaking API diet and devtools subpath.
3. Consider a future strict namespace mode for `createI18n` once compatibility
   risk is acceptable.
