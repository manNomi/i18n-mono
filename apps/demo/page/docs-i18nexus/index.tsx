"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { CodeBlock, PageShell, Section } from "@/shared/ui";

const providerQuickStart = `// app/ClientProvider.tsx
"use client";

import { I18nProvider } from "i18nexus";
import { loadNamespace } from "@/locales";

export function ClientProvider({ children, language }) {
  return (
    <I18nProvider
      initialLanguage={language}
      loadNamespace={loadNamespace}
      fallbackNamespace="common"
      preloadNamespaces={["common"]}
    >
      {children}
    </I18nProvider>
  );
}`;

const hookQuickStart = `"use client";

import { useTranslation } from "i18nexus";
import { PageSkeleton } from "@/shared/ui";

export default function MyComponent() {
  const { t, isReady } = useTranslation("docs-i18nexus");

  if (!isReady) return <PageSkeleton variant="docs" />;

  return <h1>{t("Welcome")}</h1>;
}`;

export default function I18nexusDocsPage() {
  const { t } = useTranslation("docs-i18nexus");

  const features = [
    {
      title: "I18nProvider",
      description: t("쿠키 기반 언어 영속성을 갖춘 React Context Provider"),
      href: "/docs/i18nexus/provider",
    },
    {
      title: "useTranslation",
      description: t("클라이언트 컴포넌트에서 번역 함수에 접근하기 위한 훅"),
      href: "/docs/i18nexus/use-translation",
    },
    {
      title: "useLanguageSwitcher",
      description: t("쿠키 영속성을 통한 언어 변경 훅"),
      href: "/docs/i18nexus/use-language-switcher",
    },
    {
      title: "Server Components",
      description: t("하이드레이션 불일치 제로의 서버 사이드 번역"),
      href: "/docs/i18nexus/server-components",
    },
  ];

  return (
    <PageShell
      backHref="/"
      backLabel={t("홈")}
      eyebrow={t("i18nexus 문서")}
      title={t("i18nexus 라이브러리")}
      description={t(
        "쿠키 기반 언어 관리 및 SSR 지원을 갖춘 완전한 React i18n 툴킷"
      )}
    >
      <Section title={t("설치")}>
        <CodeBlock language="bash">npm install i18nexus</CodeBlock>
      </Section>

      <Section title={t("핵심 기능")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50"
            >
              <h3 className="font-semibold text-slate-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-blue-700">
                {t("자세히 알아보기")} &rarr;
              </p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t("빠른 시작")}>
        <div className="grid gap-4">
          <CodeBlock language="tsx">{providerQuickStart}</CodeBlock>
          <CodeBlock language="tsx">{hookQuickStart}</CodeBlock>
        </div>
      </Section>
    </PageShell>
  );
}
