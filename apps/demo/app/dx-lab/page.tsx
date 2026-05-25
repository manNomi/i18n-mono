import { Metadata } from "next";

import DxLabPage from "@/page/dx-lab";

export const metadata: Metadata = {
  title: "DX Lab - i18nexus",
  description:
    "A hands-on i18nexus demo page that exercises lazy namespace loading, fallback translations, and language switching.",
};

export default function Page() {
  return <DxLabPage />;
}
