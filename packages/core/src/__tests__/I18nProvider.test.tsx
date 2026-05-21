/**
 * Tests for I18nProvider core functionality
 *
 * Note: These tests verify the base Provider behavior.
 * For type-safe i18n usage, use createI18n (see createI18n.test.tsx)
 */

import React from "react";
import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { I18nProvider, useI18nContext } from "../components/I18nProvider";
import { useTranslation } from "../hooks/useTranslation";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: "en",
    },
  }),
}));

// Mock cookie utilities
jest.mock("../utils/cookie", () => ({
  getCookie: jest.fn(),
  setCookie: jest.fn(),
}));

// Test component to access context
const TestComponent: React.FC = () => {
  const { currentLanguage, changeLanguage, availableLanguages } =
    useI18nContext();

  return (
    <div>
      <div data-testid="current-language">{currentLanguage}</div>
      <div data-testid="available-languages">
        {availableLanguages.map((lang) => lang.code).join(",")}
      </div>
      <button
        data-testid="change-language"
        onClick={() => changeLanguage("ko")}
      >
        Change to Korean
      </button>
    </div>
  );
};

const availableLanguages = [
  { code: "en", name: "English" },
  { code: "ko", name: "Korean" },
];

const LazyTranslationComponent: React.FC<{
  namespace: string;
  translationKey: string;
}> = ({ namespace, translationKey }) => {
  const { t, isReady } = useTranslation(namespace);

  return (
    <div>
      <div data-testid="translation">{t(translationKey)}</div>
      <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
    </div>
  );
};

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

const staticTranslations = {
  common: {
    en: { title: "Title" },
    ko: { title: "제목" },
  },
} as const;

