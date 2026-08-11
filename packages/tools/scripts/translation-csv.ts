import * as fs from "fs";
import * as path from "path";
import { resolveSafeChildPath } from "./google-sheets";

export interface TranslationCsvOptions {
  localesDir: string;
  csvFilePath: string;
  languages?: string[];
  force?: boolean;
  dryRun?: boolean;
}

export interface TranslationCsvResult {
  namespaces: string[];
  languages: string[];
  keys: number;
  files: string[];
  dryRun: boolean;
}

interface CsvTranslationRow {
  namespace: string;
  key: string;
  values: Record<string, string>;
}

const LEGACY_LANGUAGE_HEADERS: Record<string, string> = {
  english: "en",
  korean: "ko",
  japanese: "ja",
  chinese: "zh",
  spanish: "es",
  french: "fr",
  german: "de",
};

function assertLanguage(language: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(language)) {
    throw new Error(`Invalid language identifier: ${language}`);
  }
}

function assertSafeNamespace(namespace: string): void {
  if (
    namespace === "." ||
    namespace === ".." ||
    namespace.includes("/") ||
    namespace.includes("\\") ||
    namespace.includes("\0")
  ) {
    throw new Error(`namespace is not a safe path segment: ${namespace}`);
  }
}

function assertLanguages(languages: string[]): void {
  if (languages.length === 0) {
    throw new Error("At least one language is required.");
  }
  if (new Set(languages).size !== languages.length) {
    throw new Error("Language identifiers must not contain duplicates.");
  }
  languages.forEach(assertLanguage);
}

function readJsonObject(filePath: string): Record<string, string> {
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error(`${filePath} must contain a JSON object.`);
  }
  for (const [key, translation] of Object.entries(value)) {
    if (typeof translation !== "string") {
      throw new Error(`${filePath} contains a non-string value for ${key}.`);
    }
  }
  return value as Record<string, string>;
}

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index++) {
    const character = content[index];
    if (inQuotes) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index++;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) {
        throw new Error(
          "Invalid CSV: quote must start at the beginning of a field."
        );
      }
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (inQuotes) throw new Error("Invalid CSV: unterminated quoted field.");
  row.push(field);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function languageFromHeader(value: string): string {
  const normalized = normalizeHeader(value);
  return LEGACY_LANGUAGE_HEADERS[normalized] ?? normalized;
}

function listLocalSources(localesDir: string): Array<{
  namespace: string;
  directory: string;
}> {
  if (!fs.existsSync(localesDir)) return [];
  const sources: Array<{ namespace: string; directory: string }> = [];
  const rootFiles = fs
    .readdirSync(localesDir)
    .filter((entry) => entry.endsWith(".json"));
  if (rootFiles.length > 0)
    sources.push({ namespace: "", directory: localesDir });

  for (const entry of fs.readdirSync(localesDir)) {
    if (entry === "types" || entry.startsWith(".")) continue;
    const entryPath = resolveSafeChildPath(localesDir, entry, "namespace");
    if (!fs.statSync(entryPath).isDirectory()) continue;
    if (fs.readdirSync(entryPath).some((file) => file.endsWith(".json"))) {
      sources.push({ namespace: entry, directory: entryPath });
    }
  }
  return sources;
}

function readLocalRows(
  localesDir: string,
  requestedLanguages?: string[]
): { rows: CsvTranslationRow[]; languages: string[] } {
  const sources = listLocalSources(localesDir);
  const detectedLanguages = new Set<string>();
  const data = new Map<string, Map<string, Record<string, string>>>();

  for (const source of sources) {
    const byLanguage = new Map<string, Record<string, string>>();
    for (const entry of fs.readdirSync(source.directory)) {
      if (!entry.endsWith(".json")) continue;
      const language = path.basename(entry, ".json");
      assertLanguage(language);
      if (requestedLanguages && !requestedLanguages.includes(language))
        continue;
      const filePath = resolveSafeChildPath(
        source.directory,
        entry,
        "translation file"
      );
      byLanguage.set(language, readJsonObject(filePath));
      detectedLanguages.add(language);
    }
    data.set(source.namespace, byLanguage);
  }

  const languages = requestedLanguages ?? [...detectedLanguages].sort();
  assertLanguages(languages);
  const rows: CsvTranslationRow[] = [];
  for (const namespace of [...data.keys()].sort()) {
    const byLanguage = data.get(namespace)!;
    const keys = new Set<string>();
    byLanguage.forEach((translations) => {
      Object.keys(translations).forEach((key) => keys.add(key));
    });
    for (const key of [...keys].sort()) {
      const values: Record<string, string> = {};
      for (const language of languages) {
        values[language] = byLanguage.get(language)?.[key] ?? "";
      }
      rows.push({ namespace, key, values });
    }
  }
  return { rows, languages };
}

