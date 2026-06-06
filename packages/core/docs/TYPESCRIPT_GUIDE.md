# TypeScript Guide

This guide covers the current public TypeScript surface of `i18nexus` after the
core API diet. The beginner API stays small, and the advanced typed API is
`createI18n`.

## Quick Start

```bash
npm install i18nexus
```

TypeScript declarations are included in the package.

## Beginner API

Use `I18nProvider` and `useTranslation` when you want the smallest setup.

```tsx
import { I18nProvider, useTranslation } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save" },
    ko: { save: "저장" },
  },
};

function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider initialLanguage="en" translations={translations}>
      {children}
    </I18nProvider>
  );
}

function SaveButton() {
  const { t } = useTranslation("common");
  return <button>{t("save")}</button>;
}
```

The root hook accepts an optional generic when you want local key narrowing.

```tsx
const { t } = useTranslation<"save" | "cancel">("common");

t("save");
// t("missing"); // TypeScript error
```

## Advanced Typed API

Use `createI18n` when you can provide a translation shape and want namespace/key
autocomplete from one setup point.

```tsx
import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save", cancel: "Cancel" },
    ko: { save: "저장", cancel: "취소" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const satisfies I18nTranslations;

export const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

export const AppI18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;
```

```tsx
function HomeTitle() {
  const { t } = useAppTranslation("home");

  t("title");
  t("save"); // fallback namespace key
  // t("unknown"); // TypeScript error

  return <h1>{t("title")}</h1>;
}
```

## Lazy Namespace Types

Lazy-only apps may not keep all translations in memory. In that case, pass a
translation type shape to `createI18n` and provide runtime data through
`loadNamespace` on the provider.

```tsx
import { createI18n } from "i18nexus";

type AppTranslations = {
  common: {
    en: { loading: string };
    ko: { loading: string };
  };
  home: {
    en: { title: string };
    ko: { title: string };
  };
};

const i18n = createI18n({} as AppTranslations, {
  fallbackNamespace: "common",
});

function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <i18n.I18nProvider
      initialLanguage="en"
      languageManagerOptions={{
        defaultLanguage: "en",
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "ko", name: "한국어" },
        ],
      }}
      loadNamespace={async (namespace, language) => {
        const module = await import(`../locales/${namespace}/${language}.json`);
        return module.default;
      }}
    >
      {children}
    </i18n.I18nProvider>
  );
}
```

## Public Types

The package root exports the types needed for app setup:

```ts
import type {
  CreateI18nInstance,
  CreateI18nOptions,
  CreateI18nUseTranslationReturn,
  I18nContextType,
  I18nProviderProps,
  I18nTranslations,
  LanguageConfig,
  LanguageManagerOptions,
  NamespaceLoader,
  NamespaceTranslations,
  TranslationFunction,
  TranslationStyles,
  TranslationVariables,
  UseLanguageSwitcherReturn,
  UseTranslationReturn,
} from "i18nexus";
```

URL localization helpers and their option types are exported from the package
root:

```ts
import {
  getLanguageFromUrl,
  localizeUrl,
  removeLanguageFromUrl,
  type LocalizedUrlOptions,
  type LocalizedUrlStrategy,
} from "i18nexus";

const options: LocalizedUrlOptions = {
  languages: ["en", "ko"],
  defaultLanguage: "ko",
};

localizeUrl("/docs", "en", options);
```

`I18NexusDevtoolsProps` is exported from the devtools subpath:

```ts
import type { I18NexusDevtoolsProps } from "i18nexus/devtools";
```

## Runtime Notes

- `t` is a render-snapshot lookup function. Provider state changes trigger
  React re-renders; `t` itself is not a signal or event emitter.
- Missing keys still return the key string.
- `createI18n` preserves legacy flattened static lookup at runtime for backward
  compatibility, while its TypeScript surface narrows keys by namespace and
  fallback namespace.
- Standalone typed/dynamic utility helpers were removed from the public API.
  Prefer `createI18n` for typed translations and ordinary functions for local
  key composition.

## Best Practices

- Use `I18nProvider` and `useTranslation` for quick starts and gradual adoption.
- Use `createI18n` when namespace/key inference is valuable.
- Use `as const satisfies I18nTranslations` for static translation objects.
- Keep `loadNamespace(namespace, language)` small and predictable in lazy apps.
- Import devtools from `i18nexus/devtools`, not from the package root.

## See Also

- [API Reference](./API_REFERENCE.md)
- [Namespace Translations Guide](./NAMESPACE_TRANSLATIONS.md)
- [Lazy Loading](./LAZY_LOADING.md)
- [Devtools Guide](./guides/devtools.md)
