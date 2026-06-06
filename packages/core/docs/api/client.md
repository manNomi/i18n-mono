# Client-Side API Reference

Complete API reference for i18nexus client-side hooks and components.

## Import

```typescript
import {
  I18nProvider,
  createI18n,
  getLanguageFromUrl,
  localizeUrl,
  removeLanguageFromUrl,
  useTranslation,
  useLanguageSwitcher,
  useI18nContext,
} from "i18nexus";

import type {
  CreateI18nInstance,
  CreateI18nOptions,
  CreateI18nUseTranslationReturn,
  I18nTranslations,
  I18nProviderProps,
  LocalizedUrlOptions,
  LocalizedUrlStrategy,
  UseTranslationReturn,
  UseLanguageSwitcherReturn,
  TranslationVariables,
  TranslationStyles,
  TranslationFunction,
} from "i18nexus";

import { I18NexusDevtools } from "i18nexus/devtools";
import type { I18NexusDevtoolsProps } from "i18nexus/devtools";
```

---

## Components

### `<I18nProvider>`

Main provider component for i18n context.

```typescript
function I18nProvider<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
>(props: I18nProviderProps<TTranslations>): JSX.Element;
```

**Props:**

```typescript
type NamespaceLoader = (
  namespace: string,
  language: string
) => Promise<Record<string, string>>;

interface I18nProviderProps<
  TTranslations extends NamespaceTranslations = NamespaceTranslations,
> {
  children: ReactNode;
  languageManagerOptions?: LanguageManagerOptions;
  translations?: TTranslations;
  onLanguageChange?: (language: string) => void;
  initialLanguage?: string;
  loadNamespace?: NamespaceLoader;
  fallbackNamespace?: keyof TTranslations;
  preloadNamespaces?: Array<keyof TTranslations>;
}
```

**Example:**

```tsx
import { I18nProvider } from "i18nexus";

<I18nProvider
  initialLanguage="ko"
  languageManagerOptions={{
    defaultLanguage: "ko",
    availableLanguages: [
      { code: "ko", name: "한국어", flag: "🇰🇷" },
      { code: "en", name: "English", flag: "🇺🇸" },
    ],
  }}
  translations={translations}
  fallbackNamespace="common"
  onLanguageChange={(lang) => console.log("Changed to:", lang)}
>
  <App />
</I18nProvider>;
```

Passing `loadNamespace` enables lazy namespace loading automatically. There is no public `lazy` prop.

---

### `<I18NexusDevtools>`

Visual debugging tools for i18n (development only).

```typescript
function I18NexusDevtools(props: I18NexusDevtoolsProps): JSX.Element | null;
```

**Props:**

```typescript
interface I18NexusDevtoolsProps {
  initialIsOpen?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  panelStyles?: React.CSSProperties;
  buttonStyles?: React.CSSProperties;
}
```

**Features:**

- 🌐 Current language display
- 🔍 Browser language detection
- 🔄 Quick language switching
- 📊 Translation statistics
- ⚡ Returns `null` in production

**Example:**

```tsx
import dynamic from "next/dynamic";

const I18NexusDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(
        () =>
          import("i18nexus/devtools").then((module) => module.I18NexusDevtools),
        { ssr: false }
      );

<I18nProvider {...config}>
  <App />
  <I18NexusDevtools
    position="bottom-right"
    initialIsOpen={false}
    panelStyles={{ backgroundColor: "#1a1a1a" }}
  />
</I18nProvider>;
```

---

## Hooks

### `useTranslation(namespace?)`

Main hook for translation functions.

```typescript
function useTranslation<K extends string = string>(
  namespace?: string
): UseTranslationReturn<K>;
```

**Returns:**

```typescript
interface UseTranslationReturn {
  t: TranslationFunction;
  currentLanguage: string;
  lng: string;
  isReady: boolean;
}
```

**Translation Function:**

