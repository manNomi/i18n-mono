/**
 * Babel Wrapper 테스트
 */

import { wrapTranslations } from "../babel/wrapper";
import * as path from "path";
import {
  writeFile,
  readFile,
  createTempDir,
  removeDir,
} from "../common/utils/fs-utils";

describe("t-wrapper (Babel)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir("i18n-wrapper-test-");
  });

  afterEach(() => {
    removeDir(tempDir);
  });

  describe("wrapTranslations", () => {
    it("한국어가 포함된 파일을 처리해야 함", async () => {
      const testFile = path.join(tempDir, "test.tsx");
      writeFile(
        testFile,
        `function Component() {
  return <div>안녕하세요</div>;
}`
      );

      const result = await wrapTranslations({
        sourcePattern: path.join(tempDir, "**/*.tsx"),
      });

      expect(result.processedFiles.length).toBeGreaterThan(0);
      expect(result.processedFiles).toContain(testFile);
    });

    it("sourceLanguage가 en이면 영어 JSX 텍스트를 처리해야 함", async () => {
      const testFile = path.join(tempDir, "english.tsx");
      writeFile(
        testFile,
        `function ProductActions() {
  return (
    <div>
      <input placeholder="Search..." />
      <button>Add Product</button>
      <span className="flex items-center">Products</span>
    </div>
  );
}`
      );

      const result = await wrapTranslations({
        sourcePattern: path.join(tempDir, "**/*.tsx"),
        sourceLanguage: "en",
      });

      const modifiedContent = readFile(testFile);
      expect(result.processedFiles).toContain(testFile);
      expect(modifiedContent).toContain('t("Search...")');
      expect(modifiedContent).toContain('t("Add Product")');
      expect(modifiedContent).toContain('t("Products")');
      expect(modifiedContent).toContain('className="flex items-center"');
    });

    it("key-first JSX를 변환하고 두 번째 실행에서 다시 변환하지 않아야 함", async () => {
      const testFile = path.join(tempDir, "about.tsx");
      writeFile(
        testFile,
        `function About() {
  return <div>about.title1</div>;
}`
      );

      const config = {
        sourcePattern: path.join(tempDir, "**/*.tsx"),
        keyFirst: { enabled: true },
      };
      const first = await wrapTranslations(config);
      const afterFirst = readFile(testFile);
      const second = await wrapTranslations(config);

      expect(first.processedFiles).toContain(testFile);
      expect(afterFirst).toContain('t("about.title1")');
      expect(second.processedFiles).toEqual([]);
      expect(readFile(testFile)).toBe(afterFirst);
    });

    it("rejects invalid key-first patterns before changing files", async () => {
      const testFile = path.join(tempDir, "invalid-pattern.tsx");
      const original = `function About() { return <div>about.title1</div>; }`;
      writeFile(testFile, original);

      await expect(
        wrapTranslations({
          sourcePattern: path.join(tempDir, "**/*.tsx"),
          keyFirst: { enabled: true, pattern: "[invalid" },
        })
      ).rejects.toThrow('Invalid keyFirst.pattern "[invalid"');
      expect(readFile(testFile)).toBe(original);
    });

    it("여러 파일을 병렬로 처리해야 함", async () => {
      // 5개의 테스트 파일 생성
      for (let i = 0; i < 5; i++) {
        const testFile = path.join(tempDir, `test-${i}.tsx`);
        writeFile(
          testFile,
          `function Component${i}() {
  return <div>안녕하세요 ${i}</div>;
}`
        );
      }

      const result = await wrapTranslations({
        sourcePattern: path.join(tempDir, "**/*.tsx"),
      });

      expect(result.processedFiles.length).toBe(5);
    });

    it("총 처리 시간을 올바르게 반환해야 함", async () => {
      const testFile = path.join(tempDir, "stats-test.tsx");
      writeFile(
        testFile,
        `function Component() {
  return <div>안녕하세요</div>;
}`
      );

      const result = await wrapTranslations({
        sourcePattern: path.join(tempDir, "**/*.tsx"),
      });

      expect(result.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.processedFiles.length).toBeGreaterThan(0);
    });

    it("빈 파일 목록에 대해 올바르게 처리해야 함", async () => {
      const result = await wrapTranslations({
        sourcePattern: path.join(tempDir, "non-existent/**/*.tsx"),
      });

      expect(result.processedFiles).toEqual([]);
    });
  });
});
