const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const toolsRoot = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-tools-pack-"));
function run(command, args, cwd = temp) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 180000,
    env: { ...process.env, NODE_ENV: "production", NODE_PATH: "" },
  });
}
try {
  const result = JSON.parse(
    run(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp],
      toolsRoot
    )
  );
  fs.writeFileSync(
    path.join(temp, "package.json"),
    JSON.stringify({ private: true })
  );
  run("npm", [
    "install",
    "--omit=dev",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    path.join(temp, result[0].filename),
  ]);
  const packageDir = path.join(temp, "node_modules/i18nexus-tools");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageDir, "package.json"), "utf8")
  );
  for (const [name, bin] of Object.entries(manifest.bin)) {
    const output = run(process.execPath, [
      path.join(packageDir, bin),
      "--help",
    ]);
    assert(output.trim().length > 0, `${name} produced no help`);
    console.log(`PASS ${name} --help`);
  }
  run(process.execPath, [
    path.join(packageDir, manifest.bin["i18n-sheets"]),
    "init",
    "--typescript",
    "--non-interactive",
    "--languages",
    "en,ko",
  ]);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(temp, "i18nexus.config.json")))
      .defaultLanguage,
    "en"
  );
  console.log("PASS isolated production install and TypeScript init");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
