"use client";

import { useTranslation } from "i18nexus";

import { ProjectManageCard } from "@/features/project-manage";

import { useAdminDashboard } from "./model/useAdminDashboard";

export default function AdminDashboard() {
  const { t } = useTranslation("admin-dashboard");
  const {
    loading,
    submissions,
    filter,
    setFilter,
    handleApprove,
    handleDelete,
    handleLogout,
  } = useAdminDashboard();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-base font-medium text-slate-500">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="demo-shell">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-3 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">
            {t("관리자 대시보드")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("Showcase 제출 관리")}
          </p>
        </div>
        <button onClick={handleLogout} className="demo-button">
          로그아웃
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 sm:mb-8 flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-md border px-4 py-2 text-sm font-semibold ${
            filter === "pending"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <span className="hidden sm:inline">승인 대기 중</span>
          <span className="sm:hidden">대기</span>
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`rounded-md border px-4 py-2 text-sm font-semibold ${
            filter === "approved"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {t("승인됨")}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-md border px-4 py-2 text-sm font-semibold ${
            filter === "all"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          전체
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-3xl font-bold text-slate-950">
            {submissions.length}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {filter === "pending"
              ? t("대기 중")
              : filter === "approved"
                ? t("승인됨")
                : t("전체 제출")}
          </div>
        </div>
      </div>

      {/* Submissions Grid */}
      {submissions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-950">
            {t("제출된 프로젝트가 없습니다")}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {filter === "pending" && t("승인 대기 중인 프로젝트가 없습니다")}
            {filter === "approved" && t("승인된 프로젝트가 없습니다")}
            {filter === "all" && t("아직 제출된 프로젝트가 없습니다")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {submissions.map((submission) => (
            <div key={submission.id} className="relative">
              <ProjectManageCard
                url={submission.url}
                projectName={submission.projectName}
                autoTitle={submission.autoTitle}
                autoDescription={submission.autoDescription}
                thumbnailUrl={submission.thumbnailUrl}
                screenshotUrl={submission.screenshotUrl}
                isApproved={submission.approved}
                onApprove={
                  !submission.approved
                    ? () => handleApprove(submission.id)
                    : undefined
                }
                onDelete={() => handleDelete(submission.id)}
              />

              {submission.approved && (
                <div className="absolute right-4 top-4 z-10 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  {t("승인됨")}
                </div>
              )}
              {submission.contactEmail && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
                  {submission.contactEmail}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