describe("I18nProvider", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  it("should provide default language when no cookie exists", () => {
    render(
      <I18nProvider
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
          ],
        }}
      >
        <TestComponent />
      </I18nProvider>,
    );

    expect(screen.getByTestId("current-language")).toHaveTextContent("en");
  });

  it("should provide available languages", () => {
    render(
      <I18nProvider
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
          ],
        }}
      >
        <TestComponent />
      </I18nProvider>,
    );

    expect(screen.getByTestId("available-languages")).toHaveTextContent(
      "en,ko",
    );
  });

  it("should change language when changeLanguage is called", async () => {
    render(
      <I18nProvider
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
          ],
        }}
      >
        <TestComponent />
      </I18nProvider>,
    );

    const changeButton = screen.getByTestId("change-language");
    fireEvent.click(changeButton);

    await waitFor(() => {
      expect(screen.getByTestId("current-language")).toHaveTextContent("ko");
    });
  });

  it("should throw error when useI18nContext is used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // Render should cause an error to be logged
    expect(() => {
      render(<TestComponent />);
    }).toThrow();

    consoleSpy.mockRestore();
  });

  it("should initialize language manager with options", () => {
    const onLanguageChange = jest.fn();

    render(
      <I18nProvider
        languageManagerOptions={{
          defaultLanguage: "ko",
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
          ],
        }}
        onLanguageChange={onLanguageChange}
      >
        <TestComponent />
      </I18nProvider>,
    );

    expect(screen.getByTestId("current-language")).toHaveTextContent("ko");
  });

  it("should keep t identity stable across local rerenders", () => {
    const seenT: unknown[] = [];

    const StabilityComponent = () => {
      const { t } = useTranslation("common");
      const [count, setCount] = React.useState(0);
      seenT.push(t);

      return (
        <button
          data-testid="rerender"
          onClick={() => setCount((value) => value + 1)}
        >
          {count}:{t("title")}
        </button>
      );
    };

    render(
      <I18nProvider
        initialLanguage="en"
        translations={staticTranslations}
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages,
          enableAutoDetection: false,
          enableLocalStorage: false,
        }}
      >
        <StabilityComponent />
      </I18nProvider>,
    );

    const firstT = seenT[0];
    fireEvent.click(screen.getByTestId("rerender"));

    expect(screen.getByTestId("rerender")).toHaveTextContent("1:Title");
    expect(seenT[seenT.length - 1]).toBe(firstT);
  });

  it("should update t identity after language changes", async () => {
    const seenT: unknown[] = [];

    const LanguageComponent = () => {
      const { t } = useTranslation("common");
      const { changeLanguage } = useI18nContext();
      seenT.push(t);

      return (
        <button
          data-testid="change-language-with-translation"
          onClick={() => void changeLanguage("ko")}
        >
          {t("title")}
        </button>
      );
    };

    render(
      <I18nProvider
        initialLanguage="en"
        translations={staticTranslations}
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages,
          enableAutoDetection: false,
          enableLocalStorage: false,
        }}
      >
        <LanguageComponent />
      </I18nProvider>,
    );

    const firstT = seenT[0];
    fireEvent.click(screen.getByTestId("change-language-with-translation"));

    await waitFor(() => {
      expect(
        screen.getByTestId("change-language-with-translation"),
      ).toHaveTextContent("제목");
    });
    expect(seenT[seenT.length - 1]).not.toBe(firstT);
  });

  describe("lazy namespace loading", () => {
    it("should load a requested namespace without preloading it", async () => {
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string,
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        },
      );

      render(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <LazyTranslationComponent namespace="home" translationKey="title" />
        </I18nProvider>,
      );

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
          "Home title",
        );
        expect(screen.getByTestId("ready")).toHaveTextContent("ready");
      });
      expect(loadNamespace).toHaveBeenCalledTimes(2);
      expect(loadNamespace).toHaveBeenCalledWith("home", "en");
      expect(loadNamespace).toHaveBeenCalledWith("home", "ko");
    });

    it("should dedupe simultaneous namespace load requests", async () => {
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string,
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        },
      );

      render(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <LazyTranslationComponent namespace="home" translationKey="title" />
          <LazyTranslationComponent namespace="home" translationKey="title" />
        </I18nProvider>,
      );

      await waitFor(() => {
        expect(loadNamespace).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        loads.get("home:en")?.resolve({ title: "Home title" });
        loads.get("home:ko")?.resolve({ title: "Home title" });
        await Promise.all([
          loads.get("home:en")!.promise,
          loads.get("home:ko")!.promise,
        ]);
      });

      await waitFor(() => {
        expect(screen.getAllByTestId("translation")[0]).toHaveTextContent(
          "Home title",
        );
        screen.getAllByTestId("ready").forEach((readyNode) => {
          expect(readyNode).toHaveTextContent("ready");
        });
      });
      expect(loadNamespace).toHaveBeenCalledTimes(2);
    });

    it("should merge fallback namespace with requested namespace", async () => {
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string,
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        },
      );

      const HomeComponent = () => {
        const { t, isReady } = useTranslation("home");

        return (
          <div>
            <div data-testid="title">{t("title")}</div>
            <div data-testid="shared">{t("shared")}</div>
            <div data-testid="ready">{isReady ? "ready" : "not-ready"}</div>
          </div>
        );
      };

      render(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          fallbackNamespace="common"
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <HomeComponent />
        </I18nProvider>,
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

    it("should avoid retry loops after a namespace load failure", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const loads = new Map<string, Deferred<Record<string, string>>>();
      const loadNamespace = jest.fn(
        (
          namespace: string,
          language: string,
        ): Promise<Record<string, string>> => {
          const load = createDeferred<Record<string, string>>();
          loads.set(`${namespace}:${language}`, load);
          return load.promise;
        },
      );

      const { rerender } = render(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <LazyTranslationComponent
            namespace="missing"
            translationKey="title"
          />
        </I18nProvider>,
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
        expect(screen.getByTestId("ready")).toHaveTextContent("ready");
      });
      expect(screen.getByTestId("translation")).toHaveTextContent("title");

      rerender(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "en",
            availableLanguages,
          }}
        >
          <LazyTranslationComponent
            namespace="missing"
            translationKey="title"
          />
        </I18nProvider>,
      );

      expect(loadNamespace).toHaveBeenCalledTimes(2);
      warnSpy.mockRestore();
    });
  });
});
