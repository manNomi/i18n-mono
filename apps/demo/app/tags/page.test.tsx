import { I18nProvider } from "i18nexus";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import tagsEn from "@/locales/tags/en.json";
import tagsKo from "@/locales/tags/ko.json";
import TagsPage from "@/page/tags";

function renderTagsPage(language: "en" | "ko", selectedTag?: string) {
  return renderToStaticMarkup(
    <I18nProvider
      initialLanguage={language}
      translations={{
        tags: {
          en: tagsEn,
          ko: tagsKo,
        },
      }}
      fallbackNamespace="tags"
    >
      <TagsPage selectedTag={selectedTag} />
    </I18nProvider>
  );
}

describe("TagsPage", () => {
  it("renders only posts that share the selected tag through i18nexus translations", () => {
    const html = renderTagsPage("en", "automation");

    expect(html).toContain("Posts tagged Automation");
    expect(html).toContain("i18n-wrapper");
    expect(html).toContain("i18n-extractor");
    expect(html).toContain("i18n-upload");
    expect(html).toContain("i18n-download");
    expect(html).not.toContain("I18nProvider");
  });

  it("falls back to all posts when the tag query is unknown", () => {
    const html = renderTagsPage("en", "unknown-tag");

    expect(html).toContain("All tagged posts");
    expect(html).toContain("I18nProvider");
    expect(html).toContain("i18n-wrapper");
  });

  it("renders Korean tag labels and interpolated post counts", () => {
    const html = renderTagsPage("ko", "automation");

    expect(html).toContain("자동화 태그 글");
    expect(html).toContain("4개 글을 찾았습니다");
    expect(html).toContain("관련 글 보기");
  });
});
