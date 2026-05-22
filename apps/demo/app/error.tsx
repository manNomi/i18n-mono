"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation<"common">("common");

  useEffect(() => {
    // 에러 로깅 (선택사항)
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="rounded-lg border border-red-200 bg-white p-8 md:p-10">
          {/* Error Title */}
          <h1 className="text-center text-3xl font-bold text-slate-950 md:text-4xl">
            {t("오류가 발생했습니다")}
          </h1>

          {/* Error Message */}
          <p className="mb-6 mt-4 text-center text-slate-600">
            {t("예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.")}
          </p>

          {/* Error Details (개발 환경에서만) */}
          {process.env.NODE_ENV === "development" && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="break-all font-mono text-xs text-red-700">
                {error.message}
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-slate-500">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={reset}
              className="rounded-md border border-blue-600 bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              {t("다시 시도")}
            </button>
            <Link
              href="/"
              className="rounded-md border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("홈으로 돌아가기")}
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-center text-sm text-slate-500">
              {t("문제가 계속되면")}{" "}
              <Link
                href="https://github.com/your-repo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline hover:text-blue-900"
              >
                {t("이슈를 제보")}
              </Link>
              {t("해주세요.")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
