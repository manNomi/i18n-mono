import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import {
  I18nProvider,
  type NamespaceTranslations,
} from "../components/I18nProvider";
import { useTranslation } from "../hooks/useTranslation";
import { createI18n } from "../utils/createI18n";

const languages = [
  { code: "en", name: "English" },
  { code: "ko", name: "Korean" },
];
afterEach(cleanup);

describe.each([false, true])(
  "translation contracts (factory=%s)",
  (factory) => {
    it("keeps duplicate keys and unrelated keys inside their namespace", () => {
      const translations = {
        home: { en: { title: "Home" } },
        admin: { en: { title: "Admin", private: "Admin only" } },
        common: { en: { save: "Save" } },
      };
      const api = createI18n(translations, { fallbackNamespace: "common" });
      const Provider = factory ? api.I18nProvider : I18nProvider;
      const useT = factory
        ? () => api.useTranslation("home")
        : () => useTranslation("home");
      function Consumer() {
        const { t } = useT();
        return (
          <div>
            {t("title")}/{(t as (key: string) => string)("private")}/{t("save")}
          </div>
        );
      }
      render(
        <Provider
          translations={translations}
          initialLanguage="en"
          fallbackNamespace="common"
        >
          <Consumer />
        </Provider>
      );
      expect(screen.getByText("Home/private/Save")).toBeTruthy();
    });

    it("reports failures without looping and recovers through explicit retry", async () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const api = createI18n({} as NamespaceTranslations);
      const Provider = factory ? api.I18nProvider : I18nProvider;
      const useT = factory
        ? () => api.useTranslation("home")
        : () => useTranslation("home");
      let fail = true;
      const load = jest.fn(async () => {
        if (fail) throw new Error("offline");
        return { title: "Recovered" };
      });
      function Consumer() {
        const { t, isReady, error, retry } = useT();
        return (
          <>
            <span>{t("title")}</span>
            <span data-testid="state">{isReady ? "ready" : "pending"}</span>
            <span>{error ? "failed" : "ok"}</span>
            <button onClick={() => void retry()}>Retry</button>
          </>
        );
      }
      const tree = (
        <Provider
          initialLanguage="en"
          loadNamespace={load}
          languageManagerOptions={{ availableLanguages: languages }}
        >
          <Consumer />
        </Provider>
      );
      try {
        const view = render(tree);
        await screen.findByText("failed");
        expect(screen.getByTestId("state").textContent).toBe("pending");
        expect(load).toHaveBeenCalledTimes(2);
        view.rerender(tree);
        await act(async () => {});
        expect(load).toHaveBeenCalledTimes(2);
        fail = false;
        fireEvent.click(screen.getByText("Retry"));
        await screen.findByText("Recovered");
        await waitFor(() =>
          expect(screen.getByTestId("state").textContent).toBe("ready")
        );
        expect(screen.getByText("ok")).toBeTruthy();
        expect(load).toHaveBeenCalledTimes(4);
      } finally {
        warn.mockRestore();
      }
    });
  }
);
