import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import { downloadTranslations } from "../../../bin/i18n-download";
import { uploadTranslations } from "../../../bin/i18n-upload";
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

describe("Google Sheets upload/download workflow", () => {
  let projectDir: string;
  let mockSheets: any;

  beforeEach(() => {
    projectDir = createTempDir();
    fs.mkdirSync(path.join(projectDir, "locales", "common"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(projectDir, "credentials.json"),
      JSON.stringify({ type: "service_account", private_key: "test" })
    );
    fs.writeFileSync(
      path.join(projectDir, "locales", "common", "en.json"),
      JSON.stringify({ title: "Title" })
    );
    fs.writeFileSync(
      path.join(projectDir, "locales", "common", "ko.json"),
      JSON.stringify({ title: "제목" })
    );
    (google.auth.GoogleAuth as unknown as jest.Mock).mockImplementation(() => ({
      getClient: jest.fn().mockResolvedValue({}),
    }));
    mockSheets = {
      spreadsheets: {
        get: jest.fn().mockResolvedValue({
          data: { sheets: [{ properties: { title: "common" } }] },
        }),
        batchUpdate: jest.fn().mockResolvedValue({}),
        values: {
          get: jest.fn().mockResolvedValue({
            data: { values: [["Key", "English", "Korean"]] },
          }),
          update: jest.fn().mockResolvedValue({}),
          clear: jest.fn().mockResolvedValue({}),
        },
      },
    };
    (google.sheets as jest.Mock).mockReturnValue(mockSheets);
  });

  afterEach(() => {
    cleanupDir(projectDir);
    jest.clearAllMocks();
  });

  it("uploads local namespaces and downloads the remote snapshot", async () => {
    const credentialsPath = path.join(projectDir, "credentials.json");
    await uploadTranslations(path.join(projectDir, "locales"), {
      credentialsPath,
      spreadsheetId: "test-spreadsheet-id",
      localesDir: path.join(projectDir, "locales"),
      sheetName: "Translations",
      autoTranslate: false,
      force: false,
      dryRun: false,
      languages: ["en", "ko"],
    });
    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();

    mockSheets.spreadsheets.values.get.mockResolvedValue({
      data: {
        values: [
          ["Key", "English", "Korean"],
          ["title", "Remote title", "원격 제목"],
        ],
      },
    });
    const downloadDir = path.join(projectDir, "downloaded");
    await downloadTranslations({
      credentialsPath,
      spreadsheetId: "test-spreadsheet-id",
      localesDir: downloadDir,
      languages: ["en", "ko"],
    });

    expect(fileExists(path.join(downloadDir, "common", "en.json"))).toBe(true);
    expect(readJsonFile(path.join(downloadDir, "common", "ko.json"))).toEqual({
      title: "원격 제목",
    });
  });
});
