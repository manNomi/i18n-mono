import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ServerComponentsPage from "@/page/docs-i18nexus-server-components";
import UseLanguageSwitcherPage from "@/page/docs-i18nexus-use-language-switcher";
import UseTranslationPage from "@/page/docs-i18nexus-use-translation";

jest.mock("i18nexus", () => ({
  useLanguageSwitcher: () => ({
    availableLanguages: [
      { code: "ko", name: "Korean" },
      { code: "en", name: "English" },
    ],
    changeLanguage: jest.fn(),
    currentLanguage: "ko",
  }),
  useTranslation: () => ({
    currentLanguage: "ko",
    isReady: true,
    t: (key: string) => key,
  }),
}));

const pages = [
  {
    name: "useTranslation",
    Page: UseTranslationPage,
    heading: "useTranslation",
  },
  {
    name: "useLanguageSwitcher",
    Page: UseLanguageSwitcherPage,
    heading: "useLanguageSwitcher",
  },
  {
    name: "Server Components",
    Page: ServerComponentsPage,
    heading: "Server Components",
  },
];

describe("i18nexus documentation pages", () => {
  it.each(pages)(
    "renders $name without a runtime error",
    ({ Page, heading }) => {
      const html = renderToStaticMarkup(<Page />);

      expect(html).toContain(heading);
    }
  );
});
