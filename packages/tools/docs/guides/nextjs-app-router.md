# Next.js App Router Guide

Complete guide for using `i18nexus` and `i18nexus-tools` with Next.js App Router.

## Quick Setup

### 1. Install

```bash
npm install i18nexus
npm install -D i18nexus-tools
```

### 2. Configure Tools

For App Router projects, keep server and client component behavior explicit. Use namespace output so the generated `locales/index.ts` can provide a lazy `loadNamespace(namespace, language)` function for the runtime.

```json
{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "sourceLanguage": "ko",
  "localesDir": "./locales",
  "outputFormat": "namespaced-json",
  "sourcePattern": "app/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus",
  "mode": "server",
  "serverTranslationFunction": "getTranslation",
  "generateTypes": true
}
```

Mode options:

- `"server"`: wraps server components with `getTranslation()` from `i18nexus/server`.
- `"client"`: wraps client components with `useTranslation()` and adds `"use client"`.
- Omitted mode: keeps the legacy auto-detection behavior.

### 3. TypeScript Settings

`i18nexus/server` is exposed through package subpath exports. In Next.js, prefer bundler module resolution so TypeScript resolves the same entrypoints that the app bundler uses.

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  }
}
```

## Project Structure

```text
your-app/
├── app/
│   ├── i18n-provider.tsx      # Client provider wrapper
│   ├── layout.tsx             # Server root layout
│   ├── page.tsx               # Server page
│   └── components/
│       └── language-switcher.tsx
├── locales/
│   ├── common/
│   │   ├── en.json
│   │   └── ko.json
│   └── index.ts               # Generated lazy runtime entrypoint
├── i18nexus.config.json
└── tsconfig.json
```

## Runtime Setup

### 1. Generate Locales

Run the extractor after wrapping or after adding manual `t("...")` calls.

```bash
npx i18n-extractor
```

The generated `locales/index.ts` exports `loadNamespace`, `fallbackNamespace`, typed `I18nProvider`, and typed `useTranslation` helpers.

### 2. Add a Client Provider Wrapper

`I18nProvider` is a client component. Do not import it directly into the server `app/layout.tsx`; put it behind a small client wrapper.

```tsx
// app/i18n-provider.tsx
"use client";

import { I18nProvider } from "i18nexus";
import { fallbackNamespace, loadNamespace } from "@/locales";

const availableLanguages = [
  { code: "ko", name: "한국어" },
  { code: "en", name: "English" },
];

export function I18nClientProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: string;
}) {
  return (
    <I18nProvider
      initialLanguage={initialLanguage}
      loadNamespace={loadNamespace}
      fallbackNamespace={fallbackNamespace}
      languageManagerOptions={{
        defaultLanguage: "ko",
        availableLanguages,
      }}
    >
      {children}
    </I18nProvider>
  );
}
```

### 3. Use the Wrapper from Root Layout

When server components also call `getTranslation()`, read the same language cookie in the server layout and pass it as `initialLanguage`. This keeps the first client render aligned with the server HTML.

```tsx
// app/layout.tsx
import { cookies } from "next/headers";
import { I18nClientProvider } from "./i18n-provider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const language = cookieStore.get("i18n-language")?.value ?? "ko";

  return (
    <html lang={language}>
      <body>
        <I18nClientProvider initialLanguage={language}>
          {children}
        </I18nClientProvider>
      </body>
    </html>
  );
}
```

If your app does not render translated server components, you can omit `initialLanguage` and let `LanguageManager` detect the browser/cookie language after hydration.

## Server Components

Use `getTranslation()` in server components. This keeps pages server-rendered and SEO-friendly.

```tsx
// app/page.tsx
import { getTranslation } from "i18nexus/server";

export default async function HomePage() {
  const { t } = await getTranslation("common");

  return (
    <main>
      <h1>{t("환영합니다")}</h1>
      <p>{t("홈페이지에 오신 것을 환영합니다")}</p>
    </main>
  );
}
```

The server helper reads the language from the `i18n-language` cookie by default. Client language changes should refresh server components when the current page uses server translations.

## Client Components

Use `useTranslation(namespace)` in interactive components. The provider lazy-loads the requested namespace through the generated `loadNamespace` function.

```tsx
// app/components/cart-summary.tsx
"use client";

import { useTranslation } from "@/locales";

export function CartSummary({ count }: { count: number }) {
  const { t, isReady } = useTranslation("common");

  if (!isReady) {
    return <span>{t("로딩 중...")}</span>;
  }

  return <p>{t("총 {{count}}개의 상품", { count })}</p>;
}
```

## Language Switching

`changeLanguage()` updates the client provider, cookie, localStorage, and `document.documentElement.lang`. If the current route contains server components that call `getTranslation()`, call `router.refresh()` after the language change so the server tree re-renders with the new cookie.

```tsx
// app/components/language-switcher.tsx
"use client";

import { useRouter } from "next/navigation";
import { useLanguageSwitcher } from "i18nexus";