export function exportTranslationsToCsv(
  options: TranslationCsvOptions
): TranslationCsvResult {
  const { rows, languages } = readLocalRows(
    options.localesDir,
    options.languages
  );
  const csvRows = [
    ["Namespace", "Key", ...languages],
    ...rows.map((row) => [
      row.namespace,
      row.key,
      ...languages.map((language) => row.values[language]),
    ]),
  ];
  const content = `${csvRows.map((row) => row.map(escapeCsv).join(",")).join("\n")}\n`;

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(options.csvFilePath), { recursive: true });
    fs.writeFileSync(options.csvFilePath, content, "utf8");
  }
  return {
    namespaces: [...new Set(rows.map((row) => row.namespace))],
    languages,
    keys: rows.length,
    files: [options.csvFilePath],
    dryRun: Boolean(options.dryRun),
  };
}

function parseTranslationRows(content: string): {
  rows: CsvTranslationRow[];
  languages: string[];
} {
  const matrix = parseCsv(content);
  if (matrix.length === 0) throw new Error("CSV file is empty.");
  const headers = matrix[0];
  const namespaced = normalizeHeader(headers[0] ?? "") === "namespace";
  const keyIndex = namespaced ? 1 : 0;
  if (normalizeHeader(headers[keyIndex] ?? "") !== "key") {
    throw new Error("CSV header must start with Namespace,Key or Key.");
  }
  const languageStart = keyIndex + 1;
  const languages = headers.slice(languageStart).map(languageFromHeader);
  assertLanguages(languages);

  const rows = matrix.slice(1).map((values, index) => {
    const namespace = namespaced ? (values[0] ?? "") : "";
    if (namespace) assertSafeNamespace(namespace);
    const key = values[keyIndex] ?? "";
    if (!key) throw new Error(`CSV row ${index + 2} is missing a key.`);
    const translations: Record<string, string> = {};
    languages.forEach((language, languageIndex) => {
      translations[language] = values[languageStart + languageIndex] ?? "";
    });
    return { namespace, key, values: translations };
  });
  return { rows, languages };
}

function writeJsonAtomically(
  filePath: string,
  value: Record<string, string>
): void {
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.tmp`
  );
  try {
    fs.writeFileSync(
      temporaryPath,
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8"
    );
    fs.renameSync(temporaryPath, filePath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

export function importTranslationsFromCsv(
  options: TranslationCsvOptions
): TranslationCsvResult {
  const content = fs.readFileSync(options.csvFilePath, "utf8");
  const parsed = parseTranslationRows(content);
  const languages = options.languages ?? parsed.languages;
  assertLanguages(languages);
  for (const language of languages) {
    if (!parsed.languages.includes(language)) {
      throw new Error(
        `CSV does not contain the requested language: ${language}`
      );
    }
  }

  const grouped = new Map<string, CsvTranslationRow[]>();
  for (const row of parsed.rows) {
    grouped.set(row.namespace, [...(grouped.get(row.namespace) ?? []), row]);
  }
  const files: string[] = [];
  for (const [namespace, rows] of grouped) {
    const directory = namespace
      ? resolveSafeChildPath(options.localesDir, namespace, "namespace")
      : options.localesDir;
    if (!options.dryRun) fs.mkdirSync(directory, { recursive: true });
    for (const language of languages) {
      const filePath = resolveSafeChildPath(
        directory,
        `${language}.json`,
        "translation file"
      );
      const existing =
        !options.force && fs.existsSync(filePath)
          ? readJsonObject(filePath)
          : {};
      const next = { ...existing };
      for (const row of rows) {
        if (options.force || !(row.key in next))
          next[row.key] = row.values[language];
      }
      files.push(filePath);
      if (!options.dryRun) writeJsonAtomically(filePath, next);
    }
  }
  return {
    namespaces: [...grouped.keys()],
    languages,
    keys: parsed.rows.length,
    files,
    dryRun: Boolean(options.dryRun),
  };
}
