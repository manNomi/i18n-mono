import * as fs from "fs";
import * as path from "path";
import {
  cleanupDir,
  createTempDir,
  readJsonFile,
  runCLICommand,
} from "../cli-test-utils";

describe("i18n-sheets built CLI", () => {
  let projectDir: string;

  beforeEach(() => {
    projectDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(projectDir);
  });

  it("initializes a JSON-configured namespace project without clobbering files", async () => {
    const args = [
      "init",
      "--non-interactive",
      "--languages",
      "en,ko",
      "--locales",
      "./translations",
    ];

    const first = await runCLICommand("i18n-sheets", args, projectDir);

    expect(first.exitCode).toBe(0);
    expect(readJsonFile(path.join(projectDir, "i18nexus.config.json"))).toMatchObject(
      {
        languages: ["en", "ko"],
        defaultLanguage: "en",
        localesDir: "./translations",
      },
    );
    expect(
      fs.existsSync(path.join(projectDir, "translations", "common", "en.json")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(projectDir, "translations", "common", "ko.json")),
    ).toBe(true);
    expect(fs.existsSync(path.join(projectDir, "translations", "index.ts"))).toBe(
      true,
    );

    const configPath = path.join(projectDir, "i18nexus.config.json");
    const localePath = path.join(
      projectDir,
      "translations",
      "common",
      "en.json",
    );
    const examplePath = path.join(
      projectDir,
      "examples",
      "client-component-example.tsx",
    );
    fs.writeFileSync(configPath, '{"sentinel":"config"}\n');
    fs.writeFileSync(localePath, '{"sentinel":"locale"}\n');
    fs.writeFileSync(examplePath, "// sentinel example\n");

    const second = await runCLICommand("i18n-sheets", args, projectDir);

    expect(second.exitCode).toBe(0);
    expect(second.stdout).toContain("already exists, skipping");
    expect(fs.readFileSync(configPath, "utf8")).toBe(
      '{"sentinel":"config"}\n',
    );
    expect(fs.readFileSync(localePath, "utf8")).toBe(
      '{"sentinel":"locale"}\n',
    );
    expect(fs.readFileSync(examplePath, "utf8")).toBe(
      "// sentinel example\n",
    );
  });

  it("keeps --typescript as a warning-only JSON compatibility flag", async () => {
    const result = await runCLICommand(
      "i18n-sheets",
      ["init", "--non-interactive", "--typescript"],
      projectDir,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("--typescript is deprecated");
    expect(fs.existsSync(path.join(projectDir, "i18nexus.config.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(projectDir, "i18nexus.config.ts"))).toBe(
      false,
    );
  });

  it("fails with an actionable message when Google Sheets config is absent", async () => {
    const result = await runCLICommand("i18n-sheets", ["status"], projectDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Spreadsheet ID is required");
    expect(result.stderr).toContain("i18nexus.config.json");
  });
});
