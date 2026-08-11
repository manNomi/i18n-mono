import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-bundle-smoke-"));
const FEATURE1_LEGACY_ROOT_GZIP = 3962;
const FEATURE2_LEGACY_ROOT_GZIP = 4500;
const FORMATTER_FEATURE2_DELTA_GZIP = 500;
const FORMATTER_STANDALONE_GZIP = 700;

async function bundle(name, source) {
  const entryPath = join(tempRoot, `${name}.js`);
  await writeFile(entryPath, source);
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    minify: true,
    format: "esm",
    platform: "browser",
    external: ["react", "react/jsx-runtime"],
    write: false,
    metafile: true,
  });
  const output = result.outputFiles[0].contents;
  return {
    bytes: output.byteLength,
    gzipBytes: gzipSync(output).byteLength,
    text: new TextDecoder().decode(output),
    metafile: result.metafile,
  };
}

function assertNoNodeBuiltins(name, metafile) {
  const imports = Object.values(metafile.outputs).flatMap(
    (output) => output.imports
  );
  const nodeBuiltin = imports.find(({ path }) =>
    /^(?:node:)?(?:fs|path)(?:\/promises)?$/.test(path)
  );

  if (nodeBuiltin) {
    throw new Error(`${name} bundle imports Node builtin ${nodeBuiltin.path}`);
  }
}

try {
  const rootEntry = JSON.stringify(join(packageRoot, "dist", "index.js"));
  const urlOnly = await bundle(
    "url-only",
    `import { localizeUrl } from ${rootEntry};\nconsole.log(localizeUrl('/docs', 'ko'));\n`
  );
  const clientRuntime = await bundle(
    "legacy-client-root",
    `export { I18nProvider, useLanguageSwitcher, useTranslation } from ${rootEntry};\n`
  );
  const icuEntry = JSON.stringify(join(packageRoot, "dist", "utils", "icu.js"));
  const icuConsumer = await bundle(
    "icu-consumer",
    `import { createIcuMessageFormatter, createIcuServerTranslation } from ${icuEntry};
const formatter = createIcuMessageFormatter();
const t = createIcuServerTranslation("en", { en: { items: "{count, plural, one {# item} other {# items}}" } });
console.log(formatter.format({ locale: "en", message: "{count}", values: { count: 1 } }), t("items", { count: 2 }));\n`
  );
  const icuFormatter = await bundle(
    "icu-formatter",
    `import { createIcuMessageFormatter } from ${JSON.stringify(
      join(packageRoot, "dist", "utils", "icu-formatter.js")
    )};
console.log(createIcuMessageFormatter().format({ locale: "en", message: "{count}", values: { count: 1 } }));\n`
  );
  const nativeFormatter = await bundle(
    "native-formatter",
    `import { createFormatter } from ${JSON.stringify(
      join(packageRoot, "dist", "utils", "formatter.js")
    )};
console.log(createFormatter("en-US").number(1234.5));\n`
  );
  const icuServer = await bundle(
    "icu-server",
    `import { createIcuServerTranslation } from ${JSON.stringify(
      join(packageRoot, "dist", "utils", "icu-server.js")
    )};
console.log(createIcuServerTranslation("en", { en: { key: "Value" } })("key"));\n`
  );
  const formatterFeature2Delta =
    clientRuntime.gzipBytes - FEATURE1_LEGACY_ROOT_GZIP;
  const report = {
    node: process.version,
    esbuild: "0.25.11",
    reactExternal: true,
    urlOnly: { bytes: urlOnly.bytes, gzipBytes: urlOnly.gzipBytes },
    legacyClientRoot: {
      bytes: clientRuntime.bytes,
      gzipBytes: clientRuntime.gzipBytes,
    },
    legacyFeature1Baseline: FEATURE1_LEGACY_ROOT_GZIP,
    formatterFeature2Delta,
    formatterStandalone: {
      gzipBytes: nativeFormatter.gzipBytes,
      maxGzipBytes: FORMATTER_STANDALONE_GZIP,
    },
    formatterGateNote:
      "The prior 399 B unsafe-options budget was retired because it violated native Intl option semantics.",
    icuConsumer: {
      bytes: icuConsumer.bytes,
      gzipBytes: icuConsumer.gzipBytes,
    },
    pureIcu: {
      formatterGzipBytes: icuFormatter.gzipBytes,
      serverGzipBytes: icuServer.gzipBytes,
    },
    budgets: {
      urlOnlyGzipBytes: 2500,
      legacyClientRootGzipBytes: FEATURE2_LEGACY_ROOT_GZIP,
      formatterFeature2DeltaGzipBytes: FORMATTER_FEATURE2_DELTA_GZIP,
      formatterStandaloneGzipBytes: FORMATTER_STANDALONE_GZIP,
      icuConsumerGzipBytes: 18000,
    },
  };

  console.log(JSON.stringify(report, null, 2));

  if (/react|createContext|useContext/.test(urlOnly.text)) {
    throw new Error("URL-only bundle retained React runtime code");
  }
  if (urlOnly.gzipBytes > 2_500) {
    throw new Error(
      `URL-only gzip budget exceeded: ${urlOnly.gzipBytes} bytes`
    );
  }
  if (clientRuntime.gzipBytes > FEATURE2_LEGACY_ROOT_GZIP) {
    throw new Error(
      `Legacy client root gzip budget exceeded: ${clientRuntime.gzipBytes} bytes`
    );
  }
  if (formatterFeature2Delta > FORMATTER_FEATURE2_DELTA_GZIP) {
    throw new Error(
      `Formatter feature gzip delta exceeded: ${formatterFeature2Delta} bytes`
    );
  }
  if (nativeFormatter.gzipBytes > FORMATTER_STANDALONE_GZIP) {
    throw new Error(
      `Formatter standalone gzip budget exceeded: ${nativeFormatter.gzipBytes} bytes`
    );
  }
  if (icuConsumer.gzipBytes > 18_000) {
    throw new Error(
      `ICU consumer gzip budget exceeded: ${icuConsumer.gzipBytes} bytes`
    );
  }

  assertNoNodeBuiltins("ICU consumer", icuConsumer.metafile);
  assertNoNodeBuiltins("ICU formatter", icuFormatter.metafile);
  assertNoNodeBuiltins("ICU server", icuServer.metafile);
  assertNoNodeBuiltins("native formatter", nativeFormatter.metafile);

} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
