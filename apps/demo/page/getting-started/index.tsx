"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { CodeBlock } from "@/shared/ui";

export default function GettingStartedPage() {
  const { t } = useTranslation("getting-started");

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <Link
          href="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-4 sm:mb-6 text-sm sm:text-base"
        >
          <span className="mr-2">←</span>
          {t("홈으로 돌아가기")}
        </Link>
        <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 sm:mb-4">
          {t("시작하기")}
        </h1>
        <p className="text-base sm:text-xl text-slate-300">
          {t("프로젝트에 i18nexus를 설정하는 완벽한 단계별 가이드")}
        </p>
      </div>

      {/* Installation */}
      <section className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 rounded-xl sm:rounded-2xl border border-blue-800/50 p-4 sm:p-8 mb-6 sm:mb-8">
        <div className="flex items-center mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center mr-3 sm:mr-4">
            <span className="text-white font-bold text-lg sm:text-xl">1</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            {t("설치")}
          </h2>
        </div>

        <div className="bg-slate-950 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-3 sm:mb-4 overflow-x-auto">
          <code className="text-green-400 text-sm sm:text-base">
            npm install i18nexus
          </code>
        </div>

        <p className="text-slate-300 text-xs sm:text-sm">
          {t("React 컴포넌트와 CLI 도구를 모두 설치합니다")}
        </p>
      </section>

      {/* Step 2: Initialize Project */}
      <section className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 rounded-2xl border border-purple-800/50 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white font-bold text-xl">2</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {t("프로젝트 초기화")}
          </h2>
        </div>

        <div className="bg-slate-950 rounded-xl p-6 mb-4">
          <code className="text-green-400">npx i18n-sheets init</code>
        </div>

        <div className="space-y-3 text-slate-300">
          <p className="font-semibold text-white">{t("다음을 생성합니다")}:</p>
          <ul className="space-y-2 ml-6">
            <li className="flex items-start">
              <span className="text-purple-400 mr-3">•</span>
              <code className="bg-slate-900 px-2 py-1 rounded text-sm">
                i18nexus.config.json
              </code>
              <span className="ml-2">- {t("프로젝트 설정 파일")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-400 mr-3">•</span>
              <code className="bg-slate-900 px-2 py-1 rounded text-sm">
                locales/
              </code>
              <span className="ml-2">
                - {t("번역 파일 디렉토리 (ko.json, en.json)")}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Step 3: Setup i18n */}
      <section className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 rounded-2xl border border-green-800/50 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white font-bold text-xl">3</span>
          </div>
          <h2 className="text-3xl font-bold text-white">{t("i18n 설정")}</h2>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-slate-300 mb-3">
              <strong className="text-white">
                {t("locales/index.ts 파일 생성")}:
              </strong>
            </p>
            <CodeBlock language="typescript">
              {t(
                "// locales/index.ts\nimport { createI18n } from \"i18nexus\";\n\nexport const translations = {} as const;\n\nasync function loadNamespace(namespace: string, lang: string) {\n  const module = await import(\\`./\\${namespace}/\\${lang}.json\\`);\n  return module.default;\n}\n\nexport const i18n = createI18n(translations, {\n  fallbackNamespace: \"common\",\n  lazy: true,\n  loadNamespace,\n  preloadNamespaces: [\"common\"],\n  languageManager: {\n    defaultLanguage: \"ko\",\n    availableLanguages: [\n      { code: \"ko\", name: \"\uD55C\uAD6D\uC5B4\", flag: \"\uD83C\uDDF0\uD83C\uDDF7\" },\n      { code: \"en\", name: \"English\", flag: \"\uD83C\uDDFA\uD83C\uDDF8\" },\n    ],\n  },\n});"
              )}
            </CodeBlock>
          </div>

          <div>
            <p className="text-slate-300 mb-3">
              <strong className="text-white">{t("Root Layout")}:</strong>{" "}
              {t("Provider 없이 간단하게")}
            </p>
            <CodeBlock language="typescript">
              {`// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}`}
            </CodeBlock>
          </div>
        </div>
      </section>

      {/* Step 4: Wrap Text */}
      <section className="bg-gradient-to-br from-orange-950/50 to-red-950/50 rounded-2xl border border-orange-800/50 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white font-bold text-xl">4</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {t("한국어 텍스트 감싸기")}
          </h2>
        </div>

        <div className="bg-slate-950 rounded-xl p-6 mb-4">
          <code className="text-green-400">npx i18n-wrapper</code>
        </div>

        <div className="space-y-4 text-slate-300">
          <p>{t("모든 한국어 텍스트를 자동으로 t()로 감쌉니다")}</p>

          <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-xl p-6">
            <h3 className="text-yellow-400 font-semibold mb-3 flex items-center">
              <span className="mr-2">⚠️</span>
              {t("중요: 서버 컴포넌트 확인")}
            </h3>
            <div className="space-y-3">
              <p className="text-sm">
                {t(
                  "i18n-wrapper 실행 후 일부 파일에서 에러가 발생할 수 있습니다:"
                )}
              </p>
              <ol className="space-y-2 ml-6 text-sm">
                <li>
                  <strong className="text-white">
                    1. {t("서버 컴포넌트")}:
                  </strong>
                  <br />
                  {t(
                    "파일이 서버 컴포넌트인 경우 (use client가 없는 경우), 훅 대신 서버 유틸리티를 사용해야 합니다"
                  )}
                </li>
                <li>
                  <strong className="text-white">
                    2. {t("수동으로 수정")}:
                  </strong>
                  <br />
                  {t(
                    "에러를 확인하고 use client를 추가할지 getServerTranslation()을 사용할지 결정하세요"
                  )}
                </li>
              </ol>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-2 flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                {t("클라이언트 컴포넌트의 경우")}
              </h4>
              <CodeBlock language="tsx">
                {t(
                  "\"use client\";\nimport { useTranslation, useLanguageSwitcher } from \"i18nexus\";\n\nexport default function Page() {\n  const { t } = useTranslation(\"getting-started\");\n  return <div>{t(\"\uC548\uB155\uD558\uC138\uC694\")}</div>;\n}"
                )}
              </CodeBlock>
            </div>

            <div className="bg-slate-900 rounded-xl p-4">
              <h4 className="text-white font-semibold mb-2 flex items-center">
                <span className="text-blue-400 mr-2">✓</span>
                {t("서버 컴포넌트의 경우")}
              </h4>
              <CodeBlock language="tsx">
                {t(
                  "import { useTranslation, useLanguageSwitcher } from \"i18nexus\";\n\nexport default async function Page() {\n  const { t } = await i18n.getServerTranslation();\n  return <div>{t(\"\uC548\uB155\uD558\uC138\uC694\")}</div>;\n}"
                )}
              </CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* Step 5: Extract Keys */}
      <section className="bg-gradient-to-br from-cyan-950/50 to-blue-950/50 rounded-2xl border border-cyan-800/50 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white font-bold text-xl">5</span>
          </div>
          <h2 className="text-3xl font-bold text-white">{t("번역 키 추출")}</h2>
        </div>

        <div className="bg-slate-950 rounded-xl p-6 mb-4">
          <code className="text-green-400">npx i18n-extractor</code>
        </div>

        <div className="space-y-4 text-slate-300">
          <p>{t("코드를 스캔하여 번역 파일을 생성/업데이트합니다")}</p>

          <div className="bg-blue-950/30 border border-blue-800/50 rounded-xl p-6">
            <h3 className="text-blue-400 font-semibold mb-3 flex items-center">
              <span className="mr-2">💡</span>
              {t("App 디렉토리 참고사항")}
            </h3>
            <p className="text-sm">
              {t(
                "Next.js App Router를 사용하는 경우, -p 플래그를 사용하여 올바른 디렉토리를 지정하세요"
              )}
              :
            </p>
            <div className="bg-slate-950 rounded-lg p-4 mt-3">
              <code className="text-green-400 text-sm">
                npx i18n-extractor -p &quot;app/**/*.tsx&quot;
              </code>
            </div>
          </div>

          <div>
            <p className="font-semibold text-white mb-2">{t("결과 파일")}:</p>
            <ul className="space-y-2 ml-6">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-3">→</span>
                <code className="bg-slate-900 px-2 py-1 rounded text-sm">
                  locales/ko.json
                </code>
                <span className="ml-2">- {t("한국어 번역 (자동 채워짐)")}</span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-3">→</span>
                <code className="bg-slate-900 px-2 py-1 rounded text-sm">
                  locales/en.json
                </code>
                <span className="ml-2">
                  - {t("영어 번역 (수동 번역 필요)")}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Step 6: Add English Translations */}
      <section className="bg-gradient-to-br from-violet-950/50 to-purple-950/50 rounded-2xl border border-violet-800/50 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white font-bold text-xl">6</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {t("영어 번역 추가")}
          </h2>
        </div>

        <div className="space-y-4 text-slate-300">
          <p>{t("locales/en.json 파일을 열고 영어 번역을 추가하세요")}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">
                {t("이전 (자동 생성)")}:
              </p>
              <CodeBlock language="json">
                {t(
                  "{\n  \"\uC548\uB155\uD558\uC138\uC694\": \"\uC548\uB155\uD558\uC138\uC694\",\n  \"\uD658\uC601\uD569\uB2C8\uB2E4\": \"\uD658\uC601\uD569\uB2C8\uB2E4\"\n}"
                )}
              </CodeBlock>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-2">
                {t("이후 (번역됨)")}:
              </p>
              <CodeBlock language="json">
                {t(
                  "{\n  \"\uC548\uB155\uD558\uC138\uC694\": \"Hello\",\n  \"\uD658\uC601\uD569\uB2C8\uB2E4\": \"Welcome\"\n}"
                )}
              </CodeBlock>
            </div>
          </div>
        </div>
      </section>

      {/* Optional: Google Sheets */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-8 mb-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-500 to-slate-600 rounded-xl flex items-center justify-center mr-4">
            <span className="text-white text-2xl">📊</span>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {t("선택사항: Google Sheets 연동")}
          </h2>
        </div>

        <div className="space-y-4 text-slate-300">
          <p>{t("팀 협업을 위해 Google Sheets와 동기화할 수 있습니다")}</p>

          <div className="space-y-3">
            <div className="bg-slate-950 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-2">{t("번역 업로드")}:</p>
              <code className="text-green-400">
                npx i18n-sheets upload -s YOUR_SPREADSHEET_ID
              </code>
            </div>

            <div className="bg-slate-950 rounded-xl p-4">
              <p className="text-sm text-slate-400 mb-2">
                {t("번역 다운로드")}:
              </p>
              <code className="text-green-400">
                npx i18n-sheets download -s YOUR_SPREADSHEET_ID
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Done */}
      <section className="bg-gradient-to-br from-green-950/50 to-emerald-950/50 rounded-2xl border border-green-800/50 p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <span className="text-white font-bold text-4xl">✓</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">{t("완료!")}</h2>
          <p className="text-xl text-slate-300 mb-6">
            {t("앱이 완전히 국제화되었으며 배포할 준비가 되었습니다")}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/provider"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              {t("I18nProvider 자세히 알아보기")} →
            </Link>
            <Link
              href="/cli"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              {t("CLI 도구 살펴보기")} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
