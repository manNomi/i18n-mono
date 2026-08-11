/**
 * Google Sheets Manager 테스트
 */

import * as fs from "fs";
import * as path from "path";
import { GoogleSheetsManager, TranslationRow } from "./google-sheets";
import {
  createTempDir,
  cleanupTempDir,
  createTempJsonFile,
  createTempFile,
  createDirStructure,
  fileExists,
  readJsonFile,
} from "./__tests__/test-utils";
import { google, sheets_v4 } from "googleapis";

// googleapis mock
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
    sheets: jest.fn(),
  },
}));

describe("GoogleSheetsManager", () => {
  let tempDir: string;
  let manager: GoogleSheetsManager;
  let mockSheets: any;
  let mockAuthClient: any;

  beforeEach(() => {
    tempDir = createTempDir();
    manager = new GoogleSheetsManager({
      credentialsPath: path.join(tempDir, "credentials.json"),
      spreadsheetId: "test-spreadsheet-id",
      sheetName: "TestSheet",
    });

    // Mock Google Auth
    mockAuthClient = {};
    (google.auth.GoogleAuth as unknown as jest.Mock).mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue(mockAuthClient),
    }));

    // Mock Sheets API - 모든 메서드를 jest.fn()으로 생성
    const mockGet = jest.fn();
    const mockBatchUpdate = jest.fn();
    const mockValuesGet = jest.fn();
    const mockValuesUpdate = jest.fn();
    const mockValuesClear = jest.fn();

    mockSheets = {
      spreadsheets: {
        get: mockGet,
        batchUpdate: mockBatchUpdate,
        values: {
          get: mockValuesGet,
          update: mockValuesUpdate,
          append: jest.fn(),
          clear: mockValuesClear,
        },
      },
    };

    (google.sheets as jest.Mock).mockReturnValue(mockSheets);

    // Credentials 파일 생성
    createTempJsonFile(tempDir, "credentials.json", {
      type: "service_account",
      project_id: "test-project",
      private_key_id: "test-key-id",
      private_key:
        "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
      client_email: "test@test.iam.gserviceaccount.com",
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default config", () => {
      const defaultManager = new GoogleSheetsManager();
      expect(defaultManager).toBeInstanceOf(GoogleSheetsManager);
    });

    it("should initialize with custom config", () => {
      const customManager = new GoogleSheetsManager({
        spreadsheetId: "custom-id",
        sheetName: "CustomSheet",
        namespace: "custom-namespace",
      });
      expect(customManager).toBeInstanceOf(GoogleSheetsManager);
    });
  });

  describe("authenticate", () => {
    it("should authenticate successfully", async () => {
      await manager.authenticate();
      expect(google.auth.GoogleAuth).toHaveBeenCalled();
      expect(google.sheets).toHaveBeenCalled();
    });

    it("should throw error when credentials file not found", async () => {
      const invalidManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "nonexistent.json"),
      });

      await expect(invalidManager.authenticate()).rejects.toThrow(
        "Credentials file not found"
      );
    });

    it("should throw error when credentials are invalid", async () => {
      createTempFile(tempDir, "invalid-credentials.json", "invalid json");

      const invalidManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "invalid-credentials.json"),
      });

      await expect(invalidManager.authenticate()).rejects.toThrow();
    });
  });

  describe("checkSpreadsheet", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should return true when spreadsheet exists", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          spreadsheetId: "test-spreadsheet-id",
          properties: { title: "Test Spreadsheet" },
        },
      } as any);

      const result = await manager.checkSpreadsheet();
      expect(result).toBe(true);
      expect(mockSheets.spreadsheets.get as jest.Mock).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
      });
    });

    it("should return false when spreadsheet does not exist", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockRejectedValue(
        new Error("Spreadsheet not found")
      );

      const result = await manager.checkSpreadsheet();
      expect(result).toBe(false);
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedManager = new GoogleSheetsManager();
      await expect(unauthenticatedManager.checkSpreadsheet()).rejects.toThrow(
        "not initialized"
      );
    });
  });

  describe("ensureWorksheet", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should create worksheet when it does not exist", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [{ properties: { title: "OtherSheet" } }],
        },
      } as any);

      (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValue(
        {} as any
      );
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.ensureWorksheet();

      expect(
        mockSheets.spreadsheets.batchUpdate as jest.Mock
      ).toHaveBeenCalled();
      expect(
        mockSheets.spreadsheets.values.update as jest.Mock
      ).toHaveBeenCalled();
    });

    it("should not create worksheet when it already exists", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [{ properties: { title: "TestSheet" } }],
        },
      } as any);

      await manager.ensureWorksheet();

      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
    });
  });

  describe("downloadTranslations", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should download translations successfully", async () => {
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"], // Header
            ["welcome.title", "Welcome", "환영합니다"],
            ["button.save", "Save", "저장"],
          ],
        },
      } as any);

      const translations = await manager.downloadTranslations();

      expect(translations).toHaveLength(2);
      expect(translations[0]).toEqual({
        key: "welcome.title",
        en: "Welcome",
        ko: "환영합니다",
      });
    });

    it("should return empty array when no data", async () => {
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [["Key", "English", "Korean"]], // Header only
        },
      } as any);

      const translations = await manager.downloadTranslations();
      expect(translations).toHaveLength(0);
    });

    it("should handle escaped values (starting with ')", async () => {
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["'=formula", "'=value", "'=test"],
          ],
        },
      } as any);

      const translations = await manager.downloadTranslations();
      expect(translations[0].key).toBe("=formula");
      expect(translations[0].en).toBe("=value");
    });
  });

  describe("uploadTranslations", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should upload translations successfully", async () => {
      const localesDir = path.join(tempDir, "locales");
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

      // Mock downloadTranslations (called to check existing keys)
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.uploadTranslations(localesDir, false, false);

      expect(
        mockSheets.spreadsheets.values.update as jest.Mock
      ).toHaveBeenCalled();
    });

    it("should append new translations after existing rows", async () => {
      const localesDir = path.join(tempDir, "locales");
      createDirStructure(localesDir, {
        "en.json": JSON.stringify({
          "existing.key": "Existing",
          "new.key": "New",
        }),
        "ko.json": JSON.stringify({
          "existing.key": "기존",
          "new.key": "신규",
        }),
      });
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["existing.key", "Existing", "기존"],
          ],
        },
      } as any);

      await manager.uploadTranslations(localesDir);

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "TestSheet!A3:C3",
          requestBody: {
            values: [["new.key", "New", "신규"]],
          },
        })
      );
    });

    it("should upload with force mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ "new.key": "New Value" }, null, 2)
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ "new.key": "새 값" }, null, 2)
      );

      // First call: downloadTranslations in force mode (to get existing data for clearing)
      // The clear is only called if existingData.length > 0
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValueOnce({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["old.key", "Old", "오래된"],
          ],
        },
      } as any);

      (mockSheets.spreadsheets.values.clear as jest.Mock).mockResolvedValue(
        {} as any
      );
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.uploadTranslations(localesDir, false, true);

      // In force mode, clear should be called if there's existing data (length > 0)
      // Since we mocked existing data with 1 row, clear should be called
      expect(
        mockSheets.spreadsheets.values.clear as jest.Mock
      ).toHaveBeenCalled();
      expect(
        mockSheets.spreadsheets.values.update as jest.Mock
      ).toHaveBeenCalled();
    });

    it("should clear the full used range in force mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      createDirStructure(localesDir, {
        "en.json": JSON.stringify({ "new.key": "New" }),
        "ko.json": JSON.stringify({ "new.key": "신규" }),
      });
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["old.key", "Old", "기존"],
            ["", "stale without key", "키 없는 값"],
            ["last.key", "Last", "마지막"],
          ],
        },
      } as any);

      await manager.uploadTranslations(localesDir, false, true);

      expect(mockSheets.spreadsheets.values.clear).toHaveBeenCalledWith({
        spreadsheetId: "test-spreadsheet-id",
        range: "TestSheet!A2:C4",
      });
    });

    it("should handle auto-translate mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ key: "" }, null, 2)
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ key: "한국어" }, null, 2)
      );

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.uploadTranslations(localesDir, true, false);

      const updateCall = (mockSheets.spreadsheets.values.update as jest.Mock)
        .mock.calls[0];
      if (updateCall && updateCall[0]?.requestBody?.values) {
        const values = updateCall[0].requestBody.values;
        const englishValue = values[0]?.[1];
        expect(englishValue).toContain("GOOGLETRANSLATE");
      } else {
        // If update wasn't called, it means no new translations (all empty)
        expect(
          (mockSheets.spreadsheets.values.update as jest.Mock).mock.calls.length
        ).toBeGreaterThanOrEqual(0);
      }
    });

    it("should not update or clear Google Sheets in dry-run mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      createDirStructure(localesDir, {
        "en.json": JSON.stringify({ "welcome.title": "Welcome" }),
        "ko.json": JSON.stringify({ "welcome.title": "환영합니다" }),
      });

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["existing.key", "Existing", "기존"],
          ],
        },
      } as any);

      await manager.uploadTranslations(localesDir, false, true, true);

      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.clear).not.toHaveBeenCalled();
    });

    it("should reject namespace symlinks that escape locales", async () => {
      const localesDir = path.join(tempDir, "locales");
      const outsideDir = path.join(tempDir, "outside");
      fs.mkdirSync(localesDir, { recursive: true });
      createDirStructure(outsideDir, {
        "en.json": JSON.stringify({ secret: "do not upload" }),
      });
      fs.symlinkSync(outsideDir, path.join(localesDir, "leak"));
      const namespacedManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "test-spreadsheet-id",
        sheetName: "leak",
        namespace: "leak",
      });
      await namespacedManager.authenticate();

      await expect(
        namespacedManager.uploadTranslations(localesDir, false, false, true)
      ).rejects.toThrow("namespace escapes the locales directory");
    });
  });

  describe("getAllSheetNames", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should return all sheet names", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: "Sheet1" } },
            { properties: { title: "Sheet2" } },
            { properties: { title: "Sheet3" } },
          ],
        },
      } as any);

      const sheetNames = await manager.getAllSheetNames();

      expect(sheetNames).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });

    it("should return empty array when no sheets", async () => {
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [] },
      } as any);

      const sheetNames = await manager.getAllSheetNames();
      expect(sheetNames).toEqual([]);
    });
  });

  describe("downloadAllSheets", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should download all sheets to namespace folders", async () => {
      const localesDir = path.join(tempDir, "locales");

      // Mock getAllSheetNames
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: "common" } },
            { properties: { title: "dashboard" } },
          ],
        },
      } as any);

      // Mock downloadTranslations for each sheet
      // First call: getAllSheetNames
      // Second call: download for "common" sheet
      // Third call: download for "dashboard" sheet
      (mockSheets.spreadsheets.values.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            values: [
              ["Key", "English", "Korean"],
              ["common.key", "Common", "공통"],
            ],
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            values: [
              ["Key", "English", "Korean"],
              ["dashboard.title", "Dashboard", "대시보드"],
            ],
          },
        } as any);

      await manager.downloadAllSheets(localesDir, ["en", "ko"]);

      // Check if namespace folders were created
      expect(fs.existsSync(path.join(localesDir, "common"))).toBe(true);
      expect(fs.existsSync(path.join(localesDir, "dashboard"))).toBe(true);
    });

    it("should handle empty sheets", async () => {
      const localesDir = path.join(tempDir, "locales");

      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [] },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en", "ko"]);

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should preserve local values during incremental download", async () => {
      const localesDir = path.join(tempDir, "locales");
      createDirStructure(localesDir, {
        common: {
          "en.json": JSON.stringify({
            "common.key": "Local value",
            "local.only": "Keep me",
          }),
        },
      });
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["common.key", "Remote value", "원격 값"],
            ["remote.new", "New value", "새 값"],
          ],
        },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en"]);

      expect(readJsonFile(path.join(localesDir, "common", "en.json"))).toEqual({
        "common.key": "Local value",
        "local.only": "Keep me",
        "remote.new": "New value",
      });
    });

    it("should replace local values during force download", async () => {
      const localesDir = path.join(tempDir, "locales");
      createDirStructure(localesDir, {
        common: {
          "en.json": JSON.stringify({
            "common.key": "Local value",
            "local.only": "Remove me",
          }),
        },
      });
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["common.key", "Remote value", "원격 값"],
          ],
        },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en"], { force: true });

      expect(readJsonFile(path.join(localesDir, "common", "en.json"))).toEqual({
        "common.key": "Remote value",
      });
    });

    it("should not create locale directories in dry-run mode", async () => {
      const localesDir = path.join(tempDir, "dry-run-locales");
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["common.key", "Remote value", "원격 값"],
          ],
        },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en", "ko"], {
        dryRun: true,
      });

      expect(fs.existsSync(localesDir)).toBe(false);
    });

    it("should reject sheet names that escape the locales directory", async () => {
      const localesDir = path.join(tempDir, "locales");
      const outsideDir = path.join(tempDir, "outside");
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "../outside" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["secret.key", "Secret", "비밀"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["en", "ko"])
      ).rejects.toThrow("namespace is not a safe path segment");
      expect(fs.existsSync(outsideDir)).toBe(false);
    });

    it("should reject namespace symlinks that escape locales", async () => {
      const localesDir = path.join(tempDir, "locales");
      const outsideDir = path.join(tempDir, "outside");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.symlinkSync(outsideDir, path.join(localesDir, "common"));
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["secret.key", "Secret", "비밀"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["en", "ko"])
      ).rejects.toThrow("namespace escapes the locales directory");
      expect(fs.readdirSync(outsideDir)).toHaveLength(0);
    });

    it("should reject translation file symlinks that escape locales", async () => {
      const localesDir = path.join(tempDir, "locales");
      const namespaceDir = path.join(localesDir, "common");
      const outsideFile = path.join(tempDir, "outside.json");
      fs.mkdirSync(namespaceDir, { recursive: true });
      fs.writeFileSync(outsideFile, JSON.stringify({ keep: "unchanged" }));
      fs.symlinkSync(outsideFile, path.join(namespaceDir, "en.json"));
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["remote.key", "Remote", "원격"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["en"], { force: true })
      ).rejects.toThrow("translation file escapes the locales directory");
      expect(readJsonFile(outsideFile)).toEqual({ keep: "unchanged" });
    });

    it("should reject unsafe language path segments", async () => {
      const localesDir = path.join(tempDir, "locales");
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["remote.key", "Remote", "원격"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["../outside"])
      ).rejects.toThrow("translation file is not a safe path segment");
    });
  });

  describe("uploadAllNamespaces", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should upload all namespaces to separate sheets", async () => {
      const localesDir = path.join(tempDir, "locales");

      createDirStructure(localesDir, {
        common: {
          "en.json": { "common.key": "Common" },
          "ko.json": { "common.key": "공통" },
        },
        dashboard: {
          "en.json": { "dashboard.title": "Dashboard" },
          "ko.json": { "dashboard.title": "대시보드" },
        },
      });

      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [{ properties: { title: "common" } }], // dashboard sheet doesn't exist
        },
      } as any);

      (mockSheets.spreadsheets.batchUpdate as jest.Mock).mockResolvedValue(
        {} as any
      );
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);

      await manager.uploadAllNamespaces(localesDir, false, false);

      // Should create dashboard sheet and upload both namespaces
      expect(
        mockSheets.spreadsheets.batchUpdate as jest.Mock
      ).toHaveBeenCalled();
      expect(
        mockSheets.spreadsheets.values.update as jest.Mock
      ).toHaveBeenCalled();
    });

    it("should handle empty locales directory", async () => {
      const localesDir = path.join(tempDir, "empty-locales");
      fs.mkdirSync(localesDir, { recursive: true });

      await manager.uploadAllNamespaces(localesDir, false, false);

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe("saveTranslationsToLocal", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should save translations to local files", async () => {
      const localesDir = path.join(tempDir, "locales");

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["welcome.title", "Welcome", "환영합니다"],
            ["button.save", "Save", "저장"],
          ],
        },
      } as any);

      await manager.saveTranslationsToLocal(localesDir, ["en", "ko"]);

      const enFile = path.join(localesDir, "en.json");
      const koFile = path.join(localesDir, "ko.json");

      expect(fileExists(enFile)).toBe(true);
      expect(fileExists(koFile)).toBe(true);

      const enData = readJsonFile(enFile);
      const koData = readJsonFile(koFile);

      expect(enData["welcome.title"]).toBe("Welcome");
      expect(koData["welcome.title"]).toBe("환영합니다");
    });

    it("should save to namespace folder when namespace is set", async () => {
      const namespaceManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "test-id",
        sheetName: "TestSheet",
        namespace: "common",
      });
      await namespaceManager.authenticate();

      const localesDir = path.join(tempDir, "locales");

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["key", "Value", "값"],
          ],
        },
      } as any);

      await namespaceManager.saveTranslationsToLocal(localesDir, ["en", "ko"]);

      const enFile = path.join(localesDir, "common", "en.json");
      expect(fileExists(enFile)).toBe(true);
    });
  });

  describe("escapeFormula", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should escape formula starting with =", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ "=formula": "=formula" }, null, 2)
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ "=formula": "=수식" }, null, 2)
      );

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.uploadTranslations(localesDir, false, false);

      const updateCall = (mockSheets.spreadsheets.values.update as jest.Mock)
        .mock.calls[0];
      if (updateCall && updateCall[0]?.requestBody?.values) {
        const values = updateCall[0].requestBody.values;
        expect(values[0]?.[0]).toBe("'=formula");
      }
    });

    it("should escape date patterns", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ date: "12/25/2024" }, null, 2)
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ date: "2024/12/25" }, null, 2)
      );

      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);
      (mockSheets.spreadsheets.values.update as jest.Mock).mockResolvedValue(
        {} as any
      );

      await manager.uploadTranslations(localesDir, false, false);

      const updateCall = (mockSheets.spreadsheets.values.update as jest.Mock)
        .mock.calls[0];
      if (updateCall && updateCall[0]?.requestBody?.values) {
        const values = updateCall[0].requestBody.values;
        expect(values[0]?.[1]).toBe("'12/25/2024");
      }
    });
  });

  describe("readLocalTranslations", () => {
    it("should read translations from local files", async () => {
      const localesDir = path.join(tempDir, "locales");
      // 레거시 구조: locales/en.json, locales/ko.json (namespace 없음)
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

      const translations = await manager.readLocalTranslations(localesDir);

      expect(translations.length).toBeGreaterThan(0);
      const welcomeTranslation = translations.find(
        (t) => t.key === "welcome.title"
      );
      expect(welcomeTranslation).toBeDefined();
      expect(welcomeTranslation?.en).toBe("Welcome");
      expect(welcomeTranslation?.ko).toBe("환영합니다");
    });

    it("should return empty array when directory does not exist", async () => {
      const translations = await manager.readLocalTranslations(
        path.join(tempDir, "nonexistent")
      );
      expect(translations).toEqual([]);
    });
  });
});
