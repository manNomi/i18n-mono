"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { CodeBlock, PageShell, Section } from "@/shared/ui";

export default function I18nexusToolsPage() {
  const { t } = useTranslation("docs-i18nexus-tools");

  const tools = [
    {
      title: t("i18n-wrapper"),
      description: t(
        "Automatically wrap Korean/English text with t() function"
      ),
      href: "/docs/i18nexus-tools/wrapper",
    },
    {
      title: t("i18n-extractor"),
      description: t("Extract translation keys from your codebase"),
      href: "/docs/i18nexus-tools/extractor",
    },
    {
      title: t("i18n-upload"),
      description: t("Upload local translations to Google Sheets"),
      href: "/docs/i18nexus-tools/upload",
    },
    {
      title: t("i18n-download"),
      description: t("Download translations from Google Sheets (incremental)"),
      href: "/docs/i18nexus-tools/download",
    },
    {
      title: t("i18n-download-force"),
      description: t("Force overwrite all translations from Google Sheets"),
      href: "/docs/i18nexus-tools/download-force",
    },
    {
      title: t("Google Sheets Setup"),
      description: t("Configure Google Sheets integration"),
      href: "/docs/i18nexus-tools/google-sheets",
    },
  ];

  return (
    <PageShell
      backHref="/"
      backLabel={t("홈")}
      eyebrow={t("i18nexus-tools 문서")}
      title={t("i18nexus-tools")}
      description={t(
        "코드 변환부터 Google Sheets 통합까지 i18n 워크플로우를 자동화하는 강력한 CLI 도구"
      )}
    >
      <Section title={t("설치")}>
        <CodeBlock language="bash">npm install -D i18nexus-tools</CodeBlock>
      </Section>

      <Section title={t("도구 목록")}>
        <div className="grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50"
            >
              <h3 className="font-semibold text-slate-950">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {tool.description}
              </p>
              <p className="mt-4 text-sm font-semibold text-blue-700">
                {t("자세히 알아보기")} &rarr;
              </p>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t("기본 워크플로우")}>
        <div className="grid gap-4">
          <CodeBlock language="bash">{`npx i18n-wrapper
npx i18n-extractor
npx i18n-upload
npx i18n-download`}</CodeBlock>
          <p className="text-sm leading-6 text-slate-600">
            {t("텍스트 래핑부터 Google Sheets 동기화까지 순서대로 실행합니다.")}
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
