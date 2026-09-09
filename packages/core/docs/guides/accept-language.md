# Accept-Language 헤더 자동 감지 가이드

i18nexus는 사용자의 브라우저 언어를 자동으로 감지하여 최적의 언어를 제공합니다.

## 🌐 작동 방식

i18nexus는 다음 우선순위로 언어를 결정합니다:

1. **쿠키** (최우선) - 사용자가 선택한 언어
2. **Accept-Language 헤더** - 브라우저 설정 언어
3. **기본 언어** - 설정된 기본 언어

## 📋 목차

- [기본 사용법](#기본-사용법)
- [Server Components](#server-components)
- [실전 예제](#실전-예제)
- [Accept-Language 헤더란?](#accept-language-헤더란)
- [품질 값 (Quality Values)](#품질-값-quality-values)

---

## 기본 사용법

### Server Component에서 자동 감지

```tsx
// app/layout.tsx
import { getTranslation } from "i18nexus/server";

export default async function RootLayout({ children }) {
  const { t, language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja", "zh"],
    defaultLanguage: "en",
  });

  // Accept-Language 헤더에서 자동으로 언어 감지
  // 예: "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7" -> "ko"

  return (
    <html lang={language}>
      <body>
        <h1>{t("Welcome")}</h1>
        {children}
      </body>
    </html>
  );
}
```

### 명시적 Headers 사용

```tsx
// app/page.tsx
import { headers } from "next/headers";
import { getServerLanguage } from "i18nexus/server";

export default async function Page() {
  const headersList = await headers();

  const language = getServerLanguage(headersList, {
    availableLanguages: ["en", "ko", "ja"],
    defaultLanguage: "en",
  });

  return <div>Detected Language: {language}</div>;
}
```

---

## Server Components

### getTranslation(namespace) - 자동 감지 포함

```tsx
import { getTranslation } from "i18nexus/server";

export default async function ServerPage() {
  const { t, language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja", "zh"],
    defaultLanguage: "en",
  });

  return (
    <div>
      <h1>{t("Welcome to {{site}}", { site: "i18nexus" })}</h1>
      <p>Your language: {language}</p>
    </div>
  );
}
```

### createServerI18nWithTranslations() - 번역 직접 제공

```tsx
import { headers } from "next/headers";
import { createServerI18nWithTranslations } from "i18nexus/server";
import enTranslations from "@/locales/en.json";
import koTranslations from "@/locales/ko.json";

export default async function ServerPage() {
  const headersList = await headers();

  const { t, language } = createServerI18nWithTranslations(
    headersList,
    {
      en: enTranslations,
      ko: koTranslations,
    },
    {
      availableLanguages: ["en", "ko"],
      defaultLanguage: "en",
    }
  );

  return <h1>{t("Welcome")}</h1>;
}
```

---

## 실전 예제

### 다국어 블로그

```tsx
// app/blog/[slug]/page.tsx
import { getTranslation } from "i18nexus/server";

interface Post {
  title: string;
  content: string;
  date: string;
}

async function getPost(slug: string): Promise<Post> {
  // API 호출
  return {
    title: "Example Post",
    content: "Post content...",
    date: "2025-10-26",
  };
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const { t, language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja", "zh"],
    defaultLanguage: "en",
  });

  const post = await getPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <time>{post.date}</time>
      <p>{t("Written in {{lang}}", { lang: language })}</p>
      <div>{post.content}</div>
      <footer>
        <p>{t("Thanks for reading!")}</p>
      </footer>
    </article>
  );
}
```

### 전자상거래 사이트

```tsx
// app/products/[id]/page.tsx
import { getTranslation } from "i18nexus/server";

interface Product {
  name: string;
  price: number;
  description: string;
}

async function getProduct(id: string): Promise<Product> {
  return {
    name: "Product Name",
    price: 49900,
    description: "Product description",
  };
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const { t, language } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja", "zh"],
    defaultLanguage: "en",
  });

  const product = await getProduct(params.id);

  return (
    <div>
      <h1>{product.name}</h1>
      <p className="price">
        {t("Price: {{price}} KRW", { price: product.price })}
      </p>
      <p>{product.description}</p>
      <button>{t("Add to Cart")}</button>
      <p className="shipping">
        {t("Free shipping on orders over {{amount}}", { amount: 50000 })}
      </p>
    </div>
  );
}
```

### 다국어 대시보드

```tsx
// app/dashboard/page.tsx
import { getTranslation } from "i18nexus/server";

interface Stats {
  users: number;
  revenue: number;
  orders: number;
}

async function getStats(): Promise<Stats> {
  return {
    users: 1234,
    revenue: 5678900,
    orders: 432,
  };
}

export default async function Dashboard() {
  const { t } = await getTranslation("common", {
    availableLanguages: ["en", "ko", "ja", "zh", "es", "fr"],
    defaultLanguage: "en",
  });

  const stats = await getStats();

  return (
    <div className="dashboard">
      <h1>{t("Dashboard")}</h1>
      <div className="stats">
        <div className="stat-card">
          <h3>{t("Total Users")}</h3>
          <p className="number">{stats.users.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3>{t("Revenue")}</h3>
          <p className="number">
            {t("{{amount}} KRW", { amount: stats.revenue })}
          </p>
        </div>
        <div className="stat-card">
          <h3>{t("Orders")}</h3>
          <p className="number">{stats.orders.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Accept-Language 헤더란?

`Accept-Language` 헤더는 사용자의 브라우저가 서버에게 선호하는 언어를 알려주는 HTTP 헤더입니다.

### 헤더 예시

```
Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7
```

이는 다음을 의미합니다:

- 한국어(한국) - 최우선
- 한국어 - 0.9 품질
- 영어(미국) - 0.8 품질
- 영어 - 0.7 품질

### i18nexus의 매칭 로직

```typescript
// 1. 정확한 매칭 시도
"ko-KR" -> "ko-KR" (정확히 일치하는 언어가 있으면)

// 2. 기본 언어 코드 매칭
"ko-KR" -> "ko" (지역 코드 제거)

// 3. 품질 값에 따른 우선순위
"en;q=0.5,ko;q=0.9" -> "ko" (더 높은 품질 값)
```

---

## 품질 값 (Quality Values)

품질 값(q-factor)은 0에서 1 사이의 값으로, 사용자의 언어 선호도를 나타냅니다.

### 품질 값 예시

```
Accept-Language: ko;q=1.0, en;q=0.8, ja;q=0.5
```

- `ko` (q=1.0) - 한국어를 가장 선호
- `en` (q=0.8) - 영어를 두 번째로 선호
- `ja` (q=0.5) - 일본어를 세 번째로 선호

### 기본값

품질 값이 명시되지 않으면 **1.0**이 기본값입니다:

```
Accept-Language: ko-KR, en-US;q=0.8
```

위는 다음과 같습니다:

```
Accept-Language: ko-KR;q=1.0, en-US;q=0.8
```

---

## 🔍 디버깅

### 현재 Accept-Language 확인하기

```tsx
import { headers } from "next/headers";

export default async function DebugPage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language");
  const cookie = headersList.get("cookie");

  return (
    <div>
      <h2>Debug Info</h2>
      <p>Accept-Language: {acceptLanguage}</p>
      <p>Cookie: {cookie}</p>
    </div>
  );
}
```

### 브라우저에서 언어 설정 변경

**Chrome:**

1. Settings → Languages → Language
2. Add language and drag to top

**Firefox:**

1. Settings → General → Language → Set Alternatives
2. Choose preferred languages and order

**Safari:**

1. System Preferences → Language & Region
2. Preferred Languages

---

## ⚠️ 주의사항

### 1. availableLanguages 필수

Accept-Language 감지를 사용하려면 `availableLanguages` 옵션이 **필수**입니다:

```tsx
// ❌ 작동하지 않음 - availableLanguages 없음
const { language } = await getTranslation("common", {
  defaultLanguage: "en",
});

// ✅ 올바른 사용
const { language } = await getTranslation("common", {
  availableLanguages: ["en", "ko", "ja"],
  defaultLanguage: "en",
});
```

### 2. 우선순위 이해

```typescript
// 우선순위:
// 1. Cookie (사용자가 직접 선택)
// 2. Accept-Language (브라우저 설정)
// 3. defaultLanguage (기본값)
```

쿠키가 있으면 Accept-Language는 무시됩니다. 이는 사용자가 직접 선택한 언어를 존중하기 위함입니다.

### 3. 대소문자 무관

```typescript
// 모두 같은 결과
"ko-KR" -> "ko"
"KO-KR" -> "ko"
"Ko-Kr" -> "ko"
```

---

## 🎯 베스트 프랙티스

### 1. 충분한 언어 목록 제공

```tsx
const { language } = await getTranslation("common", {
  // 지원하는 모든 언어를 명시
  availableLanguages: ["en", "ko", "ja", "zh", "es", "fr", "de"],
  defaultLanguage: "en",
});
```

### 2. Config 파일에서 관리

```typescript
// src/i18n-config.ts (imported by application code; not auto-discovered)
export const config = defineConfig({
  languages: ["en", "ko", "ja", "zh"] as const,
  defaultLanguage: "en",
  localesDir: "./locales",
});

export type AppLanguages = (typeof config.languages)[number];
```

```tsx
// app/layout.tsx
import { getTranslation } from "i18nexus/server";
import { config } from "@/i18n-config";

export default async function RootLayout({ children }) {
  const { language } = await getTranslation("common", {
    availableLanguages: [...config.languages],
    defaultLanguage: config.defaultLanguage,
  });

  return <html lang={language}>{children}</html>;
}
```

### 3. 언어 변경 기능 제공

```tsx
// app/components/LanguageSwitcher.tsx
"use client";

import { useLanguageSwitcher } from "i18nexus";

export default function LanguageSwitcher() {
  const { currentLanguage, changeLanguage, availableLanguages } =
    useLanguageSwitcher();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}
```

---

## 📚 관련 문서

- [README.md](./README.md) - 전체 가이드
- [INTERPOLATION_GUIDE.md](./INTERPOLATION_GUIDE.md) - 변수 삽입 가이드
- [DEVTOOLS.md](./DEVTOOLS.md) - 개발자 도구
- [TYPED_CONFIG.md](./TYPED_CONFIG.md) - 타입 안전 설정

---

<div align="center">

**Made with ❤️ for the React community**

[⭐ Star us on GitHub](https://github.com/manNomi/i18nexus)

</div>
