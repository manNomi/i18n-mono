import {
  createEdgeTranslation,
  getEdgeTranslation,
  getServerLanguage,
  parseAcceptLanguage,
  parseCookies,
} from "../utils/edge";
import { createIcuMessageFormatter } from "../utils/icu-formatter";

const translations = {
  en: {
    plain: "Save",
    greeting: "Hello {{name}}",
    items: "{count, plural, one {# item} other {# items}}",
  },
  ko: {
    plain: "저장",
    greeting: "안녕하세요 {{name}}",
  },
} as const;

describe("Edge translation entrypoint", () => {
  it("prefers a supported cookie over Accept-Language", () => {
    const result = getEdgeTranslation(
      new Headers({
        cookie: "i18n-language=ko",
        "accept-language": "en-US,en;q=0.9",
      }),
      translations,
      { availableLanguages: ["en", "ko"], defaultLanguage: "en" }
    );

    expect(result.language).toBe("ko");
    expect(result.lng).toBe("ko");
    expect(result.t("plain")).toBe("저장");
    expect(result.dict).toEqual(translations.ko);
    expect(result.translations).toBe(translations);
  });

  it("ignores unsupported or malformed cookies and negotiates quality values", () => {
    const headers = new Headers({
      cookie: "i18n-language=%E0%A4%A; theme=dark; i18n-language=fr",
      "accept-language": "ko;q=0.4,en-US;q=0.9,*;q=1,ja;q=wat",
    });
    const options = {
      availableLanguages: ["en", "ko"],
      defaultLanguage: "ko",
    };

    expect(getServerLanguage(headers, options)).toBe("en");
    expect(getEdgeTranslation(headers, translations, options).t("plain")).toBe(
      "Save"
    );
    expect(parseAcceptLanguage("ko;q=0,en;q=0.5", ["en", "ko"])).toBe(
      "en"
    );
    expect(parseCookies("bad=%E0%A4%A; good=value")).toEqual({ good: "value" });
  });

  it("creates an explicit-language context with plain, legacy, and fallback behavior", () => {
    const result = createEdgeTranslation("ko", translations);

    expect(result.t("plain")).toBe("저장");
    expect(result.t("greeting", { name: "Ada" })).toBe("안녕하세요 Ada");
    expect(result.t("greeting")).toBe("안녕하세요 {{name}}");
    expect(result.t("missing", "Fallback")).toBe("Fallback");
    expect(result.t("missing", undefined, "Also fallback")).toBe(
      "Also fallback"
    );
  });

  it("binds native formatting to the explicit language", () => {
    const result = createEdgeTranslation("de-DE", translations);

    expect(result.format.number(1234.5)).toBe("1.234,5");
  });

  it("supports an optional pure ICU message formatter", () => {
    const result = createEdgeTranslation("en", translations, {
      messageFormatter: createIcuMessageFormatter(),
    });

    expect(result.t("items", { count: 2 })).toBe("2 items");
  });
});
