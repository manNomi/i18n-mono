"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { Callout, CodeBlock, PageShell, Section, StepCard } from "@/shared/ui";

const providerExample = `// app/ClientProvider.tsx
"use client";

import { I18nProvider } from "i18nexus";
import { loadNamespace } from "@/locales";

export function ClientProvider({
  children,
  language,
}: {
  children: React.ReactNode;
  language: string;
}) {
  return (
    <I18nProvider
      initialLanguage={language}
      loadNamespace={loadNamespace}
      fallbackNamespace="common"
      preloadNamespaces={["common"]}
      languageManagerOptions={{
        defaultLanguage: "ko",
        availableLanguages: [
          { code: "ko", name: "한국어" },
          { code: "en", name: "English" },
        ],
      }}
    >
      {children}
    </I18nProvider>
  );
}`;

const namespaceLoaderExample = `// locales/index.ts
export async function loadNamespace(namespace: string, lang: string) {
  const module = await import(\`./\${namespace}/\${lang}.json\`);
  return module.default;
}`;

const clientExample = `"use client";

import { useTranslation } from "i18nexus";
import { PageSkeleton } from "@/shared/ui";

export default function Page() {
  const { t, isReady } = useTranslation("getting-started");

  if (!isReady) return <PageSkeleton variant="docs" />;

  return <div>{t("안녕하세요")}</div>;
}`;

const serverExample = `import { headers } from "next/headers";
import { createServerTranslation, getServerLanguage } from "i18nexus/server";

import commonEn from "@/locales/common/en.json";
import commonKo from "@/locales/common/ko.json";
import gettingStartedEn from "@/locales/getting-started/en.json";
import gettingStartedKo from "@/locales/getting-started/ko.json";

const translations = {
  common: { en: commonEn, ko: commonKo },
  "getting-started": { en: gettingStartedEn, ko: gettingStartedKo },
};

export default async function Page() {
  const lang = getServerLanguage(await headers(), {
    defaultLanguage: "ko",
    availableLanguages: ["en", "ko"],
  });
  const t = createServerTranslation(lang, translations);

  return <div>{t("안녕하세요")}</div>;
}`;

export default function GettingStartedPage() {
  const { t } = useTranslation("getting-started");
  const actions = (
    <Link href="/cli" className="demo-button">
      {t("CLI 도구 살펴보기")}
    </Link>
  );

  return (
    <PageShell
      backHref="/"
      backLabel={t("홈으로 돌아가기")}
      title={t("시작하기")}
      description={t("프로젝트에 i18nexus를 설정하는 완벽한 단계별 가이드")}
      actions={actions}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <StepCard
          step="1"
          title={t("설치")}
          description={t("React 컴포넌트와 CLI 도구를 모두 설치합니다")}
        >
          <CodeBlock language="bash">npm install i18nexus</CodeBlock>
        </StepCard>

        <StepCard
          step="2"
          title={t("프로젝트 초기화")}
          description={t("다음을 생성합니다")}
        >
          <CodeBlock language="bash">npx i18n-sheets init</CodeBlock>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <code className="rounded bg-slate-100 px-1.5 py-0.5">
                i18nexus.config.json
              </code>{" "}
              - {t("프로젝트 설정 파일")}
            </li>
            <li>
              <code className="rounded bg-slate-100 px-1.5 py-0.5">
                locales/
              </code>{" "}
              - {t("번역 파일 디렉토리 (ko.json, en.json)")}
            </li>
          </ul>
        </StepCard>
      </div>

      <Section
        title={t("i18n 설정")}
        description={t(
          "Lazy loading은 createI18n 옵션이 아니라 I18nProvider props로 설정합니다."
        )}
      >
        <div className="grid gap-4">
          <CodeBlock language="typescript">{namespaceLoaderExample}</CodeBlock>
          <CodeBlock language="tsx">{providerExample}</CodeBlock>
        </div>
      </Section>

      <Section title={t("한국어 텍스트 감싸기")}>
        <CodeBlock language="bash">npx i18n-wrapper</CodeBlock>
        <Callout title={t("중요: 서버 컴포넌트 확인")} tone="warning">
          <p>
            {t("클라이언트 컴포넌트는")} <code>useTranslation()</code>
            {t("을 사용하고, 서버 컴포넌트는")}{" "}
            <code>createServerTranslation()</code>
            {t("을 사용합니다.")}
          </p>
        </Callout>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold text-slate-950">
              {t("클라이언트 컴포넌트의 경우")}
            </h3>
            <CodeBlock language="tsx">{clientExample}</CodeBlock>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-slate-950">
              {t("서버 컴포넌트의 경우")}
            </h3>
            <CodeBlock language="tsx">{serverExample}</CodeBlock>
          </div>
        </div>
      </Section>

      <Section title={t("번역 키 추출")}>
        <CodeBlock language="bash">npx i18n-extractor</CodeBlock>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t("코드를 스캔하여 번역 파일을 생성/업데이트합니다")}
        </p>
      </Section>

      <Section title={t("완료!")}>
        <p className="text-sm leading-6 text-slate-600">
          {t("앱이 완전히 국제화되었으며 배포할 준비가 되었습니다")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/docs/i18nexus/provider" className="demo-button">
            {t("I18nProvider 자세히 알아보기")}
          </Link>
          <Link href="/docs/i18nexus/server-components" className="demo-button">
            {t("서버 컴포넌트")}
          </Link>
        </div>
      </Section>
    </PageShell>
  );
}
