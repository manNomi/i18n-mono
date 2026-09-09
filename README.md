# i18nexus

[![i18nexus](https://img.shields.io/npm/v/i18nexus?label=i18nexus)](https://www.npmjs.com/package/i18nexus)
[![i18nexus-tools](https://img.shields.io/npm/v/i18nexus-tools?label=i18nexus-tools)](https://www.npmjs.com/package/i18nexus-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./packages/core/LICENSE)

[한국어 README](./README.ko.md)

Type-safe, AI-agent-friendly i18n toolkit for React and Next.js.

i18nexus helps teams manage multilingual React/Next.js applications by combining a lightweight runtime, namespace-based resources, generated TypeScript types, server translation helpers, and CLI automation for extraction, type generation, legacy cleanup, and translation sync.

This repository is the monorepo for the i18nexus runtime and companion tooling.

## Why i18nexus

Most i18n bugs are not caused by slow translation functions. They happen because code, locale files, generated types, lazy loading, and fallback rules drift apart.

i18nexus is designed to keep those pieces connected:

- type-safe React translation APIs
- namespace-based JSON resources
- lazy namespace loading
- SSR/server translation support
- CLI tools for wrapping text, extracting keys, generating types, cleaning legacy translation keys, and syncing translations
- AI coding agent workflows for Codex, Claude, and other autonomous tools

## Packages

| Package          | Role                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| `i18nexus`       | Type-safe React i18n runtime with provider, hooks, lazy namespace loading, and server helpers            |
| `i18nexus-tools` | CLI companion for wrapping text, extracting keys, generating types, legacy cleanup, and translation sync |
| `apps/demo`      | Example app for validating runtime and CLI workflows                                                     |

## Compatibility

| Surface           | Supported and verified                                            |
| ----------------- | ----------------------------------------------------------------- |
| Node.js           | 22.x, 24.x, 26.x                                                  |
| React / React DOM | 18.x, 19.x                                                        |
| Core modules      | ESM (`i18nexus`, `i18nexus/server`, `i18nexus/devtools`)          |
| Tools             | CommonJS CLI executables; the package root is intentionally empty |

Node 16/18/20 and React 16/17 were allowed by older manifests but are no
longer supported. CommonJS consumers must load the ESM core with dynamic
`import()`. The server entrypoint uses Node filesystem APIs and is not an Edge
runtime entrypoint.

## Quick Start

Install the runtime and CLI companion:

```bash
npm install i18nexus
npm install -D i18nexus-tools
```

Create `i18nexus.config.json`:

```json
{
  "languages": ["ko", "en"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "{src,app,pages}/**/*.{js,jsx,ts,tsx}",
  "translationImportSource": "i18nexus",
  "fallbackNamespace": "common",
  "namespaceLocation": "app",
  "lazy": true
}
```

Create the resources used by the first screen:

`locales/home/en.json`:

```json
{ "title": "Welcome" }
```

`locales/home/ko.json`:

```json
{ "title": "환영합니다" }
```

Use translations in React:

```tsx
// localized-home.tsx
"use client";

import { I18nProvider, useTranslation } from "i18nexus";

import homeEn from "./locales/home/en.json";
import homeKo from "./locales/home/ko.json";

const translations = { home: { en: homeEn, ko: homeKo } };

function HomeTitle() {
  const { t, isReady } = useTranslation("home");

  if (!isReady) return null;

  return <h1>{t("title")}</h1>;
}

export function LocalizedHome() {
  return (
    <I18nProvider initialLanguage="ko" translations={translations}>
      <HomeTitle />
    </I18nProvider>
  );
}
```

Run the tools:

```bash
npx i18n-extractor
npx i18n-type
```

## CLI Workflow

`i18nexus-tools` can help automate the repetitive parts of localization:

```bash
npx i18n-wrapper       # wrap hard-coded UI text with t(...)
npx i18n-extractor     # extract translation keys into locale files
npx i18n-type          # generate TypeScript translation key types
npx i18n-sheets        # sync translations with Google Sheets workflows
npx i18n-clean-legacy  # remove obsolete translation keys from locale files
```

## Adoption Evidence

- [Public behavior contract](./docs/BEHAVIOR_CONTRACT.md)
- [Migration guide](./docs/MIGRATION.md)
- [Troubleshooting and recovery](./docs/TROUBLESHOOTING.md)
- [Performance baseline](./docs/PERFORMANCE_BASELINE.md)

## AI Agent Setup Prompt

The project keeps an agent-ready setup prompt because i18n setup is often a multi-file migration. Copy this section into Codex, Claude, or another coding agent when you want it to install and validate i18nexus in an existing project.

<details>
<summary>Open the full agent prompt</summary>

```text
You are an autonomous coding agent.
Your task is to install and set up exactly two libraries in an existing project:
1) i18nexus
2) i18nexus-tools

Inputs:
- TARGET_PROJECT_PATH: absolute or relative path to the target project
- PACKAGE_MANAGER: optional (npm | pnpm | yarn). If missing, auto-detect.

Rules:
- Execute commands; do not only describe.
- Do not run destructive git commands (no reset --hard, no checkout --).
- If a command fails, explain cause briefly and retry with a safe fallback.
- Keep existing project behavior unless required for i18n setup.

Step 1) Detect environment
- Go to TARGET_PROJECT_PATH.
- Detect framework (Next.js App Router / Next.js Pages Router / React SPA / other).
- Detect package manager from lockfile.

Step 2) Install the 2 libraries
- npm:
  - npm install i18nexus
  - npm install -D i18nexus-tools
- pnpm:
  - pnpm add i18nexus
  - pnpm add -D i18nexus-tools
- yarn:
  - yarn add i18nexus
  - yarn add -D i18nexus-tools

Step 3) Create or update i18nexus.config.json at project root
Use this as baseline and adapt paths to real project structure:
{
  "languages": ["ko", "en"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "{src,app,pages}/**/*.{js,jsx,ts,tsx}",
  "translationImportSource": "i18nexus",
  "fallbackNamespace": "common",
  "namespaceLocation": "app",
  "lazy": true
}

Step 4) Wire runtime usage
- Next.js App Router:
  - connect i18n runtime in root layout/provider flow.
- Next.js Pages Router:
  - connect in _app.tsx or app bootstrap layer.
- React SPA:
  - connect in main.tsx/index.tsx root.
- If server-side translation is needed, use i18nexus/server APIs where appropriate.

Step 5) Create initial namespace files
- Create locales/common/ko.json and locales/common/en.json.
- Create at least one page namespace, e.g. locales/home/ko.json and locales/home/en.json.

Step 6) Run i18nexus-tools
- Optional wrapper pass:
  - npx i18n-wrapper
- Extract keys:
  - npx i18n-extractor
- Generate types:
  - npx i18n-type

Step 7) Validate outputs
- Ensure generated file exists:
  - locales/types/i18nexus.d.ts
- Ensure namespace JSON files exist under locales/<namespace>/<lang>.json.

Step 8) Apply one real usage example
- Update at least one page/component to use:
  - useTranslation<"namespace">("namespace")
- If server rendering is present, add one getTranslation usage example.

Step 9) Verification
Run project checks with the project’s package manager:
- lint
- test
- build
If any check fails, report exact command and key error.

Important edge cases to handle
1) Run from project root: config paths are relative to current working directory.
2) defaultLanguage must be included in languages.
3) If namespaceLocation does not match real route path, keys may collapse into fallback namespace.
4) Keep sourcePattern tight to avoid scanning dist/test artifacts.
5) If using Google Sheets later, credentialsPath must point to a real service-account JSON file.

Final output format
A) detected framework + package manager
B) installed dependencies
C) files created/updated
D) commands run + results
E) remaining issues and next immediate action
```

Quick message to send with this prompt:

```text
Set up i18nexus in <TARGET_PROJECT_PATH> by following the prompt exactly. Execute all steps, not just explanation.
```

</details>

## Maintainer Workflow with Codex

Codex can help maintain this project by:

- reviewing PRs for i18n key safety and namespace consistency
- generating regression tests for CLI transforms
- validating React/Next.js SSR compatibility
- checking generated type definitions before releases
- preparing release notes from changesets and tags
- diagnosing edge cases in user projects through reproducible fixtures

The goal is to turn i18n maintenance into a repeatable workflow: source code changes, generated locale resources, generated types, runtime behavior, and release validation should all agree.

## Repository Layout

```text
packages/core    # i18nexus runtime
packages/tools   # i18nexus-tools CLI companion
apps/demo        # demo and validation app
```

## Development

```bash
npm install
npm run build
npm test
```

Run package-specific checks when working in a package:

```bash
cd packages/core && npm test
cd packages/tools && npm test
```

## Documentation

- Runtime docs: [`packages/core`](./packages/core)
- Tools docs: [`packages/tools`](./packages/tools)
- Korean README: [`README.ko.md`](./README.ko.md)

## License

MIT
