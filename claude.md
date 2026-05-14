# i18nexus Monorepo Quick Context

## 1) 이 저장소가 무엇인가

- 이 저장소는 React/Next.js용 타입 안전 i18n 라이브러리 `i18nexus`와 자동화 CLI `i18nexus-tools`를 함께 관리하는 모노레포입니다.
- 핵심 목표는 `t()` 번역 키 자동 추출, 타입 생성, namespace 기반 번역 구조, 서버/클라이언트 번역 흐름 통합입니다.

## 2) 모노레포 구조

- `packages/core`: 런타임 라이브러리(`i18nexus`)
- `packages/tools`: CLI 도구(`i18nexus-tools`)
- `apps/demo`: Next.js 데모 앱 (core/tools 실제 사용 예시)

## 3) 패키지별 핵심

### packages/core (i18nexus)

- 주요 진입점: `packages/core/src/index.ts`
- 주요 API:
  - Client: `I18nProvider`, `useTranslation`, `useLanguageSwitcher`
  - Server: `getTranslation` from `i18nexus/server` (루트 import 아님)
- 번역 파일 기본 구조:
  - `locales/<namespace>/<lang>.json` (예: `locales/common/en.json`)
- 설정 파일:
  - 프로젝트 루트 `i18nexus.config.json`

### packages/tools (i18nexus-tools)

- CLI 엔트리: `packages/tools/bin/*.ts`
- 실제 로직: `packages/tools/scripts/**` (`src` 디렉토리 없음)
- 주요 명령:
  - `i18n-wrapper`
  - `i18n-extractor`
  - `i18n-type`
  - `i18n-upload`, `i18n-download`, `i18n-download-force`, `i18n-sheets`

### apps/demo

- `i18nexus`/`i18nexus-tools` 실제 연동 예제를 제공
- 설정 예시 파일:
  - `apps/demo/i18nexus.config.json`
  - `apps/demo/locales/index.ts`

## 4) AI가 처음에 꼭 알아야 할 규칙

- 소스 오브 트루스는 `src`/`scripts`이며, `dist`는 빌드 산출물입니다.
- 서버 번역 함수는 반드시 `i18nexus/server`에서 import 해야 합니다.
- 커밋 메시지 포맷은 강제됩니다:
  - `type[scope]: subject`
  - scope 허용값: `core`, `tools`, `demo`
- 루트는 npm workspace + turbo 사용:
  - 전체 빌드: `npm run build`
  - 패키지 대상 실행: `npx turbo run <task> --filter=<package>`

## 5) 작업 시작 체크리스트 (AI용)

1. 어떤 패키지(`core`/`tools`/`demo`)를 수정할지 먼저 확정한다.
2. 수정 대상의 README와 엔트리 파일부터 확인한다.
3. 변경 후 최소 검증:
   - `core`: `npx turbo run test --filter=i18nexus`
   - `tools`: `npx turbo run test --filter=i18nexus-tools`
   - `demo`: `npx turbo run build --filter=i18nexus-demo`
4. 번역/타입 관련 변경이면 `i18n-extractor` 결과(`locales/types/i18nexus.d.ts`)까지 확인한다.
