import * as fs from "fs";
import * as path from "path";
import {
  cleanupDir,
  createTempDir,
  createTestConfig,
  createTestProject,
  listFiles,
  runCLICommand,
} from "../cli-test-utils";

function snapshotFiles(projectDir: string): Record<string, string> {
  return Object.fromEntries(
    listFiles(projectDir, true)
      .sort()
      .map((filePath) => [
        path.relative(projectDir, filePath),
        fs.readFileSync(filePath).toString("base64"),
      ])
  );
}

describe("documented CLI dry runs", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(tempDir);
  });

  it("previews wrapper changes without modifying source files", async () => {
    const projectDir = createTestProject(tempDir, {
      src: {
        "Component.tsx":
          "function Component() { return <div>\uC548\uB155\uD558\uC138\uC694</div>; }\n",
      },
    });
    createTestConfig(projectDir);
    const before = snapshotFiles(projectDir);

    const result = await runCLICommand(
      "i18n-wrapper",
      ["--dry-run"],
      projectDir
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Dry run");
    expect(snapshotFiles(projectDir)).toEqual(before);
  });

  it.each(["i18n-wrapper", "i18n-wrapper-swc", "i18n-wrapper-swc-worker"])(
    "%s exits nonzero for malformed source",
    async (command) => {
      const projectDir = createTestProject(tempDir, {
        src: {
          "Invalid.tsx": "function Invalid() { return <div>안녕하세요",
        },
      });
      createTestConfig(projectDir);

      const result = await runCLICommand(
        command,
        ["--pattern", "src/Invalid.tsx"],
        projectDir
      );

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toMatch(/failed|error/i);
    }
  );

  it("previews upload targets without authentication or writes", async () => {
    const projectDir = createTestProject(tempDir, {
      locales: {
        common: {
          "en.json": JSON.stringify({ title: "Title" }),
          "ko.json": JSON.stringify({ title: "\uC81C\uBAA9" }),
        },
      },
    });
    createTestConfig(projectDir, {
      googleSheets: {
        spreadsheetId: "dry-run-sheet",
        credentialsPath: "./missing-credentials.json",
        sheetName: "Translations",
      },
    });
    const before = snapshotFiles(projectDir);

    const result = await runCLICommand(
      "i18n-upload",
      ["--dry-run"],
      projectDir
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No authentication");
    expect(snapshotFiles(projectDir)).toEqual(before);
  });

  it("lets upload environment variables override JSON during a dry run", async () => {
    const projectDir = createTestProject(tempDir, {
      locales: {
        common: {
          "en.json": JSON.stringify({ title: "Title" }),
        },
      },
    });
    createTestConfig(projectDir, {
      googleSheets: {
        spreadsheetId: "",
        credentialsPath: "./config-credentials.json",
        sheetName: "Translations",
      },
    });

    const result = await runCLICommand(
      "i18n-upload",
      ["--dry-run"],
      projectDir,
      {
        GOOGLE_SPREADSHEET_ID: "environment-sheet",
        GOOGLE_CREDENTIALS_PATH: "./environment-credentials.json",
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No authentication");
  });

  it.each(["i18n-download", "i18n-download-force"])(
    "%s previews targets without credentials, network, or local writes",
    async (command) => {
      const projectDir = createTestProject(tempDir, {
        locales: {
          common: {
            "en.json": JSON.stringify({ local: "Keep me" }),
          },
        },
      });
      createTestConfig(projectDir, {
        googleSheets: {
          spreadsheetId: "dry-run-sheet",
          credentialsPath: "./missing-credentials.json",
          sheetName: "Translations",
        },
      });
      const before = snapshotFiles(projectDir);

      const result = await runCLICommand(command, ["--dry-run"], projectDir);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("No authentication");
      expect(snapshotFiles(projectDir)).toEqual(before);
    }
  );
});
