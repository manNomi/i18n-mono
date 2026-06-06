# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### ✨ Features

- Added `sourceLanguage` support for extractor and wrapper workflows, including English-source project initialization.
- Generated locale entrypoints now export typed `AppTranslationFunction` helpers for passing `t` through props.
- `i18n-doctor` now checks installed core package exports and TypeScript module resolution for `i18nexus/server`.

### 📚 Documentation

- Reworked the Next.js App Router guide around a client Provider wrapper, server/client language sync, and `router.refresh()`.

## [3.1.0] - 2026-05-27

### ✨ Features

- **Static constant key extraction**:
  - `i18n-extractor` now resolves safe static constants used as translation keys.
  - Added `staticKeyExtraction` modes: `off`, `safe` (default), and `aggressive`.
  - Safe mode supports `const key = "title"; t(key)` and explicit i18n key containers such as `I18N_KEYS.title` or `I18N_KEYS.map((item) => t(item))`.
  - General data objects such as API response-shaped constants are skipped in safe mode; use `aggressive` to opt into broad static object/array extraction.
  - Dynamic values from functions, props, state, API data, or arrays mixed with dynamic entries are intentionally skipped to avoid false positives.

## [3.0.0] - 2026-05-26

### ✨ Features

- **Core v4 companion workflow**:
  - `i18n-extractor` now generates a core v4-ready `locales/index.ts`.
  - Generated entrypoint exports `languages`, `namespaces`, `fallbackNamespace`, `loadNamespace`, and typed `createI18n` helpers.
  - Advanced users can import generated `I18nProvider` and `useTranslation` from `./locales`.

- **Automatic type generation after extraction**:
  - `i18n-extractor` now generates `locales/types/i18nexus.d.ts` by default.
  - Added `--no-types`, `--types-output`, and `--strict-types` options.
  - Generated declarations now include `I18nexusGeneratedTranslations` for `createI18n`.
  - Translation keys are collected across all language files instead of relying on the first language only.
  - Interpolation variables are inferred from translation values.

- **New `i18n-doctor` command**:
  - Checks core package version, locale entrypoint, generated type file, fallback namespace, and translation completeness.
  - Intended as a final CI/local confidence check after `i18n-extractor`.

### 🔄 Breaking Changes

- `i18nexus-tools` is now positioned around `i18nexus@4`.
- Projects using older core versions should upgrade to `i18nexus@4` before adopting tools v3.
- `i18n-extractor` now writes generated type files by default. Use `--no-types` to keep the previous extract-only behavior.

### 📋 Migration Guide

```bash
npm install i18nexus@latest
npm install -D i18nexus-tools@latest

npx i18n-extractor
npx i18n-doctor
```

For lazy namespace loading, wire the generated entrypoint into core:

```tsx
import { I18nProvider } from "i18nexus";
import { fallbackNamespace, loadNamespace } from "./locales";

<I18nProvider
  loadNamespace={loadNamespace}
  fallbackNamespace={fallbackNamespace}
>
  {children}
</I18nProvider>;
```

### 🗑️ Removed

- **Deprecated code cleanup**:
  - Removed `i18n-extractor-backup.ts` (unused backup file)
  - Removed deprecated `generateTypeDefinitions()` method from extractor
  - Removed unused `swc-utils.ts` (not imported anywhere)
  - Removed unused imports from extractor

### 📚 Documentation

- Added `i18n-type.md` CLI documentation
- Updated CLI README to include `i18n-type` command
- Updated main README to reflect separated type generation workflow
- Removed type generation references from `i18n-extractor` documentation

## [2.5.0] - 2025-12-06

### ✨ Features

- **Google Sheets 다중 시트 자동 동기화**: 폴더 구조와 시트 구조 자동 매핑
  - `downloadAllSheets()`: Spreadsheet의 모든 시트를 자동으로 감지하여 네임스페이스별 폴더로 다운로드
  - `uploadAllNamespaces()`: `locales/` 폴더의 모든 네임스페이스를 각 시트로 자동 업로드
  - 시트 이름 = 네임스페이스 이름 (자동 매핑)
  - Config에서 `sheetName` 불필요 (자동 감지)

- **타입 생성 명령어 분리**: 추출과 타입 생성 책임 분리
  - 신규 명령어: `npx i18n-type` (타입 생성 전용)
  - `i18n-extractor`에서 타입 생성 로직 제거
  - 독립적으로 타입만 생성 가능

- **Fallback Namespace 타입 확장**: 타입 안전성 향상
  - `useTranslation<NS>()`: `TranslationKeys[NS] | CommonKeys` (fallback 포함)
  - `getTranslation<NS>()`: `GetTranslationReturn<NS, TranslationKeys[NS] | CommonKeys>`
  - Config의 `fallbackNamespace` 설정 시 자동으로 모든 네임스페이스에 fallback 키 타입 포함

### 🔄 Breaking Changes

