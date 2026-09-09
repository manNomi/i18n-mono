/**
 * Tests for server-side getServerTranslations with type safety
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  createServerI18nWithTranslations,
  createServerTranslation,
  getServerTranslations,
  getTranslation,
  invalidateCache,
  loadTranslations,
} from "../utils/server";

describe("createServerI18nWithTranslations", () => {
  const translations = {
    en: { title: "Title" },
    ko: { title: "제목" },
  };

  it("uses cookie negotiation with preloaded resources", () => {
    const headers = new Headers({ cookie: "i18n-language=ko" });
    const result = createServerI18nWithTranslations(headers, translations, {
      availableLanguages: ["en", "ko"],
      defaultLanguage: "en",
    });

    expect(result.language).toBe("ko");
    expect(result.t("title")).toBe("제목");
    expect(result.dict).toEqual({ title: "제목" });
  });

  it("falls back after malformed cookie and unacceptable header ranges", () => {
    const headers = new Headers({
      cookie: "i18n-language=%E0%A4%A",
      "accept-language": "ko;q=0,*;q=1",
    });
    const result = createServerI18nWithTranslations(headers, translations, {
      availableLanguages: ["en", "ko"],
      defaultLanguage: "en",
    });

    expect(result.language).toBe("en");
    expect(result.t("missing")).toBe("missing");
  });
});

describe("createServerTranslation", () => {
  const t = createServerTranslation("en", {
    en: { blank: "", present: "Present" },
  });

  it("preserves an intentionally empty translation", () => {
    expect(t("blank")).toBe("");
  });

  it("preserves an explicitly empty fallback for a missing key", () => {
    expect(t("missing", "")).toBe("");
    expect(t("missing", undefined, "")).toBe("");
  });

  it("returns the key only when translation and fallback are absent", () => {
    expect(t("missing")).toBe("missing");
  });
});

describe("getServerTranslations (Type-Safe)", () => {
  const translations = {
    en: {
      welcome: "Welcome",
      logout: "Logout",
      greeting: "Hello {{name}}",
    },
    ko: {
      welcome: "환영합니다",
      logout: "로그아웃",
      greeting: "안녕하세요 {{name}}",
    },
  } as const;

  it("should return translations for specified language", () => {
    const dict = getServerTranslations("en", translations);

    expect(dict.welcome).toBe("Welcome");
    expect(dict.logout).toBe("Logout");
    expect(dict.greeting).toBe("Hello {{name}}");
  });

  it("should return translations for Korean language", () => {
    const dict = getServerTranslations("ko", translations);

    expect(dict.welcome).toBe("환영합니다");
    expect(dict.logout).toBe("로그아웃");
  });

  it("should fallback to English when language not found", () => {
    const dict = getServerTranslations("fr", translations);

    // Should fallback to English
    expect(dict.welcome).toBe("Welcome");
  });

  it("should handle empty translations object", () => {
    const emptyTranslations = {
      en: {},
      ko: {},
    } as const;

    const dict = getServerTranslations("en", emptyTranslations);

    expect(dict).toEqual({});
  });

  it("should preserve type information", () => {
    const dict = getServerTranslations("en", translations);

    // Type inference should work
    const welcome: string = dict.welcome;
    const logout: string = dict.logout;

    expect(welcome).toBe("Welcome");
    expect(logout).toBe("Logout");
  });

  it("should work with namespace translations", () => {
    const namespaceTranslations = {
      common: {
        en: {
          welcome: "Welcome",
          logout: "Logout",
        },
        ko: {
          welcome: "환영합니다",
          logout: "로그아웃",
        },
      },
      menu: {
        en: {
          home: "Home",
          about: "About",
        },
        ko: {
          home: "홈",
          about: "소개",
        },
      },
    } as const;

    // Flatten namespace structure for server-side usage
    const flatTranslations = {
      en: {
        ...namespaceTranslations.common.en,
        ...namespaceTranslations.menu.en,
      },
      ko: {
        ...namespaceTranslations.common.ko,
        ...namespaceTranslations.menu.ko,
      },
    };

    const dict = getServerTranslations("en", flatTranslations);

    expect(dict.welcome).toBe("Welcome");
    expect(dict.home).toBe("Home");
  });

  it("should merge flat namespace maps with later namespaces overriding earlier ones", () => {
    const dict = getServerTranslations("en", {
      common: {
        save: "Save",
        title: "Common title",
      },
      dashboard: {
        title: "Dashboard title",
      },
    });

    expect(dict.save).toBe("Save");
    expect(dict.title).toBe("Dashboard title");
  });
});

describe("loadTranslations", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-load-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("loads legacy flat language JSON files without dynamic imports", async () => {
    fs.mkdirSync(path.join(tempDir, "locales"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "locales", "en.json"),
      JSON.stringify({ welcome: "Welcome" })
    );
    fs.writeFileSync(
      path.join(tempDir, "locales", "ko.json"),
      JSON.stringify({ welcome: "환영합니다" })
    );

    const translations = await loadTranslations("./locales");

    expect(translations.en.welcome).toBe("Welcome");
    expect(translations.ko.welcome).toBe("환영합니다");
  });

  it("loads namespaced language JSON files generated by i18nexus-tools", async () => {
    fs.mkdirSync(path.join(tempDir, "locales", "common"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempDir, "locales", "common", "en.json"),
      JSON.stringify({ welcome: "Welcome" })
    );
    fs.writeFileSync(
      path.join(tempDir, "locales", "common", "ko.json"),
      JSON.stringify({ welcome: "환영합니다" })
    );

    const translations = await loadTranslations("./locales");
    const dict = getServerTranslations("ko", translations);

    expect(dict.welcome).toBe("환영합니다");
  });

  it("returns an empty object for a missing locale directory", async () => {
    await expect(loadTranslations("./missing-locales")).resolves.toEqual({});
  });

  it("ignores non-JSON, malformed, and non-string translation resources", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    fs.mkdirSync(path.join(tempDir, "locales"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "locales", "notes.txt"), "ignored");
    fs.writeFileSync(path.join(tempDir, "locales", "en.json"), "{");
    fs.writeFileSync(
      path.join(tempDir, "locales", "ko.json"),
      JSON.stringify({ nested: { title: "invalid" } })
    );
    fs.writeFileSync(
      path.join(tempDir, "locales", "ja.json"),
      JSON.stringify({ title: "有効" })
    );

    await expect(loadTranslations("./locales")).resolves.toEqual({
      ja: { title: "有効" },
    });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("propagates locale directory read failures", async () => {
    fs.mkdirSync(path.join(tempDir, "locales"), { recursive: true });
    const readdirSpy = jest
      .spyOn(fs.promises, "readdir")
      .mockRejectedValueOnce(new Error("permission denied"));

    await expect(loadTranslations("./locales")).rejects.toThrow(
      "permission denied"
    );
    readdirSpy.mockRestore();
  });

  it("does not follow symlink entries outside the locale directory", async () => {
    const localesDir = path.join(tempDir, "locales");
    const outsideDir = path.join(tempDir, "outside");
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(
      path.join(outsideDir, "en.json"),
      JSON.stringify({ secret: "outside" })
    );
    fs.symlinkSync(
      path.join(outsideDir, "en.json"),
      path.join(localesDir, "linked.json")
    );
    fs.symlinkSync(outsideDir, path.join(localesDir, "linked-namespace"));

    await expect(loadTranslations(localesDir)).resolves.toEqual({});
  });
});

describe("getTranslation server namespace fallback", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-server-"));
    process.chdir(tempDir);
    invalidateCache();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    invalidateCache();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("should merge fallback namespace keys and let requested namespace override them", async () => {
    fs.mkdirSync(path.join(tempDir, "locales", "common"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tempDir, "locales", "dashboard"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempDir, "i18nexus.config.json"),
      JSON.stringify({
        localesDir: "./locales",
        defaultLanguage: "en",
        fallbackNamespace: "common",
      })
    );
    fs.writeFileSync(
      path.join(tempDir, "locales", "common", "en.json"),
      JSON.stringify({
        save: "Save",
        title: "Common title",
      })
    );
    fs.writeFileSync(
      path.join(tempDir, "locales", "dashboard", "en.json"),
      JSON.stringify({
        title: "Dashboard title",
      })
    );

    const { t, dict, translations, namespace } = await getTranslation(
      "dashboard",
      {
        language: "en",
        disableCache: true,
      }
    );

    expect(namespace).toBe("dashboard");
    expect(t("save")).toBe("Save");
    expect(t("title")).toBe("Dashboard title");
    expect(dict.save).toBe("Save");
    expect(dict.title).toBe("Dashboard title");
    expect(translations.common.save).toBe("Save");
    expect(translations.dashboard.title).toBe("Dashboard title");
  });

  it("should warn when i18nexus/server finds an unsupported JS config", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    fs.writeFileSync(
      path.join(tempDir, "i18nexus.config.js"),
      `export default { localesDir: "./messages" };`
    );
    fs.mkdirSync(path.join(tempDir, "locales", "common"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempDir, "locales", "common", "en.json"),
      JSON.stringify({
        title: "Common title",
      })
    );

    const { t } = await getTranslation("common", {
      language: "en",
      disableCache: true,
    });

    expect(t("title")).toBe("Common title");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("i18nexus.config.js is ignored")
    );

    warnSpy.mockRestore();
  });

  it("uses the configured default when automatic Next headers are unavailable", async () => {
    const localesDir = path.join(tempDir, "locales");
    fs.mkdirSync(path.join(localesDir, "common"), { recursive: true });
    fs.writeFileSync(
      path.join(localesDir, "common", "ko.json"),
      JSON.stringify({ title: "기본 언어" })
    );

    const result = await getTranslation("common", {
      localesDir,
      defaultLanguage: "ko",
      availableLanguages: ["en", "ko"],
      disableCache: true,
    });

    expect(result.language).toBe("ko");
    expect(result.t("title")).toBe("기본 언어");
  });

  it("rejects namespace and language paths outside the locale root", async () => {
    const localesDir = path.join(tempDir, "locales");
    const outsideDir = path.join(tempDir, "outside");
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(
      path.join(outsideDir, "en.json"),
      JSON.stringify({ secret: "outside" })
    );

    await expect(
      getTranslation("../outside", {
        language: "en",
        localesDir,
        disableCache: true,
      })
    ).rejects.toThrow("must remain inside locales directory");
    await expect(
      getTranslation("common", {
        language: "../../outside/en",
        localesDir,
        disableCache: true,
      })
    ).rejects.toThrow("must remain inside locales directory");
  });

  it("rejects translation files reached through a symlink outside the locale root", async () => {
    const localesDir = path.join(tempDir, "locales");
    const outsideDir = path.join(tempDir, "outside");
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(
      path.join(outsideDir, "en.json"),
      JSON.stringify({ secret: "outside" })
    );
    fs.symlinkSync(outsideDir, path.join(localesDir, "linked"));

    await expect(
      getTranslation("linked", {
        language: "en",
        localesDir,
        disableCache: true,
      })
    ).rejects.toThrow("must remain inside locales directory");
  });

  it("rejects a translation JSON object with non-string values", async () => {
    const localesDir = path.join(tempDir, "locales");
    fs.mkdirSync(path.join(localesDir, "common"), { recursive: true });
    fs.writeFileSync(
      path.join(localesDir, "common", "en.json"),
      JSON.stringify({ nested: { title: "invalid" } })
    );

    await expect(
      getTranslation("common", {
        language: "en",
        localesDir,
        disableCache: true,
      })
    ).rejects.toThrow("expected a JSON object with string values");
  });
});

describe("getTranslation cache isolation", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-cache-scope-"));
    process.chdir(tempDir);
    invalidateCache();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    invalidateCache();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeTranslation(
    localesDir: string,
    namespace: string,
    language: string,
    title: string
  ): void {
    fs.mkdirSync(path.join(localesDir, namespace), { recursive: true });
    fs.writeFileSync(
      path.join(localesDir, namespace, `${language}.json`),
      JSON.stringify({ title })
    );
  }

  it("isolates concurrent and subsequent reads by locale root", async () => {
    const firstLocalesDir = path.join(tempDir, "first", "locales");
    const secondLocalesDir = path.join(tempDir, "second", "locales");

    writeTranslation(firstLocalesDir, "common", "en", "First project");
    writeTranslation(secondLocalesDir, "common", "en", "Second project");

    const [first, second] = await Promise.all([
      getTranslation("common", {
        language: "en",
        localesDir: firstLocalesDir,
      }),
      getTranslation("common", {
        language: "en",
        localesDir: secondLocalesDir,
      }),
    ]);
    const [secondAgain, firstAgain] = await Promise.all([
      getTranslation("common", {
        language: "en",
        localesDir: secondLocalesDir,
      }),
      getTranslation("common", {
        language: "en",
        localesDir: firstLocalesDir,
      }),
    ]);

    expect(first.t("title")).toBe("First project");
    expect(second.t("title")).toBe("Second project");
    expect(firstAgain.t("title")).toBe("First project");
    expect(secondAgain.t("title")).toBe("Second project");
  });

  it("returns a same-root cache hit before expiry", async () => {
    const localesDir = path.join(tempDir, "locales");
    writeTranslation(localesDir, "common", "en", "Cached value");

    await getTranslation("common", { language: "en", localesDir });
    writeTranslation(localesDir, "common", "en", "Changed on disk");

    const cached = await getTranslation("common", {
      language: "en",
      localesDir,
    });

    expect(cached.t("title")).toBe("Cached value");
  });

  it("bypasses without replacing the cache when disableCache is true", async () => {
    const localesDir = path.join(tempDir, "locales");
    writeTranslation(localesDir, "common", "en", "Cached value");

    await getTranslation("common", { language: "en", localesDir });
    writeTranslation(localesDir, "common", "en", "Fresh value");

    const fresh = await getTranslation("common", {
      language: "en",
      localesDir,
      disableCache: true,
    });
    const cached = await getTranslation("common", {
      language: "en",
      localesDir,
    });

    expect(fresh.t("title")).toBe("Fresh value");
    expect(cached.t("title")).toBe("Cached value");
  });

  it("invalidates a namespace and language across all locale roots", async () => {
    const firstLocalesDir = path.join(tempDir, "first", "locales");
    const secondLocalesDir = path.join(tempDir, "second", "locales");

    for (const localesDir of [firstLocalesDir, secondLocalesDir]) {
      writeTranslation(localesDir, "common", "en", "Before invalidation");
      await getTranslation("common", { language: "en", localesDir });
      writeTranslation(localesDir, "common", "en", "After invalidation");
    }

    invalidateCache("common", "en");

    const [first, second] = await Promise.all(
      [firstLocalesDir, secondLocalesDir].map((localesDir) =>
        getTranslation("common", { language: "en", localesDir })
      )
    );

    expect(first.t("title")).toBe("After invalidation");
    expect(second.t("title")).toBe("After invalidation");
  });

  it("invalidates a namespace across roots without clearing other namespaces", async () => {
    const firstLocalesDir = path.join(tempDir, "first", "locales");
    const secondLocalesDir = path.join(tempDir, "second", "locales");

    for (const localesDir of [firstLocalesDir, secondLocalesDir]) {
      writeTranslation(localesDir, "common", "en", "Common before");
      writeTranslation(localesDir, "dashboard", "en", "Dashboard before");
      await getTranslation("common", { language: "en", localesDir });
      await getTranslation("dashboard", { language: "en", localesDir });
      writeTranslation(localesDir, "common", "en", "Common after");
      writeTranslation(localesDir, "dashboard", "en", "Dashboard after");
    }

    invalidateCache("common");

    const commonResults = await Promise.all(
      [firstLocalesDir, secondLocalesDir].map((localesDir) =>
        getTranslation("common", { language: "en", localesDir })
      )
    );
    const dashboard = await getTranslation("dashboard", {
      language: "en",
      localesDir: firstLocalesDir,
    });

    expect(commonResults.map(({ t }) => t("title"))).toEqual([
      "Common after",
      "Common after",
    ]);
    expect(dashboard.t("title")).toBe("Dashboard before");
  });

  it("invalidates a language across roots without clearing other languages", async () => {
    const firstLocalesDir = path.join(tempDir, "first", "locales");
    const secondLocalesDir = path.join(tempDir, "second", "locales");

    for (const localesDir of [firstLocalesDir, secondLocalesDir]) {
      writeTranslation(localesDir, "common", "en", "English before");
      writeTranslation(localesDir, "common", "ko", "Korean before");
      await getTranslation("common", { language: "en", localesDir });
      await getTranslation("common", { language: "ko", localesDir });
      writeTranslation(localesDir, "common", "en", "English after");
      writeTranslation(localesDir, "common", "ko", "Korean after");
    }

    invalidateCache(undefined, "en");

    const englishResults = await Promise.all(
      [firstLocalesDir, secondLocalesDir].map((localesDir) =>
        getTranslation("common", { language: "en", localesDir })
      )
    );
    const korean = await getTranslation("common", {
      language: "ko",
      localesDir: firstLocalesDir,
    });

    expect(englishResults.map(({ t }) => t("title"))).toEqual([
      "English after",
      "English after",
    ]);
    expect(korean.t("title")).toBe("Korean before");
  });

  it("invalidates every cached root when called without selectors", async () => {
    const firstLocalesDir = path.join(tempDir, "first", "locales");
    const secondLocalesDir = path.join(tempDir, "second", "locales");

    writeTranslation(firstLocalesDir, "common", "en", "First before");
    writeTranslation(secondLocalesDir, "dashboard", "ko", "Second before");
    await getTranslation("common", {
      language: "en",
      localesDir: firstLocalesDir,
    });
    await getTranslation("dashboard", {
      language: "ko",
      localesDir: secondLocalesDir,
    });
    writeTranslation(firstLocalesDir, "common", "en", "First after");
    writeTranslation(secondLocalesDir, "dashboard", "ko", "Second after");

    invalidateCache();

    const [first, second] = await Promise.all([
      getTranslation("common", {
        language: "en",
        localesDir: firstLocalesDir,
      }),
      getTranslation("dashboard", {
        language: "ko",
        localesDir: secondLocalesDir,
      }),
    ]);

    expect(first.t("title")).toBe("First after");
    expect(second.t("title")).toBe("Second after");
  });

  it.each([
    ["production", 60_000],
    ["development", 5_000],
  ])("expires %s cache entries after %i ms", async (nodeEnv, ttl) => {
    const previousNodeEnv = process.env.NODE_ENV;
    const nowSpy = jest.spyOn(Date, "now");
    let now = 1_000;
    nowSpy.mockImplementation(() => now);
    process.env.NODE_ENV = nodeEnv;

    try {
      const localesDir = path.join(tempDir, "locales");
      writeTranslation(localesDir, "common", "en", "Before expiry");
      await getTranslation("common", { language: "en", localesDir });
      writeTranslation(localesDir, "common", "en", "After expiry");

      now += ttl + 1;
      const expired = await getTranslation("common", {
        language: "en",
        localesDir,
      });

      expect(expired.t("title")).toBe("After expiry");
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
      nowSpy.mockRestore();
    }
  });

  it("includes fallback namespace identity in the cache scope", async () => {
    const localesDir = path.join(tempDir, "locales");
    writeTranslation(localesDir, "dashboard", "en", "Dashboard");
    writeTranslation(localesDir, "common", "en", "Common fallback");
    writeTranslation(localesDir, "shared", "en", "Shared fallback");
    fs.writeFileSync(
      path.join(tempDir, "i18nexus.config.json"),
      JSON.stringify({ localesDir: "./locales", fallbackNamespace: "common" })
    );

    const first = await getTranslation("dashboard", { language: "en" });

    fs.writeFileSync(
      path.join(tempDir, "i18nexus.config.json"),
      JSON.stringify({ localesDir: "./locales", fallbackNamespace: "shared" })
    );
    const second = await getTranslation("dashboard", { language: "en" });

    expect(first.translations.common.title).toBe("Common fallback");
    expect(second.translations.shared.title).toBe("Shared fallback");
    expect(second.translations.common).toBeUndefined();
  });
});
