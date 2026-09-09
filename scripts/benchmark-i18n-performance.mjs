#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import i18next from "i18next";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "..");
const iterations = Number(process.env.BENCH_ITERATIONS || 1_000_000);
const renderIterations = Number(process.env.BENCH_RENDER_ITERATIONS || 20_000);
const keyCount = Number(process.env.BENCH_KEY_COUNT || 1_000);
const languages = ["en", "ko"];
const namespaces = ["common", "home"];

function compileCoreRuntime() {
  const outDir = mkdtempSync(path.join(tmpdir(), "i18nexus-core-runtime-"));
  execFileSync(
    process.execPath,
    [
      require.resolve("typescript/bin/tsc"),
      "-p",
      path.join(repoRoot, "packages/core/tsconfig.build.json"),
      "--outDir",
      outDir,
      "--declaration",
      "false",
      "--declarationMap",
      "false",
      "--sourceMap",
      "false",
    ],
    {
      cwd: repoRoot,
      stdio: "pipe",
    },
  );
  symlinkSync(
    path.join(repoRoot, "node_modules"),
    path.join(outDir, "node_modules"),
    "dir",
  );

  return outDir;
}

function makeLanguageMap(namespace, language) {
  const result = {};

  for (let index = 0; index < keyCount; index += 1) {
    result[`key.${index}`] = `${namespace}:${language}:${index}`;
  }

  result.greeting = `Hello {{name}} from ${namespace}`;
  result.shared = `${namespace}:${language}:shared`;
  return result;
}

function makeRuntimeTranslations() {
  const result = {};

  for (const namespace of namespaces) {
    result[namespace] = {};
    for (const language of languages) {
      result[namespace][language] = makeLanguageMap(namespace, language);
    }
  }

  return result;
}

function makeI18nextResources(runtimeTranslations) {
  const resources = {};

  for (const language of languages) {
    resources[language] = {};
    for (const namespace of namespaces) {
      resources[language][namespace] = runtimeTranslations[namespace][language];
    }
  }

  return resources;
}

function bench(name, fn, count = iterations) {
  for (let index = 0; index < 10_000; index += 1) {
    fn(index);
  }

  const start = performance.now();
  for (let index = 0; index < count; index += 1) {
    fn(index);
  }
  const durationMs = performance.now() - start;
  const opsPerSecond = (count / durationMs) * 1000;

  return {
    name,
    iterations: count,
    durationMs,
    opsPerSecond,
    nsPerOp: (durationMs * 1_000_000) / count,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function printResult(result) {
  console.log(
    [
      result.name.padEnd(42),
      `${formatNumber(result.opsPerSecond)} ops/sec`.padStart(22),
      `${formatNumber(result.nsPerOp)} ns/op`.padStart(18),
      `${formatNumber(result.durationMs)} ms`.padStart(14),
    ].join("  "),
  );
}

async function main() {
  const outDir = compileCoreRuntime();

  try {
    const runtime = await import(
      pathToFileURL(path.join(outDir, "utils/translation-runtime.js"))
    );
    const runtimeTranslations = makeRuntimeTranslations();
    const loadedNamespaces = new Map();
    const snapshot = runtime.resolveTranslationSnapshot({
      namespace: "home",
      staticTranslations: runtimeTranslations,
      currentLanguage: "en",
      fallbackLanguage: "en",
      fallbackNamespace: "common",
      loadedNamespaces,
      staticResolutionMode: "namespace",
      staticMergeMode: "when-empty",
    });

    const i18nextInstance = i18next.createInstance();
    await i18nextInstance.init({
      lng: "en",
      fallbackLng: "en",
      ns: namespaces,
      defaultNS: "home",
      resources: makeI18nextResources(runtimeTranslations),
      interpolation: {
        escapeValue: false,
      },
    });
    const fixedT = i18nextInstance.getFixedT("en", "home");

    const results = [
      bench("i18nexus t simple lookup", (index) => {
        runtime.translateFromSnapshot(snapshot, `key.${index % keyCount}`);
      }),
      bench("i18next fixedT simple lookup", (index) => {
        fixedT(`key.${index % keyCount}`);
      }),
      bench("i18nexus t interpolation", () => {
        runtime.translateFromSnapshot(snapshot, "greeting", {
          name: "Codex",
        });
      }),
      bench("i18next fixedT interpolation", () => {
        fixedT("greeting", {
          name: "Codex",
        });
      }),
      bench(
        "i18nexus resolve snapshot per render",
        () => {
          runtime.resolveTranslationSnapshot({
            namespace: "home",
            staticTranslations: runtimeTranslations,
            currentLanguage: "en",
            fallbackLanguage: "en",
            fallbackNamespace: "common",
            loadedNamespaces,
            staticResolutionMode: "namespace",
            staticMergeMode: "when-empty",
          });
        },
        renderIterations,
      ),
      bench(
        "i18next getFixedT per render",
        () => {
          i18nextInstance.getFixedT("en", "home");
        },
        renderIterations,
      ),
    ];

    const i18nextVersion = JSON.parse(
      readFileSync(require.resolve("i18next/package.json"), "utf-8"),
    ).version;
    const reactI18nextVersion = JSON.parse(
      readFileSync(require.resolve("react-i18next/package.json"), "utf-8"),
    ).version;

    console.log("i18n performance microbenchmark");
    console.log(`node: ${process.version}`);
    console.log(`i18next: ${i18nextVersion}`);
    console.log(`react-i18next: ${reactI18nextVersion}`);
    console.log(`keys per namespace: ${keyCount}`);
    console.log(`hot-path iterations: ${iterations}`);
    console.log(`render-path iterations: ${renderIterations}`);
    console.log("");

    for (const result of results) {
      printResult(result);
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
