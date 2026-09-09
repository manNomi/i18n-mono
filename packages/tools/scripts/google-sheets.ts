import { google, sheets_v4 } from "googleapis";
import csvParser from "csv-parser";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import {
  assertPathInsideRoot,
  AtomicFileWrite,
  AtomicFileSystem,
  recoverAtomicFileTransaction,
  writeFilesAtomically,
} from "./common/atomic-file-transaction";

export interface GoogleSheetsConfig {
  credentialsPath?: string;
  spreadsheetId?: string;
  sheetName?: string;
  namespace?: string; // 네임스페이스 (도메인 우선 구조용)
  keyColumn?: string;
  valueColumns?: string[];
  headerRow?: number;
  languages?: string[];
}

const SENSITIVE_ERROR_PATTERN =
  /private[_ -]?key|client_secret|access_token|refresh_token|authorization|bearer\s|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;

export function formatGoogleSheetsError(error: unknown): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown Google Sheets error";
  const message = SENSITIVE_ERROR_PATTERN.test(rawMessage)
    ? "Sensitive diagnostic details were redacted"
    : rawMessage.slice(0, 500);
  const candidate = error as {
    code?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate?.response?.status ?? candidate?.code;
  const safeStatus =
    typeof status === "number" ||
    (typeof status === "string" && /^[A-Z0-9_-]{1,32}$/i.test(status))
      ? String(status)
      : undefined;

  return safeStatus ? `${message} (status: ${safeStatus})` : message;
}

function safeGoogleSheetsError(error: unknown): Error {
  return new Error(formatGoogleSheetsError(error));
}

export interface TranslationRow {
  key: string;
  [language: string]: string;
}

interface PlannedLocaleWrite {
  filePath: string;
  content: string;
  message: string;
}

interface TranslationTable {
  languages: string[];
  translations: TranslationRow[];
}

const CSV_LANGUAGE_HEADER_TO_CODE: Record<string, string> = {
  english: "en",
  korean: "ko",
  japanese: "ja",
  chinese: "zh",
  spanish: "es",
  french: "fr",
  german: "de",
};

const LANGUAGE_CODE_TO_SHEET_HEADER: Record<string, string> =
  Object.fromEntries(
    Object.entries(CSV_LANGUAGE_HEADER_TO_CODE).map(([header, code]) => [
      code,
      header[0].toUpperCase() + header.slice(1),
    ])
  );

function getSheetHeaderFromLanguageCode(language: string): string {
  return LANGUAGE_CODE_TO_SHEET_HEADER[language] || language;
}

function getColumnName(index: number): string {
  let columnNumber = index + 1;
  let name = "";

  while (columnNumber > 0) {
    const remainder = (columnNumber - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    columnNumber = Math.floor((columnNumber - 1) / 26);
  }

  return name;
}

function collectTranslationLanguages(translations: TranslationRow[]): string[] {
  const languages = new Set<string>();
  for (const translation of translations) {
    for (const language of Object.keys(translation)) {
      if (language !== "key") {
        languages.add(language);
      }
    }
  }
  return [...languages];
}

export function validateGoogleSheetsLanguages(languages: string[]): void {
  if (languages.length === 0) {
    throw new Error("At least one language is required");
  }
  for (const language of languages) {
    if (
      !language ||
      language === "." ||
      language === ".." ||
      language.startsWith(".") ||
      language.includes("/") ||
      language.includes("\\") ||
      language.length > 64 ||
      !/^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/.test(language)
    ) {
      throw new Error(`Invalid language file name: ${language || "<empty>"}`);
    }
  }
  if (
    new Set(languages.map((language) => language.toLowerCase())).size !==
    languages.length
  ) {
    throw new Error("Duplicate languages are not allowed");
  }
}

function normalizeCsvHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
}

function getLanguageCodeFromCsvHeader(header: string): string | null {
  const trimmed = header.trim().replace(/^\uFEFF/, "");
  const normalized = normalizeCsvHeader(trimmed);

  if (!normalized || normalized === "key") {
    return null;
  }

  return (
    CSV_LANGUAGE_HEADER_TO_CODE[normalized] ||
    (Object.values(CSV_LANGUAGE_HEADER_TO_CODE).includes(normalized)
      ? normalized
      : trimmed)
  );
}

export class GoogleSheetsManager {
  private sheets: sheets_v4.Sheets | null = null;
  private config: Required<GoogleSheetsConfig>;
  private fileSystem: AtomicFileSystem;

  constructor(
    config: Partial<GoogleSheetsConfig> = {},
    fileSystem: AtomicFileSystem = fs
  ) {
    validateGoogleSheetsLanguages(config.languages || ["en", "ko"]);
    this.config = {
      credentialsPath: config.credentialsPath || "./credentials.json",
      spreadsheetId: config.spreadsheetId || "",
      sheetName: config.sheetName || "Translations",
      namespace: config.namespace || "",
      keyColumn: config.keyColumn || "A",
      valueColumns: config.valueColumns || ["B", "C"], // B=English, C=Korean
      headerRow: config.headerRow || 1,
      languages: config.languages || ["en", "ko"],
    };
    this.fileSystem = fileSystem;
  }

