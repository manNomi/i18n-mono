/**
 * key-extractor 테스트
 * 키 추출 로직 테스트
 */

import {
  extractTranslationKey,
  createExtractedKey,
  ExtractedKey,
  ExtractorConfig,
} from "./key-extractor";
import * as t from "@babel/types";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

function extractKeysFromCode(
  code: string,
  config?: ExtractorConfig,
): ExtractedKey[] {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const extracted: ExtractedKey[] = [];

  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "t" })) {
        const result = extractTranslationKey(path, "test.ts", config);
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

    it("safe 모드에서 명시적인 const 객체의 문자열 키를 추출해야 함", () => {
      const extracted = extractKeysFromCode(`
        const HOME_I18N_KEYS = {
          title: "home.title",
          subtitle: "home.subtitle",
        } as const;

        t(HOME_I18N_KEYS.title);
        t(HOME_I18N_KEYS["subtitle"]);
      `);

      expect(extracted.map(({ key }) => key)).toEqual([
        "home.title",
        "home.subtitle",
      ]);
    });

    it("safe 모드에서 명시적인 const 배열 map 콜백의 t(item) 키를 모두 추출해야 함", () => {
      const extracted = extractKeysFromCode(`
        const HOME_I18N_KEYS = ["home.title", "home.subtitle"] as const;

        HOME_I18N_KEYS.map((item) => t(item));
      `);

      expect(extracted.map(({ key }) => key)).toEqual([
        "home.title",
        "home.subtitle",
      ]);
    });

    it("safe 모드에서 일반 객체 property는 정적이어도 추출하지 않아야 함", () => {
      const extracted = extractKeysFromCode(`
        const response = {
          label: "home.title",
        } as const;

        t(response.label);
      `);

      expect(extracted).toEqual([]);
    });

    it("aggressive 모드에서 정적 일반 객체 property를 추출해야 함", () => {
      const extracted = extractKeysFromCode(
        `
          const response = {
            label: "home.title",
          } as const;

          t(response.label);
        `,
        { staticKeyExtraction: "aggressive" },
      );

      expect(extracted.map(({ key }) => key)).toEqual(["home.title"]);
    });

    it("off 모드에서 const 문자열 키는 추출하지 않고 직접 문자열만 추출해야 함", () => {
      const extracted = extractKeysFromCode(
        `
          const titleKey = "home.title";

          t(titleKey);
          t("home.subtitle");
        `,
        { staticKeyExtraction: "off" },
      );

      expect(extracted.map(({ key }) => key)).toEqual(["home.subtitle"]);
    });

    it("custom container pattern으로 safe 모드 허용 객체 이름을 확장해야 함", () => {
      const extracted = extractKeysFromCode(
        `
          const navKeys = ["nav.home", "nav.settings"] as const;

          navKeys.map((item) => t(item));
        `,
        { staticKeyContainerPatterns: ["Keys$"] },
      );

      expect(extracted.map(({ key }) => key)).toEqual([
        "nav.home",
        "nav.settings",
      ]);
    });

    it("동적 배열 map 콜백은 추출하지 않아야 함", () => {
      const extracted = extractKeysFromCode(`
        const dynamicKey = getKey();
        const HOME_I18N_KEYS = ["home.title", dynamicKey] as const;

        HOME_I18N_KEYS.map((item) => t(item));
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
