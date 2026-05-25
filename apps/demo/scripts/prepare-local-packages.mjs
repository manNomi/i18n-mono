import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");

const packages = ["i18nexus", "i18nexus-tools"];

if (process.env.I18NEXUS_DEMO_SKIP_LOCAL_PACKAGE_BUILD === "1") {
  console.log(
    "Skipping local package builds because I18NEXUS_DEMO_SKIP_LOCAL_PACKAGE_BUILD=1.",
  );
  process.exit(0);
}

for (const packageName of packages) {
  console.log(`\nBuilding local package: ${packageName}`);
  const result = spawnSync(
    "npm",
    ["--workspace", packageName, "run", "build"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
