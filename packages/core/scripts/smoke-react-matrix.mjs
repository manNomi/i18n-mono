import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-react-matrix-"));
const reactVersions = ["18.3.1", "19.2.7"];

function run(command, args, cwd = packageRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}

try {
  const packDir = join(tempRoot, "packs");
  await mkdir(packDir, { recursive: true });
  const packResult = JSON.parse(
    run("npm", ["pack", "--json", "--pack-destination", packDir])
  )[0];
  const tarballPath = join(packDir, packResult.filename);

  for (const reactVersion of reactVersions) {
    const appDir = join(tempRoot, `react-${reactVersion}`);
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, "package.json"),
      JSON.stringify(
        {
          name: `i18nexus-react-${reactVersion}`,
          private: true,
          type: "module",
          dependencies: {
            i18nexus: `file:${tarballPath}`,
            react: reactVersion,
            "react-dom": reactVersion,
          },
        },
        null,
        2
      )
    );
    run(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund"],
      appDir
    );
    await writeFile(
      join(appDir, "render.mjs"),
      `import { createRequire } from "node:module";
import React from "react";
import { I18nProvider, useTranslation } from "i18nexus";

const { renderToStaticMarkup } = createRequire(import.meta.url)("react-dom/server");

function Consumer() {
  const { t } = useTranslation("common");
  return React.createElement("span", null, t("hello"));
}

const output = renderToStaticMarkup(
  React.createElement(
    I18nProvider,
    {
      initialLanguage: "en",
      translations: { common: { en: { hello: "Hello" } } },
      fallbackNamespace: "common",
    },
    React.createElement(Consumer)
  )
);

if (output !== "<span>Hello</span>") {
  throw new Error(\`Unexpected React ${reactVersion} output: \${output}\`);
}
`
    );
    run("node", ["render.mjs"], appDir);
    console.log(`React ${reactVersion}: passed`);
  }

  console.log(`React matrix passed: ${reactVersions.join(", ")}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
