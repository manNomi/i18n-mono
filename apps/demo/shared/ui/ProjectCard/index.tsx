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
      className="block overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-1)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-[color:var(--blue-line)]"
    >
      <div className="relative aspect-video bg-[color:var(--bg)]">
        <img
          src={screenshotUrl || thumbnailUrl}
          alt={autoTitle}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-lg font-semibold tracking-[-0.01em] text-[color:var(--text)]">
          {autoTitle}
        </h3>
        <p className="line-clamp-2 text-sm leading-6 text-[color:var(--text-dim)]">
          {autoDescription}
        </p>
        <p className="mt-3 font-mono text-xs font-medium text-[color:var(--blue-bright)]">
          {projectName || "Unknown"}
        </p>
      </div>
    </a>
  );
}
