"use client";

import { ProjectCard } from "@/entities/project";

interface ProjectManageCardProps {
  url: string;
  projectName?: string | null;
  autoTitle: string;
  autoDescription: string;
  thumbnailUrl: string;
  screenshotUrl?: string | null;
  isApproved: boolean;
  onApprove?: () => void;
  onDelete?: () => void;
}

/**
 * ProjectManageCard - Adds management actions (approve/delete) to ProjectCard
 * Wraps the read-only ProjectCard from entities layer with interactive features
 */
export default function ProjectManageCard({
  url,
  projectName,
  autoTitle,
  autoDescription,
  thumbnailUrl,
  screenshotUrl,
  isApproved,
  onApprove,
  onDelete,
}: ProjectManageCardProps) {
  return (
    <div className="relative">
      {/* Base ProjectCard (read-only) */}
      <ProjectCard
        url={url}
        projectName={projectName}
        autoTitle={autoTitle}
        autoDescription={autoDescription}
        thumbnailUrl={thumbnailUrl}
        screenshotUrl={screenshotUrl}
      />

      {/* Admin Actions Overlay */}
      <div className="rounded-b-lg border-x border-b border-slate-200 bg-white p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          {!isApproved && onApprove && (
            <button
              onClick={onApprove}
              className="flex-1 rounded-md border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:px-4 sm:py-2.5"
            >
              승인
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className={`${!isApproved && onApprove ? "flex-1" : "w-full"} rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 sm:px-4 sm:py-2.5`}
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
