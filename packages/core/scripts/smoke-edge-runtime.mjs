import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import { build } from "esbuild";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-edge-smoke-"));
const EDGE_BASE_GZIP_BUDGET = 5_000;
const EDGE_ICU_GZIP_BUDGET = 18_000;
const forbiddenRuntimeIdentifiers = new Set([
  "process",
  "Buffer",
  "require",
  "module",
  "__dirname",
  "__filename",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "setImmediate",
  "clearImmediate",
]);
const browserGlobalObjects = new Set(["globalThis", "self", "window"]);
const traverse = traverseModule.default;

const checksum = (value) =>
  Array.from(value).reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);

async function bundle(name, source) {
  const entryPath = join(tempRoot, `${name}.mjs`);
  await writeFile(entryPath, source);
  const result = await build({
    entryPoints: [entryPath],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    minify: true,
    write: false,
    metafile: true,
  });
  const output = result.outputFiles[0].contents;
  return {
    gzipBytes: gzipSync(output).byteLength,
    text: new TextDecoder().decode(output),
    metafile: result.metafile,
  };
}

function isForbiddenGraphPath(entry) {
  const normalized = entry.replaceAll("\\", "/");
  return (
    normalized.startsWith("node:") ||
    /^(?:fs|path)(?:\/|$)/.test(normalized) ||
    /(?:^|\/)node_modules\/(?:react|react-dom|next)(?:\/|$)/.test(
      normalized
    )
  );
}

function isForbiddenDynamicImportSource(value) {
  const normalized = value.replaceAll("\\", "/");
  return (
    normalized.startsWith("node:") ||
    /^(?:fs|path|next|react|react-dom)(?:\/|$)/.test(normalized)
  );
}

function getStaticString(path) {
  if (path.isStringLiteral()) {
    return path.node.value;
  }

  const evaluation = path.evaluate();
  return evaluation.confident && typeof evaluation.value === "string"
    ? evaluation.value
    : undefined;
}

function getForbiddenRuntimeReference(source) {
  const ast = parse(source, { sourceType: "script" });
  let forbidden;
  const reject = (path, reference) => {
    if (!forbidden) {
      forbidden = reference;
      path.stop();
    }
  };

  const checkGlobalMember = (path) => {
    const object = path.get("object");
    if (
      !object.isIdentifier() ||
      !browserGlobalObjects.has(object.node.name)
    ) {
      return;
    }

    const property = path.get("property");
    const propertyName = path.node.computed
      ? getStaticString(property)
      : property.isIdentifier()
        ? property.node.name
        : undefined;
    if (propertyName && forbiddenRuntimeIdentifiers.has(propertyName)) {
      reject(path, `${object.node.name}.${propertyName}`);
    }
  };

  const checkDynamicImport = (path, sourcePath) => {
    const sourceValue = getStaticString(sourcePath);
    if (sourceValue && isForbiddenDynamicImportSource(sourceValue)) {
      reject(path, `import(${JSON.stringify(sourceValue)})`);
    }
  };

  traverse(ast, {
    Identifier(path) {
      if (
        forbiddenRuntimeIdentifiers.has(path.node.name) &&
        path.isReferencedIdentifier()
      ) {
        reject(path, path.node.name);
      }
    },
    MemberExpression: checkGlobalMember,
    OptionalMemberExpression: checkGlobalMember,
    ImportExpression(path) {
      checkDynamicImport(path, path.get("source"));
    },
    CallExpression(path) {
      if (path.node.callee.type === "Import") {
        checkDynamicImport(path, path.get("arguments")[0]);
      }
    },
  });

  return forbidden;
}

function assertValidatorSelfTest() {
  const rejectedSources = [
    "function dormant() { return process; }",
    "function dormant() { return globalThis.process; }",
    "function dormant() { return globalThis[\"Buffer\"]; }",
    "function dormant() { return clearTimeout(0); }",
    "function dormant() { return setImmediate(() => undefined); }",
    "async function dormant() { return import(\"node:fs\"); }",
  ];

  for (const source of rejectedSources) {
    assert.ok(
      getForbiddenRuntimeReference(source),
      `Edge validator failed to reject ${source}`
    );
  }
  assert.equal(
    getForbiddenRuntimeReference('function dormant() { return "process message"; }'),
    undefined
  );
}

