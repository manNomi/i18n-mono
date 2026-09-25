import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
import { runCLICommand } from "../cli-test-utils";
import { loadConfig } from "../../config-loader";

test("TypeScript init produces the JSON read by the runtime and a compilable companion", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-init-contract-"));
  try {
    const result = await runCLICommand(
      "i18n-sheets",
      [
        "init",
        "--typescript",
        "--non-interactive",
        "--languages",
        "en,ko",
        "--fallback-namespace",
        "shared",
        "--namespace-location",
        "src/app",
      ],
      dir
    );
    expect(result.exitCode).toBe(0);
    const config = loadConfig(path.join(dir, "i18nexus.config.json"), {
      silent: true,
    });
    expect(config).toMatchObject({
      languages: ["en", "ko"],
      defaultLanguage: "en",
      fallbackNamespace: "shared",
      namespacing: { basePath: "src/app" },
    });
    const companion = fs.readFileSync(
      path.join(dir, "i18nexus.config.ts"),
      "utf8"
    );
    expect(companion).toContain('import config from "./i18nexus.config.json"');
    fs.writeFileSync(
      path.join(dir, "consumer.ts"),
      'import { config, AppLanguages } from "./i18nexus.config"; const language: AppLanguages = "en"; console.log(config.defaultLanguage, language);\n// @ts-expect-error unsupported language\nconst unsupported: AppLanguages = "fr";'
    );
    const check = spawnSync(
      process.execPath,
      [
        require.resolve("typescript/bin/tsc"),
        "--noEmit",
        "--skipLibCheck",
        "--resolveJsonModule",
        "--esModuleInterop",
        "--module",
        "commonjs",
        "--target",
        "ES2020",
        path.join(dir, "consumer.ts"),
      ],
      { encoding: "utf8" }
    );
    expect({
      status: check.status,
      output: check.stdout + check.stderr,
    }).toEqual({ status: 0, output: "" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
