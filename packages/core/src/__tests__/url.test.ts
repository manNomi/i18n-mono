import {
  getLanguageFromUrl,
  localizeUrl,
  removeLanguageFromUrl,
} from "../utils/url";

describe("URL localization helpers", () => {
  const languageOptions = {
    languages: ["ko", "en", "ja"],
    defaultLanguage: "ko",
  };

  it("adds a language prefix to relative URLs", () => {
    expect(localizeUrl("/docs?tab=api#intro", "en", languageOptions)).toBe(
      "/en/docs?tab=api#intro"
    );
  });

  it("replaces an existing language prefix", () => {
    expect(localizeUrl("/ko/docs", "en", languageOptions)).toBe("/en/docs");
  });

  it("omits default language by default", () => {
    expect(localizeUrl("/en/docs", "ko", languageOptions)).toBe("/docs");
  });

  it("keeps default language when requested", () => {
    expect(
      localizeUrl("/docs", "ko", {
        ...languageOptions,
        includeDefaultLanguage: true,
      })
    ).toBe("/ko/docs");
  });

  it("supports language prefixes after a base path", () => {
    expect(
      localizeUrl("/app/ko/profile", "ja", {
        ...languageOptions,
        basePath: "/app",
      })
    ).toBe("/app/ja/profile");
  });

  it("supports query parameter strategy", () => {
    expect(
      localizeUrl("/profile?tab=settings", "en", {
        ...languageOptions,
        strategy: "query",
      })
    ).toBe("/profile?tab=settings&lang=en");
  });

  it("removes default language from query parameter strategy", () => {
    expect(
      localizeUrl("/profile?tab=settings&lang=en", "ko", {
        ...languageOptions,
        strategy: "query",
      })
    ).toBe("/profile?tab=settings");
  });

  it("reads language from prefix and query URLs", () => {
    expect(getLanguageFromUrl("/en/docs", languageOptions)).toBe("en");
    expect(
      getLanguageFromUrl("/docs?lng=ja", {
        strategy: "query",
        queryParam: "lng",
      })
    ).toBe("ja");
  });

  it("removes language from URLs", () => {
    expect(removeLanguageFromUrl("/en/docs", languageOptions)).toBe("/docs");
    expect(
      removeLanguageFromUrl("https://example.com/docs?lang=en#top", {
        strategy: "query",
      })
    ).toBe("https://example.com/docs#top");
  });
});
