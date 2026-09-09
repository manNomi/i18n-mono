import * as root from "../index";
import { createI18n } from "../index";
import { I18NexusDevtools } from "../components/I18NexusDevtools";
import packageJson from "../../package.json";
import type {
  CreateI18nInstance,
  CreateI18nUseTranslationReturn,
  I18nTranslations,
} from "../index";

describe("root exports", () => {
  it("keeps the expected core runtime exports at the package root", () => {
    const keptRootExports = [
      "I18nProvider",
      "useI18nContext",
      "useTranslation",
      "useLanguageSwitcher",
      "createI18n",
      "defineConfig",
      "getLanguageFromUrl",
      "localizeUrl",
      "removeLanguageFromUrl",
    ];

    for (const exportName of keptRootExports) {
      expect(root).toHaveProperty(exportName);
    }
  });

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

  it("declares devtools, server, and edge as explicit package subpaths", () => {
    expect(packageJson.version).toBe("4.0.1");
    expect(packageJson.files).toContain("CHANGELOG.md");
    expect(Object.prototype.hasOwnProperty.call(packageJson.exports, ".")).toBe(
      true
    );
    expect(
      Object.prototype.hasOwnProperty.call(packageJson.exports, "./server")
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(packageJson.exports, "./edge")
    ).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(packageJson.exports, "./devtools")
    ).toBe(true);
    expect(typeof I18NexusDevtools).toBe("function");
  });

  it("points package support metadata at the canonical monorepo", () => {
    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/i18n-global/i18n-mono.git",
      directory: "packages/core",
    });
    expect(packageJson.bugs.url).toBe(
      "https://github.com/i18n-global/i18n-mono/issues"
    );
    expect(packageJson.homepage).toBe(
      "https://github.com/i18n-global/i18n-mono/tree/main/packages/core#readme"
    );
  });
});
