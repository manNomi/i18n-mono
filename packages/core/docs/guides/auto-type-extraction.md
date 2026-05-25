# Auto Type Extraction

`i18nexus` now keeps automatic key inference centered on `createI18n`. The
package root no longer exports standalone key-extraction helpers; use a typed
translation shape instead.

## Basic Pattern

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
```

## Namespace and Key Autocomplete

```tsx
function HomeTitle() {
  const { t } = i18n.useTranslation("home");

  t("title");
  t("save"); // fallback namespace key
  // t("missing"); // TypeScript error

  return <h1>{t("title")}</h1>;
}
```

## Lazy Apps

When translations are loaded at runtime, keep the type shape separate from the
runtime data.

```tsx
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
```

Then pass `loadNamespace(namespace, language)` to `i18n.I18nProvider`.

## Manual Generic Narrowing

For the beginner API, use a local generic union if you only need a small typed
surface.

```tsx
import { useTranslation } from "i18nexus";

function SaveButton() {
  const { t } = useTranslation<"save" | "cancel">("common");
  return <button>{t("save")}</button>;
}
```

## Next Steps

- [TypeScript Guide](../TYPESCRIPT_GUIDE.md)
- [Namespace Translations Guide](../NAMESPACE_TRANSLATIONS.md)
- [Lazy Loading Guide](../LAZY_LOADING.md)
