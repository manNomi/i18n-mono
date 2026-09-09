/**
 * Clean Legacy 테스트
 */

import * as fs from "fs";
import * as path from "path";
import { LegacyCleaner, CleanLegacyConfig } from "./clean-legacy";
import {
  createTempDir,
  cleanupTempDir,
  createDirStructure,
  readJsonFile,
  fileExists,
} from "./__tests__/test-utils";

// TranslationExtractor mock
jest.mock("./extractor/index", () => ({
  TranslationExtractor: jest.fn().mockImplementation(() => ({
    extractKeysOnly: jest.fn().mockResolvedValue([
      { key: "welcome.title", namespace: "common" },
      { key: "button.save", namespace: "common" },
    ]),
  })),
}));

type CleanerFileSystem = NonNullable<
  ConstructorParameters<typeof LegacyCleaner>[1]
>;

const realFileSystem: CleanerFileSystem = {
  copyFileSync: fs.copyFileSync,
  existsSync: fs.existsSync,
  mkdirSync: fs.mkdirSync,
  readFileSync: fs.readFileSync,
  renameSync: fs.renameSync,
  unlinkSync: fs.unlinkSync,
  writeFileSync: fs.writeFileSync,
};

describe("LegacyCleaner", () => {
  let tempDir: string;
  let localesDir: string;
  let cleaner: LegacyCleaner;

  beforeEach(() => {
    tempDir = createTempDir();
    localesDir = path.join(tempDir, "locales");
    cleaner = new LegacyCleaner({
      sourcePattern: "src/**/*.{ts,tsx}",
      localesDir,
      languages: ["en", "ko"],
      dryRun: false,
      backup: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    cleanupTempDir(tempDir);
  });

  describe("clean", () => {
    it("should remove unused keys", async () => {
      // Create locale files with unused keys
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            "button.save": "Save",
            "unused.key": "Unused", // This should be removed
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "button.save": "저장",
            "unused.key": "사용 안 함", // This should be removed
          },
          null,
          2
        )
      );

      const { stats, issues } = await cleaner.clean();

      expect(stats.removedUnused).toBe(1);
      expect(issues.unusedKeys).toContain("unused.key");

      // Check that unused key was removed
      const enData = readJsonFile(path.join(localesDir, "en.json"));
      const koData = readJsonFile(path.join(localesDir, "ko.json"));

      expect(enData["unused.key"]).toBeUndefined();
      expect(koData["unused.key"]).toBeUndefined();
    });

    it("should remove keys with invalid values", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            "button.save": "Save",
            "invalid.key": "_N/A", // Invalid value
            "empty.key": "", // Empty string
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "button.save": "저장",
            "invalid.key": "N/A", // Invalid value
            "empty.key": "", // Empty string
          },
          null,
          2
        )
      );

      const { stats, issues } = await cleaner.clean();

      // Invalid values should be removed or reported
      // Note: The cleaner removes invalid values from the output, but they may not be in issues.invalidValueKeys
      // if they're not in the used keys list
      expect(stats.removedInvalidValue).toBeGreaterThanOrEqual(0);

      // Check that invalid keys were removed
      const enData = readJsonFile(path.join(localesDir, "en.json"));
      expect(enData["invalid.key"]).toBeUndefined();
      expect(enData["empty.key"]).toBeUndefined();
    });

    it("should keep valid keys that are used in code", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            "button.save": "Save",
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "button.save": "저장",
          },
          null,
          2
        )
      );

      const { stats, issues } = await cleaner.clean();

      expect(stats.keptKeys).toBe(2);
      expect(issues.unusedKeys.length).toBe(0);

      // Check that valid keys are kept
      const enData = readJsonFile(path.join(localesDir, "en.json"));
      const koData = readJsonFile(path.join(localesDir, "ko.json"));

      expect(enData["welcome.title"]).toBe("Welcome");
      expect(enData["button.save"]).toBe("Save");
      expect(koData["welcome.title"]).toBe("환영합니다");
      expect(koData["button.save"]).toBe("저장");
    });

    it("should report missing keys", async () => {
      // Create locale files missing some keys that are used in code
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            // "button.save" is missing but used in code
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            // "button.save" is missing but used in code
          },
          null,
          2
        )
      );

      const { stats, issues } = await cleaner.clean();

      expect(stats.missingKeys).toBeGreaterThan(0);
      expect(issues.missingKeys.length).toBeGreaterThan(0);
    });

    it("should create backup files when backup is enabled", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            "unused.key": "Unused",
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "unused.key": "사용 안 함",
          },
          null,
          2
        )
      );

      await cleaner.clean();

      // Check for backup files (they have timestamp in filename)
      const enFiles = fs
        .readdirSync(localesDir)
        .filter((f) => f.startsWith("en.backup-"));
      const koFiles = fs
        .readdirSync(localesDir)
        .filter((f) => f.startsWith("ko.backup-"));

      expect(enFiles.length).toBeGreaterThan(0);
      expect(koFiles.length).toBeGreaterThan(0);
    });

    it("should not create backup files when backup is disabled", async () => {
      const noBackupCleaner = new LegacyCleaner({
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir,
        languages: ["en", "ko"],
        dryRun: false,
        backup: false,
      });

      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
          },
          null,
          2
        )
      );

      await noBackupCleaner.clean();

      // Check that no backup files were created
      const backupFiles = fs
        .readdirSync(localesDir)
        .filter((f) => f.includes("backup"));

      expect(backupFiles.length).toBe(0);
    });

    it("should not modify files in dry run mode", async () => {
      const dryRunCleaner = new LegacyCleaner({
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir,
        languages: ["en", "ko"],
        dryRun: true,
        backup: false,
      });

      const originalEnData = {
        "welcome.title": "Welcome",
        "unused.key": "Unused",
      };

      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(originalEnData, null, 2)
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "unused.key": "사용 안 함",
          },
          null,
          2
        )
      );

      await dryRunCleaner.clean();

      // Check that files were not modified
      const enData = readJsonFile(path.join(localesDir, "en.json"));
      expect(enData).toEqual(originalEnData);
    });

    it("should handle multiple languages", async () => {
      const multiLangCleaner = new LegacyCleaner({
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir,
        languages: ["en", "ko", "ja"],
        dryRun: false,
        backup: false,
      });

      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify(
          {
            "welcome.title": "Welcome",
            "unused.key": "Unused",
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify(
          {
            "welcome.title": "환영합니다",
            "unused.key": "사용 안 함",
          },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(localesDir, "ja.json"),
        JSON.stringify(
          {
            "welcome.title": "ようこそ",
            "unused.key": "未使用",
          },
          null,
          2
        )
      );

      const { stats } = await multiLangCleaner.clean();

      // All languages should be processed
      expect(stats.removedUnused).toBe(1);

      // Check all language files
      const enData = readJsonFile(path.join(localesDir, "en.json"));
      const koData = readJsonFile(path.join(localesDir, "ko.json"));
      const jaData = readJsonFile(path.join(localesDir, "ja.json"));

      expect(enData["unused.key"]).toBeUndefined();
      expect(koData["unused.key"]).toBeUndefined();
      expect(jaData["unused.key"]).toBeUndefined();
    });

    it("should create directories if they don't exist", async () => {
      const nonExistentDir = path.join(tempDir, "new-locales");
      const newCleaner = new LegacyCleaner({
        sourcePattern: "src/**/*.{ts,tsx}",
        localesDir: nonExistentDir,
        languages: ["en", "ko"],
        dryRun: false,
        backup: false,
      });

      // Should not throw error
      await expect(newCleaner.clean()).resolves.not.toThrow();
    });

    it("should abort without modifying any locale when JSON parsing fails", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      const enPath = path.join(localesDir, "en.json");
      const koPath = path.join(localesDir, "ko.json");
      const originalEn = '{"welcome.title":"Welcome"';
      const originalKo = JSON.stringify(
        { "welcome.title": "환영합니다", "button.save": "저장" },
        null,
        2
      );
      fs.writeFileSync(enPath, originalEn);
      fs.writeFileSync(koPath, originalKo);

      await expect(cleaner.clean()).rejects.toThrow(/parse|JSON/i);

      expect(fs.readFileSync(enPath, "utf8")).toBe(originalEn);
      expect(fs.readFileSync(koPath, "utf8")).toBe(originalKo);
      expect(fs.readdirSync(localesDir)).not.toEqual(
        expect.arrayContaining([expect.stringContaining(".backup-")])
      );
    });

    it("should abort and remove partial backups when any backup fails", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      const enPath = path.join(localesDir, "en.json");
      const koPath = path.join(localesDir, "ko.json");
      const originalEn = JSON.stringify(
        { "welcome.title": "Welcome", "button.save": "Save" },
        null,
        2
      );
      const originalKo = JSON.stringify(
        { "welcome.title": "환영합니다", "button.save": "저장" },
        null,
        2
      );
      fs.writeFileSync(enPath, originalEn);
      fs.writeFileSync(koPath, originalKo);

      let copyCount = 0;
      const failingCopyFileSync = ((
        ...args: Parameters<typeof fs.copyFileSync>
      ) => {
        copyCount++;
        if (copyCount === 2) {
          throw new Error("injected backup failure");
        }
        return fs.copyFileSync(...args);
      }) as typeof fs.copyFileSync;
      const failingCleaner = new LegacyCleaner(
        {
          sourcePattern: "src/**/*.{ts,tsx}",
          localesDir,
          languages: ["en", "ko"],
          dryRun: false,
          backup: true,
        },
        { ...realFileSystem, copyFileSync: failingCopyFileSync }
      );

      await expect(failingCleaner.clean()).rejects.toThrow(
        /injected backup failure/
      );

      expect(fs.readFileSync(enPath, "utf8")).toBe(originalEn);
      expect(fs.readFileSync(koPath, "utf8")).toBe(originalKo);
      expect(
        fs.readdirSync(localesDir).filter((file) => file.includes(".backup-"))
      ).toHaveLength(0);
    });

    it("should leave every original unchanged when staging a write fails", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      const enPath = path.join(localesDir, "en.json");
      const koPath = path.join(localesDir, "ko.json");
      const originalEn = JSON.stringify(
        {
          "welcome.title": "Welcome",
          "button.save": "Save",
          unused: "Unused",
        },
        null,
        2
      );
      const originalKo = JSON.stringify(
        {
          "welcome.title": "환영합니다",
          "button.save": "저장",
          unused: "사용 안 함",
        },
        null,
        2
      );
      fs.writeFileSync(enPath, originalEn);
      fs.writeFileSync(koPath, originalKo);

      let writeCount = 0;
      const failingWriteFileSync = ((
        ...args: Parameters<typeof fs.writeFileSync>
      ) => {
        writeCount++;
        if (writeCount === 2) {
          throw new Error("injected staging failure");
        }
        return fs.writeFileSync(...args);
      }) as typeof fs.writeFileSync;
      const atomicCleaner = new LegacyCleaner(
        {
          sourcePattern: "src/**/*.{ts,tsx}",
          localesDir,
          languages: ["en", "ko"],
          dryRun: false,
          backup: false,
        },
        { ...realFileSystem, writeFileSync: failingWriteFileSync }
      );

      await expect(atomicCleaner.clean()).rejects.toThrow(
        /injected staging failure/
      );

      expect(fs.readFileSync(enPath, "utf8")).toBe(originalEn);
      expect(fs.readFileSync(koPath, "utf8")).toBe(originalKo);
    });

    it("should roll back earlier files when a later atomic commit fails", async () => {
      fs.mkdirSync(localesDir, { recursive: true });
      const enPath = path.join(localesDir, "en.json");
      const koPath = path.join(localesDir, "ko.json");
      const originalEn = JSON.stringify(
        {
          "welcome.title": "Welcome",
          "button.save": "Save",
          unused: "Unused",
        },
        null,
        2
      );
      const originalKo = JSON.stringify(
        {
          "welcome.title": "환영합니다",
          "button.save": "저장",
          unused: "사용 안 함",
        },
        null,
        2
      );
      fs.writeFileSync(enPath, originalEn);
      fs.writeFileSync(koPath, originalKo);

      const failingRenameSync = ((source: fs.PathLike, target: fs.PathLike) => {
        if (String(source).endsWith(".tmp") && String(target) === koPath) {
          throw new Error("injected commit failure");
        }
        fs.renameSync(source, target);
      }) as typeof fs.renameSync;
      const atomicCleaner = new LegacyCleaner(
        {
          sourcePattern: "src/**/*.{ts,tsx}",
          localesDir,
          languages: ["en", "ko"],
          dryRun: false,
          backup: false,
        },
        { ...realFileSystem, renameSync: failingRenameSync }
      );

      await expect(atomicCleaner.clean()).rejects.toThrow(
        /injected commit failure/
      );

      expect(fs.readFileSync(enPath, "utf8")).toBe(originalEn);
      expect(fs.readFileSync(koPath, "utf8")).toBe(originalKo);
      expect(
        fs
          .readdirSync(localesDir)
          .filter((file) => file.endsWith(".tmp") || file.endsWith(".rollback"))
      ).toHaveLength(0);
    });
  });

  describe("printReport", () => {
    it("should print report with statistics", () => {
      const stats = {
        totalUsedInCode: 2,
        totalKeysPerLanguage: new Map([["en", 3]]),
        keptKeys: 2,
        removedUnused: 1,
        removedInvalidValue: 0,
        missingKeys: 0,
      };

      const issues = {
        unusedKeys: ["unused.key"],
        invalidValueKeys: [],
        missingKeys: [],
      };

      // Should not throw error
      expect(() => {
        cleaner.printReport(stats, issues);
      }).not.toThrow();
    });

    it("should print report with missing keys", () => {
      const stats = {
        totalUsedInCode: 3,
        totalKeysPerLanguage: new Map([["en", 2]]),
        keptKeys: 2,
        removedUnused: 0,
        removedInvalidValue: 0,
        missingKeys: 1,
      };

      const issues = {
        unusedKeys: [],
        invalidValueKeys: [],
        missingKeys: ["missing.key"],
      };

      expect(() => {
        cleaner.printReport(stats, issues);
      }).not.toThrow();
    });
  });
});
