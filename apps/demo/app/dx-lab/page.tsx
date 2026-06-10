import { Metadata } from "next";

import DxLabPage from "@/page/dx-lab";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "DX Lab - i18nexus",
  description:
    "A hands-on i18nexus demo page that exercises lazy namespace loading, fallback translations, language switching, and devtools subpath usage.",
};

export default function Page() {
  return (
    <TranslationGate namespace="dx-lab" skeleton="dashboard">
      <DxLabPage />
    </TranslationGate>
  );
}
