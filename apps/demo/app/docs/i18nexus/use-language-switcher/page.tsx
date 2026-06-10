import { Metadata } from "next";

import DocsUseLanguageSwitcherPage from "@/page/docs-i18nexus-use-language-switcher";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "useLanguageSwitcher Hook - i18nexus Documentation",
  description:
    "React hook for language switching and management. Automatic cookie persistence.",
  keywords: [
    "language switcher",
    "change language",
    "i18n language",
    "react hook",
  ],
};

export default function Page() {
  return (
    <TranslationGate
      namespace="docs-i18nexus-use-language-switcher"
      skeleton="docs"
    >
      <DocsUseLanguageSwitcherPage />
    </TranslationGate>
  );
}
