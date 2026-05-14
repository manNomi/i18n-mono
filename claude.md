# i18nexus Monorepo Quick Context

## 1) What this repository is

- This repository is a monorepo that contains the type-safe React/Next.js i18n library `i18nexus` and the automation CLI `i18nexus-tools`.
- The core goal is to unify `t()` key extraction, type generation, namespace-based translation structure, and server/client translation flows.

## 2) Monorepo structure

- `packages/core`: Runtime library (`i18nexus`)
- `packages/tools`: CLI tools (`i18nexus-tools`)
- `apps/demo`: Next.js demo app (real integration examples for core/tools)

## 3) Package highlights

### packages/core (i18nexus)

- Main entry: `packages/core/src/index.ts`
- Main APIs:
  - Client: `I18nProvider`, `useTranslation`, `useLanguageSwitcher`
  - Server: `getTranslation` from `i18nexus/server` (not from root import)
- Default translation file layout:
  - `locales/<namespace>/<lang>.json` (e.g. `locales/common/en.json`)
- Config file:
  - Root-level `i18nexus.config.json`

### packages/tools (i18nexus-tools)

- CLI entries: `packages/tools/bin/*.ts`
- Core logic: `packages/tools/scripts/**` (no `src` directory here)
- Main commands:
  - `i18n-wrapper`
  - `i18n-extractor`
  - `i18n-type`
  - `i18n-upload`, `i18n-download`, `i18n-download-force`, `i18n-sheets`

### apps/demo

- Provides practical integration examples for `i18nexus` and `i18nexus-tools`
- Example config files:
  - `apps/demo/i18nexus.config.json`
  - `apps/demo/locales/index.ts`

## 4) Rules an AI should know first

- The source of truth is `src`/`scripts`; `dist` is build output.
- Server translation utilities must be imported from `i18nexus/server`.
- Commit message format is enforced:
  - `type[scope]: subject`
  - Allowed scopes: `core`, `tools`, `demo`
- Root uses npm workspace + turbo:
  - Full build: `npm run build`
  - Package-targeted task: `npx turbo run <task> --filter=<package>`

## 5) Startup checklist (for AI)

1. Decide the target package first (`core`, `tools`, or `demo`).
2. Read the target package README and entry files before editing.
3. Run minimum validation after changes:
   - `core`: `npx turbo run test --filter=i18nexus`
   - `tools`: `npx turbo run test --filter=i18nexus-tools`
   - `demo`: `npx turbo run build --filter=i18nexus-demo`
4. For translation/type changes, also verify `i18n-extractor` output (`locales/types/i18nexus.d.ts`).
