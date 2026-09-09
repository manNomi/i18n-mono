import * as fs from "fs";
import * as path from "path";
import {
  cleanupDir,
  createTempDir,
  runCLICommand,
} from "../cli-test-utils";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createHealthyProject(projectDir: string): void {
  writeJson(path.join(projectDir, "package.json"), {
    dependencies: { i18nexus: "^4.0.0" },
  });
  writeJson(path.join(projectDir, "node_modules", "i18nexus", "package.json"), {
    name: "i18nexus",
    version: "4.0.0",
    type: "module",
    exports: {
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
    },
  });
  const packageDist = path.join(
    projectDir,
    "node_modules",
    "i18nexus",
    "dist",
  );
  fs.mkdirSync(packageDist, { recursive: true });
  fs.writeFileSync(
    path.join(packageDist, "index.js"),
    "export function createI18n() {}\n",
  );
  writeJson(path.join(projectDir, "i18nexus.config.json"), {
    localesDir: "./locales",
    fallbackNamespace: "common",
    translationImportSource: "i18nexus",
    strictTypeGeneration: true,
  });
  writeJson(path.join(projectDir, "locales", "common", "en.json"), {
    save: "Save",
  });
  writeJson(path.join(projectDir, "locales", "common", "ko.json"), {
    save: "Save in Korean",
  });
  fs.writeFileSync(path.join(projectDir, "locales", "index.ts"), "");
  fs.mkdirSync(path.join(projectDir, "locales", "types"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(projectDir, "locales", "types", "i18nexus.d.ts"),
    "",
  );
}

describe("i18n-doctor built CLI", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(projectDir);
  });

  it("returns zero for an aligned installed project", async () => {
    createHealthyProject(projectDir);

    const result = await runCLICommand("i18n-doctor", [], projectDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("i18nexus doctor");
    expect(result.stdout).toContain("Status: healthy");
  });

  it("returns nonzero with actionable findings for an unconfigured project", async () => {
    writeJson(path.join(projectDir, "package.json"), {});

    const result = await runCLICommand("i18n-doctor", [], projectDir);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("CORE_DEPENDENCY_MISSING");
    expect(result.stdout).toContain("CONFIG_MISSING");
  });
});
