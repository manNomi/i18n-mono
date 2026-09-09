import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../components/I18nProvider";
import { I18NexusDevtools } from "../components/I18NexusDevtools";

const translations = {
  common: {
    en: { title: "Title", save: "Save" },
    ko: { title: "제목", save: "저장" },
  },
};

describe("I18NexusDevtools", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("opens, reports Provider state, and closes with Escape in development", () => {
    process.env.NODE_ENV = "development";
    render(
      <I18nProvider
        initialLanguage="en"
        translations={translations}
        languageManagerOptions={{
          defaultLanguage: "en",
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
          ],
        }}
      >
        <I18NexusDevtools />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /i18nexus/i }));
    expect(screen.getByText("i18nexus Devtools")).toBeInTheDocument();
    expect(screen.getByText("Keys Loaded:").nextElementSibling).toHaveTextContent(
      "2",
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("i18nexus Devtools")).not.toBeInTheDocument();
  });

  it("renders nothing in production when used inside a Provider", () => {
    process.env.NODE_ENV = "production";
    const { container } = render(
      <I18nProvider initialLanguage="en" translations={translations}>
        <I18NexusDevtools initialIsOpen />
      </I18nProvider>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("inherits the Provider requirement", () => {
    process.env.NODE_ENV = "development";
    const errorSpy = jest.spyOn(console, "error").mockImplementation();

    expect(() => render(<I18NexusDevtools />)).toThrow(
      "useI18nContext must be used within an I18nProvider",
    );
    errorSpy.mockRestore();
  });
});
