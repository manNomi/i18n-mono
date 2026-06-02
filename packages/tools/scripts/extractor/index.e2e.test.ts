/**
 * extractor E2E 테스트
 * 실제 파일 시스템을 사용하여 전체 워크플로우 테스트
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import { runTranslationExtractor } from "./index";

const legacyFlatConfig = {
  useNamespaceStructure: false,
  namespacing: {
    enabled: false,
    basePath: "",
    defaultNamespace: "common",
  },
} as const;

function writeI18nexusTypeShim(projectRoot: string): void {
  const packageRoot = path.join(projectRoot, "node_modules", "i18nexus");
  fs.mkdirSync(path.join(packageRoot, "server"), { recursive: true });

  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    JSON.stringify(
      {
        name: "i18nexus",
        type: "module",
        exports: {
          ".": {
            types: "./index.d.ts",
            import: "./index.js",
          },
          "./server": {
            types: "./server/index.d.ts",
            import: "./server/index.js",
          },
        },
      },
      null,
      2,
    ),
    "utf-8",
  );

  fs.writeFileSync(
    path.join(packageRoot, "index.d.ts"),
    `export type NamespaceLoader = (namespace: string, language: string) => Promise<Record<string, string>>;
export interface UseTranslationReturn<K extends string = string> {
  t: (key: K, variables?: Record<string, string | number>) => string;
  currentLanguage: string;
  lng: string;
  isReady: boolean;
}
export interface CreateI18nUseTranslationReturn<K extends string = string> {
  t: (key: K, variables?: Record<string, string | number>) => string;
  currentLanguage: string;
  isReady: boolean;
}
export function useTranslation<K extends string = string>(namespace?: string): UseTranslationReturn<K>;
export function createI18n<
  TTranslations extends Record<string, Record<string, Record<string, string>>>,
  FallbackNamespace extends keyof TTranslations & string = never
>(
  translations: TTranslations,
  options?: { fallbackNamespace?: FallbackNamespace }
): {
  I18nProvider: unknown;
  useTranslation<NS extends keyof TTranslations & string>(
    namespace: NS
  ): CreateI18nUseTranslationReturn<string>;
};
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(packageRoot, "index.js"),
    `export function createI18n() {
  return {
    I18nProvider: undefined,
    useTranslation() {
      return { t: (key) => key, currentLanguage: "en", isReady: true };
    },
  };
}
export function useTranslation() {
  return { t: (key) => key, currentLanguage: "en", lng: "en", isReady: true };
}
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(packageRoot, "server", "index.d.ts"),
    `export interface GetTranslationOptions {
  language?: string;
}
export interface GetTranslationReturn<NS extends string = string, K extends string = string> {
  t: (key: K, variables?: Record<string, string | number>, fallback?: string) => string;
  namespace: NS;
}
export function getTranslation<NS extends string = string, K extends string = string>(
  namespace?: NS,
  options?: GetTranslationOptions
): Promise<GetTranslationReturn<NS, K>>;
`,
    "utf-8",
  );

  fs.writeFileSync(
    path.join(packageRoot, "server", "index.js"),
    `export async function getTranslation(namespace = "common") {
  return { t: (key) => key, namespace };
}
`,
    "utf-8",
  );
}

function runGeneratedTypeCheck(projectRoot: string): void {
  writeI18nexusTypeShim(projectRoot);

  const tsconfigPath = path.join(projectRoot, "tsconfig.generated.json");
  fs.writeFileSync(
    tsconfigPath,
    JSON.stringify(
      {
        compilerOptions: {
          strict: true,
          target: "ES2020",
          module: "ESNext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          skipLibCheck: true,
          noEmit: true,
        },
        include: ["locales/**/*.ts"],
      },
      null,
      2,
    ),
    "utf-8",
  );

  execFileSync(process.execPath, [
    require.resolve("typescript/bin/tsc"),
    "-p",
    tsconfigPath,
  ]);
}

