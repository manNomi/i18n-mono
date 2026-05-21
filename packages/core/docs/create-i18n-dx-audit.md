# createI18n DX Necessity Audit

## Summary

`createI18n` should not be treated as removed. It still provides meaningful
type-inference value, and several core tests already rely on it as the typed
API layer.

Recommended direction:

- Keep `I18nProvider` and `useTranslation` as the beginner API.
- Reposition `createI18n` as the advanced typed API.
- Do not promote `createI18nWithConfig` as a primary user API yet.
- Fix the root export and README mismatch in a follow-up change.

## Current API Map

Current root exports from `i18nexus`:

- `I18nProvider`
- `useI18nContext`
- `useTranslation`
- `useLanguageSwitcher`
- `I18NexusDevtools`
- typed utility helpers such as `createTypedTranslation`
- `LanguageManager`
- `defineConfig`

Current non-root utilities still present in source:

- `createI18n`
- `createI18nWithConfig`

Current inconsistency:

- `packages/core/src/index.ts` says `createI18n` and `createI18nWithConfig`
  were removed.
- `createI18n` is still implemented and covered by a large test suite.
- README claims type-safe i18n, but the quick start documents only the base
  `I18nProvider` and `useTranslation` path.

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

- It is not exported from the package root today.
- Its current static runtime behavior remains legacy-flattened for backward
  compatibility, so type narrowing can be stricter than runtime lookup.
- Lazy-only users may need a type-only translation shape, which is less obvious
  than the beginner API.
- The `Legacy*` type names make the API feel deprecated even though the runtime
  path is still maintained.

Current internal/source-only example:

```tsx
// Current source utility, not a current package-root export.
import { createI18n } from "./utils/createI18n";

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

Proposed future package-root example if this API is promoted:

```tsx
import { createI18n } from "i18nexus";

const i18n = createI18n(translations);
```

## createI18nWithConfig DX

`createI18nWithConfig` currently adds less user-facing value than `createI18n`.

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

Recommendation: keep it as internal or legacy-compatible for now.

## Recommendation

Keep `createI18n`, but reposition it.

Decision:

- Beginner API: `I18nProvider` and root `useTranslation`.
- Advanced typed API: `createI18n`.
- Config convenience API: `createI18nWithConfig`, not promoted yet.

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

1. Re-export `createI18n` and its public types from the package root.
2. Keep `createI18nWithConfig` non-promoted unless docs explicitly label it
   experimental or legacy-compatible.
3. Rename public-facing `Legacy*` types before root export, or export friendlier
   aliases while preserving the internal names.
4. Update README with two tracks:
   - Quick Start: `I18nProvider` and `useTranslation`.
   - Advanced Type Safety: `createI18n`.
5. Add an explicit note that static `createI18n` lookup is currently
   legacy-flattened at runtime, while types are namespace-narrowed.
