import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const demoRoot = path.resolve(scriptDir, "..");
const generatedTypesPath = path.join(
  demoRoot,
  "locales",
  "types",
  "i18nexus.d.ts",
);

const before = fs.existsSync(generatedTypesPath)
  ? fs.readFileSync(generatedTypesPath, "utf8")
  : "";

const result = spawnSync("npm", ["run", "i18n:type"], {
  cwd: demoRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const after = fs.existsSync(generatedTypesPath)
  ? fs.readFileSync(generatedTypesPath, "utf8")
  : "";

if (before !== after) {
  console.error(
    "[i18nexus-demo] Generated locale types changed. Review and commit locales/types/i18nexus.d.ts, then rerun i18n:check.",
  );
  process.exit(1);
}

console.log("[i18nexus-demo] Generated locale types are up to date.");
