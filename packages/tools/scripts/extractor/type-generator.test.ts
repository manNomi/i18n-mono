/**
 * Type Generator 테스트
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import {
  generateTypeDefinitions,
  ExtractedTranslations,
  readExtractedTranslations,
  TypeGeneratorConfig,
  validateTranslationsForTypeGeneration,
} from "./type-generator";
import {
  createTempDir,
  cleanupTempDir,
  readFileContent,
  fileExists,
} from "../__tests__/test-utils";

describe("Type Generator", () => {
  let tempDir: string;
  let outputPath: string;

  beforeEach(() => {
    tempDir = createTempDir();
    outputPath = path.join(tempDir, "types", "i18nexus.d.ts");
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe("generateTypeDefinitions", () => {
    it("should generate basic type definitions", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "welcome.title": "Welcome",
            "button.save": "Save",
          },
          ko: {
            "welcome.title": "환영합니다",
            "button.save": "저장",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        fallbackNamespace: undefined,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      expect(fileExists(outputPath)).toBe(true);
      const content = readFileContent(outputPath);

      // Check for namespace type
      expect(content).toContain('declare type TranslationNamespace = "common"');
      // Check for CommonKeys type (may be formatted differently)
      expect(content).toContain("CommonKeys");
      expect(content).toContain("welcome.title");
      expect(content).toContain("button.save");
      expect(content).toContain("export type I18nexusGeneratedTranslations");
      expect(content).toContain("I18nexusGeneratedTranslationKeys");
      expect(content).toContain("I18nexusGeneratedTranslationFunction");
      expect(content).toContain("I18nexusGeneratedClientTranslationFunction");
      expect(content).toContain('readonly "common"');
      expect(content).toContain('readonly "en"');
    });

    it("should include fallback namespace keys in all namespaces", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            save: "Save",
            cancel: "Cancel",
          },
          ko: {
            save: "저장",
            cancel: "취소",
          },
        },
        dashboard: {
          en: {
            title: "Dashboard",
          },
          ko: {
            title: "대시보드",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        fallbackNamespace: "common",
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Check that useTranslation includes fallback keys
      expect(content).toContain(
        "UseTranslationReturn<TranslationKeys[NS] | CommonKeys>"
      );
      expect(content).toContain(
        "Promise<GetTranslationReturn<NS, TranslationKeys[NS] | CommonKeys>>"
      );
      expect(content).toContain(
        "I18nexusGeneratedTranslationKeys<\n  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace\n> = TranslationKeys[NS] | CommonKeys"
      );
    });

    it("should include configured fallback namespace even when no fallback keys were extracted", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: {
            title: "Home",
          },
          ko: {
            title: "홈",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        fallbackNamespace: "common",
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      expect(content).toContain(
        'declare type TranslationNamespace = "common" | "home";'
      );
      expect(content).toContain("declare type CommonKeys = never;");
      expect(content).toContain('readonly "common"');
      expect(content).toContain(
        "I18nexusGeneratedTranslationKeys<\n  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace\n> = TranslationKeys[NS] | CommonKeys"
      );
    });

    it("should extract interpolation variables from translation values", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "days.remaining": "{{totalDays}} days remaining",
            "user.greeting": "Hello, {{name}}!",
          },
          ko: {
            "days.remaining": "{{totalDays}}일 남음",
            "user.greeting": "안녕하세요, {{name}}님!",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      expect(content).toContain("CommonKeys");
      expect(content).toContain("days.remaining");
      expect(content).toContain("user.greeting");
      expect(content).toContain("declare type CommonKeyVariables");
      expect(content).toContain('"days.remaining": "totalDays"');
      expect(content).toContain('"user.greeting": "name"');
    });

    it("should include keys from all languages when translations are incomplete", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: { save: "Save" },
          ko: { save: "저장", cancel: "취소" },
        },
      };

      generateTypeDefinitions(extractedData, {
        outputPath,
        translationImportSource: "i18nexus",
      });

      const content = readFileContent(outputPath);

      expect(content).toContain('"cancel" | "save"');
      expect(content).toContain('readonly "cancel": string');
    });

    it("should generate module augmentation", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Check for module augmentation
      expect(content).toContain('declare module "i18nexus"');
      expect(content).toContain("export function useTranslation");
      expect(content).toContain("export function getTranslation");
    });

    it("should handle empty translation data", () => {
      const extractedData: ExtractedTranslations = {};

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      // Should not throw error
      expect(() => {
        generateTypeDefinitions(extractedData, config);
      }).not.toThrow();

      // File should not be created
      expect(fileExists(outputPath)).toBe(false);
    });

    it("should fail in strict mode when a key is missing in one language", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "welcome.title": "Welcome",
          },
          ko: {
            "welcome.title": "환영합니다",
            "button.save": "저장",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
        strictValidation: true,
      };

      expect(() => {
        generateTypeDefinitions(extractedData, config);
      }).toThrow(/Missing key/);

      expect(fileExists(outputPath)).toBe(false);
    });

    it("should fail in strict mode when translation value is empty", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "welcome.title": "",
          },
          ko: {
            "welcome.title": "환영합니다",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
        strictValidation: true,
      };

      expect(() => {
        generateTypeDefinitions(extractedData, config);
      }).toThrow(/value is empty/);

      expect(fileExists(outputPath)).toBe(false);
    });

    it("should handle complex namespace structure", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: { save: "Save" },
          ko: { save: "저장" },
        },
        dashboard: {
          en: {
            title: "Dashboard",
            "stats.total": "Total: {{count}}",
          },
          ko: {
            title: "대시보드",
            "stats.total": "총: {{count}}",
          },
        },
        settings: {
          en: {
            "profile.name": "Name",
            "profile.email": "Email",
          },
          ko: {
            "profile.name": "이름",
            "profile.email": "이메일",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        fallbackNamespace: "common",
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Check all namespaces are included
      expect(content).toContain(
        'declare type TranslationNamespace = "common" | "dashboard" | "settings"'
      );
      expect(content).toContain("CommonKeys");
      expect(content).toContain("DashboardKeys");
      expect(content).toContain("SettingsKeys");

      // Check TranslationKeys mapping
      expect(content).toContain('"common": CommonKeys');
      expect(content).toContain('"dashboard": DashboardKeys');
      expect(content).toContain('"settings": SettingsKeys');
    });

    it("should create output directory if it doesn't exist", () => {
      const deepOutputPath = path.join(
        tempDir,
        "deep",
        "nested",
        "types",
        "i18nexus.d.ts"
      );

      const extractedData: ExtractedTranslations = {
        common: {
          en: { key: "Value" },
          ko: { key: "값" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath: deepOutputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      expect(fileExists(deepOutputPath)).toBe(true);
    });

    it("should import types from i18nexus package", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Check for imports
      expect(content).toContain("import type {");
      expect(content).toContain("UseTranslationReturn");
      expect(content).toContain("GetTranslationReturn");
      expect(content).toContain("from 'i18nexus'");
      expect(content).toContain("from 'i18nexus/server'");
      expect(content).not.toContain("UseLanguageSwitcherReturn");
      expect(content).not.toContain("I18nProviderProps");
      expect(content).not.toContain("export function useLanguageSwitcher");
      expect(content).not.toContain("export function I18nProvider");
    });

    it("should compile generated i18nexus augmentation against core-style exports", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: { save: "Save" },
          ko: { save: "저장" },
        },
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        fallbackNamespace: "common",
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const shimPath = path.join(tempDir, "i18nexus-shim.d.ts");
      const usagePath = path.join(tempDir, "usage.ts");
      const tsconfigPath = path.join(tempDir, "tsconfig.json");

      fs.writeFileSync(
        shimPath,
        `
declare module "i18nexus" {
  export interface UseTranslationReturn<K extends string = string> {
    t: (key: K) => string;
    currentLanguage: string;
    lng: string;
    isReady: boolean;
  }
  export interface UseLanguageSwitcherReturn {
    currentLanguage: string;
  }
  export interface I18nProviderProps<TTranslations = unknown> {
    translations?: TTranslations;
  }
  export function useTranslation<K extends string = string>(
    namespace?: string
  ): UseTranslationReturn<K>;
  export const useLanguageSwitcher: () => UseLanguageSwitcherReturn;
  export function I18nProvider(
    props: I18nProviderProps
  ): unknown;
}

declare module "i18nexus/server" {
  export interface GetTranslationOptions {
    language?: string;
  }
  export interface GetTranslationReturn<
    NS extends string = string,
    K extends string = string
  > {
    t: (key: K) => string;
    namespace: NS;
  }
  export function getTranslation<
    NS extends string = string,
    K extends string = string
  >(
    namespace?: NS,
    options?: GetTranslationOptions
  ): Promise<GetTranslationReturn<NS, K>>;
}
`
      );

      fs.writeFileSync(
        usagePath,
        `
import { useLanguageSwitcher, useTranslation } from "i18nexus";
import { getTranslation } from "i18nexus/server";
import type {
  I18nexusGeneratedClientTranslationFunction,
  I18nexusGeneratedTranslationFunction,
} from "./types/i18nexus";

function ServerChild({
  t,
}: {
  t: I18nexusGeneratedTranslationFunction<"home">;
}) {
  t("title");
  t("save");
}

function ClientChild({
  t,
}: {
  t: I18nexusGeneratedClientTranslationFunction<"home">;
}) {
  t("title");
  t("save");
}

const { t } = useTranslation("home");
t("title");
t("save");
ClientChild({ t });
useLanguageSwitcher().currentLanguage;

async function run() {
  const server = await getTranslation("home");
  server.t("title");
  server.t("save");
  ServerChild({ t: server.t });
}

void run();
`
      );

      fs.writeFileSync(
        tsconfigPath,
        JSON.stringify(
          {
            compilerOptions: {
              strict: true,
              skipLibCheck: false,
              module: "CommonJS",
              target: "ES2020",
              noEmit: true,
            },
            files: [shimPath, outputPath, usagePath],
          },
          null,
          2
        )
      );

      execFileSync(
        process.execPath,
        [require.resolve("typescript/bin/tsc"), "-p", tsconfigPath],
        {
          cwd: path.resolve(__dirname, "../.."),
          stdio: "pipe",
        }
      );
    });

    it("should handle custom translation import source", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "react-i18next",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Should use custom import source
      expect(content).toContain('declare module "react-i18next"');
      // Should not import from i18nexus
      expect(content).not.toContain("from 'i18nexus'");
    });

    it("should generate JSDoc comments when enabled", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        includeJsDocs: true,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Check for JSDoc comments
      expect(content).toContain("/**");
      expect(content).toContain("@example");
      expect(content).toContain("Type-safe translation hook");
    });

    it("should skip JSDoc comments when disabled", () => {
      const extractedData: ExtractedTranslations = {
        home: {
          en: { title: "Home" },
          ko: { title: "홈" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        includeJsDocs: false,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Should have minimal comments
      expect(content).not.toContain("@example");
      expect(content).not.toContain("Type-safe translation hook");
    });

    it("should handle keys with special characters", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "key.with.dots": "Value with dots",
            "key-with-dashes": "Value with dashes",
            key_with_underscores: "Value with underscores",
          },
          ko: {
            "key.with.dots": "점이 있는 키",
            "key-with-dashes": "대시가 있는 키",
            key_with_underscores: "언더스코어가 있는 키",
          },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // All keys should be properly escaped in type definition
      expect(content).toContain('"key.with.dots"');
      expect(content).toContain('"key-with-dashes"');
      expect(content).toContain('"key_with_underscores"');
    });

    it("should sort namespaces and keys alphabetically", () => {
      const extractedData: ExtractedTranslations = {
        zebra: {
          en: { z: "Z" },
          ko: { z: "Z" },
        },
        alpha: {
          en: { a: "A" },
          ko: { a: "A" },
        },
        beta: {
          en: { b: "B" },
          ko: { b: "B" },
        },
      };

      const config: TypeGeneratorConfig = {
        outputPath,
        translationImportSource: "i18nexus",
      };

      generateTypeDefinitions(extractedData, config);

      const content = readFileContent(outputPath);

      // Namespaces should be sorted
      const namespaceMatch = content.match(/TranslationNamespace = (.+?);/);
      expect(namespaceMatch).toBeTruthy();
      if (namespaceMatch) {
        const namespaces = namespaceMatch[1];
        expect(namespaces.indexOf("alpha")).toBeLessThan(
          namespaces.indexOf("beta")
        );
        expect(namespaces.indexOf("beta")).toBeLessThan(
          namespaces.indexOf("zebra")
        );
      }
    });
  });

  describe("validateTranslationsForTypeGeneration", () => {
    it("should return no issues when all languages have complete non-empty keys", () => {
      const extractedData: ExtractedTranslations = {
        common: {
          en: {
            "welcome.title": "Welcome",
            "button.save": "Save",
          },
          ko: {
            "welcome.title": "환영합니다",
            "button.save": "저장",
          },
        },
      };

      const issues = validateTranslationsForTypeGeneration(extractedData);
      expect(issues).toHaveLength(0);
    });
  });

  describe("readExtractedTranslations", () => {
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it("should return an empty map when locales directory is missing", () => {
      const missingDir = path.join(tempDir, "missing-locales");

      expect(readExtractedTranslations(missingDir)).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `⚠️  Locales directory not found: ${missingDir}`
      );
    });

    it("should read legacy root language files into the fallback namespace", () => {
      fs.mkdirSync(path.join(tempDir, "locales"), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, "locales", "en.json"),
        JSON.stringify({ save: "Save" })
      );
      fs.writeFileSync(
        path.join(tempDir, "locales", "ko.json"),
        JSON.stringify({ save: "저장" })
      );

      expect(
        readExtractedTranslations(path.join(tempDir, "locales"), {
          fallbackNamespace: "base",
        })
      ).toEqual({
        base: {
          en: { save: "Save" },
          ko: { save: "저장" },
        },
      });
    });

    it("should read namespaced locale folders and skip types folders", () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(path.join(localesDir, "home"), { recursive: true });
      fs.mkdirSync(path.join(localesDir, "types"), { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "home", "en.json"),
        JSON.stringify({ title: "Home" })
      );
      fs.writeFileSync(path.join(localesDir, "types", "en.json"), "{}");

      expect(readExtractedTranslations(localesDir)).toEqual({
        home: {
          en: { title: "Home" },
        },
      });
    });

    it("should warn on invalid namespace JSON and remove empty namespaces", () => {
      const localesDir = path.join(tempDir, "locales");
      const brokenFile = path.join(localesDir, "broken", "en.json");
      fs.mkdirSync(path.dirname(brokenFile), { recursive: true });
      fs.writeFileSync(brokenFile, "invalid json");

      expect(readExtractedTranslations(localesDir)).toEqual({});
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        `⚠️  Failed to read ${brokenFile}:`,
        expect.any(SyntaxError)
      );
    });
  });
});
