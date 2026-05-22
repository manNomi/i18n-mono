import { getTranslation } from "i18nexus/server";

import { CodeBlock, PageShell, Section } from "@/shared/ui";

const serverCode = `import { getTranslation } from "i18nexus/server";

export default async function Page() {
  const { t, language } = await getTranslation<"server-example">(
    "server-example"
  );

  return (
    <main>
      <h1>{t("서버 컴포넌트 예제")}</h1>
      <p>{language}</p>
    </main>
  );
}`;

export default async function ServerExamplePage() {
  const { t, language } =
    await getTranslation<"server-example">("server-example");

  return (
    <PageShell
      backHref="/"
      backLabel={t("홈으로 돌아가기")}
      title={t("서버 컴포넌트 예제")}
      description={t(
        "이 페이지는 서버 컴포넌트입니다 - 'use client' 지시문이 필요 없습니다!",
      )}
      size="narrow"
    >
      <Section title={t("사용 방법")}>
        <CodeBlock language="tsx">{serverCode}</CodeBlock>
      </Section>

      <Section title={t("서버 컴포넌트의 이점")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            [
              t("더 작은 JavaScript 번들"),
              t("클라이언트로 전송되는 React Context나 훅 없음"),
            ],
            [t("더 빠른 초기 로딩"), t("서버에서 렌더링된 번역")],
            [t("더 나은 SEO"), t("올바른 언어로 완전히 렌더링된 HTML")],
            [
              t("하이드레이션 불일치 없음"),
              t("서버와 클라이언트가 항상 동기화됨"),
            ],
          ].map(([title, description]) => (
            <article
              key={title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <h3 className="font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </Section>

      <Section title={t("현재 상태")}>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="font-medium text-slate-500">{t("현재 언어")}</dt>
            <dd className="mt-1 font-semibold text-slate-950">{language}</dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="font-medium text-slate-500">{t("컴포넌트 타입")}</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              Server Component
            </dd>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <dt className="font-medium text-slate-500">{t("번역 방법")}</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              getTranslation()
            </dd>
          </div>
        </dl>
      </Section>
    </PageShell>
  );
}
