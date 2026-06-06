# i18nexus

[![i18nexus](https://img.shields.io/npm/v/i18nexus?label=i18nexus)](https://www.npmjs.com/package/i18nexus)
[![i18nexus-tools](https://img.shields.io/npm/v/i18nexus-tools?label=i18nexus-tools)](https://www.npmjs.com/package/i18nexus-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./packages/core/LICENSE)

[English README](./README.md)

React와 Next.js를 위한 타입 안전하고 AI 에이전트 친화적인 i18n 툴킷입니다.

i18nexus는 가벼운 런타임, 네임스페이스 기반 JSON 리소스, 생성된 TypeScript 타입, 서버 번역 헬퍼, 그리고 추출/타입 생성/레거시 정리/번역 동기화를 위한 CLI 자동화를 함께 제공합니다.

이 저장소는 i18nexus 런타임과 companion CLI 도구를 함께 관리하는 모노레포입니다.

## 왜 i18nexus인가

대부분의 i18n 버그는 번역 함수가 느려서 생기지 않습니다. 코드, locale 파일, 생성된 타입, lazy loading, fallback 규칙이 서로 어긋나면서 생깁니다.

i18nexus는 이 조각들이 같은 계약을 공유하도록 설계되었습니다.

- 타입 안전한 React 번역 API
- 네임스페이스 기반 JSON 리소스
- lazy namespace loading
- SSR/server translation 지원
- 텍스트 래핑, key 추출, 타입 생성, 레거시 번역 key 정리, 번역 동기화를 위한 CLI 도구
- Codex, Claude 같은 AI coding agent를 위한 설치/검증 workflow

## 패키지 구성

| Package          | Role                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `i18nexus`       | Provider, hook, lazy namespace loading, server helper를 제공하는 타입 안전 React i18n 런타임 |
| `i18nexus-tools` | 텍스트 래핑, key 추출, 타입 생성, 레거시 정리, 번역 동기화를 위한 CLI companion              |
| `apps/demo`      | 런타임과 CLI workflow를 검증하기 위한 예제 앱                                                |

## Quick Start

런타임과 CLI companion을 설치합니다.

```bash
npm install i18nexus
npm install -D i18nexus-tools
```

`i18nexus.config.json`을 생성합니다.

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

React에서 번역을 사용합니다.

```tsx
import { useTranslation } from "i18nexus";

export function HomeTitle() {
  const { t, isReady } = useTranslation("home");

  if (!isReady) return null;

  return <h1>{t("title")}</h1>;
}
```

도구를 실행합니다.

```bash
npx i18n-extractor
npx i18n-type
```

## CLI Workflow

`i18nexus-tools`는 현지화 작업에서 반복되는 부분을 자동화합니다.

```bash
npx i18n-wrapper       # 하드코딩된 UI 텍스트를 t(...)로 래핑
npx i18n-extractor     # 번역 key를 locale 파일로 추출
npx i18n-type          # TypeScript 번역 key 타입 생성
npx i18n-sheets        # Google Sheets 기반 번역 workflow 동기화
npx i18n-clean-legacy  # locale 파일에서 더 이상 쓰지 않는 번역 key 정리
```

## AI Agent Setup Prompt

i18n 설정은 여러 파일을 함께 바꾸는 migration인 경우가 많습니다. 그래서 이 저장소는 Codex, Claude 같은 coding agent에 바로 붙여넣을 수 있는 설치 프롬프트를 유지합니다.

<details>
<summary>전체 agent prompt 열기</summary>

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

agent에게 함께 보낼 짧은 메시지:

```text
Set up i18nexus in <TARGET_PROJECT_PATH> by following the prompt exactly. Execute all steps, not just explanation.
```

</details>

## Codex를 활용한 maintainer workflow

Codex는 이 프로젝트 유지보수에서 다음 작업을 도울 수 있습니다.

- PR에서 i18n key 안전성과 namespace 일관성 리뷰
- CLI transform 회귀 테스트 생성
- React/Next.js SSR 호환성 검증
- 릴리즈 전 generated type definition 확인
- changeset, tag 기반 릴리즈 노트 준비
- 사용자 프로젝트의 edge case를 재현 가능한 fixture로 진단

목표는 i18n 유지보수를 반복 가능한 workflow로 만드는 것입니다. source code 변경, 생성된 locale 리소스, 생성된 타입, 런타임 동작, 릴리즈 검증이 모두 같은 계약을 따라야 합니다.

## 저장소 구조

```text
packages/core    # i18nexus runtime
packages/tools   # i18nexus-tools CLI companion
apps/demo        # demo and validation app
```

## 개발

```bash
npm install
npm run build
npm test
```

패키지별 작업 시에는 해당 패키지에서 테스트를 실행합니다.

```bash
cd packages/core && npm test
cd packages/tools && npm test
```

## 문서

- Runtime docs: [`packages/core`](./packages/core)
- Tools docs: [`packages/tools`](./packages/tools)
- English README: [`README.md`](./README.md)

## License

MIT
