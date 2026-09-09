import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import { downloadTranslations } from "../../../bin/i18n-download";
import {
  cleanupDir,
  createTempDir,
  fileExists,
  readJsonFile,
} from "../cli-test-utils";

jest.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth: jest.fn() },
    sheets: jest.fn(),
  },
}));

describe("i18n-download integration", () => {
  let projectDir: string;
  let mockSheets: any;

  beforeEach(() => {
    projectDir = createTempDir();
    fs.writeFileSync(
      path.join(projectDir, "credentials.json"),
      JSON.stringify({ type: "service_account", private_key: "test" })
    );
    (google.auth.GoogleAuth as unknown as jest.Mock).mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue({}),
    }));
    mockSheets = {
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: {
            sheets: [
              { properties: { title: "common" } },
              { properties: { title: "dashboard" } },
            ],
          },
        }),
        values: { get: jest.fn() },
      },
    };
    (google.sheets as jest.Mock).mockReturnValue(mockSheets);
  });

  afterEach(() => {
    cleanupDir(projectDir);
    jest.clearAllMocks();
  });

  function runDownload(languages = ["en", "ko"]): Promise<void> {
    return downloadTranslations({
      credentialsPath: path.join(projectDir, "credentials.json"),
      spreadsheetId: "test-spreadsheet-id",
      localesDir: path.join(projectDir, "locales"),
      sheetName: "Translations",
      languages,
    });
  }

  it("downloads every sheet into namespace files", async () => {
    mockSheets.spreadsheets.values.get
      .mockResolvedValueOnce({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["title", "Title", "제목"],
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          values: [
            ["Key", "English", "Korean"],
            ["heading", "Dashboard", "대시보드"],
          ],
        },
      });

    await runDownload();

    expect(fileExists(path.join(projectDir, "locales/common/en.json"))).toBe(
      true
    );
    expect(fileExists(path.join(projectDir, "locales/dashboard/ko.json"))).toBe(
      true
    );
    expect(
      readJsonFile(path.join(projectDir, "locales/common/ko.json"))
    ).toEqual({ title: "제목" });
  });

  it("writes only the requested language files", async () => {
    mockSheets.spreadsheets.get.mockResolvedValue({
      data: { sheets: [{ properties: { title: "common" } }] },
    });
    mockSheets.spreadsheets.values.get.mockResolvedValue({
      data: {
        values: [
          ["Key", "English", "Japanese"],
          ["title", "Title", "タイトル"],
        ],
      },
    });

    await runDownload(["en", "ja"]);

    expect(fileExists(path.join(projectDir, "locales/common/en.json"))).toBe(
      true
    );
    expect(fileExists(path.join(projectDir, "locales/common/ja.json"))).toBe(
      true
    );
    expect(
      readJsonFile(path.join(projectDir, "locales/common/ja.json"))
    ).toEqual({ title: "タイトル" });
    expect(fileExists(path.join(projectDir, "locales/common/ko.json"))).toBe(
      false
    );
  });

  it("rejects missing spreadsheet configuration before authentication", async () => {
    await expect(
      downloadTranslations({
        credentialsPath: path.join(projectDir, "credentials.json"),
        spreadsheetId: "",
        localesDir: path.join(projectDir, "locales"),
      })
    ).rejects.toThrow("Spreadsheet ID is required");
    expect(google.sheets).not.toHaveBeenCalled();
  });

  it("rejects a missing credentials file before network access", async () => {
    await expect(
      downloadTranslations({
        credentialsPath: path.join(projectDir, "missing.json"),
        spreadsheetId: "test-spreadsheet-id",
        localesDir: path.join(projectDir, "locales"),
      })
    ).rejects.toThrow("Credentials file not found");
    expect(google.sheets).not.toHaveBeenCalled();
  });
});
