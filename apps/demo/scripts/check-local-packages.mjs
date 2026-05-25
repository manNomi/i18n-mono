import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../../..");
const expectedCoreRoot = path.join(repoRoot, "packages", "core");

const requiredFiles = [
  "packages/core/dist/index.js",
  "packages/core/dist/index.d.ts",
  "packages/core/dist/components/I18NexusDevtools.js",
  "packages/core/dist/components/I18NexusDevtools.d.ts",
  "packages/core/dist/utils/server.js",
  "packages/core/dist/utils/server.d.ts",
  "packages/tools/dist/bin/i18n-type.js",
  "packages/tools/dist/bin/i18n-extractor.js",
];

function fail(message) {
  console.error(`\n[i18nexus-demo] ${message}`);
  console.error(
    "Run `npm --workspace i18nexus-demo run prepare:local-packages` from the repo root, then retry.",
  );
  process.exit(1);
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing local package build output: ${relativePath}`);
  }
}

const distIndex = fs.readFileSync(
  path.join(repoRoot, "packages/core/dist/index.js"),
  "utf8",
);

for (const removedImport of [
  "typeTranslation",
  "dynamicTranslation",
  "createI18nWithConfig",
]) {
  if (distIndex.includes(removedImport)) {
    fail(
      `Stale i18nexus dist/index.js still references removed module: ${removedImport}`,
    );
  }
}

let resolvedRoot;
try {
  resolvedRoot = fileURLToPath(await import.meta.resolve("i18nexus"));
} catch (error) {
  fail(`Unable to resolve i18nexus from the demo app: ${error.message}`);
}

if (!resolvedRoot.startsWith(expectedCoreRoot)) {
  fail(
    `i18nexus resolves outside this worktree.\nResolved: ${resolvedRoot}\nExpected under: ${expectedCoreRoot}`,
  );
}

try {
  const root = await import("i18nexus");
  const devtools = await import("i18nexus/devtools");
  const server = await import("i18nexus/server");

  if (typeof root.I18nProvider !== "function") {
    fail("Root import does not expose I18nProvider.");
  }

  if (typeof root.useTranslation !== "function") {
    fail("Root import does not expose useTranslation.");
  }

  if (typeof devtools.I18NexusDevtools !== "function") {
    fail("i18nexus/devtools does not expose I18NexusDevtools.");
  }

  if (typeof server.createServerTranslation !== "function") {
    fail("i18nexus/server does not expose createServerTranslation.");
  }
} catch (error) {
  fail(`Public import smoke check failed: ${error.message}`);
}

console.log("[i18nexus-demo] Local package imports are ready.");
