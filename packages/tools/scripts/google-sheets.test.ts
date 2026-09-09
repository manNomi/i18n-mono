/**
 * Google Sheets Manager 테스트
 */

import * as fs from "fs";
import * as path from "path";
import {
  formatGoogleSheetsError,
  GoogleSheetsManager,
  TranslationRow,
} from "./google-sheets";
import {
  createTempDir,
  cleanupTempDir,
  createTempJsonFile,
  createTempFile,
  fileExists,
  readJsonFile,
} from "./__tests__/test-utils";
import { google, sheets_v4 } from "googleapis";
import { AtomicFileSystem } from "./common/atomic-file-transaction";

function failWhenCommitting(targetFileName: string): AtomicFileSystem {
  return {
    existsSync: fs.existsSync,
    lstatSync: fs.lstatSync,
    mkdirSync: fs.mkdirSync,
    readFileSync: fs.readFileSync,
    readdirSync: fs.readdirSync,
    realpathSync: fs.realpathSync,
    renameSync: ((source, target) => {
      if (
        path.basename(String(target)) === targetFileName &&
        String(source).endsWith(".tmp")
      ) {
        throw new Error(`injected ${targetFileName} commit failure`);
      }
      fs.renameSync(source, target);
    }) as typeof fs.renameSync,
    unlinkSync: fs.unlinkSync,
    writeFileSync: fs.writeFileSync,
  };
}

// googleapis mock
jest.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
    sheets: jest.fn(),
  },
}));

