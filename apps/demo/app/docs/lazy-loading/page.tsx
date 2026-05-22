import { Metadata } from "next";
import Link from "next/link";

import { Callout, CodeBlock, PageShell, Section, StepCard } from "@/shared/ui";

export const metadata: Metadata = {
  title: "Lazy Loading - i18nexus Documentation",
  description:
    "Load translation namespaces on demand with I18nProvider and loadNamespace.",
  keywords: [
    "lazy loading",
    "code splitting",
    "performance",
    "i18n optimization",
  ],
};

const loaderExample = `// locales/index.ts
export async function loadNamespace(namespace: string, language: string) {
  const module = await import(\`./\${namespace}/\${language}.json\`);
  return module.default;
}`;

const providerExample = `<I18nProvider
  initialLanguage="ko"
  loadNamespace={loadNamespace}
  fallbackNamespace="common"
  preloadNamespaces={["common"]}
>
  <App />
</I18nProvider>`;

const usageExample = `"use client";

import { useTranslation } from "i18nexus";

export function ProductPage() {
  const { t, isReady } = useTranslation("product");

  if (!isReady) return null;

  return <h1>{t("제품 목록")}</h1>;
}`;

export default function Page() {
  return (
    <PageShell
      backHref="/docs/i18nexus"
      backLabel="문서로 돌아가기"
      title="Lazy Loading"
      description="namespace 번역 파일을 처음 필요한 시점에 불러와 초기 번들 부담을 줄입니다."
      size="narrow"
    >
      <Callout title="현재 API 기준" tone="info">
        <p>
          lazy loading은 <code>createI18n</code> 옵션이 아닙니다.{" "}
          <code>I18nProvider</code>에 <code>loadNamespace</code>를 전달하면
          자동으로 lazy mode가 활성화됩니다.
        </p>
      </Callout>

      <Section title="설정 순서">
        <div className="grid gap-4">
          <StepCard
            step="1"
            title="namespace loader 작성"
            description="namespace와 language를 받아 해당 JSON 파일을 동적으로 import합니다."
          >
            <CodeBlock language="typescript">{loaderExample}</CodeBlock>
          </StepCard>
          <StepCard
            step="2"
            title="I18nProvider에 연결"
            description="fallback namespace는 공통 문구를 위해 미리 로드합니다."
          >
            <CodeBlock language="tsx">{providerExample}</CodeBlock>
          </StepCard>
          <StepCard
            step="3"
            title="컴포넌트에서 namespace 요청"
            description="useTranslation(namespace)가 필요한 namespace를 자동으로 요청합니다."
          >
            <CodeBlock language="tsx">{usageExample}</CodeBlock>
          </StepCard>
        </div>
      </Section>

      <Section title="관련 문서">
        <div className="flex flex-wrap gap-3">
          <Link href="/docs/i18nexus/provider" className="demo-button">
            I18nProvider
          </Link>
          <Link href="/docs/i18nexus/use-translation" className="demo-button">
            useTranslation
          </Link>
        </div>
      </Section>
    </PageShell>
  );
}