function assertEdgeOnlyGraph(name, bundleResult) {
  const graphPaths = [
    ...Object.keys(bundleResult.metafile.inputs),
    ...Object.values(bundleResult.metafile.inputs).flatMap((input) =>
      input.imports.map((entry) => entry.path)
    ),
    ...Object.values(bundleResult.metafile.outputs).flatMap((output) =>
      output.imports.map((entry) => entry.path)
    ),
  ];
  const forbidden = graphPaths.find(isForbiddenGraphPath);
  if (forbidden) {
    throw new Error(`${name} bundle contains forbidden import ${forbidden}`);
  }
  const forbiddenRuntimeReference = getForbiddenRuntimeReference(
    bundleResult.text
  );
  if (forbiddenRuntimeReference) {
    throw new Error(`${name} bundle references ${forbiddenRuntimeReference}`);
  }
}

function runInEdgeVm(source, resultName) {
  const context = {
    Headers,
    Intl,
    URL,
    TextEncoder,
    TextDecoder,
    console,
  };
  vm.runInNewContext(source, context);
  return context[resultName];
}

assertValidatorSelfTest();

try {
  const edgeEntry = JSON.stringify(join(packageRoot, "dist", "utils", "edge.js"));
  const icuFormatterEntry = JSON.stringify(
    join(packageRoot, "dist", "utils", "icu-formatter.js")
  );
  const edgeBase = await bundle(
    "edge-base",
    `import { createEdgeTranslation, getEdgeTranslation } from ${edgeEntry};
const messages = {
  en: { greeting: "Hello {{name}}" },
  ko: { greeting: "안녕하세요 {{name}}" },
};
const negotiated = getEdgeTranslation(
  new Headers({ cookie: "i18n-language=ko", "accept-language": "en-US,en;q=0.9" }),
  messages,
  { availableLanguages: ["en", "ko"], defaultLanguage: "en" },
);
const explicit = createEdgeTranslation("de-DE", messages);
globalThis.__edgeBaseResult = {
  language: negotiated.language,
  legacy: negotiated.t("greeting", { name: "Ada" }),
  number: explicit.format.number(1234.5),
};
`
  );
  const edgeIcu = await bundle(
    "edge-icu",
    `import { createEdgeTranslation } from ${edgeEntry};
import { createIcuMessageFormatter } from ${icuFormatterEntry};
const translation = createEdgeTranslation(
  "en",
  { en: { items: "{count, plural, one {# item} other {# items}}" } },
  { messageFormatter: createIcuMessageFormatter() },
);
globalThis.__edgeIcuResult = translation.t("items", { count: 2 });
`
  );

  assertEdgeOnlyGraph("edge base", edgeBase);
  assertEdgeOnlyGraph("edge ICU", edgeIcu);

  const baseResult = runInEdgeVm(edgeBase.text, "__edgeBaseResult");
  const icuResult = runInEdgeVm(edgeIcu.text, "__edgeIcuResult");
  assert.equal(baseResult.language, "ko");
  assert.equal(baseResult.legacy, "안녕하세요 Ada");
  assert.equal(
    baseResult.number,
    new Intl.NumberFormat("de-DE").format(1234.5)
  );
  assert.equal(icuResult, "2 items");

  const report = {
    node: process.version,
    esbuild: "0.25.11",
    edgeBase: { gzipBytes: edgeBase.gzipBytes, maxGzipBytes: EDGE_BASE_GZIP_BUDGET },
    edgeIcu: { gzipBytes: edgeIcu.gzipBytes, maxGzipBytes: EDGE_ICU_GZIP_BUDGET },
    vm: {
      globals: ["Headers", "Intl", "URL", "TextEncoder", "TextDecoder", "console"],
      baseChecksum: checksum(JSON.stringify(baseResult)),
      icuChecksum: checksum(icuResult),
    },
    outputScanNote:
      "Babel AST verifies direct globals, browser-global members, and static dynamic imports; error strings do not count as runtime globals.",
  };
  console.log(JSON.stringify(report, null, 2));

  if (edgeBase.gzipBytes > EDGE_BASE_GZIP_BUDGET) {
    throw new Error(`Edge base gzip budget exceeded: ${edgeBase.gzipBytes} bytes`);
  }
  if (edgeIcu.gzipBytes > EDGE_ICU_GZIP_BUDGET) {
    throw new Error(`Edge ICU gzip budget exceeded: ${edgeIcu.gzipBytes} bytes`);
  }
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