describe("extractor E2E", () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-extractor-e2e-"));
    outputDir = path.join(tempDir, "locales");
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("t() 함수 호출에서 키를 추출해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const originalContent = `function Component() {
  const { t } = useTranslation();
  return <div>{t("hello.world")}</div>;
}`;

    fs.writeFileSync(testFile, originalContent, "utf-8");

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const koFile = path.join(outputDir, "ko.json");
    expect(fs.existsSync(koFile)).toBe(true);

    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));
    expect(koContent["hello.world"]).toBeDefined();
  });

  it("여러 키를 추출해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const originalContent = `function Component() {
  const { t } = useTranslation();
  return (
    <div>
      {t("greeting")}
      {t("farewell")}
    </div>
  );
}`;

    fs.writeFileSync(testFile, originalContent, "utf-8");

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const koFile = path.join(outputDir, "ko.json");
    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    expect(koContent).toHaveProperty("greeting");
    expect(koContent).toHaveProperty("farewell");
  });

  it("defaultValue가 있으면 추출해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const originalContent = `function Component() {
  const { t } = useTranslation();
  return <div>{t("hello", { defaultValue: "안녕하세요" })}</div>;
}`;

    fs.writeFileSync(testFile, originalContent, "utf-8");

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const koFile = path.join(outputDir, "ko.json");
    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    expect(koContent["hello"]).toBe("안녕하세요");
  });

  it("여러 파일에서 키를 추출해야 함", async () => {
    const file1 = path.join(tempDir, "Component1.tsx");
    const file2 = path.join(tempDir, "Component2.tsx");

    fs.writeFileSync(
      file1,
      `function Component1() { return <div>{t("key1")}</div>; }`,
      "utf-8",
    );
    fs.writeFileSync(
      file2,
      `function Component2() { return <div>{t("key2")}</div>; }`,
      "utf-8",
    );

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const koFile = path.join(outputDir, "ko.json");
    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    expect(koContent).toHaveProperty("key1");
    expect(koContent).toHaveProperty("key2");
  });

  it("중복 키는 하나만 저장해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const originalContent = `function Component() {
  const { t } = useTranslation();
  return (
    <div>
      {t("duplicate")}
      {t("duplicate")}
    </div>
  );
}`;

    fs.writeFileSync(testFile, originalContent, "utf-8");

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const koFile = path.join(outputDir, "ko.json");
    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    expect(koContent).toHaveProperty("duplicate");
    // 중복 키는 하나만 있어야 함
    const keys = Object.keys(koContent);
    const duplicateKeys = keys.filter((k) => k === "duplicate");
    expect(duplicateKeys.length).toBe(1);
  });

  it("CSV 형식으로 출력해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const originalContent = `function Component() {
  const { t } = useTranslation();
  return <div>{t("hello.world")}</div>;
}`;

    fs.writeFileSync(testFile, originalContent, "utf-8");

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "csv",
      outputFile: "translations.csv",
    });

    const csvFile = path.join(outputDir, "translations.csv");
    expect(fs.existsSync(csvFile)).toBe(true);

    const csvContent = fs.readFileSync(csvFile, "utf-8");
    expect(csvContent).toContain("Key,English,Korean");
    expect(csvContent).toContain("hello.world");
  });

  it("기존 번역 파일에 새 키를 추가해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const koFile = path.join(outputDir, "ko.json");

    // 기존 번역 파일 생성
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      koFile,
      JSON.stringify({ existing: "기존 키" }, null, 2),
      "utf-8",
    );

    // 새 키가 있는 파일 생성
    fs.writeFileSync(
      testFile,
      `function Component() { return <div>{t("new.key")}</div>; }`,
      "utf-8",
    );

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
      force: false,
    });

    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    // 기존 키 유지
    expect(koContent).toHaveProperty("existing");
    expect(koContent["existing"]).toBe("기존 키");
    // 새 키 추가
    expect(koContent["new.key"]).toBeDefined();
  });

  it("force 모드에서는 기존 번역을 덮어써야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    const koFile = path.join(outputDir, "ko.json");

    // 기존 번역 파일 생성
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      koFile,
      JSON.stringify({ old: "기존 값" }, null, 2),
      "utf-8",
    );

    // 새 키만 있는 파일 생성
    fs.writeFileSync(
      testFile,
      `function Component() { return <div>{t("new")}</div>; }`,
      "utf-8",
    );

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
      force: true,
    });

    const koContent = JSON.parse(fs.readFileSync(koFile, "utf-8"));

    // 기존 키는 제거됨
    expect(koContent).not.toHaveProperty("old");
    // 새 키만 있음
    expect(koContent).toHaveProperty("new");
  });

  it("index.ts 파일을 생성해야 함", async () => {
    const testFile = path.join(tempDir, "Component.tsx");
    fs.writeFileSync(
      testFile,
      `function Component() { return <div>{t("hello")}</div>; }`,
      "utf-8",
    );

    await runTranslationExtractor({
      ...legacyFlatConfig,
      sourcePattern: path.join(tempDir, "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
    });

    const indexFile = path.join(outputDir, "index.ts");
    expect(fs.existsSync(indexFile)).toBe(true);

    const indexContent = fs.readFileSync(indexFile, "utf-8");
    expect(indexContent).toContain("import ko from");
    expect(indexContent).toContain("import en from");
    expect(indexContent).toContain("export const translations");
  });

  it("core v4 기본 흐름으로 namespace entrypoint와 타입을 생성해야 함", async () => {
    const testFile = path.join(tempDir, "src", "App.tsx");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(
      testFile,
      `import { useTranslation } from "i18nexus";

export function App() {
  const { t } = useTranslation("home");
  return <h1>{t("title")}</h1>;
}`,
      "utf-8",
    );

    await runTranslationExtractor({
      sourcePattern: path.join(tempDir, "src", "**/*.tsx"),
      outputDir,
      outputFormat: "json",
      languages: ["ko", "en"],
      fallbackNamespace: "common",
      translationImportSource: "i18nexus",
    });

    const homeKoFile = path.join(outputDir, "home", "ko.json");
    const indexFile = path.join(outputDir, "index.ts");
    const typesFile = path.join(outputDir, "types", "i18nexus.d.ts");

    expect(fs.existsSync(homeKoFile)).toBe(true);
    expect(fs.existsSync(indexFile)).toBe(true);
    expect(fs.existsSync(typesFile)).toBe(true);

    const indexContent = fs.readFileSync(indexFile, "utf-8");
    expect(indexContent).toContain("createI18n");
    expect(indexContent).toContain("type NamespaceLoader");
    expect(indexContent).toContain("type CreateI18nUseTranslationReturn");
    expect(indexContent).toContain(
      'export const namespaces = ["common", "home"] as const;',
    );
    expect(indexContent).toContain("export const loadNamespace");
    expect(indexContent).toContain("export const i18n = createI18n");
    expect(indexContent).toContain("export type AppTranslationFunction");
    expect(indexContent).toContain("export type AppClientTranslationFunction");

    const typesContent = fs.readFileSync(typesFile, "utf-8");
    expect(typesContent).toContain("export type I18nexusGeneratedTranslations");
    expect(typesContent).toContain("I18nexusGeneratedTranslationFunction");
    expect(typesContent).toContain("declare type CommonKeys = never;");
    expect(typesContent).toContain('readonly "common"');
    expect(typesContent).toContain('readonly "home"');
    expect(typesContent).toContain('readonly "title": string');

    runGeneratedTypeCheck(tempDir);
  });

  it("custom typesOutputPath를 locales index의 타입 import에 반영해야 함", async () => {
    const previousCwd = process.cwd();
    const testFile = path.join(tempDir, "src", "App.tsx");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(
      testFile,
      `import { useTranslation } from "i18nexus";

export function App() {
  const { t } = useTranslation("home");
  return <h1>{t("title")}</h1>;
}`,
      "utf-8",
    );

    try {
      process.chdir(tempDir);

      await runTranslationExtractor({
        sourcePattern: "src/**/*.tsx",
        outputDir: "locales",
        outputFormat: "json",
        languages: ["ko", "en"],
        fallbackNamespace: "common",
        translationImportSource: "i18nexus",
        typesOutputPath: "./src/i18n/types.d.ts",
      });
    } finally {
      process.chdir(previousCwd);
    }

    const indexFile = path.join(tempDir, "locales", "index.ts");
    const typesFile = path.join(tempDir, "src", "i18n", "types.d.ts");

    expect(fs.existsSync(indexFile)).toBe(true);
    expect(fs.existsSync(typesFile)).toBe(true);

    const indexContent = fs.readFileSync(indexFile, "utf-8");
    expect(indexContent).toContain('} from "../src/i18n/types";');
    expect(indexContent).toContain("I18nexusGeneratedTranslations");
    expect(indexContent).toContain("I18nexusGeneratedTranslationFunction");
    expect(indexContent).not.toContain("./types/i18nexus");

    runGeneratedTypeCheck(tempDir);
  });
});
