import * as fs from "fs";
import * as path from "path";
import { runI18nexusTool } from "../tool-runner";
import type { RunI18nexusToolOptions } from "../types";
import {
  createFixture,
  installFakeI18nexusTools,
  removeFixture,
  writeJson,
} from "./fixture";

describe("runI18nexusTool", () => {
  const fixtures: string[] = [];

  afterEach(() => {
    fixtures.splice(0).forEach(removeFixture);
  });

  function createProject(): string {
    const projectPath = createFixture("tool-runner");
    fixtures.push(projectPath);
    writeJson(path.join(projectPath, "package.json"), {
      devDependencies: { "i18nexus-tools": "3.2.0" },
    });
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      sourcePattern: "src/**/*.{ts,tsx}",
      localesDir: "./locales",
      typesOutputPath: "./locales/types/i18nexus.d.ts",
    });
    installFakeI18nexusTools(projectPath);
    return projectPath;
  }

  it("executes doctor from the target project's installed package", async () => {
    const projectPath = createProject();

    const result = await runI18nexusTool({ projectPath, tool: "doctor" });

    expect(result.mode).toBe("inspect");
    expect(result.execution).toMatchObject({ status: "completed", ok: true });
    expect(JSON.parse(result.execution.stdout)).toEqual({
      args: [],
      cwd: result.projectPath,
    });
    expect(result.safety.executesProjectCode).toBe(true);
  });

  it("uses the extractor native dry-run during preview", async () => {
    const projectPath = createProject();

    const result = await runI18nexusTool({
      projectPath,
      tool: "extractor",
      languages: ["ko", "en"],
      outputDir: "./translations",
    });

    expect(result.mode).toBe("preview");
    expect(result.execution.status).toBe("completed");
    expect(result.command.args).toEqual([
      "--languages",
      "ko,en",
      "--output-dir",
      "./translations",
      "--dry-run",
    ]);
  });

  it("returns a plan for wrapper until changes are explicitly approved", async () => {
    const projectPath = createProject();

    const preview = await runI18nexusTool({
      projectPath,
      tool: "wrapper",
      pattern: "src/pages/home.tsx",
    });
    const applied = await runI18nexusTool({
      projectPath,
      tool: "wrapper",
      pattern: "src/pages/home.tsx",
      keyFirst: true,
      applyChanges: true,
    });

    expect(preview.execution.status).toBe("planned");
    expect(preview.execution.stdout).toBe("");
    expect(applied.execution.status).toBe("completed");
    expect(applied.command.args).toEqual([
      "--pattern",
      "src/pages/home.tsx",
      "--key-first",
    ]);
  });

  it("maps type, clean, and force download inputs to their real CLI contracts", async () => {
    const projectPath = createProject();

    const typePlan = await runI18nexusTool({
      projectPath,
      tool: "type",
      translationImportSource: "react-i18next",
    });
    const cleanPreview = await runI18nexusTool({
      projectPath,
      tool: "clean-legacy",
      localesDir: "./locales",
      languages: ["ko", "en"],
      backup: false,
    });
    const downloadPlan = await runI18nexusTool({
      projectPath,
      tool: "download",
      spreadsheetId: "sheet-id",
      languages: ["ko", "en"],
      force: true,
    });

    expect(typePlan.command).toMatchObject({
      name: "i18n-type",
      args: ["--translation-import-source", "react-i18next"],
    });
    expect(typePlan.execution.status).toBe("planned");
    expect(cleanPreview.command.args).toEqual([
      "--languages",
      "ko,en",
      "--locales-dir",
      "./locales",
      "--no-backup",
      "--dry-run",
    ]);
    expect(cleanPreview.execution.status).toBe("completed");
    expect(downloadPlan.command).toMatchObject({
      name: "i18n-download-force",
      args: [
        "--languages",
        "ko,en",
        "--spreadsheet-id",
        "sheet-id",
        "--dry-run",
      ],
    });
    expect(downloadPlan.execution.status).toBe("completed");
  });

  it("runs Google Sheets preview with dry-run and apply without it", async () => {
    const projectPath = createProject();

    const preview = await runI18nexusTool({
      projectPath,
      tool: "upload",
      spreadsheetId: "sheet-id",
    });
    const applied = await runI18nexusTool({
      projectPath,
      tool: "upload",
      spreadsheetId: "sheet-id",
      applyChanges: true,
    });

    expect(preview.execution.status).toBe("completed");
    expect(preview.command.args).toContain("--dry-run");
    expect(preview.safety.usesNetwork).toBe(true);
    expect(applied.execution.status).toBe("completed");
    expect(applied.command.args).not.toContain("--dry-run");
  });

  it("rejects effective config paths and patterns outside the project", async () => {
    const projectPath = createProject();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      sourcePattern: "../outside/**/*.tsx",
      localesDir: "../outside-locales",
    });

    await expect(
      runI18nexusTool({ projectPath, tool: "wrapper" })
    ).rejects.toThrow("sourcePattern escapes the project directory");
    await expect(
      runI18nexusTool({
        projectPath,
        tool: "extractor",
        pattern: "src/**/*.tsx",
      })
    ).rejects.toThrow("localesDir escapes the project directory");
    await expect(
      runI18nexusTool({ projectPath, tool: "doctor" })
    ).rejects.toThrow("localesDir escapes the project directory");
  });

  it("rejects Google Sheets credentials outside the project", async () => {
    const projectPath = createProject();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      googleSheets: { credentialsPath: "../credentials.json" },
    });

    await expect(
      runI18nexusTool({
        projectPath,
        tool: "upload",
        spreadsheetId: "sheet-id",
      })
    ).rejects.toThrow("credentialsPath escapes the project directory");
  });

  it("rejects unsafe languages loaded from project config", async () => {
    const projectPath = createProject();
    writeJson(path.join(projectPath, "i18nexus.config.json"), {
      languages: ["en", "../../outside"],
    });

    await expect(
      runI18nexusTool({
        projectPath,
        tool: "download",
        spreadsheetId: "sheet-id",
      })
    ).rejects.toThrow("languages must contain unique path-safe identifiers");
  });

  it("rejects locale paths that escape through a symlink", async () => {
    const projectPath = createProject();
    const outsidePath = createFixture("outside-locales");
    fixtures.push(outsidePath);
    fs.symlinkSync(outsidePath, path.join(projectPath, "locales"), "dir");

    await expect(
      runI18nexusTool({
        projectPath,
        tool: "extractor",
        pattern: "src/**/*.tsx",
      })
    ).rejects.toThrow("localesDir escapes the project directory");
  });

  it("rejects bins that escape the installed package", async () => {
    const projectPath = createProject();
    const packagePath = path.join(
      projectPath,
      "node_modules",
      "i18nexus-tools"
    );
    fs.writeFileSync(path.join(packagePath, "outside.js"), "", "utf8");
    installFakeI18nexusTools(projectPath, { binEntry: "../outside.js" });

    await expect(
      runI18nexusTool({ projectPath, tool: "doctor" })
    ).rejects.toThrow("resolves outside the installed package");
  });

  it("reports timeouts without leaving the call unresolved", async () => {
    const projectPath = createProject();
    installFakeI18nexusTools(projectPath, {
      doctorScript: `
        const { spawn } = require("child_process");
        spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
          stdio: "inherit"
        });
        setInterval(() => {}, 1000);
      `,
    });
    const startedAt = Date.now();

    const result = await runI18nexusTool({
      projectPath,
      tool: "doctor",
      timeoutMs: 1_000,
    });

    expect(result.execution.status).toBe("timed-out");
    expect(result.execution.ok).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  it("requires an actual local i18nexus-tools installation", async () => {
    const projectPath = createProject();
    fs.rmSync(path.join(projectPath, "node_modules"), {
      recursive: true,
      force: true,
    });

    await expect(
      runI18nexusTool({ projectPath, tool: "doctor" })
    ).rejects.toThrow("is not installed in the target project's node_modules");
  });

  it("requires the tools version that guarantees preview safety", async () => {
    const projectPath = createProject();
    const packageJsonPath = path.join(
      projectPath,
      "node_modules",
      "i18nexus-tools",
      "package.json"
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    writeJson(packageJsonPath, { ...packageJson, version: "3.2.0" });

    await expect(
      runI18nexusTool({ projectPath, tool: "doctor" })
    ).rejects.toThrow("Install i18nexus-tools >= 3.2.1");
  });

  it("does not pass arbitrary MCP server secrets or NODE_OPTIONS to target code", async () => {
    const projectPath = createProject();
    installFakeI18nexusTools(projectPath, {
      doctorScript: `console.log(JSON.stringify({
        secret: process.env.I18NEXUS_MCP_TEST_SECRET,
        nodeOptions: process.env.NODE_OPTIONS
      }));\n`,
    });
    process.env.I18NEXUS_MCP_TEST_SECRET = "do-not-forward";
    process.env.NODE_OPTIONS = "--trace-warnings";

    try {
      const result = await runI18nexusTool({ projectPath, tool: "doctor" });
      expect(JSON.parse(result.execution.stdout)).toEqual({});
    } finally {
      delete process.env.I18NEXUS_MCP_TEST_SECRET;
      delete process.env.NODE_OPTIONS;
    }
  });

  it("caps captured command output", async () => {
    const projectPath = createProject();
    installFakeI18nexusTools(projectPath, {
      doctorScript: 'process.stdout.write("x".repeat(70 * 1024));\n',
    });

    const result = await runI18nexusTool({ projectPath, tool: "doctor" });

    expect(Buffer.byteLength(result.execution.stdout)).toBe(64 * 1024);
    expect(result.execution.stdoutTruncated).toBe(true);
  });

  it("validates destructive booleans inside the public runner", async () => {
    const projectPath = createProject();

    await expect(
      runI18nexusTool({
        projectPath,
        tool: "wrapper",
        applyChanges: "false",
      } as unknown as RunI18nexusToolOptions)
    ).rejects.toThrow("expected boolean");
  });
});
