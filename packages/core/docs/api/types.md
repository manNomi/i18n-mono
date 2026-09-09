# TypeScript Types Reference

Complete TypeScript types reference for i18nexus.

## Configuration Types

### `I18nexusConfig<TLanguages>`

Configuration type for i18nexus.

```typescript
interface I18nexusConfig<
  TLanguages extends readonly string[] = readonly string[],
> {
  languages: TLanguages;
  defaultLanguage: TLanguages[number];
  localesDir?: string;
  sourcePattern?: string;
  translationImportSource?: string;
}
```

**Example:**

```typescript
import { defineConfig } from "i18nexus";

export const config: I18nexusConfig<readonly ["en", "ko", "ja"]> = {
  languages: ["en", "ko", "ja"] as const,
  defaultLanguage: "en",
  localesDir: "./locales",
  sourcePattern: "app/**/*.{ts,tsx}",
  translationImportSource: "i18nexus",
};
```

---

### `ExtractLanguages<T>`

Utility type to extract language union from config.

```typescript
type ExtractLanguages<T extends I18nexusConfig<readonly string[]>> =
  T["languages"][number];
```

**Example:**

```typescript
import type { ExtractLanguages } from "i18nexus";

const config = defineConfig({
  languages: ["en", "ko", "ja"] as const,
  defaultLanguage: "en",
});

type AppLanguages = ExtractLanguages<typeof config>;
// Type: "en" | "ko" | "ja"
```

---

## Translation Types

### `TranslationVariables`

Variables for client-side string interpolation.

```typescript
type TranslationVariables = Record<string, string | number>;
```

**Example:**

```typescript
const variables: TranslationVariables = {
  name: "John",
  age: 25,
  price: 1000,
  count: 5,
};
```

---

### `ServerTranslationVariables`

Variables for server-side string interpolation.

```typescript
type ServerTranslationVariables = Record<string, string | number>;
```

**Example:**

```typescript
import type { ServerTranslationVariables } from "i18nexus/server";

const variables: ServerTranslationVariables = {
  user: "Admin",
  count: 10,
};
```

---

### `TranslationStyles`

CSS styles for client-side variable styling.

```typescript
type TranslationStyles = Record<string, React.CSSProperties>;
```

**Example:**

```typescript
const styles: TranslationStyles = {
  price: {
    color: "red",
    fontWeight: "bold",
    fontSize: "1.5em",
  },
  discount: {
    color: "green",
    textDecoration: "line-through",
  },
};
```

---

### `VariableStyle`

Single variable style type.

```typescript
type VariableStyle = React.CSSProperties;
```

---

### `TranslationFunction`

Translation function with overloads.

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

```typescript
const t: TranslationFunction = useTranslation().t;

// String return
const text: string = t("Hello {{name}}", { name: "World" });

// React element return
const element: React.ReactElement = t(
  "Price: {{amount}}",
  { amount: 100 },
  { amount: { color: "red" } }
);
```

---

## Hook Return Types

### `UseTranslationReturn`

Return type of `useTranslation()` hook.

```typescript
interface UseTranslationReturn {
  t: TranslationFunction;
  currentLanguage: string;
  lng: string;
  isReady: boolean;
}
```

**Example:**

```typescript
import type { UseTranslationReturn } from "i18nexus";

const translationResult: UseTranslationReturn = useTranslation();
```

---

### `UseLanguageSwitcherReturn`

Return type of `useLanguageSwitcher()` hook.

```typescript
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

---

## Component Props Types

### `NamespaceTranslations`

Namespace-based translation object.

```typescript
type NamespaceTranslations = Record<
  string,
  Record<string, Record<string, string>>
>;
```

---

### `NamespaceLoader`

Lazy namespace loader function.

```typescript
type NamespaceLoader = (
  namespace: string,
  language: string
) => Promise<Record<string, string>>;
```

---

### `I18nProviderProps<TTranslations>`

Props for `I18nProvider` component.

```typescript
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

---

### `I18nTranslations`

Translation shape accepted by `createI18n`.

```typescript
type I18nTranslations = {
  readonly [namespace: string]: {
    readonly [language: string]: {
      readonly [key: string]: string;
    };
  };
};
```

---

### `CreateI18nOptions`

Options for the advanced typed `createI18n` API.

```typescript
interface CreateI18nOptions<
  TTranslations extends I18nTranslations = I18nTranslations,
  FallbackNamespace extends keyof TTranslations & string = never,
> {
  fallbackNamespace?: FallbackNamespace;
  enableFallback?: boolean;
}
```

`loadNamespace` and `preloadNamespaces` are provider props, not `createI18n` options.

---

### `CreateI18nInstance`

Return type of `createI18n`.

```typescript
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

---

### `CreateI18nUseTranslationReturn`

Return type of `createI18n(...).useTranslation`.

```typescript
type CreateI18nUseTranslationReturn<K extends string = string> =
  LegacyUseTranslationReturn<K>;
