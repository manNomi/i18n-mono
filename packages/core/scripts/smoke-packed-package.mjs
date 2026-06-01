import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "..", "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-pack-smoke-"));

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? packageRoot,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
  }).trim();
}

function findInstalledPackage(packageName) {
  const candidates = [
    join(packageRoot, "node_modules", packageName),
    join(repoRoot, "node_modules", packageName),
  ];

  return candidates.find((candidate) => existsSync(candidate));
}

async function linkPackage(nodeModulesDir, packageName) {
  const source = findInstalledPackage(packageName);
  if (!source) {
    throw new Error(
      `Cannot find ${packageName}. Run npm install before smoke:pack.`,
    );
  }

  const target = join(nodeModulesDir, packageName);
  await mkdir(dirname(target), { recursive: true });
  await symlink(
    source,
    target,
    process.platform === "win32" ? "junction" : "dir",
  );
}

try {
  const packDir = join(tempRoot, "packs");
  const unpackDir = join(tempRoot, "unpacked");
  const appDir = join(tempRoot, "app");
  const nodeModulesDir = join(appDir, "node_modules");

  await mkdir(packDir, { recursive: true });
  await mkdir(unpackDir, { recursive: true });
  await mkdir(nodeModulesDir, { recursive: true });

  const packOutput = run("npm", ["pack", "--pack-destination", packDir]);
  const tarballName = packOutput
    .split(/\r?\n/)
    .find((line) => line.endsWith(".tgz"));

  if (!tarballName) {
    throw new Error(`npm pack did not report a .tgz file:\n${packOutput}`);
  }

  const tarballPath = join(packDir, tarballName);
  run("tar", ["-xzf", tarballPath, "-C", unpackDir], { cwd: tempRoot });

  const unpackedPackageDir = join(unpackDir, "package");
  const packageNodeModulesDir = join(unpackedPackageDir, "node_modules");
  const requiredFiles = [
    "dist/index.js",
    "dist/index.d.ts",
    "dist/utils/server.js",
    "dist/utils/server.d.ts",
    "dist/components/I18NexusDevtools.js",
    "dist/components/I18NexusDevtools.d.ts",
  ];

  for (const file of requiredFiles) {
    if (!existsSync(join(unpackedPackageDir, file))) {
      throw new Error(`Packed package is missing ${file}`);
    }
  }

  await symlink(
    unpackedPackageDir,
    join(nodeModulesDir, "i18nexus"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await linkPackage(packageNodeModulesDir, "react");
  await linkPackage(packageNodeModulesDir, "react-dom");

  await writeFile(
    join(appDir, "package.json"),
    JSON.stringify({ type: "module", private: true }, null, 2),
  );

  await writeFile(
    join(appDir, "smoke.mjs"),
    `import {
  I18nProvider,
  createI18n,
  defineConfig,
  useLanguageSwitcher,
  useTranslation,
} from "i18nexus";
import { createServerTranslation, getTranslation } from "i18nexus/server";
import { I18NexusDevtools } from "i18nexus/devtools";

const requiredFunctions = {
  I18nProvider,
  createI18n,
  defineConfig,
  useLanguageSwitcher,
  useTranslation,
  createServerTranslation,
  getTranslation,
  I18NexusDevtools,
};

for (const [name, value] of Object.entries(requiredFunctions)) {
  if (typeof value !== "function") {
    throw new Error(\`Expected \${name} to be a function, got \${typeof value}\`);
  }
}

const i18n = createI18n({
  common: {
    en: { hello: "Hello" },
  },
});

if (typeof i18n.I18nProvider !== "function") {
  throw new Error("createI18n did not expose I18nProvider");
}

if (typeof i18n.useTranslation !== "function") {
  throw new Error("createI18n did not expose useTranslation");
}

const t = createServerTranslation("en", { en: { hello: "Hello" } });
if (t("hello") !== "Hello") {
  throw new Error("server translation smoke failed");
}
`,
  );

  run("node", [join(appDir, "smoke.mjs")], { cwd: appDir });
  console.log(`✅ Packed package smoke passed: ${tarballName}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
