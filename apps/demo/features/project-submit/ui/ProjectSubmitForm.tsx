"use client";

import { useTranslation } from "i18nexus";
import { useState } from "react";

import { ProjectCard } from "@/entities/project";
import { fetchMetadata } from "@/features/project-submit/api/fetchMetadata";
import { submitProject } from "@/features/project-submit/api/submitProject";
import { useError } from "@/shared/ui";

interface MetadataPreview {
  autoTitle: string;
  autoDescription: string;
  thumbnailUrl: string;
  screenshotUrl?: string | null;
  url: string;
}

export default function ProjectSubmitForm() {
  const { t } = useTranslation<"common">("common");
  const { setError } = useError();
  const [url, setUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<MetadataPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleGeneratePreview = async () => {
    if (!url) return;

    setLoading(true);
    setPreview(null);

    try {
      const data = await fetchMetadata(url);
      setPreview(data);
    } catch (error: unknown) {
      console.error("Preview generation error:", error);
      const errorObj = error as { message?: string };
      const errorMessage =
        errorObj.message || t("미리보기 생성에 실패했습니다.");

      // 사용자 친화적 에러 메시지
      if (errorMessage.includes("Invalid URL")) {
        setError(
          t(
            "올바르지 않은 URL 형식입니다. https:// 로 시작하는 전체 URL을 입력해주세요."
          )
        );
      } else if (
        errorMessage.includes("JSON") ||
        errorMessage.includes(t("처리할 수 없습니다"))
      ) {
        setError(
          t(
            "서버 응답을 처리할 수 없습니다. URL이 올바른지 확인하고 다시 시도해주세요."
          )
        );
      } else if (errorMessage.includes(t("요청 한도"))) {
        setError(
          t(
            "메타데이터 서비스의 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } else if (errorMessage.includes(t("접근할 수 없습니다"))) {
        setError(
          t("URL에 접근할 수 없습니다. 공개 접근 가능한 URL인지 확인해주세요.")
        );
      } else if (
        errorMessage.includes("external service") ||
        errorMessage.includes(t("메타데이터 서비스")) ||
        errorMessage.includes(t("예상치 못한 응답"))
      ) {
        setError(
          t(
            "메타데이터 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } else if (
        errorMessage.includes("aborted") ||
        errorMessage.includes("timeout")
      ) {
        setError(
          t(
            "요청 시간이 초과되었습니다. 네트워크 연결을 확인하고 다시 시도해주세요."
          )
        );
      } else {
        setError(
          t(
            "\uBBF8\uB9AC\uBCF4\uAE30 \uC0DD\uC131 \uC2E4\uD328: {{errorMessage}}",
            { errorMessage }
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preview || !agreed) return;

    setSubmitting(true);

    try {
      await submitProject({
        url,
        projectName: projectName || null,
        autoTitle: preview.autoTitle,
        autoDescription: preview.autoDescription,
        thumbnailUrl: preview.thumbnailUrl,
        screenshotUrl: preview.screenshotUrl,
        contactEmail: contactEmail || null,
      });

      setSubmitted(true);
      // Reset form
      setTimeout(() => {
        setUrl("");
        setProjectName("");
        setContactEmail("");
        setAgreed(false);
        setPreview(null);
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      console.error("Submission error:", error);
      setError(t("제출에 실패했습니다. 다시 시도해주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="demo-narrow-shell">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
          {t("Showcase 등록하기")}
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          {t(
            "i18nexus를 사용하는 프로젝트를 공유하고 커뮤니티에 영감을 주세요"
          )}
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6"
      >
        {/* URL Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t("프로젝트 URL (필수)")}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://myproject.vercel.app"
              className="flex-1 rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              required
            />

            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={!url || loading}
              className="whitespace-nowrap rounded-md border border-blue-600 bg-blue-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
            >
              {loading ? t("로딩...") : t("미리보기")}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {t("URL을 입력하면 자동으로 제목, 설명, 썸네일을 추출합니다")}
          </p>
        </div>

        {/* Project Name (Optional Override) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t("프로젝트 이름 (선택)")}
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder={t("자동 수집된 제목을 변경하려면 입력하세요")}
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />

          <p className="text-xs text-slate-500 mt-2">
            {t("입력하지 않으면 자동 추출된 제목을 사용합니다")}
          </p>
        </div>

        {/* Contact Email (Optional) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            {t("연락처 이메일 (선택)")}
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-slate-950 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />

          <p className="text-xs text-slate-500 mt-2">
            {t("승인 알림을 받으려면 이메일을 입력하세요")}
          </p>
        </div>

        {/* Preview Card */}
        {preview && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="mb-4 text-base font-semibold text-slate-950">
              {t("자동 미리보기")}
            </h3>
            <ProjectCard
              url={preview.url}
              projectName={projectName}
              autoTitle={preview.autoTitle}
              autoDescription={preview.autoDescription}
              thumbnailUrl={preview.thumbnailUrl}
              screenshotUrl={preview.screenshotUrl}
            />
          </div>
        )}

        {/* Agreement Checkbox */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <label className="flex items-start gap-2 sm:gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-100"
              required
            />

            <span className="text-sm leading-6 text-slate-700">
              {t(
                "위 정보 제공에 동의하며, i18nexus 쇼케이스에 공개될 수 있음을\n              이해합니다. 관리자 검토 후 공개됩니다. (필수)"
              )}
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!preview || !agreed || submitting}
          className="w-full rounded-md border border-blue-600 bg-blue-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
        >
          {submitting ? t("제출 중...") : t("제출하기")}
        </button>

        {/* Success Message */}
        {submitted && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900">
            <div className="mb-2 flex items-center justify-center">
              <span className="font-semibold">{t("제출 완료!")}</span>
            </div>
            <p className="text-sm">{t("검토 후 공개됩니다.")}</p>
          </div>
        )}
      </form>

      {/* Help Section */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-950">
          {t("제출 팁")}
        </h2>
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex items-start">
            <span className="mr-3 mt-0.5 text-slate-400">-</span>
            <span>
              <strong className="text-slate-950">
                {t("공개 접근 가능한 URL")}
              </strong>
              {t("을\n              사용하세요 (localhost, 127.0.0.1 불가)")}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 mt-0.5 text-slate-400">-</span>
            <span>
              <strong className="text-slate-950">{t("전체 URL")}</strong>
              {t("을 입력하세요 (예:\n              https://example.com)")}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 mt-0.5 text-slate-400">-</span>
            <span>
              {t("프로젝트에")}{" "}
              <strong className="text-slate-950">
                {t("Open Graph 메타 태그")}
              </strong>
              {t("가\n              있으면 더 좋은 썸네일을 얻을 수 있습니다")}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 mt-0.5 text-slate-400">-</span>
            <span>
              {t("제출 후 관리자 검토를 거쳐 24시간 이내에 공개됩니다")}
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-3 mt-0.5 text-slate-400">-</span>
            <span>
              {t("미리보기 생성이 실패하면")}{" "}
              <strong className="text-slate-950">{t("URL을 다시 확인")}</strong>
              {t("하거나 잠시\n              후 다시 시도해주세요")}
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
}