```

---

### `I18NexusDevtoolsProps`

Props for `I18NexusDevtools`. Import this type from the devtools subpath.

```typescript
import type { I18NexusDevtoolsProps } from "i18nexus/devtools";
```

```typescript
interface I18NexusDevtoolsProps {
  initialIsOpen?: boolean;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  panelStyles?: React.CSSProperties;
  buttonStyles?: React.CSSProperties;
}
```

---

## Language Types

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

**Example:**

```typescript
const languages: LanguageConfig[] = [
  { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "ko", name: "한국어", flag: "🇰🇷", dir: "ltr" },
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

---

## Cookie Option Shape

### `CookieOptions`

Options accepted through `LanguageManagerOptions.cookieOptions`. Cookie helper
functions are internal and are not exported from the package root.

```typescript
interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}
```

**Example:**

```typescript
const cookieOptions: CookieOptions = {
  maxAge: 365 * 24 * 60 * 60, // 1 year
  path: "/",
  secure: true,
  sameSite: "lax",
};
```

---

## Advanced Type Usage

### Type-Safe Language Switcher

```typescript
import type { ExtractLanguages } from "i18nexus";
import { config } from "./i18nexus.config";

type AppLanguages = ExtractLanguages<typeof config>;

function TypeSafeSwitcher() {
  const { changeLanguage } = useLanguageSwitcher();

  changeLanguage("en");
  changeLanguage("ko");

  return null;
}
```

---

### Generic Translation Component

```typescript
import type { TranslationVariables, TranslationStyles } from "i18nexus";

interface TranslatedTextProps {
  tKey: string;
  variables?: TranslationVariables;
  styles?: TranslationStyles;
}

function TranslatedText({ tKey, variables, styles }: TranslatedTextProps) {
  const { t } = useTranslation();

  return <span>{styles ? t(tKey, variables!, styles) : t(tKey, variables)}</span>;
}
```

---

### Custom Hook with Types

```typescript
import type { UseTranslationReturn } from "i18nexus";

function useFormattedDate(date: Date): string {
  const { t, currentLanguage }: UseTranslationReturn = useTranslation();

  const formatted = new Intl.DateTimeFormat(currentLanguage).format(date);

  return t("Date: {{date}}", { date: formatted });
}
```

---

## Type Guards

### Language Code Type Guard

```typescript
import type { ExtractLanguages } from "i18nexus";
import { config } from "./i18nexus.config";

type AppLanguages = ExtractLanguages<typeof config>;

function isValidLanguage(lang: string): lang is AppLanguages {
  return config.languages.includes(lang as AppLanguages);
}

// Usage
const userLang: string = getUserLanguage();

if (isValidLanguage(userLang)) {
  changeLanguage(userLang); // Type: AppLanguages
}
```

---

## Utility Types

### Extract Translation Keys

```typescript
type TranslationKeys<T extends Record<string, Record<string, string>>> =
  keyof T[keyof T];

// Usage
const translations = {
  en: { Welcome: "Welcome", Hello: "Hello" },
  ko: { Welcome: "환영합니다", Hello: "안녕하세요" },
};

type Keys = TranslationKeys<typeof translations>;
// Type: "Welcome" | "Hello"
```

---

### Language Direction Type

```typescript
type LanguageDirection = "ltr" | "rtl";

function getDirection(lang: string): LanguageDirection {
  return lang === "ar" || lang === "he" ? "rtl" : "ltr";
}
```

---

## Type-Safe Configuration Example

Complete type-safe setup:

```typescript
// src/i18n-config.ts (imported by application code; not auto-discovered)
import { defineConfig } from "i18nexus";
import type { ExtractLanguages } from "i18nexus";

export const config = defineConfig({
  languages: ["en", "ko", "ja", "zh"] as const,
  defaultLanguage: "en",
  localesDir: "./locales",
  sourcePattern: "app/**/*.{ts,tsx}",
  translationImportSource: "i18nexus",
});

export type AppLanguages = ExtractLanguages<typeof config>;

// App.tsx
import type { AppLanguages } from "./src/i18n-config";
import type {
  UseTranslationReturn,
  UseLanguageSwitcherReturn,
  TranslationVariables,
} from "i18nexus";

function App() {
  const { t, currentLanguage }: UseTranslationReturn = useTranslation();

  const { changeLanguage }: UseLanguageSwitcherReturn<AppLanguages> =
    useLanguageSwitcher<AppLanguages>();

  const variables: TranslationVariables = {
    user: "John",
    count: 5,
  };

  return (
    <div>
      <h1>{t("Welcome {{user}}", variables)}</h1>
      <button onClick={() => changeLanguage("ko")}>한국어</button>
    </div>
  );
}
```

---

## See Also

- [Server API](./server.md)
- [Client API](./client.md)
- [Typed Config Guide](../guides/typed-config.md)