```typescript
interface TranslationFunction {
  // With styles - returns React.ReactElement
  (
    key: string,
    variables: TranslationVariables,
    styles: TranslationStyles
  ): React.ReactElement;

  // Without styles - returns string
  (key: string, variables?: TranslationVariables): string;
}
```

**Example:**

```tsx
import { useTranslation } from "i18nexus";

function MyComponent() {
  const { t, currentLanguage, isReady } = useTranslation("home");

  // Basic translation
  <h1>{t("Welcome")}</h1>

  // With variables
  <p>{t("Hello {{name}}", { name: "World" })}</p>

  // With styled variables
  <div>
    {t(
      "Price: {{amount}}",
      { amount: 100 },
      { amount: { color: "red", fontWeight: "bold" } }
    )}
  </div>

  // Multiple variables
  <p>{t("{{completed}} of {{total}} done", { completed: 7, total: 10 })}</p>
}
```

In lazy mode, `useTranslation("home")` automatically requests the `home` namespace when it is not already available. `isReady` is `false` while that namespace is loading.

---

### `createI18n(translations, options?)`

Advanced typed API for namespace/key inference from a translation shape.

```typescript
function createI18n<
  TTranslations extends I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
>(
  translations: TTranslations,
  options?: CreateI18nOptions<TTranslations, FallbackNamespace>
): CreateI18nInstance<TTranslations, FallbackNamespace>;
```

```tsx
import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save" },
    ko: { save: "저장" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const satisfies I18nTranslations;

export const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

export const I18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;
```

`createI18n` options only include `fallbackNamespace` and `enableFallback`. For lazy loading, pass `loadNamespace` and `preloadNamespaces` to `i18n.I18nProvider`.

---

### `useLanguageSwitcher()`

Hook for language switching functionality.

```typescript
function useLanguageSwitcher(): UseLanguageSwitcherReturn;
```

**Returns:**

```typescript
interface UseLanguageSwitcherReturn {
  currentLanguage: string;
  availableLanguages: LanguageConfig[];
  changeLanguage: (lang: string) => Promise<void>;
  switchLng: (lang: string) => Promise<void>; // Alias
  switchToNextLanguage: () => Promise<void>;
  switchToPreviousLanguage: () => Promise<void>;
  getLanguageConfig: (code?: string) => LanguageConfig | undefined;
  detectBrowserLanguage: () => string | null;
  resetLanguage: () => void;
  isLoading: boolean;
}
```

**Example:**

```tsx
import { useLanguageSwitcher } from "i18nexus";

function LanguageSwitcher() {
  const { currentLanguage, availableLanguages, changeLanguage, isLoading } =
    useLanguageSwitcher();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      disabled={isLoading}
    >
      {availableLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

---

### URL Localization Helpers

Helpers for path-prefix and query-parameter language URLs.

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

**Example:**

```typescript
const options = {
  languages: ["ko", "en"],
  defaultLanguage: "ko",
};

localizeUrl("/docs", "en", options); // "/en/docs"
localizeUrl("/en/docs", "ko", options); // "/docs"

localizeUrl("/settings", "en", {
  strategy: "query",
}); // "/settings?lang=en"
```

---

### `useI18nContext()`

Low-level hook to access i18n context directly.
Most apps should prefer `useTranslation()` and `useLanguageSwitcher()`.

```typescript
function useI18nContext(): I18nContext;
```

**Returns:**

```typescript
interface I18nContext {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  availableLanguages: LanguageConfig[];
  languageManager: LanguageManager;
  isLoading: boolean;
  namespaceTranslations: NamespaceTranslations;
  loadedNamespaces: Map<string, Record<string, Record<string, string>>>;
  loadingNamespaces: Set<string>;
}
```

**Example:**

```tsx
import { useI18nContext } from "i18nexus";

