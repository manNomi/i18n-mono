import { Metadata } from "next";

import DocsServerComponentsPage from "@/page/docs-i18nexus-server-components";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "Server Components - i18nexus Documentation",
  description:
    "Using i18nexus with Next.js Server Components. Better SEO, faster loading, smaller bundles.",
  keywords: [
    "server components",
    "next.js server",
    "ssr i18n",
    "server-side translation",
  ],
};

export default function Page() {
  return (
    <TranslationGate
      namespace="docs-i18nexus-server-components"
      skeleton="docs"
    >
      <DocsServerComponentsPage />
    </TranslationGate>
  );
}
