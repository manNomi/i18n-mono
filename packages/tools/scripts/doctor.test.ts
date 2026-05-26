import * as fs from "fs";
import * as path from "path";
import { printDoctorReport, runDoctor } from "./doctor";
import { cleanupTempDir, createTempDir } from "./__tests__/test-utils";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

describe("i18n-doctor", () => {
  let tempDir: string;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = createTempDir();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    cleanupTempDir(tempDir);
  });

  it("passes a core v4 aligned namespace setup", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^4.0.0" },
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./locales",
      fallbackNamespace: "common",
      translationImportSource: "i18nexus",
      strictTypeGeneration: true,
    });
    writeJson(path.join(tempDir, "locales", "common", "en.json"), {
      save: "Save",
    });
    writeJson(path.join(tempDir, "locales", "common", "ko.json"), {
      save: "저장",
    });
    fs.writeFileSync(path.join(tempDir, "locales", "index.ts"), "");
    fs.mkdirSync(path.join(tempDir, "locales", "types"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "locales", "types", "i18nexus.d.ts"),
      "",
    );

    const report = runDoctor(tempDir);

    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summary.namespaces).toEqual(["common"]);
    expect(report.summary.languages).toEqual(["en", "ko"]);
  });

  it("reports blocking issues for old core and missing locales", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^3.4.2" },
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./locales",
      translationImportSource: "i18nexus",
    });

    const report = runDoctor(tempDir);

    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CORE_VERSION_OUTDATED", "LOCALES_DIR_MISSING"]),
    );
  });

  it("warns when generated core companion files are missing", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^4.0.0" },
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./locales",
      fallbackNamespace: "common",
    });
    writeJson(path.join(tempDir, "locales", "common", "en.json"), {
      save: "Save",
    });
    writeJson(path.join(tempDir, "locales", "home", "en.json"), {
      title: "Home",
    });

    const report = runDoctor(tempDir);

    expect(report.ok).toBe(true);
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "LOCALE_ENTRYPOINT_MISSING",
        "GENERATED_TYPES_MISSING",
      ]),
    );
  });

  it("prints a readable report", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^4.0.0" },
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./missing",
    });

    const report = runDoctor(tempDir);
    printDoctorReport(report);

    expect(consoleLogSpy).toHaveBeenCalledWith("🩺 i18nexus doctor");
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        String(call[0]).includes("LOCALES_DIR_MISSING"),
      ),
    ).toBe(true);
  });
});
