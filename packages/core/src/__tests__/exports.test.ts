import * as root from "../index";
import { createI18n } from "../index";
import type {
  CreateI18nInstance,
  CreateI18nUseTranslationReturn,
  I18nTranslations,
} from "../index";

describe("root exports", () => {
  it("exports createI18n as the advanced typed API", () => {
    const translations = {
      common: {
        en: {
          hello: "Hello",
        },
      },
      home: {
        en: {
          title: "Home",
        },
      },
    } as const satisfies I18nTranslations;

    const i18n: CreateI18nInstance<typeof translations> =
      createI18n(translations);
    const returnShape: Pick<
      CreateI18nUseTranslationReturn<"hello">,
      "currentLanguage" | "isReady"
    > = {
      currentLanguage: "en",
      isReady: true,
    };

    expect(typeof createI18n).toBe("function");
    expect(i18n.translations.common.en.hello).toBe("Hello");
    expect(typeof i18n.I18nProvider).toBe("function");
    expect(typeof i18n.useTranslation).toBe("function");
    expect(returnShape.isReady).toBe(true);
  });

  it("does not expose removed runtime utilities from the root entry", () => {
    const removedRuntimeExports = [
      "I18NexusDevtools",
      "createTypedTranslation",
      "createTypedTranslationWithStyles",
      "createMultiLangTypedTranslation",
      "validateTranslationKeys",
      "getTranslationKeyList",
      "createDynamicTranslation",
      "buildTranslationParams",
      "buildConditionalTranslation",
      "mapToTranslationParams",
      "setCookie",
      "getCookie",
      "deleteCookie",
      "getAllCookies",
      "LanguageManager",
      "defaultLanguageManager",
      "createI18nWithConfig",
    ];

    for (const exportName of removedRuntimeExports) {
      expect(root).not.toHaveProperty(exportName);
    }
  });
});
