import { Metadata } from "next";

import DocsDownloadForcePage from "@/page/docs-i18nexus-tools-download-force";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "i18n-download-force - i18nexus Tools Documentation",
  description:
    "Force overwrite local translations with Google Sheets data. Use Google Sheets as single source of truth.",
  keywords: [
    "i18n-download-force",
    "force sync",
    "overwrite translations",
    "sheets master",
  ],
};

export default function Page() {
  return (
    <TranslationGate
      namespace="docs-i18nexus-tools-download-force"
      skeleton="docs"
    >
      <DocsDownloadForcePage />
    </TranslationGate>
  );
}
