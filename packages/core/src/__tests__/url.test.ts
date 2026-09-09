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

  it("returns the original input for an empty target language", () => {
    const input = "/docs?tab=api#intro";
    expect(localizeUrl(input, "   ", languageOptions)).toBe(input);
  });

  it("does not remove an unknown language-like prefix", () => {
    expect(removeLanguageFromUrl("/fr/docs", languageOptions)).toBe("/fr/docs");
    expect(getLanguageFromUrl("/fr/docs", languageOptions)).toBeUndefined();
  });

  it.each([
    ["prefix", "/docs?tab=api#intro"],
    ["query", "/docs?tab=api#intro"],
  ] as const)("is idempotent for the %s strategy", (strategy, input) => {
    const options = { ...languageOptions, strategy };
    const once = localizeUrl(input, "en", options);
    expect(localizeUrl(once, "en", options)).toBe(once);
  });

  it("preserves absolute URL origin, query, hash, and encoded path data", () => {
    expect(
      localizeUrl(
        "https://example.com/%ED%95%9C%EA%B8%80?q=a%20b#top",
        "en",
        languageOptions
      )
    ).toBe("https://example.com/en/%ED%95%9C%EA%B8%80?q=a%20b#top");
  });

  it("throws TypeError for a malformed absolute URL", () => {
    expect.assertions(2);
    try {
      localizeUrl("https://[", "en", languageOptions);
    } catch (error) {
      expect(error).toHaveProperty("name", "TypeError");
      expect(error).toHaveProperty("message", "Invalid URL: https://[");
    }
  });
});
