# Namespace-based Translations

Organize translations by feature, page, or domain.

## Overview

```typescript
const translations = {
  common: {
    en: { save: "Save", cancel: "Cancel" },
    ko: { save: "저장", cancel: "취소" },
  },
  home: {
    en: { title: "Home" },
    ko: { title: "홈" },
  },
} as const;
```

Benefits:

- Better organization by page or feature.
- Same key names can exist in different namespaces.
- Fallback namespaces can share common strings.
- Lazy loading can load only the namespace a component asks for.
- `createI18n` can infer namespace and key types from the translation shape.

## Beginner API

```tsx
import { I18nProvider, useTranslation } from "i18nexus";

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

function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      translations={translations}
      fallbackNamespace="common"
      languageManagerOptions={{ defaultLanguage: "en" }}
    >
      {children}
    </I18nProvider>
  );
}

function HomeTitle() {
  const { t } = useTranslation("home");

  return <h1>{t("title")}</h1>;
}
```

## Advanced Typed API

Use `createI18n` when you want namespace and key autocomplete.

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

Runtime compatibility note: static `createI18n` currently keeps legacy flattened lookup behavior. TypeScript narrows keys to the requested namespace plus fallback namespace, but old static runtime keys from other namespaces may still resolve until strict namespace behavior is introduced in a future cleanup.

## Fallback Namespace

`fallbackNamespace` merges shared keys before the requested namespace. Requested namespace keys win.

```typescript
const translations = {
  common: {
    en: { title: "Default title", save: "Save" },
  },
  home: {
    en: { title: "Home" },
  },
} as const;

const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

function HomePage() {
  const { t } = i18n.useTranslation("home");

  t("title"); // "Home"
  t("save"); // "Save"
}
```

## Lazy Namespace Loading

Lazy loading is configured on the provider by passing `loadNamespace`.

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

async function loadNamespace(namespace: string, language: string) {
  const module = await import(`./locales/${namespace}/${language}.json`);
  return module.default;
}

function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      translations={{} as AppTranslations}
      loadNamespace={loadNamespace}
      fallbackNamespace="common"
      preloadNamespaces={["common"]}
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

## Dynamic Runtime Values

For dynamic values inside a known key, use interpolation.

```tsx
const { t } = useTranslation("home");

return <p>{t("greeting", { name: user.name })}</p>;
```

For runtime-generated keys from an API, keep the key typed at the boundary when possible.

```tsx
type HomeKeys = "title" | "greeting";

function DynamicLabel({ labelKey }: { labelKey: string }) {
  const { t } = useTranslation<HomeKeys>("home");

  return <span>{t(labelKey as HomeKeys)}</span>;
}
```

## Styled Variables

```tsx
const { t } = useTranslation("checkout");

return (
  <p>
    {t(
      "total",
      { amount: "$120" },
      { amount: { fontWeight: "bold", color: "green" } },
    )}
  </p>
);
```

## Best Practices

- Use `common` for cross-page strings such as buttons and loading states.
- Use page or feature names for specific namespaces, such as `home`, `checkout`, or `settings`.
- Keep fallback namespaces small so they do not hide missing page-specific keys.
- In lazy mode, render a loading state when `isReady` is `false`.
- Prefer `createI18n` only when its typed instance improves project DX.

## See Also

- [API Reference](./API_REFERENCE.md)
- [Lazy Loading](./LAZY_LOADING.md)
- [TypeScript Guide](./TYPESCRIPT_GUIDE.md)
- [createI18n DX Audit](./create-i18n-dx-audit.md)