export function LanguageSwitcher() {
  const router = useRouter();
  const { availableLanguages, changeLanguage, currentLanguage, isLoading } =
    useLanguageSwitcher();

  async function handleChange(language: string) {
    await changeLanguage(language);
    router.refresh();
  }

  return (
    <select
      aria-label="Language"
      disabled={isLoading}
      value={currentLanguage}
      onChange={(event) => handleChange(event.target.value)}
    >
      {availableLanguages.map((language) => (
        <option key={language.code} value={language.code}>
          {language.name}
        </option>
      ))}
    </select>
  );
}
```

## Passing `t` Through Props

The generated `locales/index.ts` exports helper types for the common pattern of
passing a typed translation function into smaller components.

```tsx
// app/components/desktop-nav.tsx
import type { AppTranslationFunction } from "@/locales";

export function DesktopNav({ t }: { t: AppTranslationFunction<"common"> }) {
  return <span>{t("대시보드")}</span>;
}
```

```tsx
// app/(dashboard)/layout.tsx
import { getTranslation } from "i18nexus/server";
import { DesktopNav } from "../components/desktop-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getTranslation("common");

  return (
    <>
      <DesktopNav t={t} />
      {children}
    </>
  );
}
```

For client components, use `AppClientTranslationFunction<"namespace">` when
passing `useTranslation(namespace).t` through props.

## Tooling Workflow

### 1. Write Source Text

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <main>
      <h1>회사 소개</h1>
      <p>우리는 혁신적인 솔루션을 제공합니다</p>
      <button>더 알아보기</button>
    </main>
  );
}
```

### 2. Wrap Text

For server components:

```json
{
  "mode": "server",
  "serverTranslationFunction": "getTranslation"
}
```

```bash
npx i18n-wrapper
```

Server mode result:

```tsx
// app/about/page.tsx
import { getTranslation } from "i18nexus/server";

export default async function AboutPage() {
  const { t } = await getTranslation();

  return (
    <main>
      <h1>{t("회사 소개")}</h1>
      <p>{t("우리는 혁신적인 솔루션을 제공합니다")}</p>
      <button>{t("더 알아보기")}</button>
    </main>
  );
}
```

For client components:

```json
{
  "mode": "client"
}
```

Client mode result:

```tsx
// app/components/about-card.tsx
"use client";

import { useTranslation } from "i18nexus";

export function AboutCard() {
  const { t } = useTranslation();

  return (
    <section>
      <h2>{t("회사 소개")}</h2>
      <button>{t("더 알아보기")}</button>
    </section>
  );
}
```

### 3. Extract Keys

```bash
npx i18n-extractor
```

With `sourceLanguage: "ko"`, Korean source files are initialized with source text and non-source languages stay empty.

```json
// locales/common/ko.json
{
  "회사 소개": "회사 소개",
  "우리는 혁신적인 솔루션을 제공합니다": "우리는 혁신적인 솔루션을 제공합니다",
  "더 알아보기": "더 알아보기"
}
```

```json
// locales/common/en.json
{
  "회사 소개": "",
  "우리는 혁신적인 솔루션을 제공합니다": "",
  "더 알아보기": ""
}
```

### 4. Fill Translations

```json
// locales/common/en.json
{
  "회사 소개": "About Us",
  "우리는 혁신적인 솔루션을 제공합니다": "We provide innovative solutions",
  "더 알아보기": "Learn More"
}
```

## Mode Selection

Use server mode for:

- App Router pages and layouts that do not need browser-only APIs.
- SEO-sensitive static copy.
- Components that already fetch data on the server.

Use client mode for:

- Interactive components with event handlers.
- Components using React state, browser APIs, or client-only hooks.
- Language switchers and UI controls.

Mixed projects should run the wrapper with narrower patterns instead of forcing one mode over the entire `app` directory.

```bash
npx i18n-wrapper -p "app/**/page.tsx"
npx i18n-wrapper -p "app/components/**/*.tsx" --mode client
```

## Common Issues

### Hydration Mismatch After Language Switching

Cause: the server layout renders one language while the client provider starts with another.

Fix: read the language cookie in `app/layout.tsx`, pass it to `I18nClientProvider` as `initialLanguage`, and call `router.refresh()` after `changeLanguage()` when the route has server translations.

### `I18nProvider` Imported into a Server Component

Cause: `I18nProvider` is a client component.

Fix: create `app/i18n-provider.tsx` with `"use client"`, then import that wrapper from `app/layout.tsx`.

### TypeScript Cannot Resolve `i18nexus/server`

Cause: TypeScript is not using a resolver compatible with package subpath exports.

Fix: set `"moduleResolution": "bundler"` in `tsconfig.json`.

### Namespace Stays on the Key Text

Cause: the namespace has not loaded yet, the JSON file is missing, or the generated `loadNamespace` was not passed to `I18nProvider`.

Fix: pass `loadNamespace` and `fallbackNamespace` into the provider, use `isReady` for loading states, and verify `locales/<namespace>/<language>.json` exists.

## Next Steps

- [Configuration Guide](./configuration.md)
- [Namespace Usage](./namespace-usage.md)
- [i18n-wrapper CLI](../cli/i18n-wrapper.md)
- [i18n-extractor CLI](../cli/i18n-extractor.md)
