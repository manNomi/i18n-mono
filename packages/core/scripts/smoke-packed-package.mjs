import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = await mkdtemp(join(tmpdir(), "i18nexus-pack-smoke-"));

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
  const rscDir = join(tempRoot, "rsc");
  await mkdir(packDir, { recursive: true });
  await mkdir(join(appDir, "locales", "common"), { recursive: true });

  const packResult = JSON.parse(
    run("npm", ["pack", "--json", "--pack-destination", packDir])
  )[0];
  const tarballPath = join(packDir, packResult.filename);
  const packedFiles = new Set(packResult.files.map((file) => file.path));
  const requiredFiles = [
    "dist/index.js",
    "dist/index.d.ts",
    "dist/utils/server.js",
    "dist/utils/server.d.ts",
    "dist/utils/edge.js",
    "dist/utils/edge.d.ts",
    "dist/utils/icu.js",
    "dist/utils/icu.d.ts",
    "dist/utils/icu-formatter.js",
    "dist/utils/icu-server.js",
    "dist/utils/formatter.js",
    "dist/components/I18NexusDevtools.js",
    "dist/components/I18NexusDevtools.d.ts",
    "LICENSE",
  ];

  for (const file of requiredFiles) {
    if (!packedFiles.has(file)) {
      throw new Error(`Packed package is missing ${file}`);
    }
  }

  await writeFile(
    join(appDir, "package.json"),
    JSON.stringify(
      {
        name: "i18nexus-installed-smoke",
        private: true,
        type: "module",
        dependencies: {
          i18nexus: `file:${tarballPath}`,
          react: "18.3.1",
          "react-dom": "18.3.1",
        },
        devDependencies: {
          "@types/react": "18.3.31",
          "@types/react-dom": "18.3.7",
          typescript: "5.9.3",
        },
      },
      null,
      2
    )
  );

  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: appDir,
  });

  const installedRoot = join(appDir, "node_modules", "i18nexus");
  const installedManifest = JSON.parse(
    readFileSync(join(installedRoot, "package.json"), "utf-8")
  );
  for (const subpath of [
    ".",
    "./server",
    "./edge",
    "./icu",
    "./icu/server",
    "./icu/formatter",
    "./devtools",
  ]) {
    if (!installedManifest.exports?.[subpath]) {
      throw new Error(`Installed package is missing export ${subpath}`);
    }
  }

  const license = readFileSync(join(installedRoot, "LICENSE"), "utf-8");
  if (!license.includes("MIT License") || license.includes("[year]")) {
    throw new Error(
      "Installed package does not contain a completed MIT license"
    );
  }

  await writeFile(
    join(appDir, "locales", "common", "en.json"),
    JSON.stringify({ welcome: "Welcome", hello: "Hello, {{name}}" }, null, 2)
  );
  await writeFile(
    join(appDir, "locales", "common", "ko.json"),
    JSON.stringify(
      { welcome: "환영합니다", hello: "안녕하세요, {{name}}님" },
      null,
      2
    )
  );

  await writeFile(
    join(appDir, "smoke.mjs"),
    `import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  I18nProvider,
  createFormatter,
  createI18n,
  defineConfig,
  useLanguageSwitcher,
  useFormatter,
  useTranslation,
} from "i18nexus";
import { createFormatter as createServerFormatter, createServerTranslation, getTranslation } from "i18nexus/server";
import { createEdgeTranslation, getEdgeTranslation } from "i18nexus/edge";
import {
  I18nMessageFormatError,
  IcuI18nProvider,
  createIcuI18n,
  createIcuMessageFormatter,
  createIcuServerTranslation,
  useIcuTranslation,
} from "i18nexus/icu";
import { I18NexusDevtools } from "i18nexus/devtools";

const requiredFunctions = {
  I18nProvider,
  createFormatter,
  createI18n,
  defineConfig,
  useLanguageSwitcher,
  useFormatter,
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

const translations = {
  common: {
    en: { welcome: "Welcome", hello: "Hello, {{name}}" },
  },
};

function Welcome() {
  const { t } = useTranslation("common");
  return React.createElement("h1", null, t("hello", { name: "Ada" }));
}

const html = renderToStaticMarkup(
  React.createElement(
    I18nProvider,
    { initialLanguage: "en", translations, fallbackNamespace: "common" },
    React.createElement(Welcome)
  )
);
if (html !== "<h1>Hello, Ada</h1>") {
  throw new Error(\`README-shaped Provider smoke failed: \${html}\`);
}

const pureT = createServerTranslation("en", { en: { welcome: "Welcome" } });
if (pureT("welcome") !== "Welcome") {
  throw new Error("createServerTranslation smoke failed");
}

if (createFormatter("en-US").currency(12, "USD") !== "$12.00") {
  throw new Error("root createFormatter packed smoke failed");
}
if (createServerFormatter("de-DE").number(1234.5) !== "1.234,5") {
  throw new Error("server createFormatter packed smoke failed");
}

const edgeTranslations = {
  en: { greeting: "Hello {{name}}", items: "{count, plural, one {# item} other {# items}}" },
  ko: { greeting: "안녕하세요 {{name}}" },
};
const edgeTranslation = getEdgeTranslation(
  new Headers({ cookie: "i18n-language=ko", "accept-language": "en-US,en;q=0.9" }),
  edgeTranslations,
  { availableLanguages: ["en", "ko"], defaultLanguage: "en" },
);
if (edgeTranslation.language !== "ko" || edgeTranslation.t("greeting", { name: "Ada" }) !== "안녕하세요 Ada") {
  throw new Error("getEdgeTranslation packed smoke failed");
}
const explicitEdgeTranslation = createEdgeTranslation("de-DE", edgeTranslations);
if (explicitEdgeTranslation.format.number(1234.5) !== "1.234,5") {
  throw new Error("createEdgeTranslation packed smoke failed");
}

const loaded = await getTranslation("common", {
  language: "en",
  localesDir: "./locales",
  disableCache: true,
});
if (loaded.t("hello", { name: "Ada" }) !== "Hello, Ada") {
  throw new Error("getTranslation installed-file smoke failed");
}
if (loaded.format.number(1234.5) !== "1,234.5") {
  throw new Error("getTranslation.format installed-file smoke failed");
}

const icuFormatter = createIcuMessageFormatter();
if (icuFormatter.format({ locale: "en", message: "{count, plural, one {# item} other {# items}}", values: { count: 2 } }) !== "2 items") {
  throw new Error("createIcuMessageFormatter packed smoke failed");
}
const icuT = createIcuServerTranslation("en", {
  en: { items: "{count, plural, one {# item} other {# items}}" },
});
if (icuT("items", { count: 2 }) !== "2 items") {
  throw new Error("createIcuServerTranslation packed smoke failed");
}
const icuEdgeTranslation = createEdgeTranslation("en", edgeTranslations, {
  messageFormatter: createIcuMessageFormatter(),
});
if (icuEdgeTranslation.t("items", { count: 2 }) !== "2 items") {
  throw new Error("ICU Edge formatter packed smoke failed");
}
for (const [name, value] of Object.entries({
  IcuI18nProvider,
  useIcuTranslation,
  createIcuI18n,
  I18nMessageFormatError,
})) {
  if (typeof value !== "function") throw new Error(\`ICU ready API \${name} is unavailable\`);
}
`
  );

  await writeFile(
    join(appDir, "smoke.cjs"),
    `(async () => {
  const core = await import("i18nexus");
  const server = await import("i18nexus/server");
  const edge = await import("i18nexus/edge");
  const devtools = await import("i18nexus/devtools");
  if (typeof core.I18nProvider !== "function") throw new Error("root import failed");
  if (typeof server.getTranslation !== "function") throw new Error("server import failed");
  if (typeof edge.getEdgeTranslation !== "function") throw new Error("edge import failed");
  if (typeof devtools.I18NexusDevtools !== "function") throw new Error("devtools import failed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`
  );

  await writeFile(
    join(appDir, "consumer.tsx"),
    `import type { ReactElement, ReactNode } from "react";
import {
  defineConfig,
  I18nProvider,
  createFormatter,
  useLanguageSwitcher,
  useFormatter,
  useTranslation,
  type I18nFormatter,
  type ExtractLanguages,
  type I18nexusConfig,
} from "i18nexus";
import { createFormatter as createServerFormatter, createServerTranslation, type GetTranslationOptions } from "i18nexus/server";
import {
  createEdgeTranslation,
  getEdgeTranslation,
  parseAcceptLanguage,
  parseCookies,
  type EdgeTranslationFunction,
  type EdgeTranslationOptions,
  type EdgeTranslationReturn,
  type EdgeTranslationVariables,
  type LanguageNegotiationOptions,
} from "i18nexus/edge";
import {
  I18nMessageFormatError,
  IcuI18nProvider,
  createIcuI18n,
  createIcuMessageFormatter,
  createIcuServerTranslation,
  useIcuTranslation,
  type CreateIcuI18nOptions,
  type CreateIcuServerTranslationOptions,
  type IcuI18nProviderProps,
  type IcuRichMessageValues,
  type IcuRichTag,
  type IcuMessageFormatter,
  type IcuMessageFormatterOptions,
} from "i18nexus/icu";
import type {
  MessageFormatRequest,
  MessageFormatter,
  TranslationFunction,
  TranslationStyles,
  TranslationVariables,
} from "i18nexus";
import commonEn from "./locales/common/en.json";
import commonKo from "./locales/common/ko.json";

const translations = { common: { en: commonEn, ko: commonKo } };
const config = defineConfig({
  languages: ["en", "ko"] as const,
  defaultLanguage: "en",
});
const typedConfig: I18nexusConfig<typeof config.languages> = config;
const language: ExtractLanguages<typeof config> = "ko";

// @ts-expect-error defaultLanguage must be included in languages
defineConfig({ languages: ["en", "ko"] as const, defaultLanguage: "fr" });

function TypedLanguageSwitcher() {
  const { changeLanguage, switchLng } =
    useLanguageSwitcher<ExtractLanguages<typeof config>>();
  void changeLanguage("ko");
  void switchLng("en");
  // @ts-expect-error language must be included in the explicit language union
  void changeLanguage("fr");
  return null;
}

export function Provider({ children }: { children: ReactNode }) {
  return (
    <I18nProvider
      initialLanguage="en"
      translations={translations}
      fallbackNamespace="common"
    >
      {children}
    </I18nProvider>
  );
}

export function Welcome() {
  const { format, t } = useTranslation("common");
  const formatter = useFormatter();
  return <h1>{t("welcome")} {format.number(1)} {formatter.number(2)}</h1>;
}

const options: GetTranslationOptions = { language: "en" };
const t = createServerTranslation("en", { en: { welcome: "Welcome" } });
const edgeOptions: EdgeTranslationOptions = {
  availableLanguages: ["en", "ko"],
  defaultLanguage: "en",
};
const languageOptions: LanguageNegotiationOptions = edgeOptions;
const edgeTranslations = { en: { welcome: "Welcome" }, ko: { welcome: "환영합니다" } };
const edge = getEdgeTranslation(
  new Headers({ "accept-language": "ko-KR,ko;q=0.9" }),
  edgeTranslations,
  edgeOptions,
);
const explicitEdge: EdgeTranslationReturn<typeof edgeTranslations> =
  createEdgeTranslation("en", edgeTranslations, edgeOptions);
const edgeT: EdgeTranslationFunction = edge.t;
const edgeVariables: EdgeTranslationVariables = { name: "Ada" };
const formatter: I18nFormatter = createFormatter("en-US");
const serverFormatter: I18nFormatter = createServerFormatter("en-US");
const icuOptions: IcuMessageFormatterOptions = { onCacheEvent: () => undefined };
const icuFormatter: IcuMessageFormatter = createIcuMessageFormatter(icuOptions);
const icuT = createIcuServerTranslation("en", {
  en: { items: "{count, plural, one {# item} other {# items}}" },
});
type CustomValues = { count: number };
const typedFormatter: MessageFormatter<CustomValues, string> =
  createIcuMessageFormatter<CustomValues, string>();
const typedRequest: MessageFormatRequest<CustomValues> = {
  locale: "en",
  message: "{count}",
  values: { count: 2 },
};
function callableOnly(
  key: string,
  variables: TranslationVariables,
  styles: TranslationStyles,
): ReactElement;
function callableOnly(key: string, variables?: TranslationVariables): string;
function callableOnly(
  key: string,
  variables?: TranslationVariables,
  styles?: TranslationStyles,
): string | ReactElement {
  void variables;
  void styles;
  return key;
}
const compatibleCallable: TranslationFunction = callableOnly;
const readyProvider: typeof IcuI18nProvider = IcuI18nProvider;
const readyHook: typeof useIcuTranslation = useIcuTranslation;
const readyI18n: typeof createIcuI18n = createIcuI18n;
const readyError: typeof I18nMessageFormatError = I18nMessageFormatError;
const richTag: IcuRichTag = (chunks) => chunks[0] ?? "";
const richValues: IcuRichMessageValues = { tag: richTag };
const providerProps: Omit<IcuI18nProviderProps, "children"> = { initialLanguage: "en" };
const i18nOptions: CreateIcuI18nOptions = {};
const serverOptions: CreateIcuServerTranslationOptions = {};
void options;
void t("welcome");
void edge.t("welcome", edgeVariables);
void explicitEdge.format.number(1);
void edgeT("welcome");
void parseAcceptLanguage("ko", ["en", "ko"]);
void parseCookies("i18n-language=ko");
void languageOptions;
void formatter.currency(1, "USD");
void serverFormatter.dateTime(new Date(), { timeZone: "UTC" });
void icuFormatter.format({ locale: "en", message: "{count}", values: { count: 2 } });
void icuT("items", { count: 2 });
void typedFormatter.format(typedRequest);
void compatibleCallable;
void readyProvider;
void readyHook;
void readyI18n;
void readyError;
void richValues;
void providerProps;
void i18nOptions;
void serverOptions;
void typedConfig;
void language;
void TypedLanguageSwitcher;
`
  );

  await writeFile(
    join(appDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          noEmit: true,
          target: "ES2020",
          lib: ["ES2020", "ES2021.Intl", "DOM"],
          module: "ESNext",
          moduleResolution: "Bundler",
          jsx: "react-jsx",
          resolveJsonModule: true,
          allowSyntheticDefaultImports: true,
          skipLibCheck: false,
        },
        include: ["consumer.tsx"],
      },
      null,
      2
    )
  );

  run("node", ["smoke.mjs"], { cwd: appDir });
  run("node", ["smoke.cjs"], { cwd: appDir });
  run(
    process.execPath,
    [
      join(appDir, "node_modules", "typescript", "bin", "tsc"),
      "-p",
      "tsconfig.json",
    ],
    { cwd: appDir }
  );
  run("npm", ["audit", "--omit=dev", "--audit-level=high"], { cwd: appDir });

  await mkdir(join(rscDir, "app"), { recursive: true });
  await writeFile(
    join(rscDir, "package.json"),
    JSON.stringify(
      {
        name: "i18nexus-rsc-smoke",
        private: true,
        type: "module",
        dependencies: {
          i18nexus: `file:${tarballPath}`,
          next: "15.5.20",
          react: "18.3.1",
          "react-dom": "18.3.1",
        },
        devDependencies: {
          "@types/node": "22.18.0",
          "@types/react": "18.3.31",
          "@types/react-dom": "18.3.7",
          typescript: "5.9.3",
        },
      },
      null,
      2
    )
  );
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: rscDir,
  });
  await writeFile(
    join(rscDir, "app", "page.tsx"),
    `import { createIcuServerTranslation } from "i18nexus/icu";

export default function Page() {
  const t = createIcuServerTranslation("en", {
    en: { items: "{count, plural, one {# item} other {# items}}" },
  });
  return <main>{t("items", { count: 2 })}</main>;
}
`
  );
  await writeFile(
    join(rscDir, "app", "layout.tsx"),
    `import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html><body>{children}</body></html>;
}
`
  );
  await writeFile(
    join(rscDir, "next.config.mjs"),
    "export default { typescript: { ignoreBuildErrors: true } };\n"
  );
  run(join(rscDir, "node_modules", ".bin", "next"), ["build"], {
    cwd: rscDir,
    stdio: "pipe",
  });

  if (!existsSync(join(appDir, "package-lock.json"))) {
    throw new Error("Clean npm install did not create a lockfile");
  }

  console.log(`Packed package smoke passed: ${packResult.filename}`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
