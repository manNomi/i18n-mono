# Migration Guide

## Runtime Requirements

Upgrade to a supported Node major (22, 24, or 26) and React/React DOM 18 or 19.
Node 16, 18, and 20 and React 16/17 were accepted by older manifests but are no
longer supported. This policy change requires a major release.

## Core v3 to v4

The v4 root is intentionally smaller. Use:

- `i18nexus` for `I18nProvider`, hooks, `createI18n`, `defineConfig`, URL helpers, and public types.
- `i18nexus/server` for filesystem-backed server translation.
- `i18nexus/devtools` for `I18NexusDevtools`.

Replace a root devtools import:

```typescript
// Before
import { I18NexusDevtools } from "i18nexus";

// After
import { I18NexusDevtools } from "i18nexus/devtools";
```

CommonJS consumers must use dynamic `import()` because core entrypoints are ESM.
For `i18nexus/server`, use TypeScript `moduleResolution: "bundler"`, `node16`,
or `nodenext`.

## Configuration Discovery

Automatic discovery now has one format: `i18nexus.config.json`. Migrate values
from JS/TS-only files into JSON. Environment expressions belong in CLI options
or the documented environment variables.

`defineConfig` is still supported for an object imported by application code:

```typescript
// src/i18n-config.ts
import { defineConfig, type ExtractLanguages } from "i18nexus";

export const config = defineConfig({
  languages: ["en", "ko"] as const,
  defaultLanguage: "en",
});

export type AppLanguage = ExtractLanguages<typeof config>;
```

That module is not read by the CLI or server automatically.

The deprecated `i18n-sheets init --typescript` flag now warns and creates JSON.
Initialization no longer overwrites existing generated or user-edited files.

## Wrapper Entrypoints

`i18n-wrapper` is the adaptive entrypoint. It selects Babel below 3,000 matched
files and SWC workers at or above the threshold. `i18n-wrapper-swc` is a
deprecated compatibility alias for that same adaptive behavior. Use
`i18n-wrapper-swc-worker` only when forcing worker execution is intentional.

Always preview first:

```bash
npx i18n-wrapper --dry-run
```

## Translation Semantics

- Missing keys return the key or explicit fallback.
- Empty strings are preserved as translations.
- Locale resources are flat string records; nested/non-string data is rejected or ignored according to the loader contract.
- Client lazy namespace loads commit atomically and can be retried after failure.
- Server locale paths cannot traverse or escape the configured root through symlinks.

Review any application code that previously used truthiness to decide whether a
translation exists.

## Google Sheets

Connection precedence is CLI option > environment variable > JSON config >
default. Dry-run performs no authentication or network access. Normal download
preserves existing non-empty/local-only values; force download replaces locale
content with the remote snapshot. Both modes use the same transaction recovery
mechanism.

Worksheet column A must be `Key`; later columns map language names or exact
locale codes to locale files. Requested columns missing from any downloaded
sheet now fail before local replacement instead of producing empty force-mode
files. Force download preserves remote keys whose value is an intentional empty
string. Upload requires every configured locale file before worksheet access;
all namespaces pass this preflight before the first remote mutation, and
incremental upload now appends after existing remote rows. Local
download, sync, CSV conversion, and generated-index writes share rollback and
symlink/path containment. Google Sheets and the local filesystem still cannot
form one distributed transaction, so rerun sync after repairing a partial
remote/local failure.

## Verification

After migration:

```bash
npx i18n-doctor
npm run typecheck
npm test
npm run build
```

Repository maintainers should also run package tarball smoke tests, browser
bundle smoke, React 18/19 smoke, and Node 22/24/26 matrix gates.
