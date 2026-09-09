import * as fs from "fs";
import * as path from "path";
import { google } from "googleapis";
import { uploadTranslations } from "../../../bin/i18n-upload";
import {
  cleanupDir,
  createTempDir,
  createTestConfig,
  createTestProject,
  runCLICommand,
} from "../cli-test-utils";

jest.mock("googleapis", () => ({
  google: {
    auth: { GoogleAuth: jest.fn() },
    sheets: jest.fn(),
  },
}));

describe("i18n-upload integration", () => {
  let tempDir: string;
  let mockSheets: any;

  beforeEach(() => {
    tempDir = createTempDir();
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
    cleanupDir(tempDir);
    jest.clearAllMocks();
  });

  function createProject(locales: Record<string, unknown>): string {
    const projectDir = createTestProject(tempDir, {
      locales: locales as any,
    });
    fs.writeFileSync(
      path.join(projectDir, "credentials.json"),
      JSON.stringify({ type: "service_account", private_key: "test" })
    );
    return projectDir;
  }

  async function upload(
    projectDir: string,
    options: { autoTranslate?: boolean; force?: boolean } = {}
  ): Promise<void> {
    await uploadTranslations(path.join(projectDir, "locales"), {
      credentialsPath: path.join(projectDir, "credentials.json"),
      spreadsheetId: "test-spreadsheet-id",
      localesDir: path.join(projectDir, "locales"),
      sheetName: "Translations",
      autoTranslate: options.autoTranslate ?? false,
      force: options.force ?? false,
      dryRun: false,
      languages: ["en", "ko"],
    });
  }

  it("uploads a flat locale set to the default sheet", async () => {
    const projectDir = createProject({
      "en.json": JSON.stringify({ title: "Title" }),
      "ko.json": JSON.stringify({ title: "제목" }),
    });

    await upload(projectDir);

    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
  });

  it("uploads every detected namespace", async () => {
    const projectDir = createProject({
      common: {
        "en.json": JSON.stringify({ title: "Title" }),
        "ko.json": JSON.stringify({ title: "제목" }),
      },
      dashboard: {
        "en.json": JSON.stringify({ heading: "Dashboard" }),
        "ko.json": JSON.stringify({ heading: "대시보드" }),
      },
    });

    await upload(projectDir);

    expect(
      mockSheets.spreadsheets.values.update.mock.calls.length
    ).toBeGreaterThanOrEqual(2);
  });

  it("validates every namespace before authentication or remote mutation", async () => {
    const projectDir = createProject({
      common: {
        "en.json": JSON.stringify({ title: "Title" }),
        "ko.json": JSON.stringify({ title: "제목" }),
      },
      dashboard: {
        "en.json": JSON.stringify({ heading: "Dashboard" }),
        "ko.json": "malformed json",
      },
    });

    await expect(upload(projectDir)).rejects.toThrow();

    expect(google.auth.GoogleAuth).not.toHaveBeenCalled();
    expect(google.sheets).not.toHaveBeenCalled();
    expect(mockSheets.spreadsheets.values.update).not.toHaveBeenCalled();
  });

  it("clears existing rows in force mode before upload", async () => {
    const projectDir = createProject({
      "en.json": JSON.stringify({ title: "Title" }),
      "ko.json": JSON.stringify({ title: "제목" }),
    });
    mockSheets.spreadsheets.values.get.mockResolvedValue({
      data: {
        values: [
          ["Key", "English", "Korean"],
          ["old", "Old", "이전"],
        ],
      },
    });

    await upload(projectDir, { force: true });

    expect(mockSheets.spreadsheets.values.clear).toHaveBeenCalled();
    expect(mockSheets.spreadsheets.values.update).toHaveBeenCalled();
  });

  it("writes an auto-translation formula when requested", async () => {
    const projectDir = createProject({
      "en.json": JSON.stringify({ title: "" }),
      "ko.json": JSON.stringify({ title: "제목" }),
    });

    await upload(projectDir, { autoTranslate: true });

    const request = mockSheets.spreadsheets.values.update.mock.calls.at(-1)[0];
    expect(JSON.stringify(request.requestBody.values)).toContain(
      "GOOGLETRANSLATE"
    );
  });

  it("returns a nonzero CLI status when spreadsheet ID is missing", async () => {
    const projectDir = createProject({
      "en.json": JSON.stringify({ title: "Title" }),
    });
    createTestConfig(projectDir, {
      googleSheets: {
        spreadsheetId: "",
        credentialsPath: "./credentials.json",
        sheetName: "Translations",
      },
    });

    const result = await runCLICommand("i18n-upload", [], projectDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Spreadsheet ID");
  });

  it("rejects a missing credentials file without a network request", async () => {
    const projectDir = createTestProject(tempDir, {
      locales: {
        "en.json": JSON.stringify({ title: "Title" }),
        "ko.json": JSON.stringify({ title: "제목" }),
      },
    });

    await expect(
      uploadTranslations(path.join(projectDir, "locales"), {
        credentialsPath: path.join(projectDir, "missing.json"),
        spreadsheetId: "test-spreadsheet-id",
        localesDir: path.join(projectDir, "locales"),
        sheetName: "Translations",
        autoTranslate: false,
        force: false,
        dryRun: false,
        languages: ["en", "ko"],
      })
    ).rejects.toThrow("Credentials file not found");
    expect(google.sheets).not.toHaveBeenCalled();
  });
});
