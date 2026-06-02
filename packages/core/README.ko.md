# i18nexus

<div align="center">

![i18nexus Logo](https://img.shields.io/badge/i18nexus-Complete%20React%20i18n%20Toolkit-blue?style=for-the-badge)

[![npm version](https://badge.fury.io/js/i18nexus.svg)](https://badge.fury.io/js/i18nexus)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**🌍 타입 안전한 React 국제화 툴킷 - 지능형 자동화 및 Server Components 지원**

[기능](#-기능) • [빠른 시작](#-빠른-시작) • [문서](#-문서) • [API 레퍼런스](#-api-레퍼런스)

[English](./README.md) | **한국어**

</div>

---

## 🚀 i18nexus란?

i18nexus는 **완전한 타입 안전성**을 갖춘 **i18n 워크플로우를 자동화**하는 포괄적인 React 국제화 툴킷입니다. TypeScript 설정 지원, 자동 문자열 래핑, 그리고 원활한 Google Sheets 통합으로 i18nexus는 지루한 수동 작업을 없애고 언어 코드에 대한 IDE 자동완성을 제공합니다.

### ✨ 주요 기능

- 🌐 **Accept-Language 자동 감지** - 사용자의 브라우저 언어 자동 감지
- 🎨 **변수 삽입** - `{{variable}}` 문법과 스타일 변수 지원
- 🎯 **타입 안전 언어** - IDE 자동완성이 가능한 TypeScript 설정
- 🖥️ **Server Components** - Next.js App Router 완벽 지원 및 hydration 이슈 제로
- 🛠️ **개발자 도구** - 시각적 디버깅을 위한 React Query 스타일 devtools
- 🤖 **제로 수동 작업** - 하드코딩된 문자열 자동 감지 및 래핑
- 🍪 **스마트 저장** - SSR 지원 쿠키 기반 언어 관리

---

## 🚀 빠른 시작

### 설치

```bash
npm install i18nexus
npm install -D i18nexus-tools  # CLI 도구를 위해 권장
```

### 1. 설정 초기화 (권장)

```bash
npx i18n-sheets init
```

`i18nexus.config.json` 생성:

```json
{
  "languages": ["en", "ko", "ja"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "app/**/*.{ts,tsx}",
  "translationImportSource": "i18nexus"
}
```

**참고:** `i18nexus.config.json`이 권장되는 설정 형식입니다. JavaScript/TypeScript 설정 파일은 CLI 도구에서는 사용할 수 있지만, `i18nexus/server` 런타임은 Next.js 동적 import 경고를 피하기 위해 읽지 않습니다. JSON 설정 없이 JS/TS 설정만 있으면 경고를 출력하고 해당 파일을 무시합니다.

### 2. Provider 설정 (Next.js App Router)

`I18nProvider`는 클라이언트 컴포넌트이므로 서버 `layout.tsx`에 직접 두지 말고 작은 클라이언트 래퍼로 감싸세요.

```tsx
// app/i18n-provider.tsx
"use client";

import { I18nProvider } from "i18nexus";

export function I18nClientProvider({
  children,
  initialLanguage,
}: {
  children: React.ReactNode;
  initialLanguage?: string;
}) {
  return (
    <I18nProvider initialLanguage={initialLanguage}>{children}</I18nProvider>
  );
}
```

```tsx
// app/layout.tsx
import { getTranslation } from "i18nexus/server";
import { I18nClientProvider } from "./i18n-provider";

export default async function RootLayout({ children }) {
  const { language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja"],
    defaultLanguage: "ko",
  });

  return (
    <html lang={language}>
      <body>
        <I18nClientProvider initialLanguage={language}>
          {children}
        </I18nClientProvider>
      </body>
    </html>
  );
}
```

`i18nexus/server`를 사용하는 Next.js 프로젝트는 TypeScript가 package subpath exports를 해석할 수 있도록 `tsconfig.json`에 `"moduleResolution": "bundler"`를 권장합니다.

### 3. 번역 사용

**Server Component:**

```tsx
import { getTranslation } from "i18nexus/server";

export default async function Page() {
  const { t, language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja"],
    defaultLanguage: "ko",
  });

  return (
    <div>
      <h1>{t("환영합니다 {{name}}", { name: "사용자" })}</h1>
      <p>현재 언어: {language}</p>
    </div>
  );
}
```

**Client Component:**

```tsx
"use client";
import { useTranslation } from "i18nexus";

export default function ClientComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("환영합니다")}</h1>
      <p>{t("{{count}}개의 메시지가 있습니다", { count: 5 })}</p>
    </div>
  );
}
```

위 빠른 시작은 가장 단순한 초보자 경로인 `I18nProvider`와
`useTranslation` API를 사용합니다. 네임스페이스별 key 자동완성과 더 강한
타입 추론이 필요하다면 아래
[createI18n으로 고급 타입 안전성 사용하기](#createi18n으로-고급-타입-안전성-사용하기)를
확인하세요.

### createI18n으로 고급 타입 안전성 사용하기

`createI18n`은 번역 객체의 모양에서 네임스페이스와 key 타입을 추론하는
고급 API입니다. 기본 사용자는 `I18nProvider/useTranslation`으로 시작하고,
앱 전역에서 typed hook을 만들고 싶을 때 `createI18n`을 사용하는 흐름을
권장합니다.

```tsx
import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    en: {
      save: "Save",
      cancel: "Cancel",
    },
    ko: {
      save: "저장",
      cancel: "취소",
    },
  },
  home: {
    en: {
      title: "Home",
      greeting: "Hello, {{name}}",
    },
    ko: {
      title: "홈",
      greeting: "안녕하세요, {{name}}님",
    },
  },
} as const satisfies I18nTranslations;

export const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});

export const I18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;
```

```tsx
function HomeTitle() {
  const { t } = useAppTranslation("home");

  t("title"); // OK: home 네임스페이스 key
  t("save"); // OK: fallback common 네임스페이스 key
  t("missing"); // TypeScript error

  return <h1>{t("greeting", { name: "Alice" })}</h1>;
}
```

중요한 런타임 참고사항: 현재 static `createI18n`은 기존 사용자 호환성을
위해 flatten된 lookup 동작을 유지합니다. TypeScript는 요청한 네임스페이스와
fallback 네임스페이스 기준으로 key를 좁혀주지만, 런타임에서는 과거 호환성
때문에 다른 static 네임스페이스의 key도 resolve될 수 있습니다.

#### createI18n과 lazy namespace

lazy 방식에서는 빈 typed translation shape를 넘기고 Provider에
`loadNamespace(namespace, language)`를 제공합니다. 요청한 네임스페이스가
로드되는 동안 `isReady`는 `false`가 됩니다.

```tsx
import { createI18n } from "i18nexus";

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

export const I18nProvider = i18n.I18nProvider;
export const useAppTranslation = i18n.useTranslation;

export function AppI18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      languageManagerOptions={{
        defaultLanguage: "en",
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "ko", name: "한국어" },
        ],
      }}
      loadNamespace={async (namespace, language) => {
        const module = await import(`../locales/${namespace}/${language}.json`);
        return module.default;
      }}
    >
      {children}
    </I18nProvider>
  );
}

function HomePage() {
  const { t, isReady } = useAppTranslation("home");

  if (!isReady) {
    return <p>Loading...</p>;
  }

  return <h1>{t("title")}</h1>;
}
```

---

## 📚 문서

### 📖 완전한 문서

- **[문서 허브](./docs/README.md)** - 중앙 문서 포털

### 🎯 기능 가이드

- [🌐 Accept-Language 감지](./docs/guides/accept-language.md) - 브라우저 언어 자동 감지
- [🎨 변수 삽입](./docs/guides/interpolation.md) - 번역 내 동적 값
- [🎯 타입 안전 설정](./docs/guides/typed-config.md) - TypeScript 설정 구성
- [🛠️ 개발자 도구](./docs/guides/devtools.md) - 시각적 디버깅 도구

### 📚 API 레퍼런스

- [서버 사이드 API](./docs/api/server.md) - `getTranslation`, `getServerLanguage` 등
- [클라이언트 사이드 API](./docs/api/client.md) - `useTranslation`, `useLanguageSwitcher` 등
- [TypeScript 타입](./docs/api/types.md) - 완전한 타입 정의

### 📋 릴리즈 노트

- [v2.7.0](./docs/releases/v2.7.0.md) - Accept-Language 자동 감지 (과거 릴리즈 노트)
- [v2.6.0](./docs/releases/v2.6.0.md) - 변수 삽입 & CI/CD
- [v2.5.2](./docs/releases/v2.5.2.md) - 개발자 도구
- [v2.1.0](./docs/releases/v2.1.0.md) - Server Components 지원
- [전체 변경 로그](./docs/CHANGELOG.md)

---

## 🎯 핵심 기능

### 🌐 Accept-Language 자동 감지

`Accept-Language` 헤더에서 사용자의 브라우저 언어를 자동으로 감지합니다:

```tsx
const { t, language } = await getTranslation("common", {
  availableLanguages: ["en", "ko", "ja", "zh"],
  defaultLanguage: "ko",
});

// 다음 순서로 감지:
// 1. 쿠키 (사용자 선호)
// 2. Accept-Language 헤더 (브라우저 설정)
// 3. 기본 언어 (폴백)
```

### 🎨 변수 삽입

`{{variable}}` 문법으로 동적 값을 삽입합니다:

```tsx
// 기본
t("안녕하세요 {{name}}", { name: "세계" });

// 여러 변수
t("{{count}}/{{total}} 완료", { count: 7, total: 10 });

// 스타일 적용 (Client Component)
t(
  "가격: {{amount}}",
  { amount: 100 },
  { amount: { color: "red", fontWeight: "bold" } },
);
```

### 🎯 타입 안전 언어

```typescript
// 언어 타입 정의
type AppLanguages = "en" | "ko" | "ja";

const { changeLanguage } = useLanguageSwitcher();

changeLanguage("ko");
```

### 🛠️ 개발자 도구

```tsx
import { I18nProvider } from "i18nexus";
import dynamic from "next/dynamic";

const I18NexusDevtools =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(
        () =>
          import("i18nexus/devtools").then((module) => module.I18NexusDevtools),
        { ssr: false },
      );

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <I18NexusDevtools position="bottom-right" /> {/* Dev 모드에서만 */}
    </I18nProvider>
  );
}
```

Devtools는 페이지마다 넣기보다 Provider가 있는 client boundary 안에 한 번만
mount하는 것을 권장합니다. production bundle에 디버깅 UI가 정적으로 들어가지
않도록 dev-only dynamic import 패턴을 사용하세요.

---

## 📦 패키지 정보

- **이름:** i18nexus
- **버전:** 3.4.2
- **라이센스:** MIT
- **TypeScript:** ✅ 완벽 지원
- **번들 크기:** ~15KB (gzipped)

---

## 🤝 기여하기

기여를 환영합니다! 기여 가이드라인을 확인해주세요:

- 📖 [Contributing Guide (English)](./docs/CONTRIBUTING.md)
- 📖 [기여 가이드 (한국어)](./docs/CONTRIBUTING.ko.md)

버그 수정, 기능 추가, 문서 개선 등 모든 도움에 감사드립니다!

---

## 📄 라이센스

MIT License - 자세한 내용은 [LICENSE](./LICENSE)를 참고하세요.

---

## 🔗 링크

- 📦 [npm 패키지](https://www.npmjs.com/package/i18nexus)
- 🐙 [GitHub 저장소](https://github.com/manNomi/i18nexus)
- 📖 [문서](./docs/README.md)
- 🐛 [이슈 트래커](https://github.com/manNomi/i18nexus/issues)
- 💬 [토론](https://github.com/manNomi/i18nexus/discussions)

---

<div align="center">

**React 커뮤니티를 위해 ❤️로 만들었습니다**

[⭐ GitHub에서 Star 주기](https://github.com/manNomi/i18nexus) • [📦 npm에서 보기](https://www.npmjs.com/package/i18nexus)

</div>
