import { Metadata } from "next";

import TagsPage from "@/page/tags";
import { TranslationGate } from "@/shared/ui/TranslationGate";

export const metadata: Metadata = {
  title: "Tags - i18nexus",
  description:
    "Browse i18nexus documentation and guides by topic tags such as core runtime, Next.js, automation, TypeScript, lazy loading, and team workflow.",
  keywords: [
    "i18nexus tags",
    "i18n documentation",
    "Next.js i18n",
    "translation automation",
  ],
};

type PageProps = {
  searchParams?: Promise<{
    tag?: string | string[];
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const tag = Array.isArray(params?.tag) ? params.tag[0] : params?.tag;

  return (
    <TranslationGate namespace="tags" skeleton="cards">
      <TagsPage selectedTag={tag} />
    </TranslationGate>
  );
}
