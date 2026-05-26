# 변수 삽입 (Variable Interpolation) 가이드

i18nexus는 번역 문자열에 동적 값을 삽입할 수 있는 강력한 변수 삽입 기능을 제공합니다.

## 📋 목차

- [기본 사용법](#기본-사용법)
- [Client Component에서 사용](#client-component에서-사용)
- [Server Component에서 사용](#server-component에서-사용)
- [스타일 적용 (Client Only)](#스타일-적용-client-only)
- [번역 파일 설정](#번역-파일-설정)

---

## 기본 사용법

### 변수 플레이스홀더 문법

i18nexus는 `{{변수명}}` 문법을 사용합니다:

```typescript
// ❌ 템플릿 리터럴 (지원하지 않음)
`환영합니다 ${count}`;

// ✅ i18nexus 변수 삽입
t("환영합니다 {{count}}", { count: 5 });
// 결과: "환영합니다 5"
```

---

## Client Component에서 사용

### 기본 변수 삽입

```tsx
"use client";
import { useTranslation } from "i18nexus";

function WelcomeMessage() {
  const { t } = useTranslation();
  const userName = "홍길동";
  const count = 5;

  return (
    <div>
      {/* 단일 변수 */}
      <h1>{t("안녕하세요 {{name}}님", { name: userName })}</h1>

      {/* 복수 변수 */}
      <p>{t("{{count}}개의 새 메시지가 있습니다", { count })}</p>

      {/* 다양한 타입 */}
      <p>
        {t("가격: {{price}}원 ({{discount}}% 할인)", {
          price: 10000,
          discount: 20,
        })}
      </p>
    </div>
  );
}
```

### 스타일 적용

변수에 직접 스타일을 적용할 수 있습니다:

```tsx
"use client";
import { useTranslation } from "i18nexus";

function StyledMessage() {
  const { t } = useTranslation();

  return (
    <div>
      {/* 변수에 스타일 적용 */}
      {t(
        "환영합니다 {{name}}님",
        { name: "홍길동" },
        { name: { color: "blue", fontWeight: "bold" } },
      )}

      {/* 복수 변수에 각각 스타일 적용 */}
      {t(
        "{{count}}개 중 {{completed}}개 완료",
        { count: 10, completed: 7 },
        {
          count: { color: "gray" },
          completed: { color: "green", fontWeight: "bold" },
        },
      )}
    </div>
  );
}
```

**결과 HTML:**

```html
<span
  >환영합니다
  <span style="color: blue; font-weight: bold;">홍길동</span>님</span
>
```

---

## Server Component에서 사용

Server Component에서도 동일한 문법으로 변수 삽입을 사용할 수 있습니다:

### 기본 사용

```tsx
// app/page.tsx (Server Component)
import { getTranslation } from "i18nexus/server";

export default async function ServerPage() {
  const { t } = await getTranslation("common");

  const userName = "홍길동";
  const count = 5;

  return (
    <div>
      {/* 단일 변수 */}
      <h1>{t("안녕하세요 {{name}}님", { name: userName })}</h1>

      {/* 복수 변수 */}
      <p>{t("{{count}}개의 새 메시지가 있습니다", { count })}</p>
    </div>
  );
}
```

### 동적 데이터와 함께 사용

```tsx
// app/posts/[id]/page.tsx
import { getTranslation } from "i18nexus/server";

async function getPost(id: string) {
  // API 호출
  return { title: "게시글", views: 1234, comments: 45 };
}

export default async function PostPage({ params }: { params: { id: string } }) {
  const { t } = await getTranslation("common");
  const post = await getPost(params.id);

  return (
    <article>
      <h1>{post.title}</h1>
      <div>
        {t("조회수: {{views}}", { views: post.views })}
        {" | "}
        {t("댓글: {{count}}개", { count: post.comments })}
      </div>
    </article>
  );
}
```

**⚠️ 주의:** Server Component에서는 스타일 적용 기능을 사용할 수 없습니다. 문자열만 반환됩니다.

---

## 번역 파일 설정

### locales/ko.json

```json
{
  "안녕하세요 {{name}}님": "안녕하세요 {{name}}님",
  "{{count}}개의 새 메시지가 있습니다": "{{count}}개의 새 메시지가 있습니다",
  "조회수: {{views}}": "조회수: {{views}}",
  "댓글: {{count}}개": "댓글: {{count}}개",
  "가격: {{price}}원 ({{discount}}% 할인)": "가격: {{price}}원 ({{discount}}% 할인)"
}
```

### locales/en.json

```json
{
  "안녕하세요 {{name}}님": "Hello, {{name}}",
  "{{count}}개의 새 메시지가 있습니다": "You have {{count}} new messages",
  "조회수: {{views}}": "Views: {{views}}",
  "댓글: {{count}}개": "{{count}} comments",
  "가격: {{price}}원 ({{discount}}% 할인)": "Price: ${{price}} ({{discount}}% off)"
}
```

---

## 🎯 실전 예제

### 쇼핑몰 장바구니

```tsx
"use client";
import { useTranslation } from "i18nexus";

function ShoppingCart({ items }: { items: CartItem[] }) {
  const { t } = useTranslation();
  const totalPrice = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;

  return (
    <div>
      <h2>{t("장바구니")}</h2>
      <p>{t("{{count}}개 상품", { count: itemCount })}</p>
      <p>
        {t(
          "합계: {{total}}원",
          { total: totalPrice },
          { total: { fontSize: "1.5em", fontWeight: "bold", color: "red" } },
        )}
      </p>
    </div>
  );
}
```

### 알림 메시지

```tsx
"use client";
import { useTranslation } from "i18nexus";

function NotificationBadge({ unreadCount }: { unreadCount: number }) {
  const { t } = useTranslation();

  if (unreadCount === 0) {
    return <span>{t("알림 없음")}</span>;
  }

  return (
    <span>
      {t(
        "{{count}}개의 읽지 않은 알림",
        { count: unreadCount },
        {
          count: {
            backgroundColor: "red",
            color: "white",
            padding: "2px 6px",
            borderRadius: "10px",
            fontSize: "12px",
          },
        },
      )}
    </span>
  );
}
```

### 날짜/시간 표시

```tsx
"use client";
import { useTranslation } from "i18nexus";

function TimeAgo({ minutes }: { minutes: number }) {
  const { t } = useTranslation();

  if (minutes < 1) {
    return <span>{t("방금 전")}</span>;
  }

  if (minutes < 60) {
    return <span>{t("{{minutes}}분 전", { minutes })}</span>;
  }

  const hours = Math.floor(minutes / 60);
  return <span>{t("{{hours}}시간 전", { hours })}</span>;
}
```

---

## 🔧 TypeScript 타입 안정성

```typescript
import { useTranslation } from 'i18nexus';
import type { TranslationVariables, TranslationStyles } from 'i18nexus';

// 변수 타입 정의
const variables: TranslationVariables = {
  name: "홍길동",  // string
  count: 5,         // number
  price: 10000,     // number
};

// 스타일 타입 정의
const styles: TranslationStyles = {
  name: { color: 'blue', fontWeight: 'bold' },
  count: { fontSize: '1.2em' },
};

function TypedComponent() {
  const { t } = useTranslation();

  return (
    <div>
      {t("안녕하세요 {{name}}님, {{count}}개의 알림", variables, styles)}
    </div>
  );
}
```

---

## ⚠️ 주의사항

### 1. 플레이스홀더는 반드시 `{{변수명}}` 형태로

```typescript
// ❌ 잘못된 형태
t("안녕하세요 {name}님", { name }); // 단일 중괄호
t("안녕하세요 $name님", { name }); // $ 기호
t("안녕하세요 ${name}님", { name }); // 템플릿 리터럴

// ✅ 올바른 형태
t("안녕하세요 {{name}}님", { name }); // 이중 중괄호
```

### 2. 변수명은 영문, 숫자, 언더스코어만 가능

```typescript
// ✅ 올바른 변수명
t("{{count}}", { count: 5 });
t("{{user_name}}", { user_name: "홍길동" });
t("{{value123}}", { value123: 100 });

// ❌ 잘못된 변수명
t("{{user-name}}", { "user-name": "홍길동" }); // 하이픈 불가
t("{{user.name}}", { "user.name": "홍길동" }); // 점 불가
```

### 3. Server Component에서는 스타일 불가

```typescript
// ❌ Server Component에서는 작동하지 않음
import { getTranslation } from "i18nexus/server";

export default async function ServerPage() {
  const { t } = await getTranslation("common");

  return t("{{name}}", { name: "홍길동" }, { name: { color: "red" } });
  // 세 번째 인자(스타일)는 무시됨
}
```

```typescript
// ✅ Client Component에서만 스타일 사용
"use client";

import { useTranslation } from "i18nexus";

export default function ClientPage() {
  const { t } = useTranslation();

  return t("{{name}}", { name: "홍길동" }, { name: { color: "red" } });
}
```

### 4. 변수가 제공되지 않으면 플레이스홀더 유지

```typescript
t("안녕하세요 {{name}}님");
// 결과: "안녕하세요 {{name}}님" (변수 없으면 그대로 표시)

t("안녕하세요 {{name}}님", {});
// 결과: "안녕하세요 {{name}}님"

t("안녕하세요 {{name}}님", { name: "홍길동" });
// 결과: "안녕하세요 홍길동님"
```

---

## 📚 관련 문서

- [README.md](./README.md) - 전체 가이드
- [DEVTOOLS.md](./DEVTOOLS.md) - 개발자 도구
- [TYPED_CONFIG.md](./TYPED_CONFIG.md) - 타입 안전 설정

---

<div align="center">

**Made with ❤️ for the React community**

[⭐ Star us on GitHub](https://github.com/manNomi/i18nexus)

</div>
