"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

export default function GoogleSheetsPage() {
  const { t } = useTranslation("docs-i18nexus-tools-google-sheets");

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link href="/" className="text-blue-400 hover:text-blue-300">
          {t("홈")}
        </Link>
        <span className="text-slate-500 mx-2">/</span>
        <Link
          href="/docs/i18nexus-tools"
          className="text-blue-400 hover:text-blue-300"
        >
          {t("i18nexus-tools")}
        </Link>
        <span className="text-slate-500 mx-2">/</span>
        <span className="text-slate-300">Google Sheets</span>
      </div>

      {/* Header */}
      <div className="mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mb-6 shadow-lg shadow-yellow-500/30">
          <span className="text-white font-bold text-2xl">📊</span>
        </div>
        <h1 className="text-5xl font-extrabold text-white mb-4">
          Google Sheets {t("연동")}
        </h1>
        <p className="text-xl text-slate-400">
          {t("팀 협업을 위해 Google Sheets와 번역을 동기화합니다")}
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("개요")}</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
          <p className="text-slate-300 mb-4">
            {t(
              "Google Sheets 통합을 통해 번역가, 기획자, 개발자가 함께 번역 작업을 할 수 있습니다. 로컬 JSON 파일과 Google Sheets를 양방향으로 동기화할 수 있습니다.",
            )}
          </p>
          <div className="space-y-2">
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">
                {t("팀원들과 실시간 협업")}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">
                {t("비개발자도 쉽게 번역 작업 가능")}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">
                {t("증분 업데이트로 안전한 동기화")}
              </span>
            </div>
            <div className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-slate-300">
                {t("강제 동기화 옵션 제공")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("초기 설정")}</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/30 border border-blue-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-300 mb-2">
                  {t("Google Cloud 프로젝트 생성")}
                </h3>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>
                    <a
                      href="https://console.cloud.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Google Cloud Console
                    </a>
                    {t("에 접속")}
                  </li>
                  <li>{t("새 프로젝트 생성 또는 기존 프로젝트 선택")}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-gradient-to-r from-green-900/30 to-green-800/30 border border-green-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-300 mb-2">
                  {t("Google Sheets API 활성화")}
                </h3>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>{t("API 및 서비스 > 라이브러리로 이동")}</li>
                  <li>{t('"Google Sheets API" 검색')}</li>
                  <li>{t("사용 설정 클릭")}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gradient-to-r from-purple-900/30 to-purple-800/30 border border-purple-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-300 mb-2">
                  {t("서비스 계정 생성")}
                </h3>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>{t("API 및 서비스 > 사용자 인증 정보로 이동")}</li>
                  <li>{t("사용자 인증 정보 만들기 > 서비스 계정 선택")}</li>
                  <li>{t("서비스 계정 이름 입력 (예: i18n-sync)")}</li>
                  <li>{t("역할: 편집자 선택")}</li>
                  <li>{t("완료 클릭")}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-gradient-to-r from-orange-900/30 to-orange-800/30 border border-orange-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-300 mb-2">
                  {t("인증 정보 JSON 다운로드")}
                </h3>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>{t("생성한 서비스 계정 클릭")}</li>
                  <li>{t("키 탭으로 이동")}</li>
                  <li>{t("키 추가 > 새 키 만들기")}</li>
                  <li>{t("JSON 유형 선택")}</li>
                  <li>
                    {t(
                      "다운로드된 JSON 파일을 프로젝트 루트에 저장 (예: credentials.json)",
                    )}
                  </li>
                </ol>
                <div className="mt-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                  <p className="text-yellow-300 text-xs">
                    ⚠️{" "}
                    {t(
                      "주의: credentials.json 파일은 절대 Git에 커밋하지 마세요! .gitignore에 추가하세요.",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-800/30 border border-yellow-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                5
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-300 mb-2">
                  {t("Google Sheets 생성 및 공유")}
                </h3>
                <ol className="space-y-2 text-slate-300 text-sm list-decimal list-inside">
                  <li>
                    <a
                      href="https://sheets.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Google Sheets
                    </a>
                    {t("에서 새 스프레드시트 생성")}
                  </li>
                  <li>{t("URL에서 Spreadsheet ID 복사 (예: 1abc...xyz)")}</li>
                  <li>{t("공유 버튼 클릭")}</li>
                  <li>
                    {t(
                      "서비스 계정 이메일 추가 (credentials.json의 client_email)",
                    )}
                  </li>
                  <li>{t("편집자 권한 부여")}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="bg-gradient-to-r from-indigo-900/30 to-indigo-800/30 border border-indigo-700/50 rounded-xl p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold mr-4 shadow-lg">
                6
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-indigo-300 mb-2">
                  {t("설정 파일 업데이트")}
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  {t("i18nexus.config.json 파일에 Google Sheets 정보 추가:")}
                </p>
                <pre className="bg-slate-950 rounded-lg p-4 text-xs border border-slate-800 overflow-x-auto">
                  <code className="text-slate-300">
                    {`{
  "languages": ["en", "ko"],
  "defaultLanguage": "ko",
  "localesDir": "./locales",
  "sourcePattern": "app/**/*.{ts,tsx}",
  "googleSheets": {
    "spreadsheetId": "YOUR_SPREADSHEET_ID",
    "credentialsPath": "./credentials.json",
    "sheetName": "Translations"
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Command */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          i18n-upload: {t("로컬에서 Sheets로")}
        </h2>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <p className="text-slate-300 mb-4">
            {t(
              "로컬 번역 파일을 Google Sheets로 업로드합니다. 기존 Sheets의 데이터는 완전히 대체됩니다.",
            )}
          </p>

          <h3 className="text-lg font-semibold text-yellow-300 mb-3">
            {t("기본 사용법")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 mb-4">
            <code className="text-green-400">
              {
                'npx i18n-upload --spreadsheet-id "YOUR_ID" --credentials "./credentials.json"'
              }
            </code>
          </pre>

          <h3 className="text-lg font-semibold text-yellow-300 mb-3 mt-6">
            {t("명령어 옵션")}
          </h3>
          <div className="space-y-3">
            <div className="border-l-4 border-yellow-500 pl-4">
              <code className="text-yellow-400">--spreadsheet-id</code>
              <p className="text-slate-400 text-sm mt-1">
                {t("Google Sheets의 Spreadsheet ID")}
              </p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <code className="text-yellow-400">--credentials</code>
              <p className="text-slate-400 text-sm mt-1">
                {t("서비스 계정 인증 정보 JSON 파일 경로")}
              </p>
            </div>
            <div className="border-l-4 border-yellow-500 pl-4">
              <code className="text-yellow-400">--sheet-name</code>
              <p className="text-slate-400 text-sm mt-1">
                {t('시트 이름 (기본값: "Translations")')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-yellow-300 mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            {t("주의사항")}
          </h4>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start">
              <span className="text-yellow-400 mr-2">•</span>
              <span>
                {t("업로드는 Sheets의 기존 데이터를 완전히 대체합니다")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-400 mr-2">•</span>
              <span>{t("중요한 Sheets 데이터가 있다면 먼저 백업하세요")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-400 mr-2">•</span>
              <span>{t("일반적으로 프로젝트 초기에 한 번만 사용합니다")}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Download Command */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          i18n-download: {t("Sheets에서 로컬로")}
        </h2>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <p className="text-slate-300 mb-4">
            {t(
              "Google Sheets의 번역을 로컬 파일로 다운로드합니다. 증분 업데이트 방식으로 기존 번역을 보존합니다.",
            )}
          </p>

          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            {t("기본 사용법")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 mb-4">
            <code className="text-green-400">
              {
                'npx i18n-download --spreadsheet-id "YOUR_ID" --credentials "./credentials.json"'
              }
            </code>
          </pre>

          <h3 className="text-lg font-semibold text-blue-300 mb-3 mt-6">
            {t("작동 방식")}
          </h3>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">1.</span>
              <span>{t("Google Sheets에서 모든 번역을 읽어옴")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">2.</span>
              <span>{t("로컬 파일의 기존 번역을 읽어옴")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">3.</span>
              <span>
                {t("Sheets의 번역으로 업데이트하되, 로컬에만 있는 번역은 보존")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">4.</span>
              <span>{t("병합된 결과를 로컬 파일에 저장")}</span>
            </li>
          </ul>
        </div>

        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-green-300 mb-2 flex items-center">
            <span className="mr-2">✓</span>
            {t("안전한 증분 업데이트")}
          </h4>
          <p className="text-slate-300 text-sm mb-3">
            {t(
              "i18n-download는 기존 번역을 보존하면서 Sheets의 변경사항만 가져옵니다:",
            )}
          </p>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>{t("Sheets에 있는 키: 값을 업데이트")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>{t("로컬에만 있는 키: 그대로 유지")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-400 mr-2">✓</span>
              <span>{t("Sheets에 새로 추가된 키: 로컬에 추가")}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Force Download */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          i18n-download-force: {t("강제 동기화")}
        </h2>

        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6 mb-6">
          <p className="text-slate-300 mb-4">
            {t("Google Sheets의 데이터로 로컬 번역 파일을 완전히 덮어씁니다.")}
          </p>

          <h3 className="text-lg font-semibold text-red-300 mb-3">
            {t("기본 사용법")}
          </h3>
          <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 mb-4">
            <code className="text-green-400">
              {
                'npx i18n-download-force --spreadsheet-id "YOUR_ID" --credentials "./credentials.json"'
              }
            </code>
          </pre>

          <h3 className="text-lg font-semibold text-red-300 mb-3 mt-6">
            {t("일반 download와 차이점")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-300 mb-2">
                i18n-download
              </h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{t("증분 업데이트")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{t("로컬 번역 보존")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>{t("안전함")}</span>
                </li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="font-semibold text-red-300 mb-2">
                i18n-download-force
              </h4>
              <ul className="space-y-1 text-slate-300 text-sm">
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>{t("전체 덮어쓰기")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>{t("로컬 번역 삭제")}</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>{t("주의 필요")}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-red-300 mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            {t("경고")}
          </h4>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start">
              <span className="text-red-400 mr-2">•</span>
              <span>{t("이 명령어는 로컬 번역 파일을 완전히 덮어씁니다")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-400 mr-2">•</span>
              <span>{t("로컬에만 있는 번역이 모두 삭제됩니다")}</span>
            </li>
            <li className="flex items-start">
              <span className="text-red-400 mr-2">•</span>
              <span>
                {t(
                  "Sheets를 단일 진실 공급원(Single Source of Truth)로 사용할 때만 사용하세요",
                )}
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Workflow Examples */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">
          {t("워크플로우 예제")}
        </h2>

        <div className="space-y-6">
          {/* Initial Setup */}
          <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-700/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-blue-300 mb-4">
              {t("초기 설정 및 업로드")}
            </h3>
            <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 overflow-x-auto">
              <code className="text-slate-300">
                {t(
                  '# 1. \uCF54\uB4DC\uC5D0\uC11C \uBC88\uC5ED \uD0A4 \uCD94\uCD9C\nnpx i18n-extractor -p "app/**/*.tsx" -d "./locales"\n\n# 2. \uB85C\uCEEC \uBC88\uC5ED\uC744 Google Sheets\uB85C \uC5C5\uB85C\uB4DC\nnpx i18n-upload --spreadsheet-id "YOUR_ID"\n\n# 3. \uD300\uC6D0\uB4E4\uC774 Google Sheets\uC5D0\uC11C \uBC88\uC5ED \uC791\uC5C5 \uC2DC\uC791',
                )}
              </code>
            </pre>
          </div>

          {/* Regular Sync */}
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-green-300 mb-4">
              {t("일상적인 동기화")}
            </h3>
            <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 overflow-x-auto">
              <code className="text-slate-300">
                {t(
                  '# 1. \uAC1C\uBC1C\uC790: \uC0C8\uB85C\uC6B4 \uAE30\uB2A5 \uCD94\uAC00 \uD6C4 \uD0A4 \uCD94\uCD9C\nnpx i18n-extractor\n\n# 2. \uAC1C\uBC1C\uC790: \uC0C8 \uD0A4\uB97C Sheets\uC5D0 \uC5C5\uB85C\uB4DC\nnpx i18n-upload --spreadsheet-id "YOUR_ID"\n\n# 3. \uBC88\uC5ED\uAC00: Google Sheets\uC5D0\uC11C \uBC88\uC5ED \uC791\uC5C5\n\n# 4. \uAC1C\uBC1C\uC790: \uBC88\uC5ED \uC644\uB8CC \uD6C4 \uB85C\uCEEC\uB85C \uB2E4\uC6B4\uB85C\uB4DC\nnpx i18n-download --spreadsheet-id "YOUR_ID"\n\n# 5. Git\uC5D0 \uBCC0\uACBD\uC0AC\uD56D \uCEE4\uBC0B\ngit add locales/\ngit commit -m "Update translations"',
                )}
              </code>
            </pre>
          </div>

          {/* CI/CD Integration */}
          <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-700/50 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-purple-300 mb-4">
              {t("CI/CD 통합")}
            </h3>
            <pre className="bg-slate-950 rounded-lg p-4 text-sm border border-slate-800 overflow-x-auto">
              <code className="text-slate-300">
                {t(
                  '# .github/workflows/sync-translations.yml\nname: Sync Translations\n\non:\n  schedule:\n    - cron: \'0 2 * * *\'  # \uB9E4\uC77C \uC624\uC804 2\uC2DC\n  workflow_dispatch:  # \uC218\uB3D9 \uC2E4\uD589 \uAC00\uB2A5\n\njobs:\n  sync:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      \n      - name: Download translations\n        run: |\n          npx i18n-download \\\\\n            --spreadsheet-id "\\${{ secrets.SHEET_ID }}" \\\\\n            --credentials ./credentials.json\n      \n      - name: Create PR if changes\n        uses: peter-evans/create-pull-request@v5\n        with:\n          title: "Update translations from Sheets"\n          commit-message: "chore: sync translations"',
                )}
              </code>
            </pre>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("모범 사례")}</h2>
        <div className="space-y-4">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
              <span className="mr-2">✅</span>
              {t("증분 다운로드 우선 사용")}
            </h4>
            <p className="text-slate-300">
              {t(
                "대부분의 경우 i18n-download를 사용하세요. 안전하게 변경사항만 가져옵니다.",
              )}
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
              <span className="mr-2">✅</span>
              {t("인증 정보 안전하게 관리")}
            </h4>
            <p className="text-slate-300 mb-2">
              {t(
                "credentials.json을 .gitignore에 추가하고 환경 변수나 시크릿으로 관리하세요.",
              )}
            </p>
            <pre className="bg-slate-950 rounded p-2 text-xs mt-2">
              <code className="text-slate-400">
                {`# .gitignore
credentials.json
*.credentials.json`}
              </code>
            </pre>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center">
              <span className="mr-2">✅</span>
              {t("Sheets 구조 유지")}
            </h4>
            <p className="text-slate-300">
              {t(
                "Google Sheets의 첫 행은 언어 코드여야 하며, 첫 열은 번역 키여야 합니다. 이 구조를 변경하지 마세요.",
              )}
            </p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center">
              <span className="mr-2">💡</span>
              {t("정기적인 동기화")}
            </h4>
            <p className="text-slate-300">
              {t("주기적으로 동기화하여 번역이 최신 상태로 유지되도록 하세요.")}
            </p>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6">{t("문제 해결")}</h2>
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
            <h4 className="font-semibold text-red-400 mb-2">
              {t("오류: 권한이 없습니다")}
            </h4>
            <p className="text-slate-300 text-sm mb-2">{t("해결 방법")}:</p>
            <ul className="space-y-1 text-slate-400 text-sm list-disc list-inside">
              <li>
                {t("Google Sheets가 서비스 계정 이메일과 공유되었는지 확인")}
              </li>
              <li>{t("편집자 권한이 부여되었는지 확인")}</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
            <h4 className="font-semibold text-red-400 mb-2">
              {t("오류: API가 활성화되지 않음")}
            </h4>
            <p className="text-slate-300 text-sm mb-2">{t("해결 방법")}:</p>
            <ul className="space-y-1 text-slate-400 text-sm list-disc list-inside">
              <li>
                {t(
                  "Google Cloud Console에서 Google Sheets API가 활성화되었는지 확인",
                )}
              </li>
              <li>{t("올바른 프로젝트를 선택했는지 확인")}</li>
            </ul>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
            <h4 className="font-semibold text-red-400 mb-2">
              {t("오류: 인증 정보를 찾을 수 없음")}
            </h4>
            <p className="text-slate-300 text-sm mb-2">{t("해결 방법")}:</p>
            <ul className="space-y-1 text-slate-400 text-sm list-disc list-inside">
              <li>{t("credentials.json 파일이 올바른 경로에 있는지 확인")}</li>
              <li>{t("파일 경로를 절대 경로로 시도")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-3xl font-bold text-white mb-6">{t("다음 단계")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/docs/i18nexus-tools/extractor"
            className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-green-500 transition-colors"
          >
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
              <span className="mr-2">🔍</span>
              i18n-extractor →
            </h4>
            <p className="text-slate-400 text-sm">
              {t("번역 키 추출 방법 알아보기")}
            </p>
          </Link>
          <Link
            href="/cli"
            className="bg-slate-900 border border-slate-700 rounded-lg p-6 hover:border-blue-500 transition-colors"
          >
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center">
              <span className="mr-2">⚡</span>
              {t("전체 워크플로우")} →
            </h4>
            <p className="text-slate-400 text-sm">
              {t("CLI 도구 전체 워크플로우 보기")}
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
