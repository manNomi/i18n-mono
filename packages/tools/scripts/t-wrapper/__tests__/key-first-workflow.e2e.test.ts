import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { TranslationExtractor } from "../../extractor";
import { wrapTranslations } from "../babel/wrapper";

describe("key-first wrapper to extractor workflow", () => {
  const originalCwd = process.cwd();
  let projectDir: string;

  beforeEach(() => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-key-first-"));
    fs.mkdirSync(path.join(projectDir, "app", "about"), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, "i18nexus.config.json"),
      JSON.stringify({
        languages: ["ko", "en"],
        defaultLanguage: "ko",
        sourceLanguage: "ko",
        localesDir: "./locales",
        sourcePattern: "app/**/*.tsx",
        translationImportSource: "i18nexus",
        namespaceLocation: "app",
        mode: "server",
        framework: "nextjs",
        keyFirst: { enabled: true },
        generateTypes: true,
      })
    );
    fs.writeFileSync(
      path.join(projectDir, "app", "about", "page.tsx"),
      `export default function AboutPage() {
  return <h1>about.title1</h1>;
}`
    );
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it("uses the configured App Router server contract and preserves qualified locale keys", async () => {
    const sourcePattern = "app/**/*.tsx";
    await wrapTranslations({
      sourcePattern,
      keyFirst: { enabled: true },
      sourceLanguage: "ko",
      mode: "server",
      framework: "nextjs",
    });

    const pagePath = path.join(projectDir, "app", "about", "page.tsx");
    expect(fs.readFileSync(pagePath, "utf8")).toContain(
      'import { getTranslation } from "i18nexus/server"'
    );
    expect(fs.readFileSync(pagePath, "utf8")).toContain('t("about.title1")');
    expect(fs.readFileSync(pagePath, "utf8")).toContain(
      'await getTranslation("about")'
    );
    expect(fs.readFileSync(pagePath, "utf8")).not.toContain("useTranslation");
    expect(fs.readFileSync(pagePath, "utf8")).not.toContain('"use client"');

    await new TranslationExtractor({
      sourcePattern,
      outputDir: "./locales",
      languages: ["ko", "en"],
      sourceLanguage: "ko",
      generateTypes: true,
    }).extract();

    const ko = JSON.parse(
      fs.readFileSync(
        path.join(projectDir, "locales", "about", "ko.json"),
        "utf8"
      )
    );
    const en = JSON.parse(
      fs.readFileSync(
        path.join(projectDir, "locales", "about", "en.json"),
        "utf8"
      )
    );

    expect(ko).toEqual({ "about.title1": "about.title1" });
    expect(en).toEqual({ "about.title1": "" });
    expect(
      fs.readFileSync(
        path.join(projectDir, "locales", "types", "i18nexus.d.ts"),
        "utf8"
      )
    ).toContain('"about.title1"');
  });
});
