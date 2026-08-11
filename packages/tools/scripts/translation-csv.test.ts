import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  exportTranslationsToCsv,
  importTranslationsFromCsv,
  parseCsv,
} from "./translation-csv";

describe("translation CSV conversion", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-csv-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses quoted commas, quotes, and newlines", () => {
    expect(
      parseCsv('Namespace,Key,en\ncommon,title,"Hello, ""world""\nagain"\n')
    ).toEqual([
      ["Namespace", "Key", "en"],
      ["common", "title", 'Hello, "world"\nagain'],
    ]);
  });

  it("round-trips multiple namespaces and dynamic languages", () => {
    const sourceDir = path.join(tempDir, "source");
    const targetDir = path.join(tempDir, "target");
    const csvPath = path.join(tempDir, "translations.csv");
    for (const namespace of ["common", "dashboard"]) {
      fs.mkdirSync(path.join(sourceDir, namespace), { recursive: true });
    }
    fs.writeFileSync(
      path.join(sourceDir, "common", "en.json"),
      JSON.stringify({ title: 'Hello, "team"\nagain', empty: "" })
    );
    fs.writeFileSync(
      path.join(sourceDir, "common", "ko.json"),
      JSON.stringify({ title: "안녕하세요", empty: "" })
    );
    fs.writeFileSync(
      path.join(sourceDir, "common", "ja.json"),
      JSON.stringify({ title: "こんにちは", empty: "" })
    );
    fs.writeFileSync(
      path.join(sourceDir, "dashboard", "en.json"),
      JSON.stringify({ metric: "Revenue" })
    );
    fs.writeFileSync(
      path.join(sourceDir, "dashboard", "ko.json"),
      JSON.stringify({ metric: "매출" })
    );
    fs.writeFileSync(
      path.join(sourceDir, "dashboard", "ja.json"),
      JSON.stringify({ metric: "売上" })
    );

    const exported = exportTranslationsToCsv({
      localesDir: sourceDir,
      csvFilePath: csvPath,
      languages: ["en", "ko", "ja"],
    });
    const imported = importTranslationsFromCsv({
      localesDir: targetDir,
      csvFilePath: csvPath,
      force: true,
    });

    expect(exported.namespaces).toEqual(["common", "dashboard"]);
    expect(imported.languages).toEqual(["en", "ko", "ja"]);
    for (const namespace of ["common", "dashboard"]) {
      for (const language of ["en", "ko", "ja"]) {
        expect(
          JSON.parse(
            fs.readFileSync(
              path.join(targetDir, namespace, `${language}.json`),
              "utf8"
            )
          )
        ).toEqual(
          JSON.parse(
            fs.readFileSync(
              path.join(sourceDir, namespace, `${language}.json`),
              "utf8"
            )
          )
        );
      }
    }
  });

  it("keeps dry-run completely read-only", () => {
    const sourceDir = path.join(tempDir, "source");
    const csvPath = path.join(tempDir, "missing", "translations.csv");
    fs.mkdirSync(path.join(sourceDir, "common"), { recursive: true });
    fs.writeFileSync(
      path.join(sourceDir, "common", "en.json"),
      JSON.stringify({ title: "Hello" })
    );

    exportTranslationsToCsv({
      localesDir: sourceDir,
      csvFilePath: csvPath,
      languages: ["en"],
      dryRun: true,
    });
    expect(fs.existsSync(path.dirname(csvPath))).toBe(false);

    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, "Namespace,Key,en\ncommon,title,Hello\n");
    const targetDir = path.join(tempDir, "target");
    importTranslationsFromCsv({
      localesDir: targetDir,
      csvFilePath: csvPath,
      dryRun: true,
    });
    expect(fs.existsSync(targetDir)).toBe(false);
  });

  it("rejects a namespace that escapes the locales directory", () => {
    const csvPath = path.join(tempDir, "translations.csv");
    fs.writeFileSync(csvPath, "Namespace,Key,en\n../outside,title,Hello\n");
    expect(() =>
      importTranslationsFromCsv({
        localesDir: path.join(tempDir, "locales"),
        csvFilePath: csvPath,
      })
    ).toThrow("not a safe path segment");
  });
});
