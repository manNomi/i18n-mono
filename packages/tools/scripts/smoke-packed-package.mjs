import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-tools-pack-smoke-"));

const binNames = [
  "i18n-wrapper",
  "i18n-wrapper-swc",
  "i18n-wrapper-swc-worker",
  "i18n-extractor",
  "i18n-type",
  "i18n-upload",
  "i18n-download",
  "i18n-download-force",
  "i18n-sheets",
  "i18n-clean-legacy",
  "i18n-doctor",
];

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  }).trim();
}

try {
  const packDir = join(tempRoot, "packs");
  const appDir = join(tempRoot, "app");
  await mkdir(packDir, { recursive: true });
  await mkdir(appDir, { recursive: true });

  const packOutput = run("npm", ["pack", "--pack-destination", packDir]);
  const tarballName = packOutput
    .split(/\r?\n/)
    .find((line) => line.endsWith(".tgz"));

  if (!tarballName) {
    throw new Error(`npm pack did not report a .tgz file:\n${packOutput}`);
  }

  const tarballPath = join(packDir, tarballName);
  await writeFile(
    join(appDir, "package.json"),
    JSON.stringify({ name: "tools-smoke", private: true }, null, 2)
  );

  run("npm", ["install", "--no-audit", "--no-fund", tarballPath], {
    cwd: appDir,
  });

  const installedPackage = join(appDir, "node_modules", "i18nexus-tools");
  for (const file of ["dist/index.js", "dist/index.d.ts", "LICENSE"]) {
    if (!existsSync(join(installedPackage, file))) {
      throw new Error(`Packed package is missing ${file}`);
    }
  }

  run("node", ["-e", 'require("i18nexus-tools")'], { cwd: appDir });

  await writeFile(join(appDir, "consumer.ts"), 'import "i18nexus-tools";\n');
  const tsc = join(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc"
  );
  run(
    tsc,
    [
      "--noEmit",
      "--strict",
      "--target",
      "ES2020",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node",
      "consumer.ts",
    ],
    { cwd: appDir }
  );

  for (const binName of binNames) {
    const executable = join(
      appDir,
      "node_modules",
      ".bin",
      process.platform === "win32" ? `${binName}.cmd` : binName
    );
    run(executable, ["--help"], { cwd: appDir });
  }

  const fixtureDir = join(appDir, "src");
  const fixturePath = join(fixtureDir, "Component.tsx");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(
    fixturePath,
    "function Component() {\n  return <div>\uC548\uB155\uD558\uC138\uC694</div>;\n}\n"
  );
  const originalFixture = await readFile(fixturePath, "utf8");

  const workerExecutable = join(
    appDir,
    "node_modules",
    ".bin",
    process.platform === "win32"
      ? "i18n-wrapper-swc-worker.cmd"
      : "i18n-wrapper-swc-worker"
  );
  const dryRunOutput = run(
    workerExecutable,
    ["--pattern", fixturePath, "--dry-run"],
    { cwd: appDir }
  );
  const dryRunFixture = await readFile(fixturePath, "utf8");
  if (
    !dryRunOutput.includes("Would modify: 1") ||
    dryRunFixture !== originalFixture
  ) {
    throw new Error(
      `Installed worker dry run was not side-effect free:\n${dryRunOutput}`
    );
  }

  const workerOutput = run(workerExecutable, ["--pattern", fixturePath], {
    cwd: appDir,
  });
  const transformedFixture = await readFile(fixturePath, "utf8");

  if (
    !workerOutput.includes("Modified: 1") ||
    !transformedFixture.includes("useTranslation") ||
    !transformedFixture.includes("t(")
  ) {
    throw new Error(
      `Installed worker did not transform the fixture:\n${workerOutput}\n${transformedFixture}`
    );
  }

  const aliasFixturePath = join(fixtureDir, "Alias.tsx");
  await writeFile(
    aliasFixturePath,
    "function Alias() {\n  return <div>\uC548\uB155\uD558\uC138\uC694</div>;\n}\n"
  );
  const aliasOriginal = await readFile(aliasFixturePath, "utf8");
  const aliasExecutable = join(
    appDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "i18n-wrapper-swc.cmd" : "i18n-wrapper-swc"
  );
  const aliasDryRun = run(
    aliasExecutable,
    ["--pattern", aliasFixturePath, "--dry-run"],
    { cwd: appDir }
  );
  if (
    !aliasDryRun.includes("Selected strategy: babel") ||
    (await readFile(aliasFixturePath, "utf8")) !== aliasOriginal
  ) {
    throw new Error(`Adaptive alias dry run failed:\n${aliasDryRun}`);
  }

  const aliasOutput = run(aliasExecutable, ["--pattern", aliasFixturePath], {
    cwd: appDir,
  });
  const aliasTransformed = await readFile(aliasFixturePath, "utf8");
  if (
    !aliasOutput.includes("Selected strategy: babel") ||
    !aliasTransformed.includes("useTranslation") ||
    !aliasTransformed.includes("t(")
  ) {
    throw new Error(
      `Installed adaptive alias did not transform the fixture:\n${aliasOutput}\n${aliasTransformed}`
    );
  }

  run(aliasExecutable, ["--pattern", aliasFixturePath], { cwd: appDir });
  if ((await readFile(aliasFixturePath, "utf8")) !== aliasTransformed) {
    throw new Error("Installed adaptive alias was not idempotent");
  }

  run("npm", ["audit", "--omit=dev", "--audit-level=high"], {
    cwd: appDir,
  });

  console.log(`Packed package smoke passed: ${tarballName}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
