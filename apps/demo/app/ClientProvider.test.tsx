/** @jest-environment jsdom */
import { useLanguageSwitcher, useTranslation } from "i18nexus";
import React, { act } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server.node";

import homeEn from "@/locales/home/en.json";
import homeKo from "@/locales/home/ko.json";
import { resolveDemoLanguage } from "@/shared/lib/demo-language";

import { ClientProvider } from "./ClientProvider";

jest.mock("next/dynamic", () => () => () => null);
jest.mock("@/shared/ui", () => ({
  GlobalErrorProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  Analytics: () => null,
  FirebaseStatus: () => null,
  ScrollRestorer: () => null,
}));
jest.mock("@/widgets/Navigation", () => () => null);
jest.mock("@/locales", () => ({
  loadNamespace: jest.fn(() => new Promise(() => {})),
}));

const key = Object.keys(homeEn).find(
  (candidate) =>
    (homeEn as Record<string, string>)[candidate] !==
    (homeKo as Record<string, string>)[candidate]
)!;
function Consumer() {
  const { t } = useTranslation("home");
  const { changeLanguage } = useLanguageSwitcher();
  return (
    <>
      <h1>{t(key)}</h1>
      <button onClick={() => void changeLanguage("ko")}>Korean</button>
    </>
  );
}

test.each([
  [undefined, "en"],
  ["invalid", "en"],
  ["en", "en"],
  ["ko", "ko"],
])("SSR and hydration retain cookie %s as %s", async (cookie, expected) => {
  const language = resolveDemoLanguage(cookie);
  const tree = (
    <ClientProvider language={language}>
      <Consumer />
    </ClientProvider>
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  const expectedText = (expected === "en" ? homeEn : homeKo) as Record<
    string,
    string
  >;
  expect(container.querySelector("h1")?.textContent).toBe(expectedText[key]);
  // A stale browser preference must not replace the server-selected language.
  localStorage.setItem("i18n-language", expected === "en" ? "ko" : "en");
  const onRecoverableError = jest.fn();
  let root: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(container, tree, { onRecoverableError });
  });
  expect(container.querySelector("h1")?.textContent).toBe(expectedText[key]);
  expect(onRecoverableError).not.toHaveBeenCalled();
  await act(async () => root!.unmount());
  localStorage.clear();
});

test("switches to Korean without waiting for lazy translation loading", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <ClientProvider language="en">
        <Consumer />
      </ClientProvider>
    )
  );
  await act(async () => container.querySelector("button")!.click());
  expect(container.querySelector("h1")?.textContent).toBe(
    (homeKo as Record<string, string>)[key]
  );
  expect(document.cookie).toContain("i18n-language=ko");
  await act(async () => root.unmount());
});
