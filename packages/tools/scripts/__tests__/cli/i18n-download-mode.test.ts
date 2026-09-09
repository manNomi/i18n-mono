import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { GoogleSheetsManager } from "../../google-sheets";
import { downloadTranslations } from "../../../bin/i18n-download";

jest.mock("../../google-sheets", () => ({
  GoogleSheetsManager: jest.fn(),
  validateGoogleSheetsLanguages: jest.fn(),
}));

describe("downloadTranslations mode wiring", () => {
  let tempDir: string;
  let authenticate: jest.Mock;
  let downloadAllSheets: jest.Mock;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-download-mode-"));
    authenticate = jest.fn().mockResolvedValue(undefined);
    downloadAllSheets = jest.fn().mockResolvedValue(undefined);
    (GoogleSheetsManager as unknown as jest.Mock).mockImplementation(() => ({
      authenticate,
      downloadAllSheets,
    }));
    fs.writeFileSync(path.join(tempDir, "credentials.json"), "{}");
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it.each([
    [false, false],
    [true, true],
  ])("passes force=%s to the manager", async (force, expectedForce) => {
    const localesDir = path.join(tempDir, "locales");

    await downloadTranslations(
      {
        credentialsPath: path.join(tempDir, "credentials.json"),
        spreadsheetId: "sheet-id",
        localesDir,
        languages: ["en", "ko"],
      },
      { force }
    );

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(downloadAllSheets).toHaveBeenCalledWith(localesDir, ["en", "ko"], {
      force: expectedForce,
    });
  });
});
