"use client";
interface ProjectCardProps {
  url: string;
  projectName?: string;
  autoTitle: string;
  autoDescription: string;
  thumbnailUrl: string;
  screenshotUrl?: string | undefined;
}

export function ProjectCard({
  url,
  projectName,
  autoTitle,
  autoDescription,
  thumbnailUrl,
  screenshotUrl,
}: ProjectCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="relative aspect-video bg-slate-100">
        <img
          src={screenshotUrl || thumbnailUrl}
          alt={autoTitle}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold text-slate-950">
          {autoTitle}
        </h3>
        <p className="line-clamp-2 text-sm text-slate-600">{autoDescription}</p>
        <p className="mt-2 text-xs font-medium text-blue-700">
          {projectName || "Unknown"}
        </p>
      </div>
    </a>
  );
}
