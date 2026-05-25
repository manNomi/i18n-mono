# i18nexus Core v4 Migration Guide

v4 is a breaking cleanup release that keeps the core runtime small and moves
optional APIs behind explicit entry points. The main runtime path remains
`I18nProvider` with `useTranslation`.

## What Stays

Continue importing these APIs from the package root:

```ts
import {
  I18nProvider,
  createI18n,
  defineConfig,
  useLanguageSwitcher,
  useTranslation,
} from "i18nexus";
```

Type-only exports for provider configuration and generated language helpers also
remain available from the root.

## Devtools Moved

`I18NexusDevtools` is no longer exported from the package root.

```tsx
// Before v4
import { I18NexusDevtools } from "i18nexus";

// v4
import { I18NexusDevtools } from "i18nexus/devtools";
```

This keeps production client bundles focused on the runtime API while preserving
the devtools component for apps that need it.

## Server Imports Stay on the Server Subpath

Server utilities continue to use the existing server subpath:

```ts
import { getTranslation } from "i18nexus/server";
```

Do not import server utilities from the package root. Keeping them on the
subpath avoids pulling Node filesystem APIs into browser bundles.

## Removed Root Runtime Exports

The following runtime exports were removed from `i18nexus`:

```ts
I18NexusDevtools;
createTypedTranslation;
createTypedTranslationWithStyles;
createMultiLangTypedTranslation;
validateTranslationKeys;
getTranslationKeyList;
createDynamicTranslation;
buildTranslationParams;
buildConditionalTranslation;
mapToTranslationParams;
setCookie;
getCookie;
deleteCookie;
getAllCookies;
LanguageManager;
defaultLanguageManager;
createI18nWithConfig;
```

## Replacements

| Removed API                                         | Recommended v4 path                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `I18NexusDevtools` from root                        | `import { I18NexusDevtools } from "i18nexus/devtools"`                     |
| `createTypedTranslation*`                           | `createI18n` for typed namespace/key inference                             |
| `validateTranslationKeys` / `getTranslationKeyList` | Use generated types and compile-time checks from `createI18n`              |
| Dynamic translation builder helpers                 | Keep interpolation at the call site with `t(key, variables)`               |
| Cookie helpers                                      | Use your app/framework cookie utilities directly                           |
| `LanguageManager` runtime export                    | Configure language behavior through `I18nProvider` props                   |
| `createI18nWithConfig`                              | Use `createI18n(translations, options)` and pass provider props explicitly |

## Beginner API

The recommended default setup is unchanged:

```tsx
import { I18nProvider, useTranslation } from "i18nexus";

const translations = {
  common: {
    en: { save: "Save" },
    ko: { save: "저장" },
  },
};

function App() {
  return (
    <I18nProvider translations={translations} initialLanguage="en">
      <Page />
    </I18nProvider>
  );
}

function Page() {
  const { t } = useTranslation("common");
  return <button>{t("save")}</button>;
}
```

## Advanced Typed API

Use `createI18n` when you want namespace/key inference from a translation shape:

```ts
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
```

`createI18n` remains supported. It is repositioned as the advanced typed API,
not removed.

## Lazy Namespace Loading

Lazy namespace loading still lives on the provider:

```tsx
<I18nProvider
  initialLanguage="en"
  translations={{}}
  loadNamespace={async (namespace, language) => {
    const mod = await import(`./locales/${namespace}/${language}.json`);
    return mod.default;
  }}
>
  <App />
</I18nProvider>
```

`useTranslation("home")` requests the namespace automatically when `loadNamespace`
is configured and the namespace is not already loaded.

## Why v4

This is a major version because root exports were removed. Apps using the core
provider/hooks path should need minimal changes. Apps importing optional helpers
from the root should migrate to the smaller v4 surface using the table above.
