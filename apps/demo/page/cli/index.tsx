"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { CodeBlock, PageShell, Section } from "@/shared/ui";

export default function CLIPage() {
  const { t } = useTranslation("cli");

  const tools = [
    {
      name: "i18n-wrapper",
      title: t("자동 텍스트 래핑"),
      description: t(
        "한국어 텍스트를 자동으로 t()로 감싸고 import를 추가합니다",
      ),
      command: 'npx i18n-wrapper --pattern "app/**/*.tsx"',
      href: "/docs/i18nexus-tools/wrapper",
    },
    {
      name: "i18n-extractor",
      title: t("스마트 키 추출"),
      description: t("번역 키를 추출하고 기존 파일과 지능적으로 병합합니다"),
      command: "npx i18n-extractor",
      href: "/docs/i18nexus-tools/extractor",
    },
    {
      name: "i18n-upload",
      title: t("업로드"),
      description: t("팀 번역을 위해 Google Sheets에 업로드합니다"),
      command: "npx i18n-upload",
      href: "/docs/i18nexus-tools/upload",
    },
    {
      name: "i18n-download",
      title: t("다운로드"),
      description: t("Sheets와 동기화"),
      command: "npx i18n-download",
      href: "/docs/i18nexus-tools/download",
    },
  ];

  return (
    <PageShell
      title={t("CLI Tools")}
      description={t("텍스트 래핑 및 번역 관리를 위한 강력한 자동화 도구")}
      actions={
        <Link href="/docs/i18nexus-tools" className="demo-button">
          i18nexus-tools
        </Link>
      }
    >
      <Section title={t("설치")}>
        <CodeBlock language="bash">npm install -D i18nexus-tools</CodeBlock>
      </Section>

      <Section title={t("전체 워크플로우")}>
        <div className="grid gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    {tool.name}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {tool.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {tool.description}
                  </p>
                </div>
                <code className="rounded bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  {tool.command}
                </code>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t("기본 사용법")}>
        <CodeBlock language="bash">{`npx i18n-wrapper --dry-run
npx i18n-wrapper
npx i18n-extractor
npx i18n-upload
npx i18n-download`}</CodeBlock>
      </Section>
    </PageShell>
  );
}
