import * as fs from "fs";
import * as path from "path";
import { setupProject } from "../setup";
import { validateProjectSetup } from "../validation";
import { createFixture, removeFixture, writeJson } from "./fixture";

describe("setupProject", () => {
  const fixtures: string[] = [];

  afterEach(() => {
    fixtures.splice(0).forEach(removeFixture);
  });

  function createNextFixture(): string {
    const projectPath = createFixture("setup");
    fixtures.push(projectPath);
    writeJson(path.join(projectPath, "package.json"), {
      scripts: { test: "vitest" },
      dependencies: { next: "^15.0.0", react: "^18.0.0", i18nexus: "^4.0.1" },
      devDependencies: { "i18nexus-tools": "^3.2.0" },
    });
    writeJson(path.join(projectPath, "package-lock.json"), {
      lockfileVersion: 3,
    });
    fs.mkdirSync(path.join(projectPath, "app"), { recursive: true });
    return projectPath;
  }

  it("previews changes without writing by default", async () => {
    const projectPath = createNextFixture();

    const result = await setupProject({ projectPath });

    expect(result.dryRun).toBe(true);
    expect(result.files.map((file) => file.action)).toContain("create");
    expect(fs.existsSync(path.join(projectPath, "i18nexus.config.json"))).toBe(
      false
    );
    expect(fs.existsSync(path.join(projectPath, "locales"))).toBe(false);
  });

  it("applies an idempotent setup and preserves existing scripts", async () => {
    const projectPath = createNextFixture();

    const first = await setupProject({
      projectPath,
      dryRun: false,
      languages: ["ko", "en", "ja"],
      installDependencies: false,
    });
    const second = await setupProject({
      projectPath,
      dryRun: false,
      languages: ["ko", "en", "ja"],
      installDependencies: false,
    });

    const config = JSON.parse(
      fs.readFileSync(path.join(projectPath, "i18nexus.config.json"), "utf8")
    );
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectPath, "package.json"), "utf8")
    );
    expect(config.languages).toEqual(["ko", "en", "ja"]);
    expect(config.namespaceLocation).toBe("app");
    expect(packageJson.scripts.test).toBe("vitest");
    expect(packageJson.scripts["i18n:doctor"]).toBe("i18n-doctor");
    expect(
      fs.existsSync(path.join(projectPath, "locales", "common", "ja.json"))
    ).toBe(true);
    expect(first.dependencyInstall.completed).toBe(false);
    expect(second.files.every((file) => file.action === "unchanged")).toBe(
      true
    );

    const validation = validateProjectSetup(projectPath);
    expect(validation.valid).toBe(true);
    expect(
      validation.checks.find((check) => check.name === "dependenciesInstalled")
        ?.status
    ).toBe("warning");
  });

  it("uses the first requested language when the new defaults are not selected", async () => {
    const projectPath = createNextFixture();

    const result = await setupProject({
      projectPath,
      languages: ["en", "fr"],
    });

    expect(result.config.defaultLanguage).toBe("en");
    expect(result.config.sourceLanguage).toBe("en");
  });

  it("preserves custom config values when filling missing defaults", async () => {
    const projectPath = createNextFixture();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      languages: ["en", "fr"],
      defaultLanguage: "en",
      sourceLanguage: "fr",
      localesDir: "./translations",
      customIntegration: { enabled: true },
    });

    const result = await setupProject({ projectPath, dryRun: false });

    expect(result.config.languages).toEqual(["en", "fr"]);
    expect(result.config.sourceLanguage).toBe("fr");
    expect(result.config.customIntegration).toEqual({ enabled: true });
    expect(
      fs.existsSync(path.join(projectPath, "translations", "common", "fr.json"))
    ).toBe(true);
  });

  it("rejects locale paths outside the project", async () => {
    const projectPath = createNextFixture();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      languages: ["ko"],
      defaultLanguage: "ko",
      sourceLanguage: "ko",
      localesDir: "../outside",
    });

    await expect(setupProject({ projectPath, dryRun: false })).rejects.toThrow(
      "Configured path escapes the project directory"
    );
  });

  it("rejects a fallback namespace that can escape the locale directory", async () => {
    const projectPath = createNextFixture();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      languages: ["ko"],
      defaultLanguage: "ko",
      sourceLanguage: "ko",
      localesDir: "./locales",
      fallbackNamespace: "../../../outside",
    });

    await expect(setupProject({ projectPath, dryRun: false })).rejects.toThrow(
      "fallbackNamespace must be a path-safe namespace identifier"
    );
  });
});
