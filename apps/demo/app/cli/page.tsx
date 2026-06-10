import { Metadata } from "next";

import CliPage from "@/page/cli";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "CLI Tools - i18nexus",
  description:
    "Powerful automation tools for i18n workflow. Auto-wrap text, extract keys, sync with Google Sheets.",
  keywords: [
    "i18n cli",
    "translation automation",
    "i18nexus tools",
    "google sheets sync",
  ],
};

export default function Page() {
  return (
    <TranslationGate namespace="cli" skeleton="cards">
      <CliPage />
    </TranslationGate>
  );
}
