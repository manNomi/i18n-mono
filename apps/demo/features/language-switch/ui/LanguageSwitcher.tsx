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
    <div className="flex h-9 max-w-full shrink-0 items-center overflow-hidden rounded-lg border border-[color:var(--border-soft)] bg-[color:var(--bg-1)] p-1">
      {availableLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.06em] transition-colors sm:px-3 ${
            currentLanguage === lang.code
              ? "bg-[color:var(--bg-3)] text-[color:var(--blue-bright)]"
              : "text-[color:var(--text-faint)] hover:text-[color:var(--text)]"
          }`}
          aria-pressed={currentLanguage === lang.code}
        >
          {lang.code.toUpperCase()}
          <span className="sr-only">
            {" "}
            {getLanguageLabel(lang.code, lang.name)}
          </span>
        </button>
      ))}
    </div>
  );
}
