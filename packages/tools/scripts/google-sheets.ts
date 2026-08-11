import { google, sheets_v4 } from "googleapis";
import * as fs from "fs";
import * as path from "path";

export interface GoogleSheetsConfig {
  credentialsPath?: string;
  spreadsheetId?: string;
  sheetName?: string;
  namespace?: string; // 네임스페이스 (도메인 우선 구조용)
  keyColumn?: string;
  valueColumns?: string[];
  headerRow?: number;
}

export interface TranslationRow {
  key: string;
  [language: string]: string;
}

function pathEntryExists(targetPath: string): boolean {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveThroughExistingAncestor(targetPath: string): string {
  let existingAncestor = targetPath;
  while (!pathEntryExists(existingAncestor)) {
    const parentPath = path.dirname(existingAncestor);
    if (parentPath === existingAncestor) {
      throw new Error(`Cannot resolve path: ${targetPath}`);
    }
    existingAncestor = parentPath;
  }

  return path.resolve(
    fs.realpathSync(existingAncestor),
    path.relative(existingAncestor, targetPath)
  );
}

function isWithin(basePath: string, targetPath: string): boolean {
  const relativePath = path.relative(basePath, targetPath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

export function resolveSafeChildPath(
  basePath: string,
  childName: string,
  label: string
): string {
  if (
    !childName ||
    childName === "." ||
    childName === ".." ||
    childName.includes("/") ||
    childName.includes("\\") ||
    childName.includes("\0")
  ) {
    throw new Error(`${label} is not a safe path segment: ${childName}`);
  }

  const resolvedBasePath = path.resolve(basePath);
  const resolvedChildPath = path.resolve(resolvedBasePath, childName);
  const realBasePath = resolveThroughExistingAncestor(resolvedBasePath);
  const realChildPath = resolveThroughExistingAncestor(resolvedChildPath);
  if (
    !isWithin(resolvedBasePath, resolvedChildPath) ||
    !isWithin(realBasePath, realChildPath)
  ) {
    throw new Error(`${label} escapes the locales directory: ${childName}`);
  }
  return resolvedChildPath;
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

function normalizeCsvHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
}

function getLanguageCodeFromCsvHeader(header: string): string | null {
  const normalized = normalizeCsvHeader(header);

  if (!normalized || normalized === "key") {
    return null;
  }

  return CSV_LANGUAGE_HEADER_TO_CODE[normalized] || normalized;
}

export class GoogleSheetsManager {
  private sheets: sheets_v4.Sheets | null = null;
  private config: Required<GoogleSheetsConfig>;

  constructor(config: Partial<GoogleSheetsConfig> = {}) {
    this.config = {
      credentialsPath: config.credentialsPath || "./credentials.json",
      spreadsheetId: config.spreadsheetId || "",
      sheetName: config.sheetName || "Translations",
      namespace: config.namespace || "",
      keyColumn: config.keyColumn || "A",
      valueColumns: config.valueColumns || ["B", "C"], // B=English, C=Korean
      headerRow: config.headerRow || 1,
    };
  }

  /**
   * 네임스페이스 경로 반환 (도메인 우선 구조: locales/[namespace]/[lang].json)
   */
  private getNamespacePath(localesDir: string): string {
    if (this.config.namespace) {
      return resolveSafeChildPath(
        localesDir,
        this.config.namespace,
        "namespace"
      );
    }
    return localesDir; // 레거시: locales/[lang].json
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
      console.error("❌ Failed to authenticate Google Sheets API:", error);
      throw error;
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
      console.error("❌ Spreadsheet not accessible:", error);
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
      console.error("❌ Failed to ensure worksheet:", error);
      throw error;
    }
  }

  /**
   * 헤더 행 추가
   */
  private async addHeaders(): Promise<void> {
    if (!this.sheets) return;

    const headers = ["Key", "English", "Korean"];
    const range = `${this.config.sheetName}!A${this.config.headerRow}:C${this.config.headerRow}`;

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.config.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers],
      },
    });

    console.log("📝 Headers added to worksheet");
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
    force: boolean = false,
    dryRun: boolean = false
  ): Promise<void> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      console.log("📤 Uploading translations to Google Sheets...");
      if (autoTranslate) {
        console.log(
          "🤖 Auto-translate mode: English will use GOOGLETRANSLATE formula"
        );
      }
      if (force) {
        console.log("💪 Force mode: Overwriting all existing data");
      }
      if (dryRun) {
        console.log("🔍 Dry run mode: Google Sheets will not be modified");
      }

      // 로컬 번역 파일들 읽기
      const translations = await this.readLocalTranslations(localesDir);

      if (translations.length === 0) {
        console.log("📝 No translation files found");
        return;
      }

      let translationsToUpload: TranslationRow[];
      const existingRows = await this.fetchTranslationRows();
      const existingData = this.parseTranslationRows(existingRows);
      const existingRowCount = Math.max(
        existingRows.length - this.config.headerRow,
        0
      );

      if (force) {
        // Force 모드: 모든 키 업로드
        translationsToUpload = translations;

        if (dryRun) {
          console.log(
            `🔍 Would clear ${existingRowCount} existing rows and upload ${translationsToUpload.length} local translations`
          );
          return;
        }

        // 기존 데이터 모두 삭제 (헤더 제외)
        if (existingRowCount > 0) {
          const deleteRange = `${this.config.sheetName}!A${this.config.headerRow + 1}:C${
            existingRowCount + this.config.headerRow
          }`;
          await this.sheets.spreadsheets.values.clear({
            spreadsheetId: this.config.spreadsheetId,
            range: deleteRange,
          });
          console.log(`�️  Cleared ${existingRowCount} existing rows`);
        }
      } else {
        // 일반 모드: 새로운 키만 업로드
        const existingData = await this.downloadTranslations();
        const existingKeys = new Set(existingData.map((row) => row.key));

        translationsToUpload = translations.filter(
          (t) => !existingKeys.has(t.key)
        );

        if (translationsToUpload.length === 0) {
          console.log("📝 No new translations to upload");
          return;
        }

        if (dryRun) {
          console.log(
            `🔍 Would append ${translationsToUpload.length} new translations after ${existingRowCount} existing rows`
          );
          return;
        }
      }

      // 시작 행 계산
      const startRow =
        this.config.headerRow + (force ? 1 : existingRowCount + 1);

      // 데이터 준비
      const values = translationsToUpload.map((translation, index) => {
        const currentRow = startRow + index;
        const key = translation.key;
        const korean = translation.ko || "";
        const localEnglishValue = translation.en || "";

        const english = autoTranslate
          ? localEnglishValue === ""
            ? `=GOOGLETRANSLATE(C${currentRow}, "ko", "en")`
            : localEnglishValue
          : localEnglishValue;

        return [
          this.escapeFormula(key),
          this.escapeFormula(english),
          this.escapeFormula(korean),
        ];
      });

      const endRow = startRow + values.length - 1;
      const range = `${this.config.sheetName}!A${startRow}:C${endRow}`;

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
      console.error("❌ Failed to upload translations:", error);
      throw error;
    }
  }

  /**
   * Google Sheets에서 번역 데이터 다운로드
   * valueRenderOption을 FORMATTED_VALUE로 설정하여 수식이 아닌 계산된 결과값을 가져옴
   */
  private async fetchTranslationRows(): Promise<any[][]> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    const range = `${this.config.sheetName}!A:C`;
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.config.spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    return response.data.values || [];
  }

  private parseTranslationRows(rows: any[][]): TranslationRow[] {
    if (rows.length <= this.config.headerRow) return [];

    const removeEscapePrefix = (value: string): string => {
      if (!value) return value;
      return value.startsWith("'") ? value.substring(1) : value;
    };

    return rows
      .slice(this.config.headerRow)
      .filter((row) => row[0])
      .map((row) => ({
        key: removeEscapePrefix(row[0] || ""),
        en: removeEscapePrefix(row[1] || ""),
        ko: removeEscapePrefix(row[2] || ""),
      }));
  }

  async downloadTranslations(): Promise<TranslationRow[]> {
    if (!this.sheets) {
      throw new Error(
        "Google Sheets client not initialized. Call authenticate() first."
      );
    }

    try {
      console.log("📥 Downloading translations from Google Sheets...");

      const rows = await this.fetchTranslationRows();

      if (rows.length <= this.config.headerRow) {
        console.log("📝 No translation data found");
        return [];
      }

      const translations = this.parseTranslationRows(rows);

      console.log(
        `✅ Downloaded ${translations.length} translations from Google Sheets`
      );
      return translations;
    } catch (error) {
      console.error("❌ Failed to download translations:", error);
      throw error;
    }
  }

  /**
   * Google Sheets 데이터를 로컬 번역 파일로 저장 (언어별 파일: en.json, ko.json)
   */
  async saveTranslationsToLocal(
    localesDir: string,
    languages: string[] = ["en", "ko"],
    dryRun: boolean = false
  ): Promise<void> {
    try {
      const translations = await this.downloadTranslations();

      if (translations.length === 0) {
        console.log("📝 No translations to save");
        return;
      }

      // locales 디렉토리가 없으면 생성
      if (!dryRun && !fs.existsSync(localesDir)) {
        fs.mkdirSync(localesDir, { recursive: true });
      }

      // 도메인 우선 구조: locales/[namespace]/[lang].json
      const namespacePath = this.getNamespacePath(localesDir);
      if (!dryRun && !fs.existsSync(namespacePath)) {
        fs.mkdirSync(namespacePath, { recursive: true });
      }

      // 언어별로 번역 파일 생성
      for (const lang of languages) {
        const translationObj: Record<string, string> = {};
        translations.forEach((row) => {
          if (row[lang]) {
            translationObj[row.key] = row[lang];
          }
        });

        const filePath = resolveSafeChildPath(
          namespacePath,
          `${lang}.json`,
          "translation file"
        );
        if (dryRun) {
          console.log(
            `🔍 Would replace ${filePath} with ${Object.keys(translationObj).length} translations`
          );
        } else {
          fs.writeFileSync(
            filePath,
            JSON.stringify(translationObj, null, 2),
            "utf-8"
          );

          console.log(
            `📝 Saved ${Object.keys(translationObj).length} ${lang} translations to ${filePath}`
          );
        }
      }
    } catch (error) {
      console.error("❌ Failed to save translations to local:", error);
      throw error;
    }
  }

  /**
   * Google Sheets 데이터를 로컬 번역 파일로 저장 (증분 업데이트 - 추가된 데이터만)
   */
  async saveTranslationsToLocalIncremental(
    localesDir: string,
    languages: string[] = ["en", "ko"],
    dryRun: boolean = false
  ): Promise<void> {
    try {
      const translations = await this.downloadTranslations();

      if (translations.length === 0) {
        console.log("📝 No translations to save");
        return;
      }

      // locales 디렉토리가 없으면 생성
      if (!dryRun && !fs.existsSync(localesDir)) {
        fs.mkdirSync(localesDir, { recursive: true });
      }

      // 도메인 우선 구조: locales/[namespace]/[lang].json
      const namespacePath = this.getNamespacePath(localesDir);
      if (!dryRun && !fs.existsSync(namespacePath)) {
        fs.mkdirSync(namespacePath, { recursive: true });
      }

      // 언어별로 번역 파일 생성/업데이트
      for (const lang of languages) {
        const filePath = resolveSafeChildPath(
          namespacePath,
          `${lang}.json`,
          "translation file"
        );

        // 기존 번역 파일 읽기
        let existingTranslations: Record<string, string> = {};
        if (fs.existsSync(filePath)) {
          existingTranslations = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }

        // 새로운 번역만 추가 (기존 키는 유지)
        let addedCount = 0;
        translations.forEach((row) => {
          if (row[lang] && !existingTranslations[row.key]) {
            existingTranslations[row.key] = row[lang];
            addedCount++;
          }
        });

        if (dryRun) {
          console.log(
            `🔍 Would add ${addedCount} new ${lang} translations to ${filePath}`
          );
        } else {
          fs.writeFileSync(
            filePath,
            JSON.stringify(existingTranslations, null, 2),
            "utf-8"
          );

          console.log(
            `📝 Added ${addedCount} new ${lang} translations to ${filePath} (total: ${Object.keys(existingTranslations).length})`
          );
        }
      }
    } catch (error) {
      console.error("❌ Failed to save translations to local:", error);
      throw error;
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

    if (!fs.existsSync(namespacePath)) {
      console.log(`⚠️  Locales directory not found: ${namespacePath}`);
      return [];
    }

    // 도메인 우선 구조: locales/[namespace]/[lang].json
    if (this.config.namespace) {
      // 네임스페이스 디렉토리에서 .json 파일들 찾기 (ko.json, en.json 등)
      const files = fs
        .readdirSync(namespacePath)
        .filter((file) => file.endsWith(".json") && file !== "index.ts");

      const translationData: Record<string, Record<string, string>> = {};

      // 각 언어 파일 읽기
      for (const file of files) {
        const lang = path.basename(file, ".json"); // ko.json -> ko
        const filePath = resolveSafeChildPath(
          namespacePath,
          file,
          "translation file"
        );

        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          translationData[lang] = content;

          Object.keys(content).forEach((key) => {
            allKeys.add(key);
          });
        } catch (error) {
          console.warn(`⚠️  Failed to read ${filePath}:`, error);
        }
      }

      // 모든 키에 대해 번역 행 생성
      allKeys.forEach((key) => {
        const row: TranslationRow = { key };
        Object.keys(translationData).forEach((lang) => {
          row[lang] = translationData[lang][key] || "";
        });
        translations.push(row);
      });
    } else {
      // 레거시 구조: locales/en.json, locales/ko.json
      const files = fs
        .readdirSync(namespacePath)
        .filter((file) => file.endsWith(".json") && file !== "index.ts");

      const translationData: Record<string, Record<string, string>> = {};

      // 각 언어 파일 읽기
      for (const file of files) {
        const lang = path.basename(file, ".json"); // en.json -> en
        const filePath = resolveSafeChildPath(
          namespacePath,
          file,
          "translation file"
        );

        try {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          translationData[lang] = content;

          Object.keys(content).forEach((key) => {
            allKeys.add(key);
          });
        } catch (error) {
          console.warn(`⚠️  Failed to read ${filePath}:`, error);
        }
      }

      // 모든 키에 대해 번역 행 생성
      allKeys.forEach((key) => {
        const row: TranslationRow = { key };
        Object.keys(translationData).forEach((lang) => {
          row[lang] = translationData[lang][key] || "";
        });
        translations.push(row);
      });
    }

    return translations;
  }

  /**
   * 양방향 동기화 - 로컬과 Google Sheets 간의 차이점 해결
   */
  async syncTranslations(localesDir: string): Promise<void> {
    try {
      console.log("🔄 Starting bidirectional sync...");

      // 로컬과 원격 데이터 읽기
      const [localTranslations, remoteTranslations] = await Promise.all([
        this.readLocalTranslations(localesDir),
        this.downloadTranslations(),
      ]);

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
        await this.uploadNewTranslations(newLocalKeys);
      }

      // 새로운 원격 키들을 로컬에 다운로드
      const newRemoteKeys = remoteTranslations.filter(
        (t) => !localKeys.has(t.key)
      );
      if (newRemoteKeys.length > 0) {
        console.log(
          `📥 Downloading ${newRemoteKeys.length} new remote keys to local files`
        );
        await this.addTranslationsToLocal(localesDir, newRemoteKeys);
      }

      console.log("✅ Sync completed successfully");
    } catch (error) {
      console.error("❌ Failed to sync translations:", error);
      throw error;
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
    translations: TranslationRow[]
  ): Promise<void> {
    if (!this.sheets || translations.length === 0) return;

    const values = translations.map((t) => [
      this.escapeFormula(t.key),
      this.escapeFormula(t.en || ""),
      this.escapeFormula(t.ko || ""),
    ]);

    // 기존 데이터의 마지막 행 찾기
    const existingData = await this.downloadTranslations();
    const startRow = existingData.length + this.config.headerRow + 1;
    const endRow = startRow + values.length - 1;
    const range = `${this.config.sheetName}!A${startRow}:C${endRow}`;

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
    translations: TranslationRow[]
  ): Promise<void> {
    const languages = ["en", "ko"];
    const namespacePath = this.getNamespacePath(localesDir);

    if (!fs.existsSync(namespacePath)) {
      fs.mkdirSync(namespacePath, { recursive: true });
    }

    for (const lang of languages) {
      const filePath = path.join(namespacePath, `${lang}.json`);

      // 기존 번역 읽기
      let existingTranslations: Record<string, string> = {};
      if (fs.existsSync(filePath)) {
        existingTranslations = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }

      // 새로운 번역 추가
      translations.forEach((t) => {
        if (t[lang]) {
          existingTranslations[t.key] = t[lang];
        }
      });

      // 파일 저장
      fs.writeFileSync(
        filePath,
        JSON.stringify(existingTranslations, null, 2),
        "utf-8"
      );
    }
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
      console.error("❌ Failed to get sheet names:", error);
      throw error;
    }
  }

  /**
   * 모든 시트의 번역을 자동으로 다운로드하여 네임스페이스별 폴더에 저장
   * 각 시트 이름이 네임스페이스가 됩니다.
   */
  async downloadAllSheets(
    localesDir: string,
    languages: string[] = ["en", "ko"],
    options: { force?: boolean; dryRun?: boolean } = {}
  ): Promise<void> {
    try {
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

      // 2. 각 시트별로 다운로드
      for (const sheetName of sheetNames) {
        console.log(`\n📥 Downloading sheet: "${sheetName}"`);

        // 해당 시트용 GoogleSheetsManager 인스턴스 생성
        const sheetManager = new GoogleSheetsManager({
          credentialsPath: this.config.credentialsPath,
          spreadsheetId: this.config.spreadsheetId,
          sheetName: sheetName,
          namespace: sheetName, // 시트 이름을 네임스페이스로 사용
        });

        // 인증 (이미 인증된 sheets 클라이언트 재사용)
        sheetManager.sheets = this.sheets;

        // 해당 시트의 데이터를 locales/[namespace]/ 에 저장
        if (options.force) {
          await sheetManager.saveTranslationsToLocal(
            localesDir,
            languages,
            options.dryRun
          );
        } else {
          await sheetManager.saveTranslationsToLocalIncremental(
            localesDir,
            languages,
            options.dryRun
          );
        }
      }

      console.log("\n✅ All sheets downloaded successfully");
    } catch (error) {
      console.error("❌ Failed to download all sheets:", error);
      throw error;
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
      const namespaces = fs.readdirSync(localesDir).filter((item) => {
        const fullPath = resolveSafeChildPath(localesDir, item, "namespace");
        // 디렉토리이고, types 같은 특수 폴더는 제외
        return (
          fs.statSync(fullPath).isDirectory() &&
          item !== "types" &&
          !item.startsWith(".")
        );
      });

      if (namespaces.length === 0) {
        console.log("📝 No namespaces found in locales directory");
        return;
      }

      console.log(
        `📋 Found ${namespaces.length} namespaces: ${namespaces.join(", ")}`
      );

      // 2. 각 네임스페이스별로 업로드
      for (const namespace of namespaces) {
        console.log(`\n📤 Uploading namespace: "${namespace}"`);

        // 해당 네임스페이스용 GoogleSheetsManager 인스턴스 생성
        const sheetManager = new GoogleSheetsManager({
          credentialsPath: this.config.credentialsPath,
          spreadsheetId: this.config.spreadsheetId,
          sheetName: namespace, // 네임스페이스 이름을 시트 이름으로 사용
          namespace: namespace,
        });

        // 인증 (이미 인증된 sheets 클라이언트 재사용)
        sheetManager.sheets = this.sheets;

        // 시트가 없으면 생성
        await sheetManager.ensureWorksheet();

        // 해당 네임스페이스의 번역을 시트에 업로드
        await sheetManager.uploadTranslations(localesDir, autoTranslate, force);
      }

      console.log("\n✅ All namespaces uploaded successfully");
    } catch (error) {
      console.error("❌ Failed to upload all namespaces:", error);
      throw error;
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
          range: `${this.config.sheetName}!A:A`,
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
      console.error("❌ Failed to get status:", error);
      throw error;
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
      const lines = csvContent.split("\n").filter((line) => line.trim());

      if (lines.length <= 1) {
        console.log("📝 No translation data found in CSV");
        return [];
      }

      const headers = this.parseCSVLine(lines[0]);
      const keyHeader = normalizeCsvHeader(headers[0] || "");
      const languageColumns = headers
        .slice(1)
        .map((header, index) => ({
          language: getLanguageCodeFromCsvHeader(header),
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

      if (keyHeader !== "key" || languageColumns.length === 0) {
        console.warn(
          "⚠️ CSV header format might not be correct. Expected: Key plus one or more language columns"
        );
      }

      // 데이터 파싱
      const translations: TranslationRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = this.parseCSVLine(line);

        if (values[0]) {
          const row: TranslationRow = {
            key: values[0],
          };

          for (const { language, valueIndex } of languageColumns) {
            row[language] = values[valueIndex] || "";
          }

          translations.push(row);
        }
      }

      console.log(`✅ Read ${translations.length} translations from CSV`);
      return translations;
    } catch (error) {
      console.error("❌ Failed to read CSV file:", error);
      throw error;
    }
  }

  /**
   * CSV 라인 파싱 (간단한 CSV 파서)
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 이스케이프된 따옴표
          current += '"';
          i += 2;
        } else {
          // 따옴표 시작/끝
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        // 컬럼 구분자
        values.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }

    values.push(current);
    return values;
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

      const csvLines = ["Key,English,Korean"];

      translations.forEach(({ key, en, ko }) => {
        const escapedKey = this.escapeCsvValue(key);
        const escapedEn = this.escapeCsvValue(en || "");
        const escapedKo = this.escapeCsvValue(ko || "");

        csvLines.push(`${escapedKey},${escapedEn},${escapedKo}`);
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
      console.error("❌ Failed to save CSV file:", error);
      throw error;
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
      const translations = await this.readTranslationsFromCSV(csvFilePath);

      if (translations.length === 0) {
        console.log("📝 No translations to convert");
        return;
      }

      // 도메인 우선 구조: locales/[namespace]/[lang].json
      const namespacePath = this.getNamespacePath(localesDir);
      if (!fs.existsSync(namespacePath)) {
        fs.mkdirSync(namespacePath, { recursive: true });
      }

      // 언어별로 번역 파일 생성
      for (const lang of languages) {
        const translationObj: Record<string, string> = {};
        translations.forEach((row) => {
          if (row[lang]) {
            translationObj[row.key] = row[lang];
          }
        });

        const filePath = path.join(namespacePath, `${lang}.json`);
        fs.writeFileSync(
          filePath,
          JSON.stringify(translationObj, null, 2),
          "utf-8"
        );

        console.log(
          `📝 Converted ${Object.keys(translationObj).length} ${lang} translations to ${filePath}`
        );
      }
    } catch (error) {
      console.error("❌ Failed to convert CSV to local translations:", error);
      throw error;
    }
  }
}

// 기본 인스턴스
export const defaultGoogleSheetsManager = new GoogleSheetsManager();
