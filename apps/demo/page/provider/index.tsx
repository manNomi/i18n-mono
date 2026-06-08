"use client";

import { useLanguageSwitcher, useTranslation } from "i18nexus";

import { Callout, CodeBlock, PageShell, Section } from "@/shared/ui";

const layoutExample = `// app/layout.tsx
import { cookies } from "next/headers";
import { ClientProvider } from "./ClientProvider";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const language = cookieStore.get("i18n-language")?.value || "ko";

  return (
    <html lang={language}>
      <body>
        <ClientProvider language={language}>{children}</ClientProvider>
      </body>
    </html>
  );
}`;

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
      preloadNamespaces={["common", "home"]}
      languageManagerOptions={{
        defaultLanguage: "ko",
        availableLanguages: [
          { code: "ko", name: "한국어" },
          { code: "en", name: "English" },
        ],
        cookieName: "i18n-language",
      }}
    >
      {children}
    </I18nProvider>
  );
}`;

const hookExample = `"use client";

import { useTranslation } from "i18nexus";

export default function HomePage() {
  const { t, currentLanguage, isReady } = useTranslation("provider");

  if (!isReady) return null;

  return <h1>{t("환영합니다")} ({currentLanguage})</h1>;
}`;

const typedExample = `import { createI18n, type I18nTranslations } from "i18nexus";

const translations = {
  common: {
    ko: { save: "저장" },
    en: { save: "Save" },
  },
} as const satisfies I18nTranslations;

export const i18n = createI18n(translations, {
  fallbackNamespace: "common",
});`;

export default function ProviderPage() {
  const { t, currentLanguage } = useTranslation("provider");
  const { changeLanguage, availableLanguages } = useLanguageSwitcher();

  return (
    <PageShell
      title="I18nProvider"
      description={t(
        "쿠키 기반 언어 영속성 및 SSR 지원을 갖춘 React Context Provider"
      )}
      size="narrow"
    >
      <Callout title={t("현재 권장 경로")} tone="info">
        <p>
          {t(
            "초급 사용자는 I18nProvider와 root useTranslation을 사용합니다. createI18n은 번역 객체에서 namespace/key 타입 추론이 필요할 때 쓰는 고급 typed API입니다."
          )}
        </p>
      </Callout>

      <Section title={t("기본 설정")}>
        <div className="grid gap-4">
          <CodeBlock language="tsx">{layoutExample}</CodeBlock>
          <CodeBlock language="tsx">{providerExample}</CodeBlock>
        </div>
      </Section>

      <Section title="useTranslation">
        <CodeBlock language="tsx">{hookExample}</CodeBlock>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t("클라이언트 컴포넌트에서 번역 함수에 접근하기 위한 훅")}
        </p>
      </Section>

      <Section
        title="createI18n"
        description={t(
          "Provider를 대체하는 API가 아니라, 타입 추론을 강화하는 선택지입니다."
        )}
      >
        <CodeBlock language="typescript">{typedExample}</CodeBlock>
      </Section>

      <Section title={t("라이브 데모")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">
              {t("현재 언어")}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {currentLanguage.toUpperCase()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold ${
                  currentLanguage === lang.code
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      </Section>
    </PageShell>
  );
}
