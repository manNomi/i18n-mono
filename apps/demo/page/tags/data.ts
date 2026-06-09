export type TagId =
  | "core-runtime"
  | "nextjs"
  | "automation"
  | "typescript"
  | "lazy-loading"
  | "team-workflow";

export type TagMeta = {
  id: TagId;
  labelKey: string;
  descriptionKey: string;
};

export type TaggedPost = {
  href: string;
  titleKey: string;
  descriptionKey: string;
  categoryKey: string;
  readingTimeKey: string;
  tags: TagId[];
};

export const tagCatalog: TagMeta[] = [
  {
    id: "core-runtime",
    labelKey: "Core runtime",
    descriptionKey:
      "Provider, hooks, language switching, and server translation behavior.",
  },
  {
    id: "nextjs",
    labelKey: "Next.js",
    descriptionKey:
      "App Router, Server Components, SSR, and hydration-safe usage.",
  },
  {
    id: "automation",
    labelKey: "Automation",
    descriptionKey:
      "CLI flows for wrapping, extracting, and syncing translation resources.",
  },
  {
    id: "typescript",
    labelKey: "TypeScript",
    descriptionKey:
      "Typed namespaces, generated declarations, and safer translation keys.",
  },
  {
    id: "lazy-loading",
    labelKey: "Lazy loading",
    descriptionKey:
      "Load namespace JSON only when a page or component actually needs it.",
  },
  {
    id: "team-workflow",
    labelKey: "Team workflow",
    descriptionKey:
      "Google Sheets and review-friendly translation operations for teams.",
  },
];

export const taggedPosts: TaggedPost[] = [
  {
    href: "/getting-started",
    titleKey: "Getting Started",
    descriptionKey:
      "Install i18nexus and wire the provider in a small, production-shaped setup.",
    categoryKey: "Guide",
    readingTimeKey: "4 min read",
    tags: ["core-runtime", "nextjs"],
  },
  {
    href: "/docs/i18nexus/provider",
    titleKey: "I18nProvider",
    descriptionKey:
      "Understand the provider contract, fallback namespace, and language persistence.",
    categoryKey: "Core API",
    readingTimeKey: "6 min read",
    tags: ["core-runtime", "lazy-loading"],
  },
  {
    href: "/docs/i18nexus/use-translation",
    titleKey: "useTranslation",
    descriptionKey:
      "Learn how t() resolves keys, readiness, interpolation, and lazy namespaces.",
    categoryKey: "Core API",
    readingTimeKey: "7 min read",
    tags: ["core-runtime", "typescript", "lazy-loading"],
  },
  {
    href: "/docs/i18nexus/server-components",
    titleKey: "Server Components",
    descriptionKey:
      "Use server translations in Next.js without hydration mismatches.",
    categoryKey: "SSR",
    readingTimeKey: "8 min read",
    tags: ["core-runtime", "nextjs"],
  },
  {
    href: "/docs/lazy-loading",
    titleKey: "Lazy Loading",
    descriptionKey:
      "Load requested namespaces on demand and keep initial bundles small.",
    categoryKey: "Performance",
    readingTimeKey: "5 min read",
    tags: ["lazy-loading", "core-runtime", "nextjs"],
  },
  {
    href: "/docs/i18nexus-tools/wrapper",
    titleKey: "i18n-wrapper",
    descriptionKey:
      "Automatically wrap source text with translation calls before extraction.",
    categoryKey: "CLI",
    readingTimeKey: "6 min read",
    tags: ["automation", "team-workflow"],
  },
  {
    href: "/docs/i18nexus-tools/extractor",
    titleKey: "i18n-extractor",
    descriptionKey:
      "Extract keys, generate namespace files, and keep translation resources organized.",
    categoryKey: "CLI",
    readingTimeKey: "7 min read",
    tags: ["automation", "typescript", "team-workflow"],
  },
  {
    href: "/docs/i18nexus-tools/upload",
    titleKey: "i18n-upload",
    descriptionKey:
      "Push local namespace files to Google Sheets for collaborative translation work.",
    categoryKey: "Google Sheets",
    readingTimeKey: "5 min read",
    tags: ["automation", "team-workflow"],
  },
  {
    href: "/docs/i18nexus-tools/download",
    titleKey: "i18n-download",
    descriptionKey:
      "Pull translations back from Sheets while preserving local namespace structure.",
    categoryKey: "Google Sheets",
    readingTimeKey: "5 min read",
    tags: ["automation", "team-workflow"],
  },
  {
    href: "/dx-lab",
    titleKey: "DX Lab",
    descriptionKey:
      "A hands-on page for checking lazy loading, fallback behavior, and devtools together.",
    categoryKey: "Lab",
    readingTimeKey: "3 min read",
    tags: ["core-runtime", "lazy-loading", "typescript"],
  },
];

export function getTagById(tagId?: string | null) {
  return tagCatalog.find((tag) => tag.id === tagId) ?? null;
}

export function getPostsForTag(tagId?: string | null) {
  const tag = getTagById(tagId);

  if (!tag) {
    return taggedPosts;
  }

  return taggedPosts.filter((post) => post.tags.includes(tag.id));
}

export function getPostCountByTag(tagId: TagId) {
  return taggedPosts.filter((post) => post.tags.includes(tagId)).length;
}
