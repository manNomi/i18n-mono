import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { I18nProvider } from "../components/I18nProvider";
import { useFormatter } from "../hooks/useFormatter";
import {
  useLanguageSwitcher,
  useTranslation,
} from "../hooks/useTranslation";
import { createI18n } from "../utils/createI18n";
import { createFormatter } from "../utils/formatter";
import { getTranslation } from "../utils/server";

describe("createFormatter", () => {
  it("formats native Intl values for the bound locale", () => {
    const en = createFormatter("en-US");
    const de = createFormatter("de-DE");
    const date = new Date("2024-01-02T03:04:00Z");
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    };

    expect(en.number(1234.5)).toBe("1,234.5");
    expect(en.currency(1234.5, "USD")).toBe("$1,234.50");
    expect(de.number(1234.5)).toBe("1.234,5");
    expect(en.number(9007199254740993n)).toBe("9,007,199,254,740,993");
    expect(en.dateTime(date, dateOptions)).toBe(
      new Intl.DateTimeFormat("en-US", dateOptions).format(date)
    );
    expect(en.relativeTime(-1, "day", { numeric: "auto" })).toBe(
      "yesterday"
    );
    expect(en.list(["apples", "bananas", "cherries"])).toBe(
      "apples, bananas, and cherries"
    );
    expect(
      en.list(["apples", "bananas", "cherries"], { type: "disjunction" })
    ).toBe("apples, bananas, or cherries");
  });

  it("preserves native Intl errors and rejects string dates", () => {
    const format = createFormatter("en-US");

    expect(() => format.currency(1, "US")).toThrow(RangeError);
    expect(() => format.dateTime(new Date(Number.NaN))).toThrow(RangeError);
    expect(() => format.dateTime("2024-01-02" as never)).toThrow(TypeError);
  });

  it("bypasses cache for inherited, non-enumerable, and distinct nullish options", () => {
    const format = createFormatter("en-US");
    const inheritedPercent = Object.create({ style: "percent" });
    const inheritedInvalidStyle = Object.create({ style: "invalid" });
    const nonEnumerablePercent = {};
    Object.defineProperty(nonEnumerablePercent, "style", {
      value: "percent",
    });
    const undefinedGrouping = { useGrouping: undefined };
    const nullGrouping = { useGrouping: null };

    expect(format.number(0.5)).toBe("0.5");
    expect(format.number(0.5, inheritedPercent)).toBe("50%");
    expect(() => format.number(0.5, inheritedInvalidStyle)).toThrow(RangeError);
    expect(format.number(0.5, nonEnumerablePercent)).toBe("50%");
    expect(format.number(1234, undefinedGrouping)).toBe(
      new Intl.NumberFormat("en-US", undefinedGrouping).format(1234)
    );
    expect(format.number(1234, nullGrouping as never)).toBe(
      new Intl.NumberFormat("en-US", nullGrouping as never).format(1234)
    );
    expect(format.number(1234, undefinedGrouping)).not.toBe(
      format.number(1234, nullGrouping as never)
    );
  });

  it("preserves inherited currency options while forcing style and currency", () => {
    const format = createFormatter("en-US");
    const inherited = Object.create({ currencyDisplay: "code" });
    const expectedOptions = Object.defineProperties(Object.create(inherited), {
      style: { value: "currency", enumerable: true },
      currency: { value: "USD", enumerable: true },
    });

    expect(format.currency(12, "USD", inherited)).toBe(
      new Intl.NumberFormat("en-US", expectedOptions).format(12)
    );
  });

  it("preserves native null and primitive currency-option behavior", () => {
    const format = createFormatter("en-US");
    const primitiveOptions = 1 as never;

    expect(() => format.currency(1, "USD", null as never)).toThrow(
      TypeError
    );
    expect(() => new Intl.NumberFormat("en-US", null as never)).toThrow(
      TypeError
    );
    expect(format.currency(1, "USD", primitiveOptions)).toBe(
      new Intl.NumberFormat("en-US", primitiveOptions).format(1)
    );
  });
});

describe("formatter integration", () => {
  const catalog = { common: { en: { title: "Title" } } };

  it("exposes the current-locale formatter from both React hooks", () => {
    function RootProbe() {
      const { format } = useTranslation("common");
      const hookFormat = useFormatter();
      return (
        <output data-testid="root">
          {format.currency(12, "USD")}|{hookFormat.number(1234.5)}
        </output>
      );
    }

    render(
      <I18nProvider initialLanguage="en-US" translations={catalog}>
        <RootProbe />
      </I18nProvider>
    );

    expect(screen.getByTestId("root")).toHaveTextContent("$12.00|1,234.5");
  });

  it("exposes the same formatter from createI18n", () => {
    const i18n = createI18n(catalog);

    function Probe() {
      const { format } = i18n.useTranslation("common");
      return <output data-testid="created">{format.number(1234.5)}</output>;
    }

    render(
      <i18n.I18nProvider initialLanguage="de-DE">
        <Probe />
      </i18n.I18nProvider>
    );

    expect(screen.getByTestId("created")).toHaveTextContent("1.234,5");
  });

  it("keeps t and format stable for local rerenders and refreshes both on language changes", async () => {
    const references: Array<{ t: unknown; format: unknown }> = [];

    function Probe() {
      const [count, setCount] = React.useState(0);
      const { format, t } = useTranslation("common");
      const { changeLanguage } = useLanguageSwitcher();
      references.push({ t, format });

      return (
        <>
          <output data-testid="locale">{format.number(1234.5)}</output>
          <button onClick={() => setCount((value) => value + 1)}>
            rerender {count}
          </button>
          <button onClick={() => void changeLanguage("de")}>language</button>
        </>
      );
    }

    render(
      <I18nProvider
        initialLanguage="en"
        translations={{ common: { en: { title: "Title" }, de: { title: "Titel" } } }}
        languageManagerOptions={{
          availableLanguages: [
            { code: "en", name: "English" },
            { code: "de", name: "Deutsch" },
          ],
        }}
      >
        <Probe />
      </I18nProvider>
    );

    const initial = references.at(-1)!;
    fireEvent.click(screen.getByRole("button", { name: /rerender/ }));
    expect(references.at(-1)).toEqual(initial);
    expect(references.at(-1)?.t).toBe(initial.t);
    expect(references.at(-1)?.format).toBe(initial.format);

    fireEvent.click(screen.getByRole("button", { name: "language" }));
    await waitFor(() => {
      expect(screen.getByTestId("locale")).toHaveTextContent("1.234,5");
    });
    expect(references.at(-1)?.t).not.toBe(initial.t);
    expect(references.at(-1)?.format).not.toBe(initial.format);
  });

  it("binds getTranslation.format to the resolved server language", async () => {
    const localesDir = await mkdtemp(join(tmpdir(), "i18nexus-formatter-"));
    const namespaceDir = join(localesDir, "common");
    await mkdir(namespaceDir, { recursive: true });
    await writeFile(join(namespaceDir, "de-DE.json"), '{"title":"Titel"}');

    try {
      const translation = await getTranslation("common", {
        language: "de-DE",
        localesDir,
        disableAutoInference: true,
        disableCache: true,
      });

      expect(translation.t("title")).toBe("Titel");
      expect(translation.format.number(1234.5)).toBe("1.234,5");
    } finally {
      await rm(localesDir, { recursive: true, force: true });
    }
  });
});
