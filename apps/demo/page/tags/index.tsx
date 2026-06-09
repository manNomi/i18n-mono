"use client";

import { useTranslation } from "i18nexus";
import Link from "next/link";

import { PageShell, Section } from "@/shared/ui/PageLayout";

import {
  getPostCountByTag,
  getPostsForTag,
  getTagById,
  tagCatalog,
  type TagId,
} from "./data";

type TagsPageProps = {
  selectedTag?: string | null;
};

function TagPill({ tagId }: { tagId: TagId }) {
  const { t } = useTranslation("tags");
  const tag = getTagById(tagId);

  if (!tag) {
    return null;
  }

  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-zinc-300">
      {t(tag.labelKey)}
    </span>
  );
}

export default function TagsPage({ selectedTag }: TagsPageProps) {
  const { t, isReady } = useTranslation("tags");
  const activeTag = getTagById(selectedTag);
  const visiblePosts = getPostsForTag(activeTag?.id);

  if (!isReady) {
    return (
      <PageShell eyebrow="Tags" title="Loading tags...">
        <Section>
          <p className="text-sm text-zinc-400">Loading...</p>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell
      backHref="/"
      backLabel={t("Home")}
      eyebrow={t("Tags")}
      title={t("Browse docs by tag")}
      description={t(
        "Pick a topic card to see only the guides and reference pages that share the same tag."
      )}
      actions={
        activeTag ? (
          <Link href="/tags" className="demo-button">
            {t("Clear filter")}
          </Link>
        ) : null
      }
    >
      <Section
        title={t("Topic cards")}
        description={t(
          "Each card groups pages around one product concern so the docs feel closer to a reading path."
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tagCatalog.map((tag) => {
            const selected = activeTag?.id === tag.id;
            const postCount = getPostCountByTag(tag.id);

            return (
              <Link
                key={tag.id}
                href={`/tags?tag=${tag.id}`}
                aria-current={selected ? "page" : undefined}
                className={`group rounded-2xl border p-5 transition-all duration-200 ${
                  selected
                    ? "border-blue-300/50 bg-blue-300/15 shadow-[0_18px_70px_rgba(96,165,250,0.18)]"
                    : "border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-blue-300/30 hover:bg-white/[0.07]"
                }`}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-sm font-bold text-blue-200">
                    #
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-zinc-300">
                    {t("{{count}} posts", { count: postCount })}
                  </span>
                </div>
                <h2 className="text-lg font-bold tracking-[-0.02em] text-zinc-50">
                  {t(tag.labelKey)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {t(tag.descriptionKey)}
                </p>
                <p className="mt-5 text-sm font-semibold text-blue-300">
                  {selected ? t("Selected") : t("View tagged posts")} &rarr;
                </p>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section
        title={
          activeTag
            ? t("Posts tagged {{tag}}", { tag: t(activeTag.labelKey) })
            : t("All tagged posts")
        }
        description={t("{{count}} posts found", {
          count: visiblePosts.length,
        })}
      >
        <div className="grid gap-4">
          {visiblePosts.map((post) => (
            <Link
              key={post.href}
              href={post.href}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-blue-300/30 hover:bg-blue-300/10"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                    {t(post.categoryKey)}
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-[-0.02em] text-zinc-50">
                    {t(post.titleKey)}
                  </h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                    {t(post.descriptionKey)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-zinc-400">
                  {t(post.readingTimeKey)}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {post.tags.map((tagId) => (
                  <TagPill key={tagId} tagId={tagId} />
                ))}
              </div>
            </Link>
          ))}
        </div>
      </Section>
    </PageShell>
  );
}
