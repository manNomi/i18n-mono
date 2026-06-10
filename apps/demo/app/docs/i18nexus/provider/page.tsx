import { Metadata } from "next";

import ProviderPage from "@/page/provider";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "I18nProvider - i18nexus Documentation",
  description:
    "React Context Provider for i18n with cookie-based persistence and SSR support. Zero hydration mismatches.",
  keywords: ["I18nProvider", "react context", "i18n provider", "ssr"],
};

export default function Page() {
  return (
    <TranslationGate namespace="provider" skeleton="docs">
      <ProviderPage />
    </TranslationGate>
  );
}
