"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

export default function UseLanguageSwitcherPage() {
  const { t } = useTranslation("docs-i18nexus-use-language-switcher");
  const currentLanguage = getCurrentLanguage();
  const changeLanguage = changeLanguage;
  const availableLanguages = getAvailableLanguages();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300">
          {t("홈")}
        </Link>
        <span className="text-slate-500 mx-2">/</span>
        <Link
          href="/docs/i18nexus"
          className="text-blue-400 hover:text-blue-300"
        >
          {t("i18nexus")}
        </Link>
        <span className="text-slate-500 mx-2">/</span>
        <span className="text-slate-300">useLanguageSwitcher</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <h1 className="text-5xl font-extrabold text-white mb-4">
          useLanguageSwitcher
        </h1>
        <p className="text-xl text-slate-400">
          {t("언어 전환 및 관리를 위한 React 훅")}
        </p>
      </div>

      {/* Live Demo */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          <span className="mr-2">🎮</span>
          {t("인터랙티브 데모")}
        </h2>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="mb-4">
            <p className="text-slate-300 mb-4">
              {t("현재 언어")}:{" "}
              <span className="text-blue-400 font-bold">{currentLanguage}</span>
            </p>
            <div className="flex gap-3">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                    currentLanguage === lang.code
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">
            <p>💡 {t("언어를 전환해보세요. 쿠키에 자동으로 저장됩니다!")}</p>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("개요")}</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-300 mb-4">
            <code className="text-blue-400 bg-slate-950 px-2 py-1 rounded">
              useLanguageSwitcher
            </code>
            {t(
              "는 현재 언어 상태를 관리하고 언어를 전환하는 기능을 제공하는 React 훅입니다."
            )}
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">{t("현재 언어 상태 조회")}</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">{t("동적 언어 전환")}</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">
                {t("사용 가능한 언어 목록 조회")}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">{t("자동 쿠키 저장")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* API Reference */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          {t("API 레퍼런스")}
        </h2>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <h3 className="text-xl font-semibold text-white mb-4">
            {t("Return Value")}
          </h3>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="mb-2">
                <code className="text-green-400 text-lg">
                  currentLanguage: string
                </code>
              </div>
              <p className="text-slate-300 mb-2">
                {t("현재 활성화된 언어 코드입니다.")}
              </p>
              <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto">
                <code className="text-sm text-slate-400">
                  {t(
                    "// \u2705 \uC0C8\uB85C\uC6B4 \uBC29\uC2DD (\uAD8C\uC7A5)\nconst currentLanguage = getCurrentLanguage();\nconsole.log(currentLanguage); // \"ko\" or \"en\"\n\n// \u274C \uB808\uAC70\uC2DC \uBC29\uC2DD (deprecated)\nconst { currentLanguage } = useLanguageSwitcher();"
                  )}
                </code>
              </pre>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <div className="mb-2">
                <code className="text-green-400 text-lg">
                  changeLanguage: (code: string) =&gt; void
                </code>
              </div>
              <p className="text-slate-300 mb-2">
                {t(
                  "언어를 변경하는 함수입니다. 변경된 언어는 쿠키에 자동으로 저장됩니다."
                )}
              </p>
              <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto">
                <code className="text-sm text-slate-400">
                  {t(
                    "// \u2705 \uC0C8\uB85C\uC6B4 \uBC29\uC2DD (\uAD8C\uC7A5)\nchangeLanguage(\"en\");\nchangeLanguage(\"ko\");\n\n// \u274C \uB808\uAC70\uC2DC \uBC29\uC2DD (deprecated)\nconst { changeLanguage } = useLanguageSwitcher();"
                  )}
                </code>
              </pre>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <div className="mb-2">
                <code className="text-green-400 text-lg">
                  availableLanguages: Language[]
                </code>
              </div>
              <p className="text-slate-300 mb-2">
                {t("사용 가능한 언어 목록입니다.")}
              </p>
              <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto">
                <code className="text-sm text-slate-400">
                  {t(
                    "// \u2705 \uC0C8\uB85C\uC6B4 \uBC29\uC2DD (\uAD8C\uC7A5)\nconst availableLanguages = getAvailableLanguages();\n\n// Language \uD0C0\uC785:\n// { code: string, name: string, flag?: string }\n\navailableLanguages.map(lang => (\n  <button onClick={() => changeLanguage(lang.code)}>\n    {lang.flag} {lang.name}\n  </button>\n))\n\n// \u274C \uB808\uAC70\uC2DC \uBC29\uC2DD (deprecated)\nconst { availableLanguages } = useLanguageSwitcher();"
                  )}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("사용 예제")}</h2>

        {/* Basic Usage */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-blue-400 mb-4">
            {t("기본 사용법")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-6 overflow-x-auto border border-slate-800">
            <code className="text-sm text-slate-300">
              {t(
                "\"use client\";\n\nimport { useTranslation, useLanguageSwitcher } from \"i18nexus\";\n\nexport default function LanguageSelector() {\n  const currentLanguage = getCurrentLanguage();\n  const availableLanguages = getAvailableLanguages();\n\n  return (\n    <div>\n      <p>\uD604\uC7AC \uC5B8\uC5B4: {currentLanguage}</p>\n\n      {availableLanguages.map((lang) => (\n        <button\n          key={lang.code}\n          onClick={() => changeLanguage(lang.code)}\n        >\n          {lang.name}\n        </button>\n      ))}\n    </div>\n  );\n}"
              )}
            </code>
          </pre>
        </div>

        {/* Dropdown Example */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-green-400 mb-4">
            {t("드롭다운 선택기")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-6 overflow-x-auto border border-slate-800">
            <code className="text-sm text-slate-300">{`"use client";

import { useTranslation, useLanguageSwitcher } from "i18nexus";

export default function LanguageDropdown() {
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
      className="px-4 py-2 rounded-lg bg-slate-800 text-white"
    >
      {availableLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  );
}`}</code>
          </pre>
        </div>

        {/* Advanced Example */}
        <div>
          <h3 className="text-xl font-semibold text-purple-400 mb-4">
            {t("고급 예제 - 플래그와 함께")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-6 overflow-x-auto border border-slate-800">
            <code className="text-sm text-slate-300">
              {`"use client";

import { useTranslation, useLanguageSwitcher } from "i18nexus";

export default function FancyLanguageSwitcher() {
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();

  return (
    <div className="flex gap-2">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={\`px-4 py-2 rounded-lg transition-all \${
            currentLanguage === lang.code
              ? "bg-blue-600 text-white scale-105"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }\`}
        >
          <span className="text-xl mr-2">{lang.flag}</span>
          <span>{lang.name}</span>
        </button>
      ))}
    </div>
  );
}`}
            </code>
          </pre>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("모범 사례")}</h2>
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
              <span className="mr-2">✅</span>
              {t("권장: 언어 변경 후 전체 페이지 리로드하지 않기")}
            </h4>
            <p className="text-slate-300">
              {t(
                "i18nexus는 자동으로 모든 컴포넌트를 업데이트합니다. 수동으로 페이지를 리로드할 필요가 없습니다."
              )}
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
              <span className="mr-2">✅</span>
              {t("권장: 사용자 경험을 위한 시각적 피드백")}
            </h4>
            <p className="text-slate-300">
              {t(
                "현재 선택된 언어를 명확하게 표시하여 사용자가 현재 언어를 쉽게 알 수 있도록 하세요."
              )}
            </p>
          </div>

          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-red-400 mb-2 flex items-center">
              <span className="mr-2">❌</span>
              {t("비권장: 서버 컴포넌트에서 사용")}
            </h4>
            <p className="text-slate-300 mb-2">
              {t(
                "useLanguageSwitcher는 클라이언트 훅입니다. 서버 컴포넌트에서는 사용할 수 없습니다."
              )}
            </p>
            <pre className="bg-slate-950 rounded-lg p-3 overflow-x-auto">
              <code className="text-sm text-slate-400">
                {`// 서버 컴포넌트에서는 클라이언트 훅을 사용할 수 없습니다.
export default async function Page() {
  changeLanguage("en"); // Error: client hook state is unavailable.
}

// 클라이언트 컴포넌트에서 언어를 변경합니다.
"use client";
export default function Page() {
  changeLanguage("en");
}

// 서버 컴포넌트 번역은 getTranslation()을 사용합니다.
import { getTranslation } from "i18nexus/server";

export default async function ServerPage() {
  const { t } = await getTranslation<"common">("common");
  return <h1>{t("환영합니다")}</h1>;
}`}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* See Also */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">{t("참고 자료")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/docs/i18nexus/use-translation"
            className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
          >
            <h4 className="text-lg font-semibold text-white mb-2">
              useTranslation →
            </h4>
            <p className="text-slate-400 text-sm">
              {t("컴포넌트에서 번역을 사용하는 방법 알아보기")}
            </p>
          </Link>
          <Link
            href="/docs/i18nexus/provider"
            className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors"
          >
            <h4 className="text-lg font-semibold text-white mb-2">
              I18nProvider →
            </h4>
            <p className="text-slate-400 text-sm">
              {t("Provider 설정 방법 알아보기")}
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
