# i18nexus Core v3 Migration Guide

## Overview

i18nexus core v3 moved the recommended beginner path to a React Context based architecture.

## Recommended API Tracks

| Use case                                            | Recommended API                        |
| --------------------------------------------------- | -------------------------------------- |
| Fast setup, minimal concepts                        | `I18nProvider` + root `useTranslation` |
| Namespace/key autocomplete from a translation shape | `createI18n` advanced typed API        |
| Server Components                                   | `i18nexus/server` utilities            |

`createI18n` is not removed. It is now positioned as the advanced typed API instead of the beginner API.

## Core API Diet Breaking Changes

The package root now exports only the core runtime APIs and setup types. The following utilities were removed from the root API:

- Standalone typed helpers such as `createTypedTranslation`, `validateTranslationKeys`, and `getTranslationKeyList`.
- Dynamic translation helper builders.
- Public cookie helpers.
- Public `LanguageManager` runtime exports.
- `createI18nWithConfig`.

Use `createI18n` for typed namespace/key inference. Import devtools from `i18nexus/devtools` instead of the package root.

## Main Migration Path

### 1. Keep translations in namespace shape

```typescript
export const translations = {
  common: {
    en: { save: "Save" },
    ko: { save: "저장" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const;
```

### 2. Add `I18nProvider`

```tsx
import { I18nProvider } from "i18nexus";
import { translations } from "@/locales";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <I18nProvider
          initialLanguage="ko"
          translations={translations}
          fallbackNamespace="common"
          languageManagerOptions={{
            defaultLanguage: "ko",
            availableLanguages: [
              { code: "ko", name: "한국어" },
              { code: "en", name: "English" },
            ],
          }}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
```

### 3. Use the root hook in components

```tsx
"use client";

import { useTranslation } from "i18nexus";

export default function HomePage() {
  const { t } = useTranslation("home");

  return <h1>{t("title")}</h1>;
}
```

### 4. Switch languages through React state

```tsx
"use client";

import { useLanguageSwitcher } from "i18nexus";

export function LanguageSwitcher() {
  const { changeLanguage } = useLanguageSwitcher();

  return <button onClick={() => changeLanguage("en")}>English</button>;
}
```

## Lazy Namespace Loading

Lazy loading is configured on `I18nProvider` by passing `loadNamespace`. There is no public `lazy` prop; lazy mode is enabled automatically when `loadNamespace` is provided.

```tsx
import { I18nProvider } from "i18nexus";

const translations = {} as {
  common: {
    en: { loading: string };
    ko: { loading: string };
  };
  home: {
    en: { title: string };
    ko: { title: string };
  };
};

async function loadNamespace(namespace: string, language: string) {
  const module = await import(`./locales/${namespace}/${language}.json`);
  return module.default;
}

<I18nProvider
  initialLanguage="ko"
  translations={translations}
  loadNamespace={loadNamespace}
  fallbackNamespace="common"
  preloadNamespaces={["common"]}
>
  <App />
</I18nProvider>;
```

`useTranslation("home")` automatically requests the `home` namespace when it is not statically available or already loaded. `isReady` is `false` while the requested namespace is loading.

## Advanced Typed API: `createI18n`

Use `createI18n` when you want a project-local typed provider and hook with namespace/key inference.

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

```tsx
function HomePage() {
  const { t } = useAppTranslation("home");

  t("title");
  t("save");
  // t("missing"); // TypeScript error

  return <h1>{t("title")}</h1>;
}
```

### Runtime compatibility note

Static `createI18n` still keeps legacy flattened lookup behavior for backward compatibility. TypeScript narrows keys to the requested namespace plus fallback namespace, but old static runtime keys from other namespaces may still resolve until strict namespace behavior is introduced in a future cleanup.

## FAQ

### Do I need to migrate away from `createI18n` immediately?

No. Keep `createI18n` if you rely on its typed instance pattern. For new users, document `I18nProvider/useTranslation` first and introduce `createI18n` as the advanced typed path.

### Is `createI18n` deprecated?

No. The older docs called it deprecated, but the current recommendation is to reposition it as the advanced typed API.

### Does lazy loading work with `createI18n`?

Yes. Pass `loadNamespace` to `i18n.I18nProvider`, not to `createI18n` options.

### What should server components use?

Use server utilities from `i18nexus/server`, such as `getTranslation`.
