"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { DownloadStats } from "@/entities/download";
import { Section } from "@/shared/ui";

export default function HomePage() {
  const { t } = useTranslation("home");

  const features = [
    {
      title: t("쿠키 기반 언어 관리 및 SSR 지원을 갖춘 완전한 React i18n 툴킷"),
      description: t(
        "쿠키 기반 언어 관리로 서버와 클라이언트가 항상 동일한 언어를 사용합니다.",
      ),
    },
    {
      title: t("CLI로 자동 텍스트 래핑"),
      description: t(
        "i18n-wrapper CLI가 코드를 분석해 자동으로 번역 함수를 적용합니다.",
      ),
    },
    {
      title: t("Google Sheets 연동"),
      description: t(
        "번역 파일을 Google Sheets로 관리하고 자동 동기화할 수 있습니다.",
      ),
    },
    {
      title: t("타입 안전성"),
      description: t("TypeScript 완벽 지원으로 컴파일 타임 오류 방지"),
    },
  ];

  const quickLinks = [
    {
      href: "/getting-started",
      title: t("시작하기"),
      description: t("복잡한 설정 없이 3단계로 즉시 시작하세요"),
    },
    {
      href: "/docs/i18nexus",
      title: t("문서 보기"),
      description: t("상세한 사용법과 API 레퍼런스를 확인하세요"),
    },
    {
      href: "/cli",
      title: "CLI",
      description: t(
        "코드 변환부터 Google Sheets 통합까지 i18n 워크플로우를 자동화하는 강력한 CLI 도구",
      ),
    },
    {
      href: "/showcase",
      title: t("i18nexus 쇼케이스"),
      description: t("i18nexus와 i18nexus-tools를 사용하는 실제 프로젝트들"),
    },
  ];

  return (
    <main className="demo-shell">
      <section className="mb-10 border-b border-slate-200 pb-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
          i18nexus
        </p>
        <h1 className="max-w-4xl text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
          {t("글로벌 앱을 위한 다국어 타입안전 라이브러리")}
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          {t("자동화된 워크플로우로 다국어 지원을 1분 안에 설정하세요")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/getting-started" className="demo-button-primary">
            {t("무료로 시작하기")}
          </Link>
          <Link href="/docs/i18nexus" className="demo-button">
            {t("문서 보기")}
          </Link>
        </div>
      </section>

      <Section
        title={t("신뢰받는 i18n 솔루션")}
        description={t("전 세계 개발자들이 선택한 번역 관리 도구")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <DownloadStats
            packageName="i18nexus"
            displayName="i18nexus"
            color="blue"
          />
          <DownloadStats
            packageName="i18nexus-tools"
            displayName="i18nexus-tools"
            color="indigo"
          />
        </div>
      </Section>

      <Section
        title={t("핵심 기능")}
        description={t("개발자를 위해 설계된 완전한 i18n 도구 모음")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="font-semibold text-slate-950">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title={t("바로가기")}>
        <div className="grid gap-3 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-blue-200 hover:bg-blue-50"
            >
              <h3 className="font-semibold text-slate-950">{link.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </Section>
    </main>
  );
}
