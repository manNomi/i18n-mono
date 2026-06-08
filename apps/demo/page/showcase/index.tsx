// ISR을 비활성화하고 On-Demand Revalidation만 사용
// 데이터 변경(추가/삭제/수정) 시에만 재검증
export const revalidate = false;

import { createServerTranslation, getServerLanguage } from "i18nexus/server";
import { headers } from "next/headers";
import Link from "next/link";

import { getProjects } from "@/entities/project/api/getProjects";
import commonEn from "@/locales/common/en.json";
import commonKo from "@/locales/common/ko.json";
import showcaseEn from "@/locales/showcase/en.json";
import showcaseKo from "@/locales/showcase/ko.json";
import { PageShell, ProjectCard } from "@/shared/ui";

const showcaseTranslations = {
  common: {
    en: commonEn,
    ko: commonKo,
  },
  showcase: {
    en: showcaseEn,
    ko: showcaseKo,
  },
};

export default async function ShowcasePage() {
  const language = getServerLanguage(await headers(), {
    defaultLanguage: "ko",
    availableLanguages: ["en", "ko"],
  });
  const t = createServerTranslation(language, showcaseTranslations);

  // Get only approved projects
  const projects = await getProjects(true);
  const actions = (
    <Link href="/showcase/submit" className="demo-button-primary">
      {t("내 프로젝트 등록하기")}
    </Link>
  );

  return (
    <PageShell
      title={t("i18nexus 쇼케이스")}
      description={t("i18nexus와 i18nexus-tools를 사용하는 실제 프로젝트들")}
      actions={actions}
    >
      {projects.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h3 className="text-xl font-semibold text-slate-950">
            {t("아직 등록된 프로젝트가 없습니다")}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {t("첫 번째 프로젝트를 등록하고 커뮤니티에 공유해보세요!")}
          </p>
          <Link href="/showcase/submit" className="demo-button-primary mt-6">
            {t("첫 번째 프로젝트 등록하기")}
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
    </PageShell>
  );
}
