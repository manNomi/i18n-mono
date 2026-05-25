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
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
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

export default function Navigation() {
  const { t } = useTranslation<"common">("common");
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const primaryItems: NavItem[] = [
    { href: "/", label: t("홈") },
    { href: "/getting-started", label: t("시작하기") },
    { href: "/server-example", label: t("서버 예제") },
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
          className="fixed inset-0 z-40 cursor-default bg-slate-950/20"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={closeSidebar}
            >
              <Image
                src="/i18n-icon-no-bg.png"
                alt="i18nexus"
                width={36}
                height={28}
                className="object-contain"
              />
              <span className="text-base font-semibold text-slate-950">
                i18nexus
              </span>
            </Link>
            <button
              aria-label={String(t("닫기"))}
              className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              onClick={closeSidebar}
            >
              <MenuIcon open />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                className="mt-6 border-t border-slate-200 pt-4"
              >
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.label}
                </p>
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

      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label={String(sidebarOpen ? t("닫기") : t("메뉴 열기"))}
              className="rounded-md border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <MenuIcon open={sidebarOpen} />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/i18n-icon-no-bg.png"
                alt="i18nexus"
                width={40}
                height={30}
                className="object-contain"
                priority
              />
              <span className="text-base font-semibold text-slate-950 sm:text-lg">
                i18nexus
              </span>
            </Link>
          </div>

          <LanguageSwitcher />
        </div>
      </nav>
    </>
  );
}
