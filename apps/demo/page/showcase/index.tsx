// ISR을 비활성화하고 On-Demand Revalidation만 사용
// 데이터 변경(추가/삭제/수정) 시에만 재검증
export const revalidate = false;

import { getTranslation } from "i18nexus/server";
import Link from "next/link";

import { getProjects } from "@/entities/project/api/getProjects";
import { ProjectCard } from "@/shared/ui";

export default async function ShowcasePage() {
  // 서버에서 자동으로 언어 감지 및 번역 함수 생성
  const { t } = await getTranslation<"showcase">("showcase");

  // Get only approved projects
  const projects = await getProjects(true);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl mb-6 sm:mb-8 shadow-lg shadow-blue-500/50">
          <span className="text-white font-bold text-2xl sm:text-3xl">🌍</span>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 mb-4 sm:mb-6">
          {t("i18nexus 쇼케이스")}
        </h1>
        <p className="text-base sm:text-xl md:text-2xl text-slate-300 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
          {t("i18nexus와 i18nexus-tools를 사용하는 실제 프로젝트들")}
        </p>
        <Link
          href="/showcase/submit"
          className="inline-flex items-center px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base sm:text-lg rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-105"
        >
          <span className="mr-2 sm:mr-3 text-xl sm:text-2xl">📝</span>
          <span className="hidden sm:inline">{t("내 프로젝트 등록하기")}</span>
          <span className="sm:hidden">{t("프로젝트 등록")}</span>
          <span className="ml-2 sm:ml-3">→</span>
        </Link>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 p-6 sm:p-12 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <span className="text-4xl sm:text-5xl">📦</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
            {t("아직 등록된 프로젝트가 없습니다")}
          </h3>
          <p className="text-sm sm:text-base text-slate-400 mb-6 sm:mb-8">
            {t("첫 번째 프로젝트를 등록하고 커뮤니티에 공유해보세요!")}
          </p>
          <Link
            href="/showcase/submit"
            className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm sm:text-base rounded-lg transition-colors"
          >
            <span className="hidden sm:inline">
              {t("첫 번째 프로젝트 등록하기")} →
            </span>
            <span className="sm:hidden">{t("프로젝트 등록하기")} →</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              url={project.url}
              projectName={project.projectName}
              autoTitle={project.autoTitle || "Untitled Project"}
              autoDescription={
                project.autoDescription || "No description available"
              }
              thumbnailUrl={project.thumbnailUrl || "/default-thumbnail.svg"}
              screenshotUrl={project.screenshotUrl || ""}
            />
          ))}
        </div>
      )}
    </main>
  );
}
