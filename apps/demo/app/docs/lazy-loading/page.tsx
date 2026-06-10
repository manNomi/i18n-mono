import { Metadata } from "next";

import DocsLazyLoadingPage from "@/page/docs-lazy-loading";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "Lazy Loading - i18nexus Documentation",
  description:
    "Load translation namespaces on demand with I18nProvider and loadNamespace.",
  keywords: [
    "lazy loading",
    "code splitting",
    "performance",
    "i18n optimization",
  ],
};

export default function Page() {
  return (
    <TranslationGate namespace="docs-lazy-loading" skeleton="docs">
      <DocsLazyLoadingPage />
    </TranslationGate>
  );
}
