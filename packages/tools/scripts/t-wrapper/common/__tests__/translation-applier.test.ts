import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import generate from "@babel/generator";
import { parse } from "@babel/parser";
import traverse, { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import {
  ScriptConfig,
  SCRIPT_CONFIG_DEFAULTS,
} from "../../../common/default-config";
import { applyTranslationsToAST } from "../applier/translation-applier";

function parseCode(code: string): t.File {
  return parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
}

function getFunctionPaths(ast: t.File): NodePath<t.Function>[] {
  const paths: NodePath<t.Function>[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      paths.push(path);
    },
    ArrowFunctionExpression(path) {
      paths.push(path);
    },
  });

  return paths;
}

function makeConfig(
  overrides: Partial<ScriptConfig> = {},
): Required<ScriptConfig> {
  return {
    ...SCRIPT_CONFIG_DEFAULTS,
    ...overrides,
  } as Required<ScriptConfig>;
}

describe("translation-applier", () => {
  const originalCwd = process.cwd();
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    consoleLogSpy.mockRestore();
  });

  it("adds client binding, import, and use client directive for Next.js clients", () => {
    const ast = parseCode(`
function Component({ title }) {
  return <div>{title}</div>;
}
`);

    applyTranslationsToAST(
      ast,
      getFunctionPaths(ast),
      makeConfig({ mode: "client", framework: "nextjs" }),
    );

    const output = generate(ast).code;
    expect(output).toContain('"use client"');
    expect(output).toContain('import { useTranslation } from "i18nexus";');
    expect(output).toContain("useTranslation();");
    expect(output).toContain("const {\n    t\n  }");
  });

  it("adds server binding/import and converts expression-bodied arrows to blocks", () => {
    const ast = parseCode(`const Component = () => <div />;`);

    applyTranslationsToAST(
      ast,
      getFunctionPaths(ast),
      makeConfig({
        mode: "server",
        serverTranslationFunction: "getTranslation",
      }),
    );

    const output = generate(ast).code;
    expect(output).toContain(
      'import { getTranslation } from "i18nexus/server";',
    );
    expect(output).toContain("async () =>");
    expect(output).toContain("await getTranslation();");
    expect(output).toContain("const {\n    t\n  }");
    expect(output).toContain("return <div />;");
  });

  it("does not add a binding when t already exists in component scope", () => {
    const ast = parseCode(`
function Component() {
  const t = localize;
  return <div />;
}
`);

    applyTranslationsToAST(
      ast,
      getFunctionPaths(ast),
      makeConfig({ mode: "client" }),
    );

    const output = generate(ast).code;
    expect(output).not.toContain("useTranslation");
    expect(output).toContain("const t = localize;");
  });

  it("does not add a second binding when the translation hook is already called", () => {
    const ast = parseCode(`
function Component() {
  useTranslation();
  return <div />;
}
`);

    applyTranslationsToAST(
      ast,
      getFunctionPaths(ast),
      makeConfig({ mode: "client" }),
    );

    const output = generate(ast).code;
    expect(output).not.toContain("import");
    expect(output.match(/useTranslation/g)).toHaveLength(1);
  });

  it("updates existing useTranslation calls with inferred namespace", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-applier-"));
    process.chdir(tempDir);
    fs.writeFileSync(
      path.join(tempDir, "i18nexus.config.json"),
      JSON.stringify({
        namespacing: {
          enabled: true,
          basePath: path.join(tempDir, "app"),
          defaultNamespace: "common",
          framework: "nextjs-app",
        },
      }),
    );

    const sourceCode = `
function Page() {
  const translation = useTranslation();
  return <div />;
}
`;
    const ast = parseCode(sourceCode);
    const filePath = path.join(tempDir, "app", "dashboard", "page.tsx");

    applyTranslationsToAST(
      ast,
      getFunctionPaths(ast),
      makeConfig({ mode: "client" }),
      filePath,
      sourceCode,
    );

    const output = generate(ast).code;
    expect(output).toContain('import { useTranslation } from "i18nexus";');
    expect(output).toContain('useTranslation("dashboard")');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
