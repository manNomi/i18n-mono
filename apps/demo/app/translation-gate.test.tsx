/** @jest-environment jsdom */

import { I18nProvider, useTranslation } from "i18nexus";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { TranslationGate } from "@/shared/ui/TranslationGate";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function TranslatedChild() {
  const { t } = useTranslation("lazy-page");

  return <h1>{t("안녕하세요")}</h1>;
}

describe("TranslationGate", () => {
  let container: HTMLDivElement;
  let root: Root;
  let resolvers: Map<string, (value: Record<string, string>) => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    resolvers = new Map();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("keeps translated children hidden until the lazy namespace is ready", async () => {
    const loadNamespace = jest.fn(
      (_namespace: string, language: string) =>
        new Promise<Record<string, string>>((resolve) => {
          resolvers.set(language, resolve);
        })
    );

    await act(async () => {
      root.render(
        <I18nProvider
          initialLanguage="en"
          loadNamespace={loadNamespace}
          languageManagerOptions={{
            defaultLanguage: "ko",
            availableLanguages: [
              { code: "ko", name: "한국어" },
              { code: "en", name: "English" },
            ],
          }}
        >
          <TranslationGate namespace="lazy-page">
            <TranslatedChild />
          </TranslationGate>
        </I18nProvider>
      );
      await flushPromises();
    });

    expect(container.textContent).not.toContain("안녕하세요");
    expect(container.textContent).not.toContain("Hello");
    expect(loadNamespace).toHaveBeenCalledWith("lazy-page", "ko");
    expect(loadNamespace).toHaveBeenCalledWith("lazy-page", "en");

    await act(async () => {
      resolvers.get("ko")?.({ 안녕하세요: "안녕하세요" });
      resolvers.get("en")?.({ 안녕하세요: "Hello" });
      await flushPromises();
    });

    expect(container.textContent).toContain("Hello");
    expect(container.textContent).not.toContain("안녕하세요");
  });
});
