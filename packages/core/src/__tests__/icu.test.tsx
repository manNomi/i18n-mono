import React from "react";
import { render, screen } from "@testing-library/react";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { I18nProvider } from "../components/I18nProvider";
import { useTranslation } from "../hooks/useTranslation";
import { createI18n } from "../utils/createI18n";
import {
  I18nMessageFormatError,
  IcuI18nProvider,
  createIcuI18n,
  createIcuMessageFormatter,
  createIcuServerTranslation,
  useIcuTranslation,
} from "../utils/icu";
import { getTranslation } from "../utils/server";

const catalog = {
  common: {
    en: {
      plain: "Save",
      legacy: "Hello {{name}}",
      cardinal: "{count, plural, =0 {No items} one {# item} other {# items}}",
      ordinal:
        "You finished {place, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}.",
      nested:
        "{gender, select, female {{count, plural, one {She has # task} other {She has # tasks}}} other {{count, plural, one {They have # task} other {They have # tasks}}}}",
      rich: "<strong>Important</strong>: read <link>{title}</link>.",
      malformed: "{count, plural, one {One item} other {Many items}",
      mixed: "Hello {{name}}, {count, plural, one {# item} other {# items}}",
    },
    ru: {
      cardinal:
        "{count, plural, one {# сообщение} few {# сообщения} many {# сообщений} other {# сообщения}}",
    },
  },
} as const;

