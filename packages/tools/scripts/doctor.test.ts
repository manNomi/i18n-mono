import * as fs from "fs";
import * as path from "path";
import { printDoctorReport, runDoctor } from "./doctor";
import { cleanupTempDir, createTempDir } from "./__tests__/test-utils";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function writeInstalledCorePackage(
  projectRoot: string,
  options: {
    exports?: Record<string, unknown>;
    rootSource?: string;
  } = {},
): void {
  const packageRoot = path.join(projectRoot, "node_modules", "i18nexus");
  const exportsMap = options.exports ?? {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      default: "./dist/index.js",
    },
    "./server": {
      types: "./dist/utils/server.d.ts",
      import: "./dist/utils/server.js",
      default: "./dist/utils/server.js",
    },
    "./devtools": {
      types: "./dist/components/I18NexusDevtools.d.ts",
      import: "./dist/components/I18NexusDevtools.js",
      default: "./dist/components/I18NexusDevtools.js",
    },
  };

  writeJson(path.join(packageRoot, "package.json"), {
    name: "i18nexus",
    version: "4.0.0",
    type: "module",
    exports: exportsMap,
  });
  fs.mkdirSync(path.join(packageRoot, "dist"), { recursive: true });
  fs.writeFileSync(
    path.join(packageRoot, "dist", "index.js"),
    options.rootSource ?? "export function createI18n() {}",
  );
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
    writeInstalledCorePackage(tempDir);
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
    expect(report.status).toBe("healthy");
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

  it("warns when server usage has legacy TypeScript module resolution", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^4.0.0" },
    });
    writeInstalledCorePackage(tempDir);
    writeJson(path.join(tempDir, "tsconfig.json"), {
      compilerOptions: {
        moduleResolution: "node",
      },
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./locales",
      fallbackNamespace: "common",
      mode: "server",
    });
    writeJson(path.join(tempDir, "locales", "common", "en.json"), {
      save: "Save",
    });
    fs.writeFileSync(path.join(tempDir, "locales", "index.ts"), "");
    fs.mkdirSync(path.join(tempDir, "locales", "types"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "locales", "types", "i18nexus.d.ts"),
      "",
    );

    const report = runDoctor(tempDir);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("warning");
    expect(report.summary.typescriptModuleResolution).toBe("node");
    expect(report.issues.map((issue) => issue.code)).toContain(
      "TSCONFIG_MODULE_RESOLUTION_LEGACY",
    );
  });

  it("reports installed core package exports that cannot support generated locales", () => {
    writeJson(path.join(tempDir, "package.json"), {
      dependencies: { i18nexus: "^4.0.0" },
    });
    writeInstalledCorePackage(tempDir, {
      exports: {
        ".": {
          import: "./dist/index.js",
        },
      },
      rootSource: "export const useTranslation = () => null;",
    });
    writeJson(path.join(tempDir, "i18nexus.config.json"), {
      localesDir: "./locales",
      fallbackNamespace: "common",
    });
    writeJson(path.join(tempDir, "locales", "common", "en.json"), {
      save: "Save",
    });
    fs.writeFileSync(
      path.join(tempDir, "locales", "index.ts"),
      'import { createI18n } from "i18nexus";',
    );
    fs.mkdirSync(path.join(tempDir, "locales", "types"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "locales", "types", "i18nexus.d.ts"),
      "",
    );

    const report = runDoctor(tempDir);

    expect(report.ok).toBe(false);
    expect(report.status).toBe("failed");
    expect(report.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CORE_PACKAGE_EXPORT_MISSING",
        "CORE_CREATE_I18N_EXPORT_MISSING",
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
