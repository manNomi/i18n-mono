# Lazy Namespace Loading

## Overview

i18nexus supports namespace-level lazy loading. This lets an app ship a small initial translation shape and load page or feature namespaces only when a component asks for them.

Lazy loading is configured on `I18nProvider` through `loadNamespace(namespace, language)`. It is not configured on `createI18n` options.

## Beginner API Example

```tsx
import { I18nProvider, useTranslation } from "i18nexus";

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

const translations = {} as AppTranslations;

async function loadNamespace(namespace: string, language: string) {
  const module = await import(`./locales/${namespace}/${language}.json`);
  return module.default;
}

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      translations={translations}
      loadNamespace={loadNamespace}
      fallbackNamespace="common"
      preloadNamespaces={["common"]}
      languageManagerOptions={{
        defaultLanguage: "en",
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "ko", name: "한국어" },
        ],
      }}
    >
      {children}
    </I18nProvider>
  );
}

function HomePage() {
  const { t, isReady } = useTranslation("home");

  if (!isReady) {
    return <p>Loading...</p>;
  }

  return <h1>{t("title")}</h1>;
}
```

## Advanced Typed API Example

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

export const I18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      loadNamespace={async (namespace, language) => {
        const module = await import(`./locales/${namespace}/${language}.json`);
        return module.default;
      }}
      preloadNamespaces={["common"]}
      languageManagerOptions={{
        defaultLanguage: "en",
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "ko", name: "한국어" },
        ],
      }}
    >
      {children}
    </I18nProvider>
  );
}
```

## Behavior

- Passing `loadNamespace` enables lazy mode automatically.
- `useTranslation("home")` requests `home` when it is neither statically available nor already loaded.
- The provider loads all configured languages for a namespace so language switching works after the namespace is loaded.
- Duplicate in-flight loads for the same namespace are deduped.
- `fallbackNamespace` is merged before the requested namespace, so requested keys override fallback keys.
- Missing keys continue to return the key itself.
- Failed namespace loads are marked as resolved for readiness and do not retry infinitely on every render.

## Provider Props

```typescript
type NamespaceLoader = (
  namespace: string,
  language: string,
) => Promise<Record<string, string>>;

interface I18nProviderProps<TTranslations extends NamespaceTranslations> {
  translations?: TTranslations;
  loadNamespace?: NamespaceLoader;
  fallbackNamespace?: keyof TTranslations;
  preloadNamespaces?: Array<keyof TTranslations>;
  initialLanguage?: string;
  languageManagerOptions?: LanguageManagerOptions;
}
```

## `createI18n` Options

`createI18n` options intentionally stay small:

```typescript
interface CreateI18nOptions<
  TTranslations extends I18nTranslations = I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  fallbackNamespace?: FallbackNamespace;
  enableFallback?: boolean;
}
```

Do not pass `lazy`, `loadNamespace`, or `preloadNamespaces` to `createI18n`. Pass those loading props to `i18n.I18nProvider` instead.

## Bundle Size Guidance

### Small projects, fewer than 5 namespaces

Static translations are usually simplest. Lazy loading may not save enough bundle size to justify the extra moving parts.

### Medium projects, 5 to 20 namespaces

Lazy loading with `fallbackNamespace` and a small `preloadNamespaces` list gives a good balance of performance and UX.

### Large projects, 20 or more namespaces

Lazy loading page and feature namespaces keeps the initial bundle smaller. Prefer preloading only shared namespaces such as `common`.

## Common Mistakes

### Passing lazy options to `createI18n`

```typescript
createI18n(translations, {
  // Not supported here
  // lazy: true,
  // loadNamespace,
  fallbackNamespace: "common",
});
```

Use provider props instead:

```tsx
<i18n.I18nProvider loadNamespace={loadNamespace} preloadNamespaces={["common"]}>
  <App />
</i18n.I18nProvider>
```

### Forgetting `isReady`

Lazy translations are async. Read `isReady` before rendering UI that must not show fallback keys.

```tsx
const { t, isReady } = useAppTranslation("home");

if (!isReady) {
  return <p>Loading...</p>;
}

return <h1>{t("title")}</h1>;
```
