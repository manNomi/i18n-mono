"use client";

import { useLanguageSwitcher, useTranslation } from "i18nexus";
import { usePathname } from "next/navigation";

export default function LanguageSwitcher() {
  const { t, currentLanguage } = useTranslation<"common">("common");
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

  const getLanguageLabel = (langCode: string, fallbackName: string) => {
    if (langCode === "ko") return t("한국어");
    if (langCode === "en") return t("English");
    return fallbackName;
  };

  return (
    <div className="flex max-w-full shrink-0 items-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 p-1">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors sm:px-3 sm:text-sm ${
            currentLanguage === lang.code
              ? "bg-white text-blue-700 shadow-[0_1px_2px_rgba(0,12,30,0.08)]"
              : "text-slate-500 hover:text-slate-900"
          }`}
          aria-pressed={currentLanguage === lang.code}
        >
          <span className="hidden md:inline">
            {getLanguageLabel(lang.code, lang.name)}
          </span>
          <span className="md:hidden">{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