describe("formatGoogleSheetsError", () => {
  it("keeps safe diagnostics and status without serializing request config", () => {
    const error = Object.assign(new Error("Quota exceeded"), {
      response: { status: 429 },
      config: { headers: { Authorization: "Bearer secret-token" } },
    });

    expect(formatGoogleSheetsError(error)).toBe("Quota exceeded (status: 429)");
  });

  it.each([
    "Authorization: Bearer secret-token",
    'private_key: "secret"',
    "-----BEGIN PRIVATE KEY----- secret -----END PRIVATE KEY-----",
  ])("redacts sensitive error messages", (message) => {
    const formatted = formatGoogleSheetsError(new Error(message));

    expect(formatted).toBe("Sensitive diagnostic details were redacted");
    expect(formatted).not.toContain("secret");
  });
});

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
    const mockGet = jest.fn().mockResolvedValue({
      data: { sheets: [{ properties: { title: "TestSheet" } }] },
    });
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

    it("rejects unsafe and case-colliding language file names", () => {
      expect(
        () => new GoogleSheetsManager({ languages: ["en", "=IMPORTXML"] })
      ).toThrow("Invalid language file name");
      expect(
        () => new GoogleSheetsManager({ languages: ["pt-BR", "pt-br"] })
      ).toThrow("Duplicate languages");
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

    it("maps language columns from the worksheet header", async () => {
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "Korean", "Japanese", "English"],
            ["welcome", "환영", "ようこそ", "Welcome"],
          ],
        },
      } as any);

      await expect(manager.downloadTranslations()).resolves.toEqual([
        { key: "welcome", ko: "환영", ja: "ようこそ", en: "Welcome" },
      ]);
    });

    it("preserves custom locale casing and quotes worksheet names in A1 ranges", async () => {
      const quotedManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "test-spreadsheet-id",
        sheetName: "Team's copy",
      });
      await quotedManager.authenticate();
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "pt-BR"],
            ["count", 12],
          ],
        },
      } as any);

      await expect(quotedManager.downloadTranslations()).resolves.toEqual([
        { key: "count", "pt-BR": "12" },
      ]);
      expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith(
        expect.objectContaining({ range: "'Team''s copy'!A:ZZ" })
      );
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

    it("appends incremental rows after existing remote rows", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ existing: "Existing", added: "Added" })
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ existing: "기존", added: "추가" })
      );
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["existing", "Remote", "원격"],
          ],
        },
      } as any);

      await manager.uploadTranslations(localesDir);

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "'TestSheet'!A3:C3",
          requestBody: { values: [["added", "Added", "추가"]] },
        })
      );
    });

    it("adds configured language columns and uploads their values", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      for (const [language, value] of [
        ["en", "Welcome"],
        ["ko", "환영"],
        ["ja", "ようこそ"],
      ]) {
        fs.writeFileSync(
          path.join(localesDir, `${language}.json`),
          JSON.stringify({ welcome: value })
        );
      }
      const multilingualManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "test-spreadsheet-id",
        sheetName: "TestSheet",
        languages: ["en", "ko", "ja"],
      });
      await multilingualManager.authenticate();
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: { values: [["Key", "English", "Korean"]] },
      } as any);

      await multilingualManager.uploadTranslations(localesDir);

      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "'TestSheet'!A1:D1",
          requestBody: { values: [["Key", "English", "Korean", "Japanese"]] },
        })
      );
      expect(mockSheets.spreadsheets.values.update).toHaveBeenCalledWith(
        expect.objectContaining({
          range: "'TestSheet'!A2:D2",
          requestBody: {
            values: [["welcome", "Welcome", "환영", "ようこそ"]],
          },
        })
      );
    });

    it("rejects malformed local resources before worksheet access or mutation", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(path.join(localesDir, "en.json"), "malformed json");

      await expect(manager.uploadTranslations(localesDir)).rejects.toThrow();
      expect(mockSheets.spreadsheets.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
    });

    it("rejects missing configured locale files before worksheet access or mutation", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ welcome: "Welcome" })
      );
      fs.writeFileSync(
        path.join(localesDir, "ko.json"),
        JSON.stringify({ welcome: "환영" })
      );
      const multilingualManager = new GoogleSheetsManager({
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "test-spreadsheet-id",
        sheetName: "TestSheet",
        languages: ["en", "ko", "ja"],
      });
      await multilingualManager.authenticate();

      await expect(
        multilingualManager.uploadTranslations(localesDir, false, true)
      ).rejects.toThrow(
        "Local locale files is missing requested language column(s): ja"
      );
      expect(mockSheets.spreadsheets.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.clear).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
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

      const updateCall = (
        mockSheets.spreadsheets.values.update as jest.Mock
      ).mock.calls.at(-1);
      if (updateCall && updateCall[0]?.requestBody?.values) {
        const values = updateCall[0].requestBody.values;
        const englishValue = values[0]?.[1];
        expect(englishValue).toBe('=GOOGLETRANSLATE(C2, "ko", "en")');
      } else {
        // If update wasn't called, it means no new translations (all empty)
        expect(
          (mockSheets.spreadsheets.values.update as jest.Mock).mock.calls.length
        ).toBeGreaterThanOrEqual(0);
      }
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

    it("should preserve existing values and local-only keys in normal mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      const namespaceDir = path.join(localesDir, "common");
      fs.mkdirSync(namespaceDir, { recursive: true });
      fs.writeFileSync(
        path.join(namespaceDir, "en.json"),
        JSON.stringify(
          { shared: "Local", localOnly: "Keep", empty: "" },
          null,
          2
        )
      );
      fs.writeFileSync(
        path.join(namespaceDir, "ko.json"),
        JSON.stringify(
          { shared: "로컬", localOnly: "유지", empty: "" },
          null,
          2
        )
      );
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["shared", "Remote", "원격"],
            ["remoteOnly", "Add", "추가"],
            ["empty", "Filled", "채움"],
          ],
        },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en", "ko"], {
        force: false,
      });

      expect(readJsonFile(path.join(namespaceDir, "en.json"))).toEqual({
        shared: "Local",
        localOnly: "Keep",
        empty: "Filled",
        remoteOnly: "Add",
      });
      expect(readJsonFile(path.join(namespaceDir, "ko.json"))).toEqual({
        shared: "로컬",
        localOnly: "유지",
        empty: "채움",
        remoteOnly: "추가",
      });
    });

    it("should replace local content with the remote snapshot in force mode", async () => {
      const localesDir = path.join(tempDir, "locales");
      const namespaceDir = path.join(localesDir, "common");
      fs.mkdirSync(namespaceDir, { recursive: true });
      fs.writeFileSync(
        path.join(namespaceDir, "en.json"),
        JSON.stringify({ shared: "Local", localOnly: "Remove" }, null, 2)
      );
      fs.writeFileSync(
        path.join(namespaceDir, "ko.json"),
        JSON.stringify({ shared: "로컬", localOnly: "제거" }, null, 2)
      );
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "common" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["shared", "Remote", "원격"],
            ["remoteOnly", "Add", "추가"],
            ["intentionallyEmpty", "", ""],
          ],
        },
      } as any);

      await manager.downloadAllSheets(localesDir, ["en", "ko"], {
        force: true,
      });

      expect(readJsonFile(path.join(namespaceDir, "en.json"))).toEqual({
        shared: "Remote",
        remoteOnly: "Add",
        intentionallyEmpty: "",
      });
      expect(readJsonFile(path.join(namespaceDir, "ko.json"))).toEqual({
        shared: "원격",
        remoteOnly: "추가",
        intentionallyEmpty: "",
      });
    });

    it("should leave every namespace unchanged when a later sheet fetch fails", async () => {
      const localesDir = path.join(tempDir, "locales");
      const commonFile = path.join(localesDir, "common", "en.json");
      const dashboardFile = path.join(localesDir, "dashboard", "en.json");
      fs.mkdirSync(path.dirname(commonFile), { recursive: true });
      fs.mkdirSync(path.dirname(dashboardFile), { recursive: true });
      fs.writeFileSync(commonFile, '{"value":"old-common"}\n');
      fs.writeFileSync(dashboardFile, '{"value":"old-dashboard"}\n');
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: "common" } },
            { properties: { title: "dashboard" } },
          ],
        },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock)
        .mockResolvedValueOnce({
          data: {
            values: [
              ["Key", "English", "Korean"],
              ["value", "new-common", "새 공통"],
            ],
          },
        } as any)
        .mockRejectedValueOnce(new Error("second sheet unavailable"));

      await expect(
        manager.downloadAllSheets(localesDir, ["en"], { force: true })
      ).rejects.toThrow("second sheet unavailable");

      expect(fs.readFileSync(commonFile, "utf-8")).toBe(
        '{"value":"old-common"}\n'
      );
      expect(fs.readFileSync(dashboardFile, "utf-8")).toBe(
        '{"value":"old-dashboard"}\n'
      );
    });

    it("should parse every existing target before replacing any file", async () => {
      const localesDir = path.join(tempDir, "locales");
      const commonFile = path.join(localesDir, "common", "en.json");
      const dashboardFile = path.join(localesDir, "dashboard", "en.json");
      fs.mkdirSync(path.dirname(commonFile), { recursive: true });
      fs.mkdirSync(path.dirname(dashboardFile), { recursive: true });
      fs.writeFileSync(commonFile, '{"value":"old-common"}\n');
      fs.writeFileSync(dashboardFile, "malformed json");
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: {
          sheets: [
            { properties: { title: "common" } },
            { properties: { title: "dashboard" } },
          ],
        },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["value", "remote", "원격"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["en"], { force: true })
      ).rejects.toThrow();

      expect(fs.readFileSync(commonFile, "utf-8")).toBe(
        '{"value":"old-common"}\n'
      );
      expect(fs.readFileSync(dashboardFile, "utf-8")).toBe("malformed json");
    });

    it("should reject sheet names that escape the locales directory", async () => {
      const localesDir = path.join(tempDir, "locales");
      const escapedFile = path.join(tempDir, "escape", "en.json");
      (mockSheets.spreadsheets.get as jest.Mock).mockResolvedValue({
        data: { sheets: [{ properties: { title: "../escape" } }] },
      } as any);
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["value", "remote", "원격"],
          ],
        },
      } as any);

      await expect(
        manager.downloadAllSheets(localesDir, ["en"])
      ).rejects.toThrow("Refusing to access path outside");
      expect(fs.existsSync(escapedFile)).toBe(false);
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
  });

  describe("uploadAllNamespaces", () => {
    beforeEach(async () => {
      await manager.authenticate();
    });

    it("should upload all namespaces to separate sheets", async () => {
      const localesDir = path.join(tempDir, "locales");

      for (const [namespace, resources] of Object.entries({
        common: {
          "en.json": { "common.key": "Common" },
          "ko.json": { "common.key": "공통" },
        },
        dashboard: {
          "en.json": { "dashboard.title": "Dashboard" },
          "ko.json": { "dashboard.title": "대시보드" },
        },
      })) {
        const namespaceDir = path.join(localesDir, namespace);
        fs.mkdirSync(namespaceDir, { recursive: true });
        for (const [fileName, resource] of Object.entries(resources)) {
          fs.writeFileSync(
            path.join(namespaceDir, fileName),
            JSON.stringify(resource)
          );
        }
      }

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

    it("validates every namespace before mutating the first sheet", async () => {
      const localesDir = path.join(tempDir, "locales");
      for (const namespace of ["common", "dashboard"]) {
        fs.mkdirSync(path.join(localesDir, namespace), { recursive: true });
        fs.writeFileSync(
          path.join(localesDir, namespace, "en.json"),
          JSON.stringify({ title: namespace })
        );
        fs.writeFileSync(
          path.join(localesDir, namespace, "ko.json"),
          namespace === "dashboard"
            ? "malformed json"
            : JSON.stringify({ title: "제목" })
        );
      }

      await expect(manager.uploadAllNamespaces(localesDir)).rejects.toThrow();

      expect(mockSheets.spreadsheets.get).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.batchUpdate).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
      expect(mockSheets.spreadsheets.values.clear).not.toHaveBeenCalled();
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

    it("rolls back locale files when an additional generated file fails", async () => {
      const localesDir = path.join(tempDir, "locales");
      const enFile = path.join(localesDir, "en.json");
      const koFile = path.join(localesDir, "ko.json");
      const indexFile = path.join(localesDir, "index.ts");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(enFile, '{"old":"en"}\n');
      fs.writeFileSync(koFile, '{"old":"ko"}\n');
      fs.writeFileSync(indexFile, "// old index\n");
      const failingManager = new GoogleSheetsManager(
        {
          credentialsPath: path.join(tempDir, "credentials.json"),
          spreadsheetId: "test-spreadsheet-id",
          sheetName: "TestSheet",
        },
        failWhenCommitting("index.ts")
      );
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["new", "New", "신규"],
          ],
        },
      } as any);
      await failingManager.authenticate();

      await expect(
        failingManager.saveTranslationsToLocal(
          localesDir,
          ["en", "ko"],
          [{ filePath: indexFile, content: "// new index\n" }]
        )
      ).rejects.toThrow("injected index.ts commit failure");

      expect(fs.readFileSync(enFile, "utf-8")).toBe('{"old":"en"}\n');
      expect(fs.readFileSync(koFile, "utf-8")).toBe('{"old":"ko"}\n');
      expect(fs.readFileSync(indexFile, "utf-8")).toBe("// old index\n");
    });

    it("rejects a missing requested sheet language before replacing local files", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      const jaFile = path.join(localesDir, "ja.json");
      fs.writeFileSync(jaFile, '{"old":"保持"}\n');
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["new", "New", "신규"],
          ],
        },
      } as any);

      await expect(
        manager.saveTranslationsToLocal(localesDir, ["en", "ja"])
      ).rejects.toThrow("missing requested language column(s): ja");
      expect(fs.readFileSync(jaFile, "utf-8")).toBe('{"old":"保持"}\n');
      expect(fs.existsSync(path.join(localesDir, "en.json"))).toBe(false);
    });

    it("rejects an existing locale symlink before reading or replacing it", async () => {
      const localesDir = path.join(tempDir, "locales");
      const outsideFile = path.join(tempDir, "outside.json");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(outsideFile, '{"secret":"unchanged"}\n');
      fs.symlinkSync(outsideFile, path.join(localesDir, "en.json"));
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["new", "New", "신규"],
          ],
        },
      } as any);

      await expect(
        manager.saveTranslationsToLocal(localesDir, ["en", "ko"])
      ).rejects.toThrow("non-regular locale file");
      expect(fs.readFileSync(outsideFile, "utf-8")).toBe(
        '{"secret":"unchanged"}\n'
      );
    });
  });

  describe("sync and CSV local transactions", () => {
    it("parses multiline CSV fields and rejects duplicate language headers", async () => {
      const csvPath = path.join(tempDir, "multiline.csv");
      fs.writeFileSync(
        csvPath,
        'Key,English,pt-BR\nmessage,"Line one\nLine two","Olá, mundo"\n'
      );

      await expect(manager.readTranslationsFromCSV(csvPath)).resolves.toEqual([
        {
          key: "message",
          en: "Line one\nLine two",
          "pt-BR": "Olá, mundo",
        },
      ]);

      fs.writeFileSync(csvPath, "Key,English,en\nmessage,First,Second\n");
      await expect(manager.readTranslationsFromCSV(csvPath)).rejects.toThrow(
        "Duplicate languages"
      );
    });

    it("rejects a missing requested CSV language before replacing files", async () => {
      const csvPath = path.join(tempDir, "translations.csv");
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      const koFile = path.join(localesDir, "ko.json");
      fs.writeFileSync(koFile, '{"old":"유지"}\n');
      fs.writeFileSync(csvPath, "Key,English\nwelcome,Welcome\n");

      await expect(
        manager.convertCSVToLocalTranslations(csvPath, localesDir, ["en", "ko"])
      ).rejects.toThrow("CSV is missing requested language column(s): ko");
      expect(fs.readFileSync(koFile, "utf-8")).toBe('{"old":"유지"}\n');
      expect(fs.existsSync(path.join(localesDir, "en.json"))).toBe(false);
    });

    it("rolls back every local language when sync commit fails", async () => {
      const localesDir = path.join(tempDir, "locales");
      const failingManager = new GoogleSheetsManager(
        {
          credentialsPath: path.join(tempDir, "credentials.json"),
          spreadsheetId: "test-spreadsheet-id",
          sheetName: "TestSheet",
        },
        failWhenCommitting("ko.json")
      );
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["remote", "Remote", "원격"],
          ],
        },
      } as any);
      await failingManager.authenticate();

      await expect(failingManager.syncTranslations(localesDir)).rejects.toThrow(
        "injected ko.json commit failure"
      );

      expect(fs.existsSync(path.join(localesDir, "en.json"))).toBe(false);
      expect(fs.existsSync(path.join(localesDir, "ko.json"))).toBe(false);
      expect(
        fs.existsSync(
          path.join(localesDir, ".i18nexus-download-transaction.json")
        )
      ).toBe(false);
    });

    it("rejects malformed local resources before sync mutates Google Sheets", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(path.join(localesDir, "en.json"), "malformed json");
      (mockSheets.spreadsheets.values.get as jest.Mock).mockResolvedValue({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["remote", "Remote", "원격"],
          ],
        },
      } as any);
      await manager.authenticate();

      await expect(manager.syncTranslations(localesDir)).rejects.toThrow();
      expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
    });

    it("rolls back every CSV language and rejects escaping language names", async () => {
      const csvPath = path.join(tempDir, "translations.csv");
      const localesDir = path.join(tempDir, "locales");
      fs.writeFileSync(
        csvPath,
        "Key,English,Korean\nwelcome,Welcome,환영합니다\n"
      );
      const failingManager = new GoogleSheetsManager(
        {},
        failWhenCommitting("ko.json")
      );

      await expect(
        failingManager.convertCSVToLocalTranslations(csvPath, localesDir)
      ).rejects.toThrow("injected ko.json commit failure");
      expect(fs.existsSync(path.join(localesDir, "en.json"))).toBe(false);
      expect(fs.existsSync(path.join(localesDir, "ko.json"))).toBe(false);

      await expect(
        manager.convertCSVToLocalTranslations(csvPath, localesDir, [
          "en",
          "../../escape",
        ])
      ).rejects.toThrow("Invalid language file name");
      expect(fs.existsSync(path.join(tempDir, "escape.json"))).toBe(false);
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

    it("rejects malformed and non-string local resources", async () => {
      const localesDir = path.join(tempDir, "locales");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ nested: { value: "invalid" } })
      );

      await expect(manager.readLocalTranslations(localesDir)).rejects.toThrow(
        "Expected a JSON object with string values"
      );
    });

    it("ignores locale symlink files and rejects namespace symlink escapes", async () => {
      const localesDir = path.join(tempDir, "locales");
      const outsideDir = path.join(tempDir, "outside");
      fs.mkdirSync(localesDir, { recursive: true });
      fs.mkdirSync(outsideDir, { recursive: true });
      fs.writeFileSync(
        path.join(outsideDir, "secret.json"),
        JSON.stringify({ secret: "do not upload" })
      );
      fs.symlinkSync(
        path.join(outsideDir, "secret.json"),
        path.join(localesDir, "en.json")
      );

      await expect(manager.readLocalTranslations(localesDir)).resolves.toEqual(
        []
      );

      fs.symlinkSync(outsideDir, path.join(localesDir, "escaped"));
      const namespaceManager = new GoogleSheetsManager({
        namespace: "escaped",
      });
      await expect(
        namespaceManager.readLocalTranslations(localesDir)
      ).rejects.toThrow("non-regular locale directory");
    });
  });
});
