import { execFileSync } from "node:child_process";

const nodeVersions = ["22", "24", "26"];

for (const nodeVersion of nodeVersions) {
  execFileSync(
    "npx",
    [
      "--yes",
      `--package=node@${nodeVersion}`,
      "--call=node scripts/verify-node-version.mjs",
    ],
    { stdio: "inherit" }
  );
}

console.log(`Node matrix passed: ${nodeVersions.join(", ")}`);
