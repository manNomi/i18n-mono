"use client";
import { useTranslation } from "i18nexus";
import { useState } from "react";

interface ProjectCardProps {
  url: string;
  projectName?: string | null;
  autoTitle: string;
  autoDescription: string;
  thumbnailUrl: string;
  screenshotUrl?: string | null;
}

/**
 * ProjectCard - Read-only view component (Entity layer)
 * For interactive features (approve/delete), use ProjectManageCard from _features
 */
export default function ProjectCard({
  url,
  projectName,
  autoTitle,
  autoDescription,
  thumbnailUrl,
  screenshotUrl,
}: ProjectCardProps) {
  const { t } = useTranslation<"common">("common");
  const displayTitle = projectName || autoTitle;
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="group overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-200">
        {/* Thumbnail - 클릭 시 모달 열기 */}
        <div
          className="group/image relative h-48 w-full cursor-pointer overflow-hidden bg-slate-100"
          onClick={(e) => {
            e.preventDefault();
            setIsModalOpen(true);
          }}
        >
          <img
            src={thumbnailUrl}
            alt={displayTitle}
            className="h-full w-full bg-slate-100 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/default-thumbnail.svg";
            }}
          />

          {/* 확대 아이콘 힌트 */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 opacity-0 group-hover/image:opacity-100">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
            {t("이미지 확대")}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-950">
            {displayTitle}
          </h3>
          <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
            {autoDescription}
          </p>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            {t("바로가기")}

            <span className="ml-1">→</span>
          </a>
        </div>
      </div>

      {/* 이미지 상세보기 모달 */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative max-w-6xl w-full flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 z-10 flex items-center gap-2 text-sm font-medium text-white hover:text-blue-100"
            >
              <span>{t("닫기")}</span>
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* 이미지 컨테이너 - 스크롤 가능 */}
            <div className="overflow-x-hidden overflow-y-auto rounded-lg border border-slate-200 bg-white">
              <div className="relative">
                <img
                  src={screenshotUrl || thumbnailUrl}
                  alt={displayTitle}
                  className="h-auto w-full bg-slate-100 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = thumbnailUrl;
                  }}
                />
              </div>

              {/* 이미지 정보 */}
              <div className="border-t border-slate-200 bg-white p-6">
                <h3 className="mb-2 text-xl font-semibold text-slate-950">
                  {displayTitle}
                </h3>
                <p className="mb-4 text-sm text-slate-600">{autoDescription}</p>
                <div className="flex gap-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
                  >
                    {t("사이트 방문하기")}

                    <svg
                      className="w-4 h-4 ml-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  {screenshotUrl && screenshotUrl !== thumbnailUrl && (
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = screenshotUrl;
                        link.download = `${displayTitle}-screenshot.png`;
                        link.target = "_blank";
                        link.click();
                      }}
                      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {t("이미지 다운로드")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
