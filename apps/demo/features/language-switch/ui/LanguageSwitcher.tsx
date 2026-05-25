"use client";

import { useLanguageSwitcher, useTranslation } from "i18nexus";
import { usePathname } from "next/navigation";

export default function LanguageSwitcher() {
  const { currentLanguage } = useTranslation<"common">("common");
  const { changeLanguage, availableLanguages } = useLanguageSwitcher();
  const pathname = usePathname();

  // 서버 컴포넌트 페이지 목록 (새로고침 필요)
  const serverComponentPages = ["/server-example"];

  const handleLanguageChange = async (langCode: string) => {
    // 서버 컴포넌트 페이지인 경우 새로고침
    const shouldReload = serverComponentPages.some((path) =>
      pathname?.startsWith(path)
    );
    await changeLanguage(langCode);
    if (shouldReload) {
      window.location.reload();
    }
  };

  return (
    <div className="flex max-w-full shrink-0 items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-1">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`whitespace-nowrap rounded px-2.5 py-1.5 text-xs font-semibold sm:px-3 sm:text-sm ${
            currentLanguage === lang.code
              ? "bg-white text-blue-700"
              : "text-slate-500 hover:text-slate-900"
          }`}
          aria-pressed={currentLanguage === lang.code}
        >
          <span className="hidden md:inline">{lang.name}</span>
          <span className="md:hidden">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
