# API Reference

Current public API reference for `i18nexus` core.

## API Tracks

`i18nexus` exposes two client-side usage tracks:

- Beginner API: `I18nProvider` + root `useTranslation`.
- Advanced typed API: `createI18n`, which creates a typed provider/hook pair from a translation shape.

Devtools are intentionally split into the `i18nexus/devtools` subpath so the package root stays focused on the core runtime.

## Imports

```typescript
import {
  I18nProvider,
  createI18n,
  getLanguageFromUrl,
  localizeUrl,
  removeLanguageFromUrl,
  useLanguageSwitcher,
  useTranslation,
} from "i18nexus";

import type {
  CreateI18nInstance,
  CreateI18nOptions,
  CreateI18nUseTranslationReturn,
  I18nProviderProps,
  I18nTranslations,
  LocalizedUrlOptions,
  LocalizedUrlStrategy,
  NamespaceLoader,
  NamespaceTranslations,
  TranslationFunction,
  UseLanguageSwitcherReturn,
  UseTranslationReturn,
} from "i18nexus";

import { I18NexusDevtools } from "i18nexus/devtools";
import type { I18NexusDevtoolsProps } from "i18nexus/devtools";
```

## `I18nProvider`

React context provider for the beginner API.

### Signature

```typescript
function I18nProvider<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
>(props: I18nProviderProps<TTranslations>): JSX.Element;
```

### Props

```typescript
type NamespaceTranslations = Record<
  string,
  Record<string, Record<string, string>>
>;

type NamespaceLoader = (
  namespace: string,
  language: string
) => Promise<Record<string, string>>;

interface I18nProviderProps<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
> {
  children: React.ReactNode;
  languageManagerOptions?: LanguageManagerOptions;
  translations?: TTranslations;
  onLanguageChange?: (language: string) => void;
  initialLanguage?: string;
  loadNamespace?: NamespaceLoader;
  fallbackNamespace?: keyof TTranslations;
  preloadNamespaces?: Array<keyof TTranslations>;
}
```

### Notes

- Passing `loadNamespace` enables lazy mode automatically.
- `fallbackNamespace` is preloaded in lazy mode and merged before the requested namespace.
- `preloadNamespaces` loads extra namespaces ahead of first use.
- There is no public `lazy` prop and no `namespaceTranslations` prop. Use `translations`.

### Example

```tsx
import { I18nProvider } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save" },
    ko: { save: "저장" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const;

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      translations={translations}
      fallbackNamespace="common"
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

## `useTranslation(namespace?)`

Hook for client component translations.

### Signature

```typescript
function useTranslation<K extends string = string>(
  namespace?: string
): UseTranslationReturn<K>;
```

### Return Type

```typescript
interface UseTranslationReturn<K extends string = string> {
  t: TranslationFunction<K>;
  currentLanguage: string;
  lng: string;
  isReady: boolean;
}

type TranslationFunction<K extends string = string> = {
  (
    key: K,
    variables: TranslationVariables,
    styles: TranslationStyles
  ): React.ReactElement;
  (key: K, variables?: TranslationVariables): string;
};
```

### Behavior

- `t` is a render-snapshot lookup function, not an event emitter.
- Language changes and namespace loads update React state through the provider, causing components to re-render.
- Missing keys keep the current graceful behavior and return the key itself.
- In lazy mode, `useTranslation("home")` automatically requests the `home` namespace when it is not already available.
- `isReady` is `false` while provider loading or the requested lazy namespace is loading.

### Example

```tsx
"use client";

import { useTranslation } from "i18nexus";

export function HomeTitle() {
  const { t, currentLanguage, isReady } = useTranslation("home");

  if (!isReady) {
    return <p>Loading...</p>;
  }

  return <h1 lang={currentLanguage}>{t("title")}</h1>;
}
```

## `createI18n(translations, options?)`

Advanced typed API for apps that want namespace and key inference from a translation shape.

### Signature

```typescript
function createI18n<
  TTranslations extends I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
>(
  translations: TTranslations,
  options?: CreateI18nOptions<TTranslations, FallbackNamespace>
): CreateI18nInstance<TTranslations, FallbackNamespace>;
```

### Types

```typescript
type I18nTranslations = {
  readonly [namespace: string]: {
    readonly [language: string]: {
      readonly [key: string]: string;
    };
  };
};

interface CreateI18nOptions<
  TTranslations extends I18nTranslations = I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  fallbackNamespace?: FallbackNamespace;
  enableFallback?: boolean;
}

