이 깃허브 URL을 복사해서 LLM 프롬프트로 붙여넣으세요.

# i18nexus LLM Setup Prompt

Copy and paste this entire file into your LLM (Codex/Claude).

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
