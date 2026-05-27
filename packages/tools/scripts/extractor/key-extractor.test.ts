/**
 * key-extractor 테스트
 * 키 추출 로직 테스트
 */

import {
  extractTranslationKey,
  createExtractedKey,
  ExtractedKey,
} from "./key-extractor";
import * as t from "@babel/types";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

function extractKeysFromCode(code: string): ExtractedKey[] {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const extracted: ExtractedKey[] = [];

  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "t" })) {
        const result = extractTranslationKey(path, "test.ts");
        if (Array.isArray(result)) {
          extracted.push(...result);
        } else if (result) {
          extracted.push(result);
        }
      }
    },
  });

  return extracted;
}

describe("key-extractor", () => {
  describe("extractTranslationKey", () => {
    it("t() 호출에서 키를 추출해야 함", () => {
      const extracted = extractKeysFromCode(`t("hello.world");`)[0];

      expect(extracted).not.toBeNull();
      expect(extracted?.key).toBe("hello.world");
    });

    it("템플릿 리터럴은 null을 반환해야 함", () => {
      const extracted = extractKeysFromCode("t(`hello.${name}`);");

      expect(extracted).toEqual([]);
    });

    it("첫 번째 인수가 문자열이 아니면 null을 반환해야 함", () => {
      const extracted = extractKeysFromCode("t(variable);");

      expect(extracted).toEqual([]);
    });

    it("const 문자열 키를 추출해야 함", () => {
      const extracted = extractKeysFromCode(`
        const titleKey = "home.title";
        t(titleKey);
      `);

      expect(extracted.map(({ key }) => key)).toEqual(["home.title"]);
    });

    it("const 객체의 문자열 키를 추출해야 함", () => {
      const extracted = extractKeysFromCode(`
        const keys = {
          title: "home.title",
          subtitle: "home.subtitle",
        } as const;

        t(keys.title);
        t(keys["subtitle"]);
      `);

      expect(extracted.map(({ key }) => key)).toEqual([
        "home.title",
        "home.subtitle",
      ]);
    });

    it("const 배열 map 콜백의 t(item) 키를 모두 추출해야 함", () => {
      const extracted = extractKeysFromCode(`
        const keys = ["home.title", "home.subtitle"] as const;

        keys.map((item) => t(item));
      `);

      expect(extracted.map(({ key }) => key)).toEqual([
        "home.title",
        "home.subtitle",
      ]);
    });

    it("동적 배열 map 콜백은 추출하지 않아야 함", () => {
      const extracted = extractKeysFromCode(`
        const dynamicKey = getKey();
        const keys = ["home.title", dynamicKey] as const;

        keys.map((item) => t(item));
      `);

      expect(extracted).toEqual([]);
    });
  });

  describe("createExtractedKey", () => {
    it("기본 키로 ExtractedKey를 생성해야 함", () => {
      const callExpr = t.callExpression(t.identifier("t"), [
        t.stringLiteral("hello.world"),
      ]);
      callExpr.loc = {
        start: { line: 10, column: 0 },
        end: { line: 10, column: 20 },
      } as any;
      const key = createExtractedKey(
        "hello.world",
        callExpr,
        "src/component.tsx",
      );
      expect(key.key).toBe("hello.world");
      expect(key.defaultValue).toBeUndefined();
    });

    it("defaultValue가 있으면 포함해야 함", () => {
      const callExpr = t.callExpression(t.identifier("t"), [
        t.stringLiteral("hello.world"),
        t.objectExpression([
          t.objectProperty(
            t.identifier("defaultValue"),
            t.stringLiteral("기본값"),
          ),
        ]),
      ]);
      callExpr.loc = {
        start: { line: 10, column: 0 },
        end: { line: 10, column: 20 },
      } as any;
      const key = createExtractedKey(
        "hello.world",
        callExpr,
        "src/component.tsx",
      );
      expect(key.key).toBe("hello.world");
      expect(key.defaultValue).toBe("기본값");
    });
  });
});
