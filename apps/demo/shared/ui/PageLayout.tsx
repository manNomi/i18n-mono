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
      <header className="mb-8 border-b border-slate-200 pb-6">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <span className="mr-2" aria-hidden="true">
              &larr;
            </span>
            {backLabel}
          </Link>
        ) : null}
        {eyebrow ? (
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
                {description}
              </p>
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
    <section className={`demo-section mb-6 ${className}`}>
      {title ? (
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
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
  info: "border-blue-200 bg-blue-50 text-blue-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function Callout({ children, title, tone = "info" }: CalloutProps) {
  return (
    <div className={`rounded-lg border p-4 ${calloutToneClass[tone]}`}>
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
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-700">
          {step}
        </span>
        <div>
          <h3 className="font-semibold text-slate-950">{title}</h3>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </article>
  );
}
