import { applyWrapperCliOptions, createWrapperConfig } from "../cli-options";
import type { I18nexusConfig } from "../../../config-loader";

const projectConfig: I18nexusConfig = {
  languages: ["en", "ko"],
  defaultLanguage: "ko",
  localesDir: "./locales",
  sourcePattern: "app/**/*.tsx",
  translationImportSource: "i18nexus",
  sourceLanguage: "ko",
  mode: "server",
  framework: "nextjs",
  serverTranslationFunction: "getServerT",
  keyFirst: { enabled: false },
};

describe("wrapper CLI options", () => {
  it("keeps project runtime settings and enables key-first", () => {
    const config = createWrapperConfig(projectConfig, "swc");
    applyWrapperCliOptions(
      ["--key-first-pattern", "about\\.[a-z0-9]+", "--source-language", "en"],
      config
    );

    expect(config).toMatchObject({
      parserType: "swc",
      mode: "server",
      framework: "nextjs",
      serverTranslationFunction: "getServerT",
      sourceLanguage: "en",
      keyFirst: { enabled: true, pattern: "about\\.[a-z0-9]+" },
    });
  });

  it("allows a one-run disable over an enabled project config", () => {
    const config = createWrapperConfig({
      ...projectConfig,
      keyFirst: { enabled: true },
    });
    applyWrapperCliOptions(["--no-key-first"], config);

    expect(config.keyFirst).toEqual({ enabled: false });
  });
});