- **타입 생성 워크플로우 변경**: 타입 생성이 별도 명령어로 분리됨
  - 이전: `npx i18n-extractor` (추출 + 타입 생성)
  - 이후: `npx i18n-extractor` (추출만) → `npx i18n-type` (타입 생성)
  - 기존 프로젝트: `npx i18n-type` 실행하여 타입 재생성 필요

### 📋 마이그레이션 가이드

**이전 워크플로우:**

```bash
npx i18n-extractor  # 추출 + 타입 생성
```

**새로운 워크플로우:**

```bash
npx i18n-extractor  # 추출만
npx i18n-type       # 타입 생성만
```

**Google Sheets 사용:**

```bash
# 이전: sheetName 지정 필요
npx i18n-download -s "id" -n "Translations"

# 이후: 자동 감지 (모든 시트)
npx i18n-download -s "id"
```

---

## [2.4.0] - 2025-12-06

### ✨ Features

- **타입 생성 리팩토링**: `i18nexus` 원본 타입 재사용으로 타입 안전성 대폭 향상
  - `UseTranslationReturn`, `UseLanguageSwitcherReturn`, `I18nProviderProps` import 및 재사용
  - `GetTranslationReturn`, `GetTranslationOptions` import 및 재사용
  - Type augmentation 방식으로 원본 타입 확장 (완전 재정의 제거)
  - `i18nexus` 패키지 타입과 완벽히 동기화
  - IDE 자동완성 개선 (원본 JSDoc 포함)

### 🔄 Breaking Changes

- **타입 생성 방식 변경**: `i18nexus@3.4.0` 이상 필요
  - 기존 프로젝트: `npx i18n-extractor` 재실행으로 타입 재생성 필요
  - 사용 방법은 동일 (코드 변경 불필요)
  - 생성된 타입 파일을 직접 수정한 경우 영향 받을 수 있음

### 🎯 Benefits

- 타입 충돌 완전 제거
- 패키지 업데이트 시 타입 자동 동기화
- 유지보수 비용 감소
- 타입 정확성 향상

---

## [2.3.12] - 2025-12-06

### 🐛 Bug Fixes

- **타입 생성기 개선**: `I18nProvider` 타입 정의를 실제 구현과 일치하도록 업데이트
  - `translations` prop이 이제 optional (lazy loading 시 불필요)
  - `loadNamespace` prop 추가 (lazy loading 지원)
  - `onLanguageChange` prop 추가
  - `languageManagerOptions`를 실제 구현과 일치하도록 수정
  - JSDoc에 eager/lazy loading 예제 추가

---

## [2.3.11] - 2025-12-06

### ✨ Features

- **타입 생성기 개선**: `I18nProvider` 컴포넌트 타입 정의 추가
  - `declare module "i18nexus"`에서 `I18nProvider` 컴포넌트 타입 정의 포함
  - i18nexus 사용 시에만 추가 (다른 i18n 라이브러리에는 영향 없음)
  - 이제 생성된 타입 정의 파일에서 `I18nProvider`를 정상적으로 import 가능

---

## [2.3.10] - 2025-12-06

### ✨ Features

- **extractor 개선**: 기존 파일에도 `useLanguageSwitcher`와 `I18nProvider` 자동 import
  - 파일에 이미 `useTranslation` import가 있으면 자동으로 `useLanguageSwitcher`와 `I18nProvider`도 추가
  - wrapper 실행 시 기존 파일들도 자동으로 import 업데이트

---

## [2.3.9] - 2025-12-06

### ✨ Features

- **extractor 개선**: i18nexus 사용 시 자동으로 `useLanguageSwitcher`와 `I18nProvider` import 추가
  - 클라이언트 모드에서 `useTranslation` 사용 시 함께 필요한 import들을 자동으로 추가
  - `ensureMultipleNamedImports` 함수 추가로 여러 import를 한 번에 처리

---

## [2.3.8] - 2025-12-06

### 🐛 Bug Fixes

- **타입 생성기 수정**: `i18n-extractor`가 생성하는 타입 정의에 `useLanguageSwitcher` 추가
  - `declare module "i18nexus"`에서 `useLanguageSwitcher` 훅 타입 정의 포함
  - 이제 생성된 타입 정의 파일에서 `useLanguageSwitcher`를 정상적으로 import 가능
  - **i18nexus 사용자에 한해서만 추가**: `translationImportSource`가 `"i18nexus"`일 때만 `useLanguageSwitcher` 타입 정의 생성
  - 다른 i18n 라이브러리(예: `react-i18next`) 사용 시에는 생성되지 않음

---

## [2.3.7] - 2025-12-06

### 🐛 Bug Fixes

- **Server mode wrapper 수정**: `mode: "server"` 설정 시 `getTranslation` 생성 및 올바른 import source 사용
  - `i18nexus.config.json`에서 `mode`, `framework`, `serverTranslationFunction` 설정을 wrapper에 전달하도록 수정
  - 서버 모드일 때 import source에 `/server` 경로 자동 추가
  - 결과: `import { getTranslation } from "i18nexus/server"` (이전: `import { useTranslation } from "i18nexus"`)

---
