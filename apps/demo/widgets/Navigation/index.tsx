"use client";

import { useTranslation } from "i18nexus";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/features/language-switch";

type NavItem = {
  href: string;
  label: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={open ? "M6 18 18 6M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"}
      />
    </svg>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`demo-nav-link ${active ? "demo-nav-link-active" : ""}`}
    >
      {item.label}
    </Link>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSkeletonLine({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-full bg-[color:var(--bg-3)] ${className}`}
    />
  );
}

function NavigationSkeleton() {
  return (
    <>
      <aside className="demo-sidebar fixed inset-y-0 left-0 z-20 hidden lg:top-[var(--nav-h)] lg:block lg:shadow-none">
        <nav className="space-y-6 px-3 py-6" aria-hidden="true">
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <NavSkeletonLine key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
          <div className="border-t border-[color:var(--border-soft)] pt-4">
            <NavSkeletonLine className="mb-3 h-3 w-16" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <NavSkeletonLine
                  key={index}
                  className="h-9 w-full rounded-lg"
                />
              ))}
            </div>
          </div>
        </nav>
      </aside>

      <nav className="demo-top-nav" aria-busy="true">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <NavSkeletonLine className="h-10 w-10 rounded-lg lg:hidden" />
            <Image
              src="/i18nexus-logo.png"
              alt="i18nexus"
              width={148}
              height={41}
              className="h-8 w-auto shrink-0 object-contain sm:h-9"
              priority
            />
            <div className="ml-5 hidden items-center gap-2 md:flex">
              <NavSkeletonLine className="h-8 w-16 rounded-lg" />
              <NavSkeletonLine className="h-8 w-12 rounded-lg" />
              <NavSkeletonLine className="h-8 w-12 rounded-lg" />
            </div>
          </div>
          <NavSkeletonLine className="h-9 w-28 rounded-lg" />
        </div>
      </nav>
    </>
  );
}

export default function Navigation() {
  const { t, isReady } = useTranslation<"common">("common");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  if (!isReady) {
    return <NavigationSkeleton />;
  }

  const primaryItems: NavItem[] = [
    { href: "/", label: t("홈") },
    { href: "/getting-started", label: t("시작하기") },
    { href: "/server-example", label: t("서버 예제") },
    { href: "/dx-lab", label: t("DX Lab") },
    { href: "/tags", label: t("태그") },
    { href: "/showcase", label: t("쇼케이스") },
    { href: "/showcase/submit", label: t("프로젝트 등록") },
  ];

  const navGroups: NavGroup[] = [
    {
      label: t("문서"),
      items: [
        { href: "/docs/i18nexus", label: t("문서 개요") },
        { href: "/docs/i18nexus/provider", label: "I18nProvider" },
        { href: "/docs/i18nexus/use-translation", label: "useTranslation" },
        {
          href: "/docs/i18nexus/use-language-switcher",
          label: "useLanguageSwitcher",
        },
        { href: "/docs/i18nexus/server-components", label: t("서버 컴포넌트") },
        { href: "/docs/lazy-loading", label: "Lazy Loading" },
      ],
    },
    {
      label: t("CLI"),
      items: [
        { href: "/cli", label: t("CLI 개요") },
        { href: "/docs/i18nexus-tools", label: "i18nexus-tools" },
        { href: "/docs/i18nexus-tools/wrapper", label: "wrapper" },
        { href: "/docs/i18nexus-tools/extractor", label: "extractor" },
        { href: "/docs/i18nexus-tools/upload", label: "upload" },
        { href: "/docs/i18nexus-tools/download", label: "download" },
        {
          href: "/docs/i18nexus-tools/download-force",
          label: "download-force",
        },
        { href: "/docs/i18nexus-tools/google-sheets", label: "Google Sheets" },
      ],
    },
    {
      label: t("관리자"),
      items: [
        { href: "/admin/login", label: t("관리자 로그인") },
        { href: "/admin/dashboard", label: t("대시보드") },
      ],
    },
  ];

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen ? (
        <button
          aria-label={String(t("닫기"))}
          className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={`demo-sidebar fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:top-[var(--nav-h)] lg:z-20 lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[var(--nav-h)] items-center justify-between border-b border-[color:var(--border-soft)] px-4 lg:hidden">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={closeSidebar}
            >
              <Image
                src="/i18nexus-logo.png"
                alt="i18nexus"
                width={136}
                height={38}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <button
              aria-label={String(t("닫기"))}
              className="rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-1)] p-2 text-[color:var(--text-dim)] hover:bg-[color:var(--bg-2)] hover:text-[color:var(--text)]"
              onClick={closeSidebar}
            >
              <MenuIcon open />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-6">
            <div className="space-y-1">
              {primaryItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  onClick={closeSidebar}
                />
              ))}
            </div>

            {navGroups.map((group) => (
              <div
                key={group.label}
                className="mt-6 border-t border-[color:var(--border-soft)] pt-4"
              >
                <p className="demo-sidebar-heading">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item.href)}
                      onClick={closeSidebar}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      <nav className="demo-top-nav">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label={String(sidebarOpen ? t("닫기") : t("메뉴 열기"))}
              className="shrink-0 rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-1)] p-2 text-[color:var(--text-dim)] transition-colors hover:bg-[color:var(--bg-2)] hover:text-[color:var(--text)] lg:hidden"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <MenuIcon open={sidebarOpen} />
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Image
                src="/i18nexus-logo.png"
                alt="i18nexus"
                width={148}
                height={41}
                className="h-8 w-auto shrink-0 object-contain sm:h-9"
                priority
              />
            </Link>

            <div className="ml-5 hidden items-center gap-1 md:flex">
              <Link href="/docs/i18nexus" className="demo-top-link">
                {t("문서")}
              </Link>
              <Link href="/docs/i18nexus-tools" className="demo-top-link">
                API
              </Link>
              <Link href="/cli" className="demo-top-link">
                CLI
              </Link>
            </div>
          </div>

          <LanguageSwitcher />
        </div>
      </nav>
    </>
  );
}