function DebugInfo() {
  const { currentLanguage, namespaceTranslations, isLoading } =
    useI18nContext();

  return (
    <div>
      <p>Current: {currentLanguage}</p>
      <p>Loading: {isLoading.toString()}</p>
      <p>Static namespaces: {Object.keys(namespaceTranslations).length}</p>
    </div>
  );
}
```

---

## Types

### `TranslationVariables`

Variables for string interpolation.

```typescript
type TranslationVariables = Record<string, string | number>;
```

**Usage:**

```typescript
const variables: TranslationVariables = {
  name: "User",
  count: 5,
  price: 1000,
};
```

---

### `TranslationStyles`

CSS styles for variables in Client Components.

```typescript
type TranslationStyles = Record<string, React.CSSProperties>;
```

**Usage:**

```typescript
const styles: TranslationStyles = {
  price: { color: "red", fontWeight: "bold" },
  discount: { color: "green" },
};

t("Price: {{price}} ({{discount}}% off)", variables, styles);
```

---

### `LanguageConfig`

Language configuration object.

```typescript
interface LanguageConfig {
  code: string;
  name: string;
  flag?: string;
  dir?: "ltr" | "rtl";
}
```

**Usage:**

```typescript
const languages: LanguageConfig[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
];
```

---

### `LanguageManagerOptions`

Options for language manager.

```typescript
interface LanguageManagerOptions {
  defaultLanguage?: string;
  availableLanguages?: LanguageConfig[];
  cookieName?: string;
  cookieOptions?: CookieOptions;
}
```

**Usage:**

```typescript
const options: LanguageManagerOptions = {
  defaultLanguage: "en",
  availableLanguages: [
    { code: "en", name: "English" },
    { code: "ko", name: "한국어" },
  ],
  cookieName: "i18n-language",
  cookieOptions: {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    path: "/",
    sameSite: "lax",
  },
};
```

---

## Advanced Usage

### Custom Language Switcher with Flags

```tsx
function FlagSwitcher() {
  const { currentLanguage, availableLanguages, changeLanguage } =
    useLanguageSwitcher();

  return (
    <div className="flex gap-2">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={currentLanguage === lang.code ? "active" : ""}
        >
          <span className="text-2xl">{lang.flag}</span>
          <span className="sr-only">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
```

### Conditional Rendering Based on Language

```tsx
function ConditionalContent() {
  const { currentLanguage } = useTranslation();

  return (
    <>
      {currentLanguage === "ko" && <KoreanSpecificComponent />}
      {currentLanguage === "en" && <EnglishSpecificComponent />}
      <UniversalComponent />
    </>
  );
}
```

### Loading State Handling

```tsx
function TranslatedContent() {
  const { t, isReady } = useTranslation();

  if (!isReady) {
    return <div>Loading translations...</div>;
  }

  return <div>{t("Content")}</div>;
}
```

---

## Best Practices

### 1. Keep Supported Languages Centralized

```typescript
// i18nexus.config.ts
export const config = defineConfig({
  languages: ["en", "ko", "ja"] as const,
  defaultLanguage: "en",
});

export type AppLanguages = (typeof config.languages)[number];

// Component
const { changeLanguage } = useLanguageSwitcher();
changeLanguage("en");
```

### 2. Memoize Styled Translations

```tsx
import { useMemo } from "react";

function ExpensiveComponent() {
  const { t } = useTranslation();

  const styledText = useMemo(
    () => t("Price: {{amount}}", { amount: 100 }, { amount: { color: "red" } }),
    [t]
  );

  return <div>{styledText}</div>;
}
```

### 3. Extract Translation Keys

```typescript
// constants/translationKeys.ts
export const TRANSLATION_KEYS = {
  WELCOME: "Welcome",
  HELLO_NAME: "Hello {{name}}",
  ITEMS_COUNT: "{{count}} items",
} as const;

// Component
function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t(TRANSLATION_KEYS.WELCOME)}</h1>;
}
```

---

## See Also

- [Server API](./server.md)
- [Types Reference](./types.md)
- [Interpolation Guide](../guides/interpolation.md)
- [DevTools Guide](../guides/devtools.md)
