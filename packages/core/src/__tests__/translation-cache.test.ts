import {
  cacheTranslations,
  cleanupExpiredCache,
  getCachedTranslations,
  getCacheStats,
  invalidateCache,
} from "../utils/translation-cache";

describe("translation-cache", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let nowSpy: jest.SpyInstance<number, []>;

  beforeEach(() => {
    invalidateCache();
    nowSpy = jest.spyOn(Date, "now").mockReturnValue(1_000);
  });

  afterEach(() => {
    invalidateCache();
    nowSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("stores translations by namespace and language", () => {
    const homeEn = { en: { title: "Home" } };
    const homeKo = { ko: { title: "홈" } };

    cacheTranslations("home", "en", homeEn);
    cacheTranslations("home", "ko", homeKo);

    expect(getCachedTranslations("home", "en")).toBe(homeEn);
    expect(getCachedTranslations("home", "ko")).toBe(homeKo);
    expect(getCachedTranslations("dashboard", "en")).toBeNull();
  });

  it("invalidates a specific namespace and language pair", () => {
    cacheTranslations("home", "en", { en: { title: "Home" } });
    cacheTranslations("home", "ko", { ko: { title: "홈" } });
    cacheTranslations("dashboard", "en", { en: { title: "Dashboard" } });

    invalidateCache("home", "en");

    expect(getCachedTranslations("home", "en")).toBeNull();
    expect(getCachedTranslations("home", "ko")).not.toBeNull();
    expect(getCachedTranslations("dashboard", "en")).not.toBeNull();
  });

  it("invalidates by namespace, by language, and all entries", () => {
    cacheTranslations("home", "en", { en: { title: "Home" } });
    cacheTranslations("home", "ko", { ko: { title: "홈" } });
    cacheTranslations("dashboard", "en", { en: { title: "Dashboard" } });

    invalidateCache("home");

    expect(getCachedTranslations("home", "en")).toBeNull();
    expect(getCachedTranslations("home", "ko")).toBeNull();
    expect(getCachedTranslations("dashboard", "en")).not.toBeNull();

    invalidateCache(undefined, "en");
    expect(getCachedTranslations("dashboard", "en")).toBeNull();

    cacheTranslations("home", "en", { en: { title: "Home" } });
    invalidateCache();
    expect(getCacheStats().totalEntries).toBe(0);
  });

  it("expires entries after the production TTL", () => {
    process.env.NODE_ENV = "production";
    cacheTranslations("home", "en", { en: { title: "Home" } });

    nowSpy.mockReturnValue(60_999);
    expect(getCachedTranslations("home", "en")).not.toBeNull();

    nowSpy.mockReturnValue(61_001);
    expect(getCachedTranslations("home", "en")).toBeNull();
  });

  it("uses a shorter TTL in development and reports cache stats", () => {
    process.env.NODE_ENV = "development";
    cacheTranslations("home", "en", { en: { title: "Home" } });
    cacheTranslations("dashboard", "ko", { ko: { title: "대시보드" } });

    nowSpy.mockReturnValue(6_001);
    const stats = getCacheStats();

    expect(stats.totalEntries).toBe(2);
    expect(stats.validEntries).toBe(0);
    expect(stats.expiredEntries).toBe(2);
    expect(stats.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          namespace: "home",
          language: "en",
          isExpired: true,
        }),
      ])
    );

    cleanupExpiredCache();
    expect(getCacheStats().totalEntries).toBe(0);
  });
});
