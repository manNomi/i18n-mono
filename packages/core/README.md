# 🌐 i18nexus

> Type-safe i18n for React with zero runtime overhead

[English](./README.md) | [한국어](./README.ko.md)

[![NPM Version](https://img.shields.io/npm/v/i18nexus)](https://www.npmjs.com/package/i18nexus)
[![NPM Downloads](https://img.shields.io/npm/dm/i18nexus)](https://www.npmjs.com/package/i18nexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ Features

### 🔒 Full Type Safety

- Auto-completion for translation keys
- Compile-time validation for translation keys and variables
- Type inference without explicit generics
- Interpolation variable type checking

### ⚡ Modern React Support

- Next.js 14+ App Router support
- Server Components translation
- Client Components translation
- React Server Actions support

### 🌍 Flexible Namespace Management

- Page-based translation file organization
- Component-based translation management
- Dynamic namespace loading
- Fallback namespace support

### 🎯 Developer Friendly

- Zero configuration for quick start
- Intuitive API design
- Comprehensive TypeScript types
- Rich documentation and examples

### 🔥 Performance Optimized

- Lightweight bundle size
- Lazy loading support
- Efficient memory usage
- Hot Module Replacement support

## 📦 Installation

```bash
npm install i18nexus
# or
yarn add i18nexus
# or
pnpm add i18nexus
```

## 🚀 Quick Start

### 1. Create Translation Files

Create translation files in `locales/[namespace]/[lang].json`:

```
locales/
├── common/
│   ├── en.json
│   └── ko.json
└── home/
    ├── en.json
    └── ko.json
```

```json
// locales/common/en.json
{
  "welcome": "Welcome",
  "hello": "Hello, {{name}}"
}
```

```json
// locales/common/ko.json
{
  "welcome": "환영합니다",
  "hello": "안녕하세요, {{name}}님"
}
```

### 2. Setup Provider

For Next.js App Router, keep the Provider behind a small Client Component
wrapper:

```tsx
// app/i18n-provider.tsx
"use client";

import { I18nProvider } from "i18nexus";

export function I18nClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <I18nProvider initialLanguage="en">{children}</I18nProvider>;
}
```

```tsx
// app/layout.tsx
import { I18nClientProvider } from "./i18n-provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <I18nClientProvider>{children}</I18nClientProvider>
      </body>
    </html>
  );
}
```

### 3. Use in Components

This Quick Start uses the beginner-friendly `I18nProvider` and
`useTranslation` API. If you want namespace and key autocomplete from a typed
translation object, see
[Advanced Type Safety with createI18n](#advanced-type-safety-with-createi18n).

#### Client Component

```tsx
"use client";
import { useTranslation } from "i18nexus";

export default function Welcome() {
  const { t } = useTranslation("common");

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <p>{t("hello", { name: "John" })}</p>
    </div>
  );
}
```

#### Server Component

```tsx
import { getTranslation } from "i18nexus/server";

export default async function WelcomeServer() {
  const { t } = await getTranslation("common");

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <p>{t("hello", { name: "John" })}</p>
    </div>
  );
}
```

## 📖 API Reference

### `useTranslation(namespace)`

Hook for using translations in Client Components.

**Parameters:**

- `namespace` (string): The namespace to load translations from

**Returns:**

- `t(key, variables?, styles?)` - Translation function
- `currentLanguage` (or `lng`) - Current language code
- `isReady` - Whether translations are loaded

**Example:**

```tsx
const { t, currentLanguage, isReady } = useTranslation("home");

// Basic usage
t("title"); // Looks up "title" in the home namespace

// With variables
t("greeting", { name: "Alice" });

// With styles (returns ReactElement)
t("styled", {}, { bold: { fontWeight: "bold" } });
```

### `createI18n(translations, options)`

Advanced typed API for apps that want namespace and key inference from a
translation shape.

Use this when you want TypeScript to autocomplete keys for each namespace while
keeping the simple provider/hook runtime model.

```tsx
import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    en: {
      save: "Save",
      cancel: "Cancel",
    },
    ko: {
      save: "저장",
      cancel: "취소",
    },
  },
  home: {
    en: {
      title: "Home",
      greeting: "Hello, {{name}}",
    },
    ko: {
      title: "홈",
      greeting: "안녕하세요, {{name}}님",
    },
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

  t("title"); // OK: home namespace key
  t("save"); // OK: fallback common namespace key
  t("missing"); // TypeScript error

  return <h1>{t("greeting", { name: "Alice" })}</h1>;
}
```

Important runtime note: static `createI18n` currently keeps a legacy flattened
lookup for backward compatibility. TypeScript narrows keys to the requested
namespace plus fallback namespace, but old static runtime keys from other
namespaces may still resolve until strict namespace behavior is introduced in a
future cleanup.

#### Lazy Namespaces with `createI18n`

For lazy apps, pass an empty typed translation shape and provide
`loadNamespace(namespace, language)` to the provider. `isReady` is `false` while
the requested namespace is loading.

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
    </I18nProvider>
  );
}

function HomePage() {
  const { t, isReady } = useAppTranslation("home");

  if (!isReady) {
    return <p>Loading...</p>;
  }

  return <h1>{t("title")}</h1>;
}
```

### `getTranslation(namespace)`

Function for getting translations in Server Components.

**Parameters:**

- `namespace` (string): The namespace to load translations from

**Returns:**

- `t(key, variables?, styles?)` - Translation function
- `language` (or `lng`) - Current language code

**Example:**

```tsx
const { t, language } = await getTranslation("home");

console.log(language); // "en" or "ko"
t("title"); // ✅ Type-safe
```

### `useLanguageSwitcher()`

Hook for language switching functionality.

**Returns:**

- `currentLanguage` - Current language code
- `changeLanguage(lang)` - Function to change language
- `availableLanguages` - List of available languages

**Example:**

```tsx
"use client";
import { useLanguageSwitcher } from "i18nexus";

export function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, availableLanguages } =
    useLanguageSwitcher();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map((lang) => (
        <option key={lang} value={lang}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

## 🎨 Advanced Usage

### Namespace Organization

Organize translation files by page or feature:

```
locales/
├── common/          # Shared translations
│   ├── en.json
│   └── ko.json
├── constant/        # Constant values (dropdowns, labels)
│   ├── en.json
│   └── ko.json
└── home/            # Page-specific translations
    ├── en.json
    └── ko.json
```

### Type-Safe Constants

Use namespace-specific types for type-safe constants:

```tsx
import { useTranslation } from "i18nexus";
import type { ConstantKeys } from "@/locales/types/i18nexus";

const CATEGORY_OPTIONS: ConstantKeys[] = [
  "category.all",
  "category.tech",
  "category.design",
];

function CategoryDropdown() {
  const { t } = useTranslation("constant");

  return (
    <select>
      {CATEGORY_OPTIONS.map((key) => (
        <option key={key} value={key}>
          {t(key)} {/* ✅ Type-safe */}
        </option>
      ))}
    </select>
  );
}
```

### Dynamic Keys

For dynamic keys, explicitly type them as `ConstantKeys`:

```tsx
import type { ConstantKeys } from "@/locales/types/i18nexus";

function DynamicLabel({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation("constant");

  // Cast dynamic key to ConstantKeys
  return <span>{t(labelKey as ConstantKeys)}</span>;
}
```

### Passing `t` as Props

When passing `t` as a prop, it automatically defaults to the `common` namespace:

```tsx
// Parent component
function ParentComponent() {
  const { t } = useTranslation("common"); // Explicit namespace
  return <ChildComponent t={t} />;
}

// Child component
function ChildComponent({ t }: { t: (key: string) => string }) {
  return <p>{t("welcome")}</p>; // ✅ Uses common namespace
}
```

### Styled Translations

Apply inline styles to parts of translated text:

```tsx
// Translation file
{
  "terms": "I agree to the <bold>Terms</bold> and <link>Privacy Policy</link>"
}

// Component
const { t } = useTranslation("legal");

const styledText = t("terms", {}, {
  bold: { fontWeight: "bold" },
  link: { color: "blue", textDecoration: "underline" }
});

return <div>{styledText}</div>; // Returns ReactElement
```

### Variable Interpolation

TypeScript validates required variables:

```tsx
// Translation file
{
  "greeting": "Hello, {{name}}!",
  "stats": "You have {{count}} new messages"
}

// Component
const { t } = useTranslation("messages");

t("greeting", { name: "Alice" }); // ✅ OK
t("greeting"); // ❌ TypeScript error: 'name' is required

t("stats", { count: 5 }); // ✅ OK
t("stats", { total: 5 }); // ❌ TypeScript error: 'count' is required
```

## ⚙️ Configuration

### i18nexus.config.json

Create a configuration file in your project root:

```json
{
  "sourcePattern": "src/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "languages": ["en", "ko"],
  "defaultLanguage": "en",
  "localesDir": "./locales",
  "fallbackNamespace": "common"
}
```

**Options:**

- `sourcePattern` - Pattern for source files to extract translations from
- `translationImportSource` - Import path for translation hooks (e.g., `"i18nexus"`, `"@/app/i18n/client"`)
- `languages` - List of supported languages
- `defaultLanguage` - Default language
- `localesDir` - Directory for translation files
- `fallbackNamespace` - Default namespace used for fallback keys

For `i18nexus/server`, `i18nexus.config.json` is the runtime-supported config
format. JavaScript/TypeScript config files are supported by the CLI tools, but
the server runtime avoids importing them so Next.js builds do not emit dynamic
import warnings. If `i18nexus/server` finds a JS/TS config without a JSON
config, it logs a warning and ignores that file.

If TypeScript cannot resolve `i18nexus/server`, set modern package export
resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

## 🛠️ CLI Tools

i18nexus works seamlessly with `i18nexus-tools` for automation:

```bash
# Install CLI tools
npm install -D i18nexus-tools

# Extract translation keys from code
npx i18n-extractor

# Regenerate namespace/key TypeScript definitions
npx i18n-type

# Upload translations to Google Sheets
npx i18n-upload

# Download translations from Google Sheets
npx i18n-download

# Auto-wrap hardcoded text with t()
npx i18n-wrapper
```

Learn more in the [i18nexus-tools documentation](../tools/README.md).

When you add a namespace manually, create the locale JSON files first, then run
`npx i18n-type` so generated namespace/key types stay in sync with runtime
translations.

## 🔗 Links

- [📖 Full Documentation](./docs)
- [🛠️ CLI Tools](../tools)
- [🎓 Type Safety Deep Dive](../../TECH_BLOG_TYPE_SAFETY.md)
- [🎮 Live Demo](https://i18nexus-demo.vercel.app)
- [💬 Discussions](https://github.com/i18n-global/i18n-mono/discussions)
- [🐛 Report Issues](https://github.com/i18n-global/i18n-mono/issues)

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm test -- --coverage
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for details on our code of conduct and development process.

## 📄 License

MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

This project was inspired by excellent i18n libraries:

- [react-i18next](https://react.i18next.com/)
- [next-intl](https://next-intl-docs.vercel.app/)
- [i18next](https://www.i18next.com/)

## 📈 Version History

### v3.4.2 (Latest)

- 🔄 Lazy namespace loading stability improvements
- 🎯 `createI18n` repositioned as the advanced typed API
- 📚 Public API and documentation alignment

### v3.3.0

- ✨ Type inference improvements - no explicit generics needed
- 🔄 Wrapper removes redundant generic types
- 📚 Documentation updates

### v3.2.0

- ✨ Namespace-specific type exports (`ConstantKeys`, `CommonKeys`, etc.)
- 🎯 Auto-default to `common` namespace when `t` is passed as props
- 📚 Enhanced TypeScript support

### v3.1.0

- 🔒 Stricter type checking for dynamic keys
- 🎨 Function overloads for styled translations
- ⚡ Performance improvements

### v3.0.0

- 🌍 Google Sheets formula escaping
- 📦 Namespace-based sheet organization
- 🛠️ CLI tool improvements

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

**Made with ❤️ by the i18nexus team**