  /**
   * 네임스페이스 경로 반환 (도메인 우선 구조: locales/[namespace]/[lang].json)
   */
  private getNamespacePath(localesDir: string): string {
    if (this.config.namespace) {
      const namespacePath = path.resolve(localesDir, this.config.namespace);
      assertPathInsideRoot(localesDir, namespacePath);
      return namespacePath;
    }
    return path.resolve(localesDir); // 레거시: locales/[lang].json
  }

  private getTransactionJournalPath(localesDir: string): string {
    return path.join(
      path.resolve(localesDir),
      ".i18nexus-download-transaction.json"
    );
  }

  private getSheetRange(range: string): string {
    const escapedSheetName = this.config.sheetName.replace(/'/g, "''");
    return `'${escapedSheetName}'!${range}`;
  }

  private getLocaleFilePath(
    localesDir: string,
    namespacePath: string,
    language: string
  ): string {
    this.assertValidLanguage(language);

    const filePath = path.join(namespacePath, `${language}.json`);
    assertPathInsideRoot(localesDir, filePath);
    return filePath;
  }

  private assertValidLanguage(language: string): void {
    validateGoogleSheetsLanguages([language]);
  }

  private assertRequestedLanguages(
    availableLanguages: string[],
    requestedLanguages: string[]
  ): void {
    this.assertSourceLanguages(
      `Google Sheet ${this.config.sheetName}`,
      availableLanguages,
      requestedLanguages
    );
  }

  private assertSourceLanguages(
    source: string,
    availableLanguages: string[],
    requestedLanguages: string[]
  ): void {
    const missingLanguages = requestedLanguages.filter(
      (language) => !availableLanguages.includes(language)
    );
    if (missingLanguages.length > 0) {
      throw new Error(
        `${source} is missing requested language column(s): ${missingLanguages.join(", ")}`
      );
    }
  }

  private assertRealPathInsideLocales(
    localesDir: string,
    targetPath: string
  ): void {
    const realRoot = this.fileSystem.realpathSync(localesDir);
    const realTarget = this.fileSystem.realpathSync(targetPath);
    assertPathInsideRoot(realRoot, realTarget);
  }

  private assertSafeExistingLocaleFile(
    localesDir: string,
    filePath: string
  ): void {
    if (!this.fileSystem.existsSync(filePath)) {
      return;
    }
    const stat = this.fileSystem.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`Refusing to read non-regular locale file: ${filePath}`);
    }
    this.assertRealPathInsideLocales(localesDir, filePath);
  }

  /**
   * Google Sheets API 인증 및 초기화
   */
  async authenticate(): Promise<void> {
    try {
      // 서비스 계정 키 파일 읽기
      if (!fs.existsSync(this.config.credentialsPath)) {
        throw new Error(
          `Credentials file not found: ${this.config.credentialsPath}`
        );
      }

      const credentials = JSON.parse(
        fs.readFileSync(this.config.credentialsPath, "utf8")
      );

      // JWT 클라이언트 생성
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const authClient = await auth.getClient();

      // Sheets API 클라이언트 생성
      this.sheets = google.sheets({ version: "v4", auth: authClient as any });

      console.log("✅ Google Sheets API authenticated successfully");
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error(
        "❌ Failed to authenticate Google Sheets API:",
        safeError.message
      );
      throw safeError;
    }
  }

  /**
   * 스프레드시트가 존재하는지 확인
   */
  async checkSpreadsheet(): Promise<boolean> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      return true;
    } catch (error) {
      console.error(
        "❌ Spreadsheet not accessible:",
        formatGoogleSheetsError(error)
      );
      return false;
    }
  }

  /**
   * 워크시트가 존재하는지 확인하고, 없으면 생성
   */
  async ensureWorksheet(): Promise<void> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheetExists = spreadsheet.data.sheets?.some(
        (sheet) => sheet.properties?.title === this.config.sheetName
      );

      if (!sheetExists) {
        console.log(`📝 Creating worksheet: ${this.config.sheetName}`);

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.config.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: this.config.sheetName,
                  },
                },
              },
            ],
          },
        });

        // 헤더 행 추가
        await this.addHeaders();
      }
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to ensure worksheet:", safeError.message);
      throw safeError;
    }
  }

  /**
   * 헤더 행 추가
   */
  private async addHeaders(): Promise<void> {
    if (!this.sheets) return;

    await this.writeHeaders(this.config.languages);

    console.log("📝 Headers added to worksheet");
  }

  private async writeHeaders(languages: string[]): Promise<void> {
    if (!this.sheets) return;

    const headers = ["Key", ...languages.map(getSheetHeaderFromLanguageCode)];
    const endColumn = getColumnName(headers.length - 1);
    const range = this.getSheetRange(
      `A${this.config.headerRow}:${endColumn}${this.config.headerRow}`
    );

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers],
      },
    });
  }

  async preflightUpload(localesDir: string): Promise<TranslationRow[]> {
    const translations = await this.readLocalTranslations(localesDir);
    if (translations.length === 0) {
      return translations;
    }

    this.assertSourceLanguages(
      "Local locale files",
      collectTranslationLanguages(translations),
      this.config.languages
    );
    return translations;
  }

  /**
   * 로컬 번역 파일들을 읽어서 Google Sheets에 업로드
   * @param localesDir 로컬 번역 파일 디렉토리
   * @param autoTranslate true일 경우 영어는 GOOGLETRANSLATE 수식으로 업로드
   * @param force true일 경우 기존 데이터를 모두 지우고 새로 업로드
   */
  async uploadTranslations(
    localesDir: string,
    autoTranslate: boolean = false,
    force: boolean = false
  ): Promise<void> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      validateGoogleSheetsLanguages(this.config.languages);
      console.log("📤 Uploading translations to Google Sheets...");
      if (autoTranslate) {
        console.log(
          "🤖 Auto-translate mode: English will use GOOGLETRANSLATE formula"
        );
      }
      if (force) {
        console.log("💪 Force mode: Overwriting all existing data");
      }

      // 모든 로컬 입력을 원격 접근 전에 검증합니다.
      const translations = await this.preflightUpload(localesDir);

      if (translations.length === 0) {
        console.log("📝 No translation files found");
        return;
      }

      if (
        autoTranslate &&
        (!this.config.languages.includes("en") ||
          !this.config.languages.includes("ko"))
      ) {
        throw new Error(
          "Auto-translate requires both en and ko in the configured languages"
        );
      }

      await this.ensureWorksheet();
      const remoteTable = await this.readTranslationTable();

      let translationsToUpload: TranslationRow[];
      let sheetLanguages: string[];

      if (force) {
        // Force 모드: 모든 키 업로드
        translationsToUpload = translations;
        sheetLanguages = [...this.config.languages];

        // Force replaces the complete remote table, including language columns.
        await this.sheets.spreadsheets.values.clear({
          spreadsheetId: this.config.spreadsheetId,
          range: this.getSheetRange(`A${this.config.headerRow}:ZZ`),
        });
        await this.writeHeaders(sheetLanguages);
        console.log(
          `🗑️  Cleared ${remoteTable.translations.length} existing rows`
        );
      } else {
        // 일반 모드: 새로운 키만 업로드
        const existingKeys = new Set(
          remoteTable.translations.map((row) => row.key)
        );

        translationsToUpload = translations.filter(
          (t) => !existingKeys.has(t.key)
        );

        if (translationsToUpload.length === 0) {
          console.log("📝 No new translations to upload");
          return;
        }

        sheetLanguages = [
          ...remoteTable.languages,
          ...this.config.languages.filter(
            (language) => !remoteTable.languages.includes(language)
          ),
        ];
        if (
          sheetLanguages.length !== remoteTable.languages.length ||
          remoteTable.languages.length === 0
        ) {
          await this.writeHeaders(sheetLanguages);
        }
      }

      // 시작 행 계산
      const startRow = force
        ? this.config.headerRow + 1
        : this.config.headerRow + remoteTable.translations.length + 1;
      const koreanColumnIndex = sheetLanguages.indexOf("ko") + 1;
      const koreanColumn = getColumnName(koreanColumnIndex);

      // 데이터 준비
      const values = translationsToUpload.map((translation, index) => {
        const currentRow = startRow + index;
        const key = translation.key;
        return [
          this.escapeFormula(key),
          ...sheetLanguages.map((language) => {
            const localValue = translation[language] || "";
            const generatedFormula =
              autoTranslate && language === "en" && localValue === ""
                ? `=GOOGLETRANSLATE(${koreanColumn}${currentRow}, "ko", "en")`
                : null;
            return generatedFormula || this.escapeFormula(localValue);
          }),
        ];
      });

      const endRow = startRow + values.length - 1;
      const endColumn = getColumnName(sheetLanguages.length);
      const range = this.getSheetRange(`A${startRow}:${endColumn}${endRow}`);

      // 데이터 업로드
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values,
        },
      });

      console.log(
        `✅ Uploaded ${translationsToUpload.length} translations to Google Sheets`
      );
      if (autoTranslate) {
        console.log(
          "🤖 English translations will be auto-generated by Google Sheets"
        );
      }
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to upload translations:", safeError.message);
      throw safeError;
    }
  }

  /**
   * Google Sheets에서 번역 데이터 다운로드
   * valueRenderOption을 FORMATTED_VALUE로 설정하여 수식이 아닌 계산된 결과값을 가져옴
   */
  async downloadTranslations(): Promise<TranslationRow[]> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      return (await this.readTranslationTable()).translations;
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to download translations:", safeError.message);
      throw safeError;
    }
  }

  private async readTranslationTable(): Promise<TranslationTable> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    console.log("📥 Downloading translations from Google Sheets...");
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range: this.getSheetRange("A:ZZ"),
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const rows = response.data.values || [];
    const header = rows[this.config.headerRow - 1] || [];

    if (header.length === 0) {
      console.log("📝 No translation data found");
      return { languages: [], translations: [] };
    }

    if (normalizeCsvHeader(String(header[0] || "")) !== "key") {
      throw new Error(
        `Expected Key in column A of Google Sheet ${this.config.sheetName}`
      );
    }

    const languageColumns = header
      .slice(1)
      .map((value, index) => ({
        language: getLanguageCodeFromCsvHeader(String(value || "")),
        valueIndex: index + 1,
      }))
      .filter(
        (
          column
        ): column is {
          language: string;
          valueIndex: number;
        } => Boolean(column.language)
      );
    const languages = languageColumns.map(({ language }) => language);
    if (
      new Set(languages.map((language) => language.toLowerCase())).size !==
      languages.length
    ) {
      throw new Error(
        `Google Sheet ${this.config.sheetName} contains duplicate language columns`
      );
    }

    const removeEscapePrefix = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      const text = String(value);
      return text.startsWith("'") ? text.substring(1) : text;
    };
    const translations: TranslationRow[] = rows
      .slice(this.config.headerRow)
      .filter((row) => row[0] !== null && row[0] !== undefined && row[0] !== "")
      .map((row) => {
        const translation: TranslationRow = {
          key: removeEscapePrefix(row[0]),
        };
        for (const { language, valueIndex } of languageColumns) {
          translation[language] = removeEscapePrefix(row[valueIndex]);
        }
        return translation;
      });

    if (translations.length === 0) {
      console.log("📝 No translation data found");
    } else {
      console.log(
        `✅ Downloaded ${translations.length} translations from Google Sheets`
      );
    }
    return { languages, translations };
  }

  /**
   * Google Sheets 데이터를 로컬 번역 파일로 저장 (언어별 파일: en.json, ko.json)
   */
  async saveTranslationsToLocal(
    localesDir: string,
    languages: string[] = ["en", "ko"],
    additionalWrites: AtomicFileWrite[] = []
  ): Promise<void> {
    try {
      const journalPath = this.getTransactionJournalPath(localesDir);
      recoverAtomicFileTransaction(journalPath, this.fileSystem);
      const writes = await this.planTranslationsToLocal(
        localesDir,
        languages,
        true
      );
      const plannedAdditionalWrites = additionalWrites.map((write) => {
        assertPathInsideRoot(localesDir, write.filePath);
        return {
          ...write,
          message: `📝 Generated ${write.filePath}`,
        };
      });
      this.commitLocaleWrites(
        [...writes, ...plannedAdditionalWrites],
        journalPath
      );
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error(
        "❌ Failed to save translations to local:",
        safeError.message
      );
      throw safeError;
    }
  }

  /**
   * Google Sheets 데이터를 로컬 번역 파일로 저장 (증분 업데이트 - 추가된 데이터만)
   */
  async saveTranslationsToLocalIncremental(
    localesDir: string,
    languages: string[] = ["en", "ko"]
  ): Promise<void> {
    try {
      const journalPath = this.getTransactionJournalPath(localesDir);
      recoverAtomicFileTransaction(journalPath, this.fileSystem);
      const writes = await this.planTranslationsToLocal(
        localesDir,
        languages,
        false
      );
      this.commitLocaleWrites(writes, journalPath);
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error(
        "❌ Failed to save translations to local:",
        safeError.message
      );
      throw safeError;
    }
  }

  private readExistingTranslations(filePath: string): Record<string, string> {
    if (!this.fileSystem.existsSync(filePath)) {
      return {};
    }

    const parsed = JSON.parse(
      this.fileSystem.readFileSync(filePath, "utf-8")
    ) as unknown;
    if (
      parsed === null ||
      Array.isArray(parsed) ||
      typeof parsed !== "object" ||
      Object.values(parsed).some((value) => typeof value !== "string")
    ) {
      throw new Error(
        `Expected a JSON object with string values in ${filePath}`
      );
    }

    return parsed as Record<string, string>;
  }

  private async planTranslationsToLocal(
    localesDir: string,
    languages: string[],
    force: boolean
  ): Promise<PlannedLocaleWrite[]> {
    validateGoogleSheetsLanguages(languages);
    const table = await this.readTranslationTable();
    this.assertRequestedLanguages(table.languages, languages);
    const translations = table.translations;

    if (translations.length === 0) {
      console.log("📝 No translations to save");
      return [];
    }

    const namespacePath = this.getNamespacePath(localesDir);

    return languages.map((lang) => {
      const filePath = this.getLocaleFilePath(localesDir, namespacePath, lang);

      // Parse every existing target before any write, including force mode.
      this.assertSafeExistingLocaleFile(localesDir, filePath);
      const existingTranslations = this.readExistingTranslations(filePath);
      const nextTranslations: Record<string, string> = force
        ? {}
        : { ...existingTranslations };
      let addedCount = 0;

      for (const row of translations) {
        if (force) {
          nextTranslations[row.key] = row[lang] ?? "";
        } else if (row[lang] && !nextTranslations[row.key]) {
          nextTranslations[row.key] = row[lang];
          addedCount++;
        }
      }

      const count = Object.keys(nextTranslations).length;
      return {
        filePath,
        content: JSON.stringify(nextTranslations, null, 2),
        message: force
          ? `📝 Saved ${count} ${lang} translations to ${filePath}`
          : `📝 Added ${addedCount} new ${lang} translations to ${filePath} (total: ${count})`,
      };
    });
  }

  private commitLocaleWrites(
    writes: PlannedLocaleWrite[],
    journalPath: string
  ): void {
    writeFilesAtomically(writes, journalPath, this.fileSystem);
    for (const write of writes) {
      console.log(write.message);
    }
  }

  /**
   * 로컬 번역 파일들 읽기
   * - namespace가 없으면: locales/en.json, locales/ko.json (레거시)
   * - namespace가 있으면: locales/${namespace}/en.json, locales/${namespace}/ko.json (도메인 우선)
   */
  async readLocalTranslations(localesDir: string): Promise<TranslationRow[]> {
    const translations: TranslationRow[] = [];
    const allKeys = new Set<string>();

    const namespacePath = this.getNamespacePath(localesDir);

    if (!this.fileSystem.existsSync(namespacePath)) {
      console.log(`⚠️  Locales directory not found: ${namespacePath}`);
      return [];
    }

    const namespaceStat = this.fileSystem.lstatSync(namespacePath);
    if (namespaceStat.isSymbolicLink() || !namespaceStat.isDirectory()) {
      throw new Error(
        `Refusing to read non-regular locale directory: ${namespacePath}`
      );
    }
    this.assertRealPathInsideLocales(localesDir, namespacePath);

    const files = this.fileSystem
      .readdirSync(namespacePath)
      .filter(
        (file) =>
          typeof file === "string" &&
          file.endsWith(".json") &&
          !file.startsWith(".")
      );
    const translationData: Record<string, Record<string, string>> = {};

    for (const file of files) {
      const lang = path.basename(file, ".json");
      this.assertValidLanguage(lang);
      const filePath = path.join(namespacePath, file);
      assertPathInsideRoot(localesDir, filePath);
      if (!this.fileSystem.lstatSync(filePath).isFile()) {
        continue;
      }
      this.assertRealPathInsideLocales(localesDir, filePath);
      const content = this.readExistingTranslations(filePath);
      translationData[lang] = content;

      Object.keys(content).forEach((key) => allKeys.add(key));
    }

    allKeys.forEach((key) => {
      const row: TranslationRow = { key };
      Object.keys(translationData).forEach((lang) => {
        row[lang] = translationData[lang][key] || "";
      });
      translations.push(row);
    });

    return translations;
  }

  /**
   * 양방향 동기화 - 로컬과 Google Sheets 간의 차이점 해결
   */
  async syncTranslations(localesDir: string): Promise<void> {
    try {
      console.log("🔄 Starting bidirectional sync...");

      // 로컬과 원격 데이터 읽기
      const localTranslations = await this.readLocalTranslations(localesDir);
      await this.ensureWorksheet();
      const remoteTable = await this.readTranslationTable();
      this.assertRequestedLanguages(
        remoteTable.languages,
        this.config.languages
      );
      const remoteTranslations = remoteTable.translations;

      const localKeys = new Set(localTranslations.map((t) => t.key));
      const remoteKeys = new Set(remoteTranslations.map((t) => t.key));

      // 새로운 로컬 키들을 Google Sheets에 업로드
      const newLocalKeys = localTranslations.filter(
        (t) => !remoteKeys.has(t.key)
      );
      if (newLocalKeys.length > 0) {
        console.log(
          `📤 Uploading ${newLocalKeys.length} new local keys to Google Sheets`
        );
        await this.uploadNewTranslations(newLocalKeys, remoteTable);
      }

      // 새로운 원격 키들을 로컬에 다운로드
      const newRemoteKeys = remoteTranslations.filter(
        (t) => !localKeys.has(t.key)
      );
      if (newRemoteKeys.length > 0) {
        console.log(
          `📥 Downloading ${newRemoteKeys.length} new remote keys to local files`
        );
        await this.addTranslationsToLocal(
          localesDir,
          newRemoteKeys,
          this.config.languages
        );
      }

      console.log("✅ Sync completed successfully");
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to sync translations:", safeError.message);
      throw safeError;
    }
  }

  /**
   * Google Sheets에서 수식/날짜/시간으로 해석되는 값 방지
   *
   * 처리되는 패턴:
   * 1. 수식으로 오인될 수 있는 시작 문자: =, +, -, @
   * 2. 날짜/시간으로 자동 변환되는 패턴:
   *    - 1-2, 3/4, 5.6 (날짜로 변환)
   *    - 12:30 (시간으로 변환)
   *    - 2025/12/2 (날짜로 변환)
   * 3. 숫자와 연산자 조합: "1 + 1", "2-3" 등
   * 4. 괄호로 시작: (제목 없음), (1+2) 등
   *
   * 모든 위험한 패턴 앞에 '를 추가하여 텍스트로 강제 변환
   */
  private escapeFormula(value: string): string {
    if (!value) return value;

    // 공백 제거 후 첫 문자 확인
    const trimmed = value.trim();
    if (!trimmed) return value;

    // 1. 수식으로 해석될 수 있는 문자로 시작하는 경우
    // =, +, -, @, (, )로 시작하는 경우
    if (/^[+\-=@()]/.test(trimmed)) {
      return `'${value}`;
    }

    // 2. 날짜/시간 패턴 감지
    // 날짜 패턴: 숫자-숫자, 숫자/숫자, 숫자.숫자
    // 예: "1-2", "3/4", "5.6", "2025/12/2"
    if (/^\d+[-/.]\d+/.test(trimmed)) {
      // 시간 패턴은 제외 (예: "12:30"은 시간으로 변환되지만, "12:30 PM" 같은 경우는 처리)
      // 단순 숫자-숫자, 숫자/숫자 패턴은 날짜로 변환될 수 있음
      if (/^\d{1,2}[-/.]\d{1,2}([-/.]\d{2,4})?$/.test(trimmed)) {
        return `'${value}`;
      }
    }

    // 시간 패턴: HH:MM 또는 HH:MM:SS
    // 예: "12:30", "12:30:45"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      return `'${value}`;
    }

    // 3. 숫자로 시작하고 연산자가 포함된 경우 (수식으로 해석될 수 있음)
    // 예: "1 + 1", "2-3", "3*4", "5/6"
    if (/^\d/.test(trimmed) && /[\s+\-*/=]/.test(trimmed)) {
      return `'${value}`;
    }

    // 4. 지수 표현 패턴: 숫자e숫자 또는 숫자E숫자
    // 예: "1e5", "2E10"
    if (/^\d+[eE][+-]?\d+/.test(trimmed)) {
      return `'${value}`;
    }

    return value;
  }

  /**
   * 새로운 번역들을 Google Sheets에 추가
   */
  private async uploadNewTranslations(
    translations: TranslationRow[],
    remoteTable: TranslationTable
  ): Promise<void> {
    if (!this.sheets || translations.length === 0) return;

    const sheetLanguages = [
      ...remoteTable.languages,
      ...this.config.languages.filter(
        (language) => !remoteTable.languages.includes(language)
      ),
    ];
    if (sheetLanguages.length !== remoteTable.languages.length) {
      await this.writeHeaders(sheetLanguages);
    }
    const values = translations.map((translation) => [
      this.escapeFormula(translation.key),
      ...sheetLanguages.map((language) =>
        this.escapeFormula(translation[language] || "")
      ),
    ]);

    // 기존 데이터의 마지막 행 찾기
    const startRow =
      remoteTable.translations.length + this.config.headerRow + 1;
    const endRow = startRow + values.length - 1;
    const endColumn = getColumnName(sheetLanguages.length);
    const range = this.getSheetRange(`A${startRow}:${endColumn}${endRow}`);

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
  }

  /**
   * 새로운 번역들을 로컬 파일에 추가
   */
  private async addTranslationsToLocal(
    localesDir: string,
    translations: TranslationRow[],
    languages: string[]
  ): Promise<void> {
    validateGoogleSheetsLanguages(languages);
    const namespacePath = this.getNamespacePath(localesDir);
    const writes = languages.map((lang) => {
      const filePath = this.getLocaleFilePath(localesDir, namespacePath, lang);
      this.assertSafeExistingLocaleFile(localesDir, filePath);
      const existingTranslations = this.readExistingTranslations(filePath);

      translations.forEach((t) => {
        if (t[lang]) {
          existingTranslations[t.key] = t[lang];
        }
      });

      return {
        filePath,
        content: JSON.stringify(existingTranslations, null, 2),
        message: `📝 Added remote translations to ${filePath}`,
      };
    });
    const journalPath = this.getTransactionJournalPath(localesDir);
    recoverAtomicFileTransaction(journalPath, this.fileSystem);
    this.commitLocaleWrites(writes, journalPath);
  }

  /**
   * Spreadsheet의 모든 시트 목록 조회
   */
  async getAllSheetNames(): Promise<string[]> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheetNames =
        spreadsheet.data.sheets
          ?.map((sheet) => sheet.properties?.title)
          .filter((name): name is string => !!name) || [];

      return sheetNames;
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to get sheet names:", safeError.message);
      throw safeError;
    }
  }

  /**
   * 모든 시트의 번역을 자동으로 다운로드하여 네임스페이스별 폴더에 저장
   * 각 시트 이름이 네임스페이스가 됩니다.
   */
  async downloadAllSheets(
    localesDir: string,
    languages: string[] = ["en", "ko"],
    options: { force?: boolean } = {}
  ): Promise<void> {
    try {
      validateGoogleSheetsLanguages(languages);
      console.log("📥 Downloading all sheets from Google Sheets...");

      // 1. 모든 시트 이름 조회
      const sheetNames = await this.getAllSheetNames();

      if (sheetNames.length === 0) {
        console.log("📝 No sheets found in spreadsheet");
        return;
      }

      console.log(
        `📋 Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`
      );

      const journalPath = this.getTransactionJournalPath(localesDir);
      recoverAtomicFileTransaction(journalPath, this.fileSystem);
      const writes: PlannedLocaleWrite[] = [];

      // Fetch and parse every sheet before any locale file is replaced.
      for (const sheetName of sheetNames) {
        console.log(`\n📥 Downloading sheet: "${sheetName}"`);

        // 해당 시트용 GoogleSheetsManager 인스턴스 생성
        const sheetManager = new GoogleSheetsManager(
          {
            credentialsPath: this.config.credentialsPath,
            spreadsheetId: this.config.spreadsheetId,
            sheetName: sheetName,
            namespace: sheetName, // 시트 이름을 네임스페이스로 사용
            languages,
          },
          this.fileSystem
        );

        // 인증 (이미 인증된 sheets 클라이언트 재사용)
        sheetManager.sheets = this.sheets;

        writes.push(
          ...(await sheetManager.planTranslationsToLocal(
            localesDir,
            languages,
            options.force === true
          ))
        );
      }

      this.commitLocaleWrites(writes, journalPath);
      console.log("\n✅ All sheets downloaded successfully");
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to download all sheets:", safeError.message);
      throw safeError;
    }
  }

  /**
   * locales 폴더의 모든 네임스페이스를 자동으로 업로드
   * 각 네임스페이스 폴더가 하나의 시트가 됩니다.
   */
  async uploadAllNamespaces(
    localesDir: string,
    autoTranslate: boolean = false,
    force: boolean = false
  ): Promise<void> {
    try {
      console.log("📤 Uploading all namespaces to Google Sheets...");

      if (!fs.existsSync(localesDir)) {
        throw new Error(`Locales directory not found: ${localesDir}`);
      }

      // 1. locales 폴더의 하위 디렉토리 목록 조회 (네임스페이스)
      const namespaces = fs
        .readdirSync(localesDir, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            entry.name !== "types" &&
            !entry.name.startsWith(".")
        )
        .map((entry) => entry.name);

      if (namespaces.length === 0) {
        console.log("📝 No namespaces found in locales directory");
        return;
      }

      console.log(
        `📋 Found ${namespaces.length} namespaces: ${namespaces.join(", ")}`
      );

      const namespaceManagers = namespaces.map((namespace) => ({
        namespace,
        sheetManager: new GoogleSheetsManager(
          {
            credentialsPath: this.config.credentialsPath,
            spreadsheetId: this.config.spreadsheetId,
            sheetName: namespace, // 네임스페이스 이름을 시트 이름으로 사용
            namespace: namespace,
            languages: this.config.languages,
          },
          this.fileSystem
        ),
      }));

      // Validate every namespace before the first remote mutation.
      for (const { sheetManager } of namespaceManagers) {
        await sheetManager.preflightUpload(localesDir);
      }

      // 2. 각 네임스페이스별로 업로드
      for (const { namespace, sheetManager } of namespaceManagers) {
        console.log(`\n📤 Uploading namespace: "${namespace}"`);

        // 인증 (이미 인증된 sheets 클라이언트 재사용)
        sheetManager.sheets = this.sheets;

        // 해당 네임스페이스의 번역을 시트에 업로드
        await sheetManager.uploadTranslations(localesDir, autoTranslate, force);
      }

      console.log("\n✅ All namespaces uploaded successfully");
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to upload all namespaces:", safeError.message);
      throw safeError;
    }
  }

  /**
   * 스프레드시트 상태 확인
   */
  async getStatus(): Promise<{
    spreadsheetId: string;
    sheetName: string;
    totalRows: number;
    lastUpdated?: string;
  }> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      const [spreadsheet, values] = await Promise.all([
        this.sheets.spreadsheets.get({
          spreadsheetId: this.config.spreadsheetId,
        }),
        this.sheets.spreadsheets.values.get({
          spreadsheetId: this.config.spreadsheetId,
          range: this.getSheetRange("A:A"),
        }),
      ]);

      const totalRows =
        (values.data.values?.length || 0) - this.config.headerRow;

      return {
        spreadsheetId: this.config.spreadsheetId,
        sheetName: this.config.sheetName,
        totalRows: Math.max(0, totalRows),
        lastUpdated: spreadsheet.data.properties?.timeZone || undefined,
      };
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to get status:", safeError.message);
      throw safeError;
    }
  }

  /**
   * CSV 파일에서 번역 데이터 읽기 (구글 시트 호환 형식)
   */
  async readTranslationsFromCSV(
    csvFilePath: string
  ): Promise<TranslationRow[]> {
    try {
      console.log(`📥 Reading translations from CSV: ${csvFilePath}`);

      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      const csvContent = fs.readFileSync(csvFilePath, "utf-8");
      if (!csvContent.trim()) {
        console.log("📝 No translation data found in CSV");
        return [];
      }

      const headers: string[] = [];
      const records: Record<string, string>[] = [];
      await new Promise<void>((resolve, reject) => {
        const parser = csvParser({ strict: true });
        parser.on("headers", (parsedHeaders: string[]) => {
          headers.push(...parsedHeaders);
        });
        parser.on("data", (record: Record<string, string>) => {
          records.push(record);
        });
        parser.on("end", resolve);
        parser.on("error", reject);
        Readable.from([csvContent]).pipe(parser);
      });

      const keyHeader = normalizeCsvHeader(headers[0] || "");
      const languageColumns = headers
        .slice(1)
        .map((header) => ({
          header,
          language: getLanguageCodeFromCsvHeader(header),
        }))
        .filter(
          (
            column
          ): column is {
            header: string;
            language: string;
          } => Boolean(column.language)
        );

      if (keyHeader !== "key" || languageColumns.length === 0) {
        throw new Error(
          "Invalid CSV header. Expected Key plus one or more language columns"
        );
      }
      validateGoogleSheetsLanguages(
        languageColumns.map(({ language }) => language)
      );

      // 데이터 파싱
      const translations: TranslationRow[] = [];

      for (const record of records) {
        const key = record[headers[0]];
        if (key) {
          const row: TranslationRow = {
            key,
          };

          for (const { header, language } of languageColumns) {
            row[language] = record[header] || "";
          }

          translations.push(row);
        }
      }

      console.log(`✅ Read ${translations.length} translations from CSV`);
      return translations;
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to read CSV file:", safeError.message);
      throw safeError;
    }
  }

  /**
   * 번역 데이터를 CSV 형식으로 저장 (구글 시트 호환)
   */
  async saveTranslationsToCSV(
    csvFilePath: string,
    translations: TranslationRow[]
  ): Promise<void> {
    try {
      console.log(`📤 Saving translations to CSV: ${csvFilePath}`);

      const detectedLanguages = collectTranslationLanguages(translations);
      const languages =
        detectedLanguages.length > 0
          ? detectedLanguages
          : this.config.languages;
      validateGoogleSheetsLanguages(languages);
      const csvLines = [
        ["Key", ...languages.map(getSheetHeaderFromLanguageCode)]
          .map((value) => this.escapeCsvValue(value))
          .join(","),
      ];

      translations.forEach((translation) => {
        csvLines.push(
          [
            translation.key,
            ...languages.map((language) => translation[language] || ""),
          ]
            .map((value) => this.escapeCsvValue(value))
            .join(",")
        );
      });

      const csvContent = csvLines.join("\n");

      // 디렉토리 생성
      const csvDir = path.dirname(csvFilePath);
      if (!fs.existsSync(csvDir)) {
        fs.mkdirSync(csvDir, { recursive: true });
      }

      fs.writeFileSync(csvFilePath, csvContent, "utf-8");

      console.log(`✅ Saved ${translations.length} translations to CSV`);
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error("❌ Failed to save CSV file:", safeError.message);
      throw safeError;
    }
  }

  /**
   * CSV 값 이스케이프
   */
  private escapeCsvValue(value: string): string {
    if (
      value.includes(",") ||
      value.includes('"') ||
      value.includes("\n") ||
      value.includes("\r")
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * CSV 파일을 로컬 JSON 번역 파일로 변환
   */
  async convertCSVToLocalTranslations(
    csvFilePath: string,
    localesDir: string,
    languages: string[] = ["en", "ko"]
  ): Promise<void> {
    try {
      validateGoogleSheetsLanguages(languages);
      const translations = await this.readTranslationsFromCSV(csvFilePath);

      if (translations.length === 0) {
        console.log("📝 No translations to convert");
        return;
      }
      this.assertSourceLanguages(
        "CSV",
        collectTranslationLanguages(translations),
        languages
      );

      // 도메인 우선 구조: locales/[namespace]/[lang].json
      const namespacePath = this.getNamespacePath(localesDir);
      const writes = languages.map((lang) => {
        const translationObj: Record<string, string> = {};
        translations.forEach((row) => {
          translationObj[row.key] = row[lang] ?? "";
        });

        const filePath = this.getLocaleFilePath(
          localesDir,
          namespacePath,
          lang
        );
        return {
          filePath,
          content: JSON.stringify(translationObj, null, 2),
          message: `📝 Converted ${Object.keys(translationObj).length} ${lang} translations to ${filePath}`,
        };
      });
      const journalPath = this.getTransactionJournalPath(localesDir);
      recoverAtomicFileTransaction(journalPath, this.fileSystem);
      this.commitLocaleWrites(writes, journalPath);
    } catch (error) {
      const safeError = safeGoogleSheetsError(error);
      console.error(
        "❌ Failed to convert CSV to local translations:",
        safeError.message
      );
      throw safeError;
    }
  }
}

// 기본 인스턴스
export const defaultGoogleSheetsManager = new GoogleSheetsManager();
