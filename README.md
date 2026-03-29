# i18nexus Turborepo

> 이 README는 항상 LLM에게 복사해서 붙여넣으세요.
> 이 README는 항상 LLM에게 복사해서 붙여넣으세요.

## README의 역할

이 README의 목적은 하나입니다.

- 새 프로젝트 또는 이미 개발 중인 프로젝트에 `i18nexus`를 바로 적용하도록, LLM(Codex/Claude)에 그대로 복붙할 실행 지침을 제공하는 것

이 문서는 데모 소개 문서가 아닙니다.
특정 로컬 환경(개인 경로, 개인 장비) 전제 없이 작동하도록 작성되었습니다.

## 사용 시나리오 (사용자 관점)

1. 우리 GitHub 주소 `A`를 복사합니다.
2. LLM에게 다음처럼 말합니다.

```text
우리 프로젝트에 A를 셋업해주세요.
```

3. 아래 "LLM 복붙용 마스터 프롬프트"를 함께 붙여넣습니다.
4. LLM이 실제 명령 실행까지 완료하면, 프로젝트는 i18n 적용 상태가 됩니다.

## 저장소 구조 (참고)

이 레포는 i18n 적용에 필요한 런타임/도구를 제공합니다.

```text
i18nexus-turborepo/
├─ packages/
│  ├─ core/     # i18n 런타임 라이브러리 (package: i18nexus)
│  └─ tools/    # i18n 자동화 CLI (package: i18nexus-tools)
├─ apps/
│  └─ demo/     # 내부 검증용 예제 앱 (적용 대상 프로젝트 자체가 아님)
├─ turbo.json
├─ package.json
└─ tsconfig.json
```

## 핵심 개념 (적용 프로젝트 기준)

1. `i18nexus` (`packages/core`):

- `I18nProvider`
- `useTranslation(namespace)`
- `useLanguageSwitcher()`
- `getTranslation` from `i18nexus/server`

2. `i18nexus-tools` (`packages/tools`):

- `i18n-wrapper`
- `i18n-extractor`
- `i18n-type`
- `i18n-upload`, `i18n-download`, `i18n-download-force`

3. 프로젝트 설정 파일:

- `i18nexus.config.json`이 i18n 자동화의 기준점입니다.

## 페이지별 타입 생성 원칙

페이지(또는 라우트) 단위 namespace를 권장합니다.

예시:

- `/` -> `home`
- `/about` -> `about`
- `/pricing` -> `pricing`
- `/dashboard/settings` -> `dashboard-settings`

작업 순서:

1. 페이지 namespace에 맞춰 `locales/<namespace>/<lang>.json` 생성
2. 코드에서 `useTranslation<"<namespace>">("<namespace>")` 사용
3. `npx i18n-type` 실행
4. 생성된 타입 파일(`locales/types/i18nexus.d.ts`)로 키 오타를 컴파일 타임에 검증

## 페이지 생성 후 i18n 사용법 (간단)

Client Component:

```tsx
"use client";

import { useTranslation } from "i18nexus";

export default function Page() {
  const { t } = useTranslation<"home">("home");
  return <h1>{t("title")}</h1>;
}
```

Server Component:

```tsx
import { getTranslation } from "i18nexus/server";

export default async function Page() {
  const { t } = await getTranslation<"home">("home");
  return <h1>{t("title")}</h1>;
}
```

## 권장 기본 `i18nexus.config.json`

LLM이 프로젝트 구조에 맞게 조정해야 하는 기본 템플릿:

```json
{
  "languages": ["ko", "en"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "{src,app,pages}/**/*.{js,jsx,ts,tsx}",
  "translationImportSource": "i18nexus",
  "fallbackNamespace": "common",
  "namespaceLocation": "page",
  "lazy": true
}
```

## LLM 복붙용 마스터 프롬프트

아래 전체를 그대로 복사해서 LLM(Codex/Claude)에 붙여넣으세요.

