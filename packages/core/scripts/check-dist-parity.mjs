import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const distDir = path.join(packageDir, "dist");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function snapshot(directory) {
  const files = new Map();

  function visit(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, {
      withFileTypes: true,
    })) {
      const absolutePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }

      const relativePath = path.relative(directory, absolutePath);
      const hash = createHash("sha256")
        .update(readFileSync(absolutePath))
        .digest("hex");
      files.set(relativePath, hash);
    }
  }

  visit(directory);
  return files;
}

function differences(expected, actual) {
  const paths = new Set([...expected.keys(), ...actual.keys()]);
  return [...paths]
    .sort()
    .filter((filePath) => expected.get(filePath) !== actual.get(filePath));
}

function build() {
  execFileSync(npmCommand, ["run", "build"], {
    cwd: packageDir,
    stdio: "inherit",
  });
}

const trackedSnapshot = snapshot(distDir);

build();
const firstBuild = snapshot(distDir);
const parityDiff = differences(trackedSnapshot, firstBuild);
if (parityDiff.length > 0) {
  throw new Error(
    `Tracked dist does not match a clean source build:\n${parityDiff.join("\n")}`
  );
}

build();
const secondBuild = snapshot(distDir);
const reproducibilityDiff = differences(firstBuild, secondBuild);
if (reproducibilityDiff.length > 0) {
  throw new Error(
    `Two clean source builds differ:\n${reproducibilityDiff.join("\n")}`
  );
}

console.log(
  `Core dist parity and reproducibility passed (${secondBuild.size} files)`
);
