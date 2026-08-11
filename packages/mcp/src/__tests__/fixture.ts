import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function createFixture(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `i18nexus-mcp-${name}-`));
}

export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function installFakeI18nexusTools(
  projectPath: string,
  options?: { doctorScript?: string; binEntry?: string }
): void {
  const packagePath = path.join(projectPath, "node_modules", "i18nexus-tools");
  const binEntry = options?.binEntry ?? "bin/fake.js";
  const bins = {
    "i18n-doctor": binEntry,
    "i18n-wrapper": binEntry,
    "i18n-wrapper-swc-worker": binEntry,
    "i18n-extractor": binEntry,
    "i18n-type": binEntry,
    "i18n-clean-legacy": binEntry,
    "i18n-upload": binEntry,
    "i18n-download": binEntry,
    "i18n-download-force": binEntry,
    "i18n-sheets-status": binEntry,
    "i18n-sheets-sync-new-keys": binEntry,
    "i18n-json-to-csv": binEntry,
    "i18n-csv-to-json": binEntry,
  };
  writeJson(path.join(packagePath, "package.json"), {
    name: "i18nexus-tools",
    version: "3.3.0",
    bin: bins,
  });
  if (binEntry === "bin/fake.js") {
    fs.mkdirSync(path.join(packagePath, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(packagePath, binEntry),
      options?.doctorScript ??
        "console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));\n",
      "utf8"
    );
  }
}

export function removeFixture(fixturePath: string): void {
  fs.rmSync(fixturePath, { recursive: true, force: true });
}