```text
당신은 코드를 실제로 수정하고 명령을 실행하는 개발 에이전트다.
설명만 하지 말고, 실제 파일 수정 + 명령 실행 + 검증까지 완료해라.

[입력]
- i18n 기준 레포 URL: <A>
- 적용 대상 프로젝트 루트 경로: <TARGET_PROJECT_PATH>

[목표]
<TARGET_PROJECT_PATH> 프로젝트에 i18nexus를 완전히 셋업하라.
완료 기준은 아래 "완료 조건"을 충족하는 것이다.

[절대 규칙]
1. destructive git 명령 금지 (reset --hard, checkout -- 등)
2. 명령 실패 시 원인 요약 + 대체 시도 후 계속 진행
3. 실제 실행 없는 완료 보고 금지
4. 변경 파일/명령/검증 결과를 최종에 모두 보고

[실행 단계]
1. 프로젝트 분석
- <TARGET_PROJECT_PATH>로 이동
- 프레임워크(Next.js / React / 기타), 패키지 매니저(npm/pnpm/yarn), 라우팅 구조(app/pages/src) 식별
- 기존 i18n 라이브러리 존재 여부 확인

2. 의존성 설치
- 패키지 매니저에 맞춰 아래를 설치
  - runtime: i18nexus
  - dev/tooling: i18nexus-tools
- lockfile 반드시 갱신

3. i18n config 생성/정리
- 프로젝트 루트에 i18nexus.config.json이 없으면 생성, 있으면 병합 업데이트
- 최소 포함 키:
  - languages
  - defaultLanguage
  - localesDir
  - sourcePattern
  - translationImportSource
  - fallbackNamespace
  - namespaceLocation
  - lazy
- sourcePattern은 실제 코드 구조에 맞게 조정

4. 런타임 연결
- Next.js App Router:
  - 루트 layout/provider 계층에 I18nProvider 연결
- React SPA:
  - 엔트리(main.tsx/index.tsx)에서 I18nProvider 연결
- 서버 컴포넌트/SSR이 있으면 i18nexus/server 사용 경로 연결

5. 페이지별 namespace 구조 적용
- 라우트/페이지 기준으로 namespace 설계
- locales/<namespace>/<lang>.json 기본 파일 생성
- common namespace도 생성

6. 자동화 명령 실행
- (선택) 문자열 래핑: i18n-wrapper
- 키 추출: i18n-extractor
- 타입 생성: i18n-type
- 생성 결과 확인:
  - locales/types/i18nexus.d.ts
  - locales/*/*.json

7. 코드 적용
- 주요 페이지/컴포넌트에 useTranslation 또는 getTranslation 적용
- 하드코딩 문자열 최소 1개 이상 namespace 키로 치환
- 타입 에러 없이 동작하도록 제네릭 namespace를 명시

8. 검증
- lint
- test
- build
- dev 서버 실행 가능 여부 확인(실행 후 종료)

[완료 조건]
아래 항목이 모두 충족되어야 완료:
1. i18nexus 의존성 설치 완료
2. i18nexus.config.json 유효 상태
3. I18nProvider 연결 완료
4. 페이지별 namespace JSON 생성 완료
5. locales/types/i18nexus.d.ts 생성 완료
6. lint/test/build 통과 (또는 실패 시 원인과 재현 명령 명시)

[최종 보고 형식]
- A. 감지한 프로젝트 구조/패키지 매니저
- B. 수정한 파일 목록
- C. 실행한 명령과 결과
- D. 생성된 namespace/type 결과
- E. 남은 이슈(있다면) + 바로 실행 가능한 다음 조치
```

## 짧은 실행 문구 (사용자용)

아래 문구 하나로 시작해도 됩니다.

```text
우리 프로젝트에 <A>를 셋업해주세요. 아래 README 프롬프트 기준으로 실제 실행까지 완료해주세요.
```

## 중요 문구

이 README는 항상 LLM에게 복사해서 붙여넣으세요.
이 README는 항상 LLM에게 복사해서 붙여넣으세요.