interface CreateI18nInstance<
  TTranslations extends I18nTranslations = I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  I18nProvider: React.ComponentType<
    Omit<
      I18nProviderProps<TTranslations>,
      "translations" | "fallbackNamespace"
    > & {
      translations?: TTranslations;
    }
  >;
  useTranslation: {
    (): CreateI18nUseTranslationReturn<string>;
    <NS extends keyof TTranslations & string>(
      namespace: NS
    ): CreateI18nUseTranslationReturn<string>;
  };
  translations: TTranslations;
  options: {
    fallbackNamespace?: FallbackNamespace;
    enableFallback: boolean;
  };
}
```

### Static Example

```tsx
import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save", cancel: "Cancel" },
    ko: { save: "저장", cancel: "취소" },
  },
  home: {
    en: { title: "Home", greeting: "Hello, {{name}}" },
    ko: { title: "홈", greeting: "안녕하세요, {{name}}님" },
  },
} as const satisfies I18nTranslations;

export const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

export const I18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;
```

```tsx
function HomeTitle() {
  const { t } = useAppTranslation("home");

  t("title");
  t("save");
  // t("missing"); // TypeScript error

  return <h1>{t("greeting", { name: "Alice" })}</h1>;
}
```

### Runtime Compatibility Note

Static `createI18n` currently preserves legacy flattened lookup behavior for backward compatibility. TypeScript narrows keys to the requested namespace plus fallback namespace, but old static runtime keys from other namespaces may still resolve until strict namespace behavior is introduced in a future cleanup.

## Lazy Namespace Loading

Lazy loading is configured on the provider, not on `CreateI18nOptions`.

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

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
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
      preloadNamespaces={["common"]}
    >
      {children}
    </i18n.I18nProvider>
  );
}
```

## `useLanguageSwitcher()`

Hook for language switching functionality.

```typescript
function useLanguageSwitcher<
  TLanguage extends string = string,
>(): UseLanguageSwitcherReturn<TLanguage>;

interface UseLanguageSwitcherReturn<TLanguage extends string = string> {
  currentLanguage: string;
  availableLanguages: LanguageConfig[];
  changeLanguage: (lang: TLanguage) => Promise<void>;
  switchLng: (lang: TLanguage) => Promise<void>;
  switchToNextLanguage: () => Promise<void>;
  switchToPreviousLanguage: () => Promise<void>;
  getLanguageConfig: (code?: TLanguage) => LanguageConfig | undefined;
  detectBrowserLanguage: () => string | null;
  resetLanguage: () => void;
  isLoading: boolean;
}
```

## URL Localization Helpers

Helpers for converting links when language is represented in a path prefix or
query parameter.

```typescript
type LocalizedUrlStrategy = "prefix" | "query";

interface LocalizedUrlOptions {
  strategy?: LocalizedUrlStrategy;
  languages?: readonly string[];
  defaultLanguage?: string;
  includeDefaultLanguage?: boolean;
  queryParam?: string;
  basePath?: string;
}

function localizeUrl(
  input: string,
  language: string,
  options?: LocalizedUrlOptions
): string;

function getLanguageFromUrl(
  input: string,
  options?: LocalizedUrlOptions
): string | undefined;

function removeLanguageFromUrl(
  input: string,
  options?: LocalizedUrlOptions
): string;
```

```typescript
const options = {
  languages: ["ko", "en", "ja"],
  defaultLanguage: "ko",
};

localizeUrl("/docs?tab=api", "en", options); // "/en/docs?tab=api"
localizeUrl("/en/docs", "ko", options); // "/docs"
getLanguageFromUrl("/ja/docs", options); // "ja"
removeLanguageFromUrl("/en/docs", options); // "/docs"

localizeUrl("/profile", "en", {
  strategy: "query",
  queryParam: "lng",
}); // "/profile?lng=en"
```

## Devtools Subpath

`I18NexusDevtools` is no longer exported from the package root. Import it from
`i18nexus/devtools` when you need visual debugging in development.

```tsx
import { I18nProvider } from "i18nexus";
import dynamic from "next/dynamic";

const I18NexusDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(
        () =>
          import("i18nexus/devtools").then((module) => module.I18NexusDevtools),
        { ssr: false }
      );

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <I18NexusDevtools position="bottom-right" />
    </I18nProvider>
  );
}
```

Mount it once inside the provider/client boundary so it can inspect the same
language state and lazy namespace state as the rest of the app. Keep the
subpath behind a dev-only dynamic import when possible so production bundles do
not eagerly load debugging UI.

## Server Functions

Server utilities are available only from `i18nexus/server` so that filesystem code is not bundled into client builds.

```typescript
import { getTranslation } from "i18nexus/server";

const { t, language } = await getTranslation("common");
```

See [Server API](./api/server.md) for server-specific details.
