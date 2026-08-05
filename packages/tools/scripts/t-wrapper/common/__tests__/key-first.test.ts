import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import { transformFunctionBody } from "../ast/ast-transformers";
import { createKeyFirstMatcher } from "../key-first";

function transform(
  code: string,
  sourceLanguage = "ko",
  keyFirstEnabled = true
): string {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });

  traverse(ast, {
    FunctionDeclaration(path) {
      transformFunctionBody(path, code, {
        sourceLanguage,
        keyFirst: { enabled: keyFirstEnabled },
      });
    },
  });

  return generate(ast).code;
}

describe("key-first JSX transformation", () => {
  it("is disabled by default", () => {
    const matcher = createKeyFirstMatcher();
    expect(matcher("about.title1")).toBe(false);
  });

  it("does not change key-like JSX text when key-first is disabled", () => {
    const output = transform(
      `function About() { return <div>about.title1</div>; }`,
      "ko",
      false
    );

    expect(output).not.toContain('t("about.title1")');
  });

  it.each(["ko", "en", "auto"])(
    "wraps a key independently of sourceLanguage=%s",
    (sourceLanguage) => {
      const output = transform(
        `function About() { return <div>about.title1</div>; }`,
        sourceLanguage
      );

      expect(output).toContain('t("about.title1")');
    }
  );

  it("uses exact full-string matching for custom patterns", () => {
    const matcher = createKeyFirstMatcher({
      enabled: true,
      pattern: "feature\\.[a-z]+",
    });

    expect(matcher("feature.title")).toBe(true);
    expect(matcher("prefix.feature.title")).toBe(false);
    expect(matcher("feature.title.suffix")).toBe(false);
  });

  it("wraps direct JSX expression strings and user-facing attributes", () => {
    const output = transform(`function About() {
  return <><div>{"about.title1"}</div><input placeholder="search.placeholder" /><img alt="about.heroAlt" /><div title={"about.title2"} /></>;
}`);

    expect(output).toContain('t("about.title1")');
    expect(output).toContain('placeholder={t("search.placeholder")}');
    expect(output).toContain('alt={t("about.heroAlt")}');
    expect(output).toContain('title={t("about.title2")}');
  });

  it("does not treat technical JSX attributes or code-like descendants as keys", () => {
    const output = transform(`function About() {
  return <><a href="about.title1" data-key="about.title1" id="about.title1">Link</a><div className="about.title1" /><a href={"about.title2"} data-key={"item.id"} /><div className={"layout.grid"} /><code>about.title1</code><pre>about.title1</pre></>;
}`);

    expect(output).not.toContain('t("about.title1")');
    expect(output).not.toContain('t("about.title2")');
    expect(output).not.toContain('t("item.id")');
    expect(output).not.toContain('t("layout.grid")');
    expect(output).toContain('href="about.title1"');
    expect(output).toContain('className="about.title1"');
    expect(output).toContain('href={"about.title2"}');
    expect(output).toContain('data-key={"item.id"}');
    expect(output).toContain('className={"layout.grid"}');
  });

  it.each(["en", "auto"])(
    "keeps matching key-first values in excluded descendants for sourceLanguage=%s",
    (sourceLanguage) => {
      const output = transform(
        `function About() {
  return <><code>about.title1</code><pre>{"about.title2"}</pre><script>{"about.title3"}</script><style>{"about.title4"}</style><p>Plain English text</p></>;
}`,
        sourceLanguage
      );

      expect(output).not.toContain('t("about.title1")');
      expect(output).not.toContain('t("about.title2")');
      expect(output).not.toContain('t("about.title3")');
      expect(output).not.toContain('t("about.title4")');
      expect(output).toContain('t("Plain English text")');
    }
  );

  it("does not wrap arbitrary constants, variables, dynamic templates, ignored nodes, or existing t calls", () => {
    const output = transform(`function About({ response }) {
  const title = "about.title1";
  const keys = ["about.title2"];
  const item = { label: "about.title3" };
  const section = "title4";
  return <><div>{response.title}</div><div>{title}</div><div>{\`about.\${section}\`}</div>{/* i18n-ignore */}<div>about.title5</div><div>{t("about.title6")}</div></>;
}`);

    expect(output).not.toContain('t("about.title1")');
    expect(output).not.toContain('t("about.title2")');
    expect(output).not.toContain('t("about.title3")');
    expect(output).not.toContain('t("about.title5")');
    expect(output.match(/t\("about\.title6"\)/g)).toHaveLength(1);
  });

  it("fails clearly for invalid patterns", () => {
    expect(() =>
      createKeyFirstMatcher({ enabled: true, pattern: "[unterminated" })
    ).toThrow('Invalid keyFirst.pattern "[unterminated"');
  });
});
