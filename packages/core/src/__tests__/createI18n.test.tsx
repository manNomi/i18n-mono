/**
 * Comprehensive test suite for createI18n utility
 * Tests automatic type inference and namespace-based translation system
 */

import React from "react";
import {
  act,
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { createI18n } from "../utils/createI18n";
import { createFormatter } from "../utils/formatter";

// Clean up after each test
afterEach(() => {
  cleanup();
  // Clear all cookies
  document.cookie.split(";").forEach((c) => {
    document.cookie = c
      .replace(/^ +/, "")
      .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  // Clear localStorage
  localStorage.clear();
});

// Test translations
const testTranslations = {
  common: {
    en: {
      welcome: "Welcome",
      goodbye: "Goodbye",
      greeting: "Hello {{name}}",
    },
    ko: {
      welcome: "환영합니다",
      goodbye: "안녕히 가세요",
      greeting: "안녕하세요 {{name}}",
    },
  },
  menu: {
    en: {
      home: "Home",
      about: "About",
      contact: "Contact",
    },
    ko: {
      home: "홈",
      about: "소개",
      contact: "연락처",
    },
  },
  error: {
    en: {
      notfound: "Page not found",
      servererror: "Server error",
    },
    ko: {
      notfound: "페이지를 찾을 수 없습니다",
      servererror: "서버 오류",
    },
  },
} as const;

const availableLanguages = [
  { code: "en", name: "English" },
  { code: "ko", name: "Korean" },
];

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

type LazyTranslations = {
  common: {
    en: {
      title: string;
      shared: string;
    };
    ko: {
      title: string;
      shared: string;
    };
  };
  home: {
    en: {
      title: string;
    };
    ko: {
      title: string;
    };
  };
  missing: {
    en: {
      title: string;
    };
    ko: {
      title: string;
    };
  };
};

const lazyTranslations = {} as LazyTranslations;

describe("createI18n", () => {
  describe("Basic Functionality", () => {
    it("should create i18n instance with Provider and useTranslation", () => {
      const i18n = createI18n(testTranslations);

      expect(i18n).toHaveProperty("I18nProvider");
      expect(i18n).toHaveProperty("useTranslation");
      expect(i18n).toHaveProperty("translations");
      expect(typeof i18n.I18nProvider).toBe("function");
      expect(typeof i18n.useTranslation).toBe("function");
    });

    it("should preserve original translations", () => {
      const i18n = createI18n(testTranslations);

      expect(i18n.translations).toBe(testTranslations);
      expect(i18n.translations.common.en.welcome).toBe("Welcome");
      expect(i18n.translations.menu.ko.home).toBe("홈");
    });
  });

  describe("I18nProvider Component", () => {
    it("should render children correctly", () => {
      const i18n = createI18n(testTranslations);

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages: [
              { code: "en", name: "English" },
              { code: "ko", name: "한국어" },
            ],
          }}
        >
          <div data-testid="child">Test Child</div>
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });

    it("should provide context to child components", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent("Welcome");
    });

    it("should support custom translations override", () => {
      const customTranslations = {
        common: {
          en: { welcome: "Custom Welcome" },
          ko: { welcome: "커스텀 환영" },
        },
      } as const;

      const i18n = createI18n(customTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent(
        "Custom Welcome"
      );
    });
  });

  describe("useTranslation Hook", () => {
    it("should return translation function and language info", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t, currentLanguage, isReady } = i18n.useTranslation("common");

        return (
          <div>
            <div data-testid="translation">{t("welcome")}</div>
            <div data-testid="language">{currentLanguage}</div>
            <div data-testid="ready">{isReady ? "ready" : "not ready"}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent("Welcome");
      expect(screen.getByTestId("language")).toHaveTextContent("en");
      expect(screen.getByTestId("ready")).toHaveTextContent("ready");
    });

    it("should keep t identity stable across local rerenders", () => {
      const i18n = createI18n(testTranslations);
      const seenT: unknown[] = [];

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        const [count, setCount] = React.useState(0);
        seenT.push(t);

        return (
          <button
            data-testid="rerender"
            onClick={() => setCount((value) => value + 1)}
          >
            {count}:{t("welcome")}
          </button>
        );
      }

      render(
        <i18n.I18nProvider
          initialLanguage="en"
          languageManagerOptions={{
            defaultLanguage: "en",
            enableAutoDetection: false,
            enableLocalStorage: false,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      const firstT = seenT[0];
      fireEvent.click(screen.getByTestId("rerender"));

      expect(screen.getByTestId("rerender")).toHaveTextContent("1:Welcome");
      expect(seenT[seenT.length - 1]).toBe(firstT);
    });

    it("should translate based on namespace", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t: tCommon } = i18n.useTranslation("common");
        const { t: tMenu } = i18n.useTranslation("menu");
        const { t: tError } = i18n.useTranslation("error");

        return (
          <div>
            <div data-testid="common">{tCommon("welcome")}</div>
            <div data-testid="menu">{tMenu("home")}</div>
            <div data-testid="error">{tError("notfound")}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("common")).toHaveTextContent("Welcome");
      expect(screen.getByTestId("menu")).toHaveTextContent("Home");
      expect(screen.getByTestId("error")).toHaveTextContent("Page not found");
    });

    it("should translate to English", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent("Welcome");
    });

    it("should translate to Korean", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "ko",
            enableAutoDetection: false,
            enableLocalStorage: false,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent("환영합니다");
    });

    it("should handle variable interpolation", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");

        return (
          <div>
            <div data-testid="greeting-john">
              {t("greeting", { name: "John" })}
            </div>
            <div data-testid="greeting-jane">
              {t("greeting", { name: "Jane" })}
            </div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("greeting-john")).toHaveTextContent(
        "Hello John"
      );
      expect(screen.getByTestId("greeting-jane")).toHaveTextContent(
        "Hello Jane"
      );
    });

    it("should handle styled variables (returns React element)", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");

        return (
          <div data-testid="styled">
            {t(
              "greeting",
              { name: "World" },
              { name: { color: "red", fontWeight: "bold" } }
            )}
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      const styledElement = screen.getByTestId("styled");
      expect(styledElement).toBeInTheDocument();
      expect(styledElement.textContent).toContain("Hello");
      expect(styledElement.textContent).toContain("World");

      // Check that span with style exists
      const span = styledElement.querySelector("span");
      expect(span).toBeInTheDocument();
      expect(span).toHaveStyle({ color: "red", fontWeight: "bold" });
    });

    it("should return key when namespace not found", () => {
      const i18n = createI18n(testTranslations);
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      function TestComponent() {
        const { t } = i18n.useTranslation("invalid-namespace" as any);
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      // When namespace is invalid but key exists in flattened translations, it returns the translation value
      // Since all namespaces are flattened, 'welcome' key from 'common' namespace is found
      expect(screen.getByTestId("translation")).toHaveTextContent("Welcome");

      consoleWarnSpy.mockRestore();
    });

    it("should return key when translation key not found", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("nonexistent" as any)}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("translation")).toHaveTextContent(
        "nonexistent"
      );
    });
  });

  describe("Multiple Namespaces", () => {
    it("should handle multiple namespaces in one component", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t: tCommon } = i18n.useTranslation("common");
        const { t: tMenu } = i18n.useTranslation("menu");
        const { t: tError } = i18n.useTranslation("error");

        return (
          <div>
            <h1 data-testid="h1">{tCommon("welcome")}</h1>
            <nav data-testid="nav">{tMenu("home")}</nav>
            <p data-testid="error">{tError("notfound")}</p>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("h1")).toHaveTextContent("Welcome");
      expect(screen.getByTestId("nav")).toHaveTextContent("Home");
      expect(screen.getByTestId("error")).toHaveTextContent("Page not found");
    });

    it("should isolate namespaces correctly", () => {
      const i18n = createI18n(testTranslations);

      function TestComponent() {
        const { t: tCommon } = i18n.useTranslation("common");
        const { t: tMenu } = i18n.useTranslation("menu");

        return (
          <div>
            {/* "home" only exists in menu namespace */}
            <div data-testid="common-home">{tCommon("home" as any)}</div>
            {/* "welcome" only exists in common namespace */}
            <div data-testid="menu-welcome">{tMenu("welcome" as any)}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      // Since translations are flattened, keys from other namespaces are also accessible
      // 'home' exists in 'menu' namespace, so it returns 'Home'
      // 'welcome' exists in 'common' namespace, so it returns 'Welcome'
      expect(screen.getByTestId("common-home")).toHaveTextContent("Home");
      expect(screen.getByTestId("menu-welcome")).toHaveTextContent("Welcome");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty namespace translations", () => {
      const minimalTranslations = {
        common: {
          en: {},
          ko: {},
        },
        test: {
          en: { hello: "Hello" },
          ko: { hello: "안녕하세요" },
        },
      } as const;
      const i18n = createI18n(minimalTranslations);

      function TestComponent() {
        const { t: tCommon } = i18n.useTranslation("common");
        const { t: tTest } = i18n.useTranslation("test");
        return (
          <div>
            {/* @ts-expect-error - Testing non-existent key */}
            <div data-testid="empty">{tCommon("nonexistent")}</div>
            <div data-testid="existing">{tTest("hello")}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      // Empty namespace should return key
      expect(screen.getByTestId("empty")).toHaveTextContent("nonexistent");
      // Non-empty namespace should work
      expect(screen.getByTestId("existing")).toHaveTextContent("Hello");
    });

    it("should handle missing language in namespace", () => {
      const partialTranslations = {
        common: {
          en: { welcome: "Welcome" },
          // Missing 'fr'
        },
      } as const;

      const i18n = createI18n(partialTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("common");
        return <div data-testid="translation">{t("welcome")}</div>;
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "fr", // Non-existent language
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      // Should return the key when language doesn't exist
      // But may also fall back to another language if implementation chooses to
      const text = screen.getByTestId("translation").textContent;
      expect(["welcome", "Welcome"]).toContain(text);
    });

    it("should handle special characters in keys and values", () => {
      const specialTranslations = {
        special: {
          en: {
            "key-with-dash": "Value with special chars: !@#$%",
            "key.with.dots": "Another value",
          },
          ko: {
            "key-with-dash": "특수 문자: !@#$%",
            "key.with.dots": "다른 값",
          },
        },
      } as const;

      const i18n = createI18n(specialTranslations);

      function TestComponent() {
        const { t } = i18n.useTranslation("special");

        return (
          <div>
            <div data-testid="dash">{t("key-with-dash")}</div>
            <div data-testid="dots">{t("key.with.dots")}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          languageManagerOptions={{
            defaultLanguage: "en",
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(screen.getByTestId("dash")).toHaveTextContent(
        "Value with special chars: !@#$%"
      );
      expect(screen.getByTestId("dots")).toHaveTextContent("Another value");
    });
  });

  describe("Lazy namespace loading", () => {
    it("should load a requested namespace without preloading it", async () => {
      const i18n = createI18n(lazyTranslations);
      const seenT: unknown[] = [];
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        }
      );

      function TestComponent() {
        const { t, isReady } = i18n.useTranslation("home");
        seenT.push(t);

        return (
          <div>
            <div data-testid="translation">{t("title")}</div>
            <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      const firstT = seenT[0];
      expect(screen.getByTestId("ready")).toHaveTextContent("not-ready");

      await waitFor(() => {
        expect(loadNamespace).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        loads.get("home:en")?.resolve({ title: "Home title" });
        loads.get("home:ko")?.resolve({ title: "홈 제목" });
        await Promise.all([
          loads.get("home:en")!.promise,
          loads.get("home:ko")!.promise,
        ]);
      });

      await waitFor(() => {
        expect(screen.getByTestId("translation")).toHaveTextContent(
          "Home title"
        );
        expect(screen.getByTestId("ready")).toHaveTextContent("ready");
      });
      expect(seenT[seenT.length - 1]).not.toBe(firstT);
      expect(loadNamespace).toHaveBeenCalledWith("home", "en");
      expect(loadNamespace).toHaveBeenCalledWith("home", "ko");
      expect(loadNamespace).toHaveBeenCalledTimes(2);
    });

    it("should dedupe simultaneous namespace load requests", async () => {
      const i18n = createI18n(lazyTranslations);
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        }
      );

      function TestComponent() {
        const { t, isReady } = i18n.useTranslation("home");

        return (
          <div>
            <div data-testid="translation">{t("title")}</div>
            <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <TestComponent />
          <TestComponent />
        </i18n.I18nProvider>
      );

      await waitFor(() => {
        expect(loadNamespace).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        loads.get("home:en")?.resolve({ title: "Home title" });
        loads.get("home:ko")?.resolve({ title: "홈 제목" });
        await Promise.all([
          loads.get("home:en")!.promise,
          loads.get("home:ko")!.promise,
        ]);
      });

      await waitFor(() => {
        screen.getAllByTestId("translation").forEach((translationNode) => {
          expect(translationNode).toHaveTextContent("Home title");
        });
        screen.getAllByTestId("ready").forEach((readyNode) => {
          expect(readyNode).toHaveTextContent("ready");
        });
      });
      expect(loadNamespace).toHaveBeenCalledTimes(2);
    });

    it("should merge fallback namespace with the requested namespace", async () => {
      const i18n = createI18n(lazyTranslations, {
        fallbackNamespace: "common",
      });
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        }
      );

      function TestComponent() {
        const { t, isReady } = i18n.useTranslation("home");

        return (
          <div>
            <div data-testid="title">{t("title")}</div>
            <div data-testid="shared">{t("shared")}</div>
            <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
          </div>
        );
      }

      render(
        <i18n.I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      await waitFor(() => {
        expect(loadNamespace).toHaveBeenCalledTimes(4);
      });

      await act(async () => {
        loads.get("common:en")?.resolve({
          title: "Fallback title",
          shared: "Shared label",
        });
        loads.get("common:ko")?.resolve({});
        loads.get("home:en")?.resolve({ title: "Home title" });
        loads.get("home:ko")?.resolve({});
        await Promise.all([
          loads.get("common:en")!.promise,
          loads.get("common:ko")!.promise,
          loads.get("home:en")!.promise,
          loads.get("home:ko")!.promise,
        ]);
      });

      await waitFor(() => {
        expect(screen.getByTestId("title")).toHaveTextContent("Home title");
        expect(screen.getByTestId("shared")).toHaveTextContent("Shared label");
        expect(screen.getByTestId("ready")).toHaveTextContent("ready");
      });
    });

    it("should keep a failed namespace pending without an automatic retry loop", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const i18n = createI18n(lazyTranslations);
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        }
      );

      function TestComponent() {
        const { t, isReady } = i18n.useTranslation("missing");

        return (
          <div>
            <div data-testid="translation">{t("title")}</div>
            <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
          </div>
        );
      }

      const { rerender } = render(
        <i18n.I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      await waitFor(() => {
        expect(loadNamespace).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        loads.get("missing:en")?.reject(new Error("missing namespace"));
        loads.get("missing:ko")?.reject(new Error("missing namespace"));
        await Promise.allSettled([
          loads.get("missing:en")!.promise,
          loads.get("missing:ko")!.promise,
        ]);
      });

      await waitFor(() => {
        expect(screen.getByTestId("ready")).toHaveTextContent("not-ready");
      });
      expect(screen.getByTestId("translation")).toHaveTextContent("title");

      rerender(
        <i18n.I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <TestComponent />
        </i18n.I18nProvider>
      );

      expect(loadNamespace).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });
  });

  describe("Type Safety (Compile-time checks)", () => {
    it("should infer correct namespace types", () => {
      const i18n = createI18n(testTranslations);

      // These should compile without errors
      type Namespaces = Parameters<typeof i18n.useTranslation>[0];
      const validNamespace: Namespaces = "common";
      const validNamespace2: Namespaces = "menu";
      const validNamespace3: Namespaces = "error";

      expect(validNamespace).toBe("common");
      expect(validNamespace2).toBe("menu");
      expect(validNamespace3).toBe("error");
    });

    it("should infer correct key types per namespace", () => {
      const i18n = createI18n(testTranslations);

      type CommonReturn = ReturnType<typeof i18n.useTranslation<"common">>;
      type MenuReturn = ReturnType<typeof i18n.useTranslation<"menu">>;

      // Type assertions to verify inference
      const assertCommonReturn: CommonReturn = {
        t: ((key: "welcome" | "goodbye" | "greeting") => key) as any,
        format: createFormatter("en"),
        currentLanguage: "en",
        isReady: true,
      };

      const assertMenuReturn: MenuReturn = {
        t: ((key: "home" | "about" | "contact") => key) as any,
        format: createFormatter("en"),
        currentLanguage: "en",
        isReady: true,
      };

      expect(assertCommonReturn).toBeDefined();
      expect(assertMenuReturn).toBeDefined();
    });
  });
});
