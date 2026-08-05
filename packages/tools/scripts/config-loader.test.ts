import * as fs from "fs";
import * as pathLib from "path";
import { loadConfig, I18nexusConfig } from "./config-loader";

describe("config-loader", () => {
  const testConfigPath = pathLib.join(__dirname, "test-config.json");
  const originalArgv = process.argv;

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    process.argv = originalArgv;
    jest.restoreAllMocks();
  });

  describe("namespaceLocation 변환", () => {
    it("namespaceLocation이 설정되면 namespacing.basePath로 변환", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
        namespaceLocation: "src/pages",
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.namespacing?.enabled).toBe(true);
      expect(config.namespacing?.basePath).toBe("src/pages");
      expect(config.namespacing?.defaultNamespace).toBe("common");
    });

    it("namespaceLocation과 namespacing을 함께 설정하면 병합", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
        namespaceLocation: "src/pages",
        namespacing: {
          defaultNamespace: "global",
          framework: "nextjs-pages" as const,
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.namespacing?.enabled).toBe(true);
      expect(config.namespacing?.basePath).toBe("src/pages");
      expect(config.namespacing?.defaultNamespace).toBe("global");
      expect(config.namespacing?.framework).toBe("nextjs-pages");
    });

    it("namespaceLocation이 없으면 기존 namespacing 설정 유지", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
        namespacing: {
          enabled: true,
          basePath: "src/app",
          defaultNamespace: "custom",
        },
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.namespacing?.enabled).toBe(true);
      expect(config.namespacing?.basePath).toBe("src/app");
      expect(config.namespacing?.defaultNamespace).toBe("custom");
    });
  });

  describe("keyFirst", () => {
    it("uses a disabled default when keyFirst is omitted", () => {
      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.keyFirst).toEqual({ enabled: false });
    });

    it("loads an enabled custom key-first pattern", () => {
      fs.writeFileSync(
        testConfigPath,
        JSON.stringify({
          keyFirst: {
            enabled: true,
            pattern: "feature\\.[a-z]+",
          },
        })
      );

      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.keyFirst).toEqual({
        enabled: true,
        pattern: "feature\\.[a-z]+",
      });
    });
  });

  describe("strictTypeGeneration", () => {
    it("strictTypeGeneration 설정을 로드해야 함", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
        strictTypeGeneration: true,
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });
      expect(config.strictTypeGeneration).toBe(true);
    });
  });

  describe("sourceLanguage", () => {
    it("sourceLanguage이 없으면 defaultLanguage를 사용해야 함", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });
      expect(config.sourceLanguage).toBe("en");
    });

    it("sourceLanguage 설정을 명시적으로 로드해야 함", () => {
      const testConfig = {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        sourceLanguage: "ko",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });
      expect(config.sourceLanguage).toBe("ko");
    });
  });

  describe("core v4 type generation defaults", () => {
    it("generateTypes는 기본적으로 true", () => {
      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.generateTypes).toBe(true);
      expect(config.typesOutputPath).toBeUndefined();
    });

    it("generateTypes와 typesOutputPath 설정을 로드해야 함", () => {
      const testConfig = {
        generateTypes: false,
        typesOutputPath: "./src/i18n/types.d.ts",
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });
      expect(config.generateTypes).toBe(false);
      expect(config.typesOutputPath).toBe("./src/i18n/types.d.ts");
    });
  });

  describe("staticKeyExtraction", () => {
    it("staticKeyExtraction은 기본적으로 safe", () => {
      const config = loadConfig(testConfigPath, { silent: true });

      expect(config.staticKeyExtraction).toBe("safe");
    });

    it("staticKeyExtraction과 staticKeyContainerPatterns 설정을 로드해야 함", () => {
      const testConfig = {
        staticKeyExtraction: "aggressive",
        staticKeyContainerPatterns: ["Keys$", "^I18N_"],
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(testConfig));

      const config = loadConfig(testConfigPath, { silent: true });
      expect(config.staticKeyExtraction).toBe("aggressive");
      expect(config.staticKeyContainerPatterns).toEqual(["Keys$", "^I18N_"]);
    });
  });

  describe("CLI help output", () => {
    it("설정 파일이 없어도 일반 실행에서는 안내 로그를 출력", () => {
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      loadConfig(testConfigPath);

      expect(logSpy).toHaveBeenCalledWith(
        "⚠️  i18nexus.config.json not found, using default configuration"
      );
    });

    it("--help 실행에서는 설정 파일 없음 안내 로그를 숨김", () => {
      process.argv = ["node", "i18n-wrapper", "--help"];
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      loadConfig(testConfigPath);

      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
