import { createHash } from "node:crypto";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { createIcuMessageFormatter } from "../dist/utils/icu.js";
import { createFormatter } from "../dist/utils/formatter.js";
import { createServerTranslation } from "../dist/utils/server.js";

const sampleCount = 25;
const legacyIterations = 50_000;
const icuCacheHitIterations = 20_000;
const icuColdCompileIterations = 2_000;
const formatterCacheHitIterations = 50_000;
const limits = {
  legacyInterpolationP50: 0.55,
  icuCacheHitP50: 5,
  icuColdCompileP50: 100,
  formatterCacheHitP50: 25,
};

const legacy = createServerTranslation("en", {
  en: {
    greeting: "Hello, {{name}}. You have {{count}} messages.",
  },
});
const cachedFormatter = createIcuMessageFormatter();
const formatter = createFormatter("en-US");
const formatterOptions = { maximumFractionDigits: 0 };
const icuMessage = "{count, plural, one {# item} other {# items}}";
const coldMessages = Array.from(
  { length: sampleCount * icuColdCompileIterations },
  (_, index) =>
    `{count, plural, one {# item ${index}} other {# items ${index}}}`
);

function checksum(value, previous) {
  return (previous + value.length) >>> 0;
}

function percentile(values, ratio) {
  const index = Math.min(
    values.length - 1,
    Math.ceil(values.length * ratio) - 1
  );
  return values[index];
}

function measure(name, iterations, run) {
  for (let index = 0; index < iterations; index += 1) {
    run(index, -1);
  }

  const samples = [];
  let totalLengthChecksum = 0;
  for (let sample = 0; sample < sampleCount; sample += 1) {
    let sampleChecksum = 0;
    const start = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      sampleChecksum = checksum(run(index, sample), sampleChecksum);
    }
    samples.push(((performance.now() - start) * 1_000) / iterations);
    totalLengthChecksum = (totalLengthChecksum + sampleChecksum) >>> 0;
  }

  samples.sort((left, right) => left - right);
  return {
    name,
    p50: Number(percentile(samples, 0.5).toFixed(4)),
    p95: Number(percentile(samples, 0.95).toFixed(4)),
    timedLengthChecksum: totalLengthChecksum,
    representativeChecksum: createHash("sha256")
      .update(run(0, 0))
      .digest("hex"),
  };
}

const legacyResult = measure(
  "legacy-interpolation",
  legacyIterations,
  (index) => legacy("greeting", { name: "Ada", count: index })
);
const cacheHitResult = measure(
  "icu-cache-hit",
  icuCacheHitIterations,
  (index) =>
    cachedFormatter.format({
      locale: "en",
      message: icuMessage,
      values: { count: index },
    })
);
const coldCompileResult = measure(
  "icu-cold-compile",
  icuColdCompileIterations,
  (index, sample) => {
    const messageIndex = Math.max(sample, 0) * icuColdCompileIterations + index;
    return createIcuMessageFormatter().format({
      locale: "en",
      message: coldMessages[messageIndex],
      values: { count: index },
    });
  }
);
const formatterResult = measure(
  "formatter-cache-hit",
  formatterCacheHitIterations,
  (index) => formatter.number(index, formatterOptions)
);

const results = [legacyResult, cacheHitResult, coldCompileResult, formatterResult];
const output = {
  environment: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    v8: process.versions.v8,
    cpu: cpus()[0]?.model || "unknown",
  },
  samples: sampleCount,
  unit: "microseconds/operation",
  limits,
  results,
};

console.log(JSON.stringify(output, null, 2));

const failures = [
  [legacyResult, limits.legacyInterpolationP50],
  [cacheHitResult, limits.icuCacheHitP50],
  [coldCompileResult, limits.icuColdCompileP50],
  [formatterResult, limits.formatterCacheHitP50],
].filter(([result, limit]) => result.p50 > limit);

if (failures.length > 0) {
  throw new Error(
    `Performance gate failed: ${failures
      .map(
        ([result, limit]) => `${result.name} p50 ${result.p50}us > ${limit}us`
      )
      .join(", ")}`
  );
}
