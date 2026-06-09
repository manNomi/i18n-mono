import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: ReactNode;
  size?: "default" | "narrow";
};

export function PageShell({
  children,
  eyebrow,
  title,
  description,
  actions,
  backHref,
  backLabel,
  size = "default",
}: PageShellProps) {
  return (
    <main className={size === "narrow" ? "demo-narrow-shell" : "demo-shell"}>
      <header className="demo-page-hero">
        {backHref ? (
          <Link href={backHref} className="demo-back-link">
            <span className="mr-2" aria-hidden="true">
              &larr;
            </span>
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? <p className="demo-eyebrow">{eyebrow}</p> : null}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="demo-page-title">{title}</h1>
            {description ? (
              <p className="demo-page-description">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
      </header>
      {children}
    </main>
  );
}

type SectionProps = {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function Section({
  children,
  title,
  description,
  className = "",
}: SectionProps) {
  return (
    <section className={`demo-section ${className}`}>
      {title ? (
        <div className="mb-5">
          <h2 className="demo-section-title">{title}</h2>
          {description ? (
            <p className="demo-section-description">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type CalloutProps = {
  children: ReactNode;
  title?: ReactNode;
  tone?: "info" | "warning" | "success";
};

const calloutToneClass = {
  info: "demo-callout-info",
  warning: "demo-callout-warning",
  success: "demo-callout-success",
};

export function Callout({ children, title, tone = "info" }: CalloutProps) {
  return (
    <div className={`demo-callout ${calloutToneClass[tone]}`}>
      {title ? <p className="mb-2 font-semibold">{title}</p> : null}
      <div className="text-sm leading-6">{children}</div>
    </div>
  );
}

type StepCardProps = {
  children: ReactNode;
  step: ReactNode;
  title: ReactNode;
  description?: ReactNode;
};

export function StepCard({
  children,
  step,
  title,
  description,
}: StepCardProps) {
  return (
    <article className="demo-step-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="demo-step-number">{step}</span>
        <div>
          <h3 className="font-semibold text-[color:var(--text)]">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[color:var(--text-dim)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </article>
  );
}
