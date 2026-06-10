import { Metadata } from "next";

import DocsGoogleSheetsPage from "@/page/docs-i18nexus-tools-google-sheets";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "Google Sheets Integration - i18nexus Tools Documentation",
  description:
    "Sync translations with Google Sheets for team collaboration. Complete setup guide and workflow.",
  keywords: [
    "google sheets",
    "translation sync",
    "team collaboration",
    "i18n workflow",
  ],
};

export default function Page() {
  return (
    <TranslationGate
      namespace="docs-i18nexus-tools-google-sheets"
      skeleton="docs"
    >
      <DocsGoogleSheetsPage />
    </TranslationGate>
  );
}
