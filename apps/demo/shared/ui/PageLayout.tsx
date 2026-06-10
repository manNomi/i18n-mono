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

type SkeletonVariant = "landing" | "docs" | "cards" | "form" | "dashboard";

type PageSkeletonProps = {
  variant?: SkeletonVariant;
};

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-full bg-[color:var(--bg-3)] ${className}`}
    />
  );
}

function SkeletonCard({ dense = false }: { dense?: boolean }) {
  return (
    <article className="demo-card p-5" aria-hidden="true">
      <SkeletonLine className="h-3 w-20" />
      <SkeletonLine className="mt-5 h-5 w-3/4" />
      <div className="mt-4 space-y-2.5">
        <SkeletonLine className="h-3 w-full" />
        <SkeletonLine className="h-3 w-5/6" />
        {!dense ? <SkeletonLine className="h-3 w-2/3" /> : null}
      </div>
    </article>
  );
}

function SkeletonHero({ wide = false }: { wide?: boolean }) {
  return (
    <header className="demo-page-hero" aria-hidden="true">
      <SkeletonLine className="mb-4 h-3 w-24" />
      <SkeletonLine
        className={`h-10 ${wide ? "w-full max-w-2xl" : "w-4/5 max-w-xl"}`}
      />
      <SkeletonLine className="mt-3 h-10 w-3/5 max-w-lg" />
      <div className="mt-6 space-y-2.5">
        <SkeletonLine className="h-3.5 w-full max-w-2xl" />
        <SkeletonLine className="h-3.5 w-4/5 max-w-xl" />
      </div>
    </header>
  );
}

function DashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading translated page"
      className="demo-shell"
    >
      <SkeletonHero />
      <div className="mb-6 flex flex-wrap gap-2" aria-hidden="true">
        <SkeletonLine className="h-10 w-28 rounded-md" />
        <SkeletonLine className="h-10 w-24 rounded-md" />
        <SkeletonLine className="h-10 w-20 rounded-md" />
      </div>
      <div className="grid gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard dense />
      </div>
    </main>
  );
}

function FormSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading translated page"
      className="demo-narrow-shell"
    >
      <SkeletonHero />
      <section className="demo-section" aria-hidden="true">
        <div className="space-y-6">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <SkeletonLine className="h-3 w-32" />
              <SkeletonLine className="mt-2 h-12 w-full rounded-md" />
              <SkeletonLine className="mt-2 h-3 w-2/3" />
            </div>
          ))}
          <SkeletonLine className="h-12 w-full rounded-md" />
        </div>
      </section>
    </main>
  );
}

function LandingSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading translated page"
      className="demo-shell demo-shell-wide"
    >
      <section className="demo-page-hero grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
        <div aria-hidden="true">
          <SkeletonLine className="mb-4 h-3 w-24" />
          <SkeletonLine className="h-12 w-5/6 max-w-xl" />
          <SkeletonLine className="mt-3 h-12 w-3/5 max-w-lg" />
          <div className="mt-6 space-y-2.5">
            <SkeletonLine className="h-3.5 w-full max-w-xl" />
            <SkeletonLine className="h-3.5 w-4/5 max-w-lg" />
          </div>
          <div className="mt-8 flex gap-3">
            <SkeletonLine className="h-11 w-32 rounded-md" />
            <SkeletonLine className="h-11 w-28 rounded-md" />
          </div>
        </div>
        <div className="demo-card min-h-[280px] p-6" aria-hidden="true">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="mt-10 h-8 w-3/4" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <SkeletonCard dense />
            <SkeletonCard dense />
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </main>
  );
}

export function PageSkeleton({ variant = "docs" }: PageSkeletonProps) {
  if (variant === "landing") {
    return <LandingSkeleton />;
  }

  if (variant === "form") {
    return <FormSkeleton />;
  }

  if (variant === "dashboard") {
    return <DashboardSkeleton />;
  }

  const shellClass = variant === "cards" ? "demo-shell" : "demo-narrow-shell";
  const cardCount = variant === "cards" ? 6 : 4;

  return (
    <main
      aria-busy="true"
      aria-label="Loading translated page"
      className={shellClass}
    >
      <SkeletonHero wide={variant === "cards"} />
      <div
        className={
          variant === "cards" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"
        }
        aria-hidden="true"
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <SkeletonCard key={index} dense={variant === "cards"} />
        ))}
      </div>
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