describe("ICU message formatter", () => {
  it("uses the actual intl-messageformat ESM runtime for plural, ordinal, select, and escaping", () => {
    const formatter = createIcuMessageFormatter();

    expect(
      formatter.format({
        locale: "en",
        message: catalog.common.en.cardinal,
        values: { count: 0 },
      })
    ).toBe("No items");
    expect(
      formatter.format({
        locale: "ru",
        message: catalog.common.ru.cardinal,
        values: { count: 5 },
      })
    ).toBe("5 сообщений");
    expect(
      formatter.format({
        locale: "en",
        message: catalog.common.en.ordinal,
        values: { place: 23 },
      })
    ).toBe("You finished 23rd.");
    expect(
      formatter.format({
        locale: "en",
        message: catalog.common.en.nested,
        values: { gender: "female", count: 2 },
      })
    ).toBe("She has 2 tasks");
    expect(
      formatter.format({
        locale: "en",
        message: "This '{is}' {count, plural, one {# item} other {# items}}",
        values: { count: 2 },
      })
    ).toBe("This {is} 2 items");
  });

  it("keeps legacy interpolation, emits stable ICU errors, and observes cache hit plus eviction", () => {
    const cacheEvents: Array<{
      type: "hit" | "evict";
      cacheKey: string;
      evictedKey?: string;
    }> = [];
    const formatter = createIcuMessageFormatter({
      onCacheEvent: (event) => cacheEvents.push(event),
    });
    const t = createIcuServerTranslation("en", catalog, {
      messageFormatter: formatter,
    });

    expect(t("plain")).toBe("Save");
    expect(t("legacy", { name: "Ada" })).toBe("Hello Ada");
    expect(t("legacy")).toBe("Hello {{name}}");
    expect(() => t("malformed")).toThrow(I18nMessageFormatError);
    expect(() => t("mixed", { name: "Ada", count: 2 })).toThrow(
      I18nMessageFormatError
    );
    expect(() => t("cardinal")).toThrow(I18nMessageFormatError);
    expect(() => t("cardinal", { count: "two" })).toThrow(
      I18nMessageFormatError
    );

    for (let index = 0; index < 500; index += 1) {
      formatter.format({
        locale: "en",
        message: `{value${index}}`,
        values: { [`value${index}`]: index },
      });
    }
    formatter.format({
      locale: "en",
      message: "{value0}",
      values: { value0: 0 },
    });
    formatter.format({
      locale: "en",
      message: "{value500}",
      values: { value500: 500 },
    });

    expect(cacheEvents).toContainEqual({
      type: "hit",
      cacheKey: JSON.stringify(["en", "{value0}"]),
    });
    expect(cacheEvents).toContainEqual({
      type: "evict",
      cacheKey: JSON.stringify(["en", "{value500}"]),
      evictedKey: JSON.stringify(["en", "{value1}"]),
    });
  });

  it("keeps formatter injection parity across the existing root provider and createI18n", () => {
    const formatter = createIcuMessageFormatter();
    const i18n = createI18n(catalog, { messageFormatter: formatter });

    function RootProbe() {
      const { t } = useTranslation("common");
      return (
        <output data-testid="root">
          {t("nested", { gender: "female", count: 2 })}
        </output>
      );
    }

    function CreatedProbe() {
      const { t } = i18n.useTranslation("common");
      return (
        <output data-testid="created-root">
          {t("nested", { gender: "female", count: 2 })}
        </output>
      );
    }

    render(
      <>
        <I18nProvider
          initialLanguage="en"
          translations={catalog}
          messageFormatter={formatter}
        >
          <RootProbe />
        </I18nProvider>
        <i18n.I18nProvider initialLanguage="en">
          <CreatedProbe />
        </i18n.I18nProvider>
      </>
    );

    expect(screen.getByTestId("root")).toHaveTextContent("She has 2 tasks");
    expect(screen.getByTestId("created-root")).toHaveTextContent(
      "She has 2 tasks"
    );
  });

  it("requires a formatter for root t.rich and directs ordinary t to t.rich", () => {
    function MissingFormatterProbe() {
      const { t } = useTranslation("common");
      return <>{t.rich("rich", { title: "the guide" })}</>;
    }

    function OrdinaryTranslationProbe() {
      const { t } = useTranslation("common");
      return (
        <>
          {t("rich", {
            title: "the guide",
            strong: (chunks: React.ReactNode[]) => <strong>{chunks}</strong>,
            link: (chunks: React.ReactNode[]) => <a href="/guide">{chunks}</a>,
          } as never)}
        </>
      );
    }

    const consoleError = jest.spyOn(console, "error").mockImplementation();
    try {
      expect(() =>
        render(
          <I18nProvider initialLanguage="en" translations={catalog}>
            <MissingFormatterProbe />
          </I18nProvider>
        )
      ).toThrow(
        expect.objectContaining({
          name: "I18nMessageFormatError",
          reason: "formatter-required",
        })
      );

      expect(() =>
        render(
          <I18nProvider
            initialLanguage="en"
            translations={catalog}
            messageFormatter={createIcuMessageFormatter()}
          >
            <OrdinaryTranslationProbe />
          </I18nProvider>
        )
      ).toThrow(
        expect.objectContaining({
          name: "I18nMessageFormatError",
          reason: "rich-result",
          message: expect.stringContaining("Use t.rich"),
        })
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("keeps getTranslation formatter injection parity", async () => {
    const localesDir = await mkdtemp(join(tmpdir(), "i18nexus-icu-"));
    const namespaceDir = join(localesDir, "common");
    await mkdir(namespaceDir, { recursive: true });
    await writeFile(
      join(namespaceDir, "en.json"),
      JSON.stringify(catalog.common.en)
    );

    try {
      const translation = await getTranslation("common", {
        language: "en",
        localesDir,
        disableAutoInference: true,
        disableCache: true,
        messageFormatter: createIcuMessageFormatter(),
      });

      expect(translation.t("nested", { gender: "female", count: 2 })).toBe(
        "She has 2 tasks"
      );
    } finally {
      await rm(localesDir, { recursive: true, force: true });
    }
  });

  it("keeps createIcuI18n and rich tags on the ICU entrypoint", () => {
    const i18n = createIcuI18n(catalog);

    function CreatedProbe() {
      const { t } = i18n.useTranslation("common");
      return (
        <output data-testid="created">
          {t("nested", { gender: "female", count: 2 })}
        </output>
      );
    }

    function RichProbe() {
      const { t } = useIcuTranslation("common");
      return (
        <div data-testid="rich">
          {React.Children.toArray(
            t.rich("rich", {
              title: "the guide",
              strong: (chunks: React.ReactNode[]) => (
                <strong>{React.Children.toArray(chunks)}</strong>
              ),
              link: (chunks: React.ReactNode[]) => (
                <a href="/guide">{React.Children.toArray(chunks)}</a>
              ),
            })
          )}
        </div>
      );
    }

    render(
      <>
        <i18n.I18nProvider initialLanguage="en">
          <CreatedProbe />
        </i18n.I18nProvider>
        <IcuI18nProvider initialLanguage="en" translations={catalog}>
          <RichProbe />
        </IcuI18nProvider>
      </>
    );

    expect(screen.getByTestId("created")).toHaveTextContent("She has 2 tasks");
    expect(screen.getByTestId("rich")).toHaveTextContent(
      "Important: read the guide."
    );
    expect(screen.getByRole("link", { name: "the guide" })).toHaveAttribute(
      "href",
      "/guide"
    );
  });
});
