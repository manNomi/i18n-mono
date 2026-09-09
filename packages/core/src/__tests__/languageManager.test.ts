import { LanguageManager } from "../utils/languageManager";

const languages = [
  { code: "en", name: "English", dir: "ltr" as const },
  { code: "ko", name: "한국어", dir: "ltr" as const },
  { code: "ar", name: "Arabic", dir: "rtl" as const },
];

function clearCookies() {
  document.cookie.split(";").forEach((cookie) => {
    document.cookie = cookie
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/");
  });
}

function setNavigatorLanguages(value: string[]) {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value,
  });
}

describe("LanguageManager", () => {
  beforeEach(() => {
    clearCookies();
    localStorage.clear();
    document.documentElement.lang = "";
    document.documentElement.dir = "";
    setNavigatorLanguages(["en-US"]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    clearCookies();
    localStorage.clear();
  });

  it("resolves language from cookie before localStorage and browser settings", () => {
    document.cookie = "i18n-language=ko; path=/";
    localStorage.setItem("i18n-language", "ar");
    setNavigatorLanguages(["en-US"]);

    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });

    expect(manager.getCurrentLanguage()).toBe("ko");
  });

  it("falls back from invalid stored values to browser language", () => {
    document.cookie = "i18n-language=fr; path=/";
    localStorage.setItem("i18n-language", "de");
    setNavigatorLanguages(["ko-KR", "en-US"]);

    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });

    expect(manager.getCurrentLanguage()).toBe("ko");
  });

  it("continues detection when localStorage throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    setNavigatorLanguages(["ko-KR"]);

    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });

    expect(manager.getCurrentLanguage()).toBe("ko");
  });

  it("sets cookie, localStorage, html lang/dir, and notifies listeners", () => {
    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });
    const listener = jest.fn();
    manager.addLanguageChangeListener(listener);

    expect(manager.setLanguage("ar")).toBe(true);

    expect(document.cookie).toContain("i18n-language=ar");
    expect(localStorage.getItem("i18n-language")).toBe("ar");
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(listener).toHaveBeenCalledWith("ar");
  });

  it("rejects invalid languages without notifying listeners", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();
    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });
    const listener = jest.fn();
    manager.addLanguageChangeListener(listener);

    expect(manager.setLanguage("fr")).toBe(false);

    expect(listener).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Language "fr" is not available')
    );
  });

  it("supports listener unsubscribe and isolates listener errors", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation();
    const manager = new LanguageManager({
      availableLanguages: languages,
      defaultLanguage: "en",
    });
    const removedListener = jest.fn();
    const unsubscribe = manager.addLanguageChangeListener(removedListener);
    const throwingListener = jest.fn(() => {
      throw new Error("listener failed");
    });
    const stableListener = jest.fn();

    unsubscribe();
    manager.addLanguageChangeListener(throwingListener);
    manager.addLanguageChangeListener(stableListener);

    expect(manager.setLanguage("ko")).toBe(true);

    expect(removedListener).not.toHaveBeenCalled();
    expect(throwingListener).toHaveBeenCalledWith("ko");
    expect(stableListener).toHaveBeenCalledWith("ko");
    expect(errorSpy).toHaveBeenCalledWith(
      "Error in language change listener:",
      expect.any(Error)
    );
  });
});
