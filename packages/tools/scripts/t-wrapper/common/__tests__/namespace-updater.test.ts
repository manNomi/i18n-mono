import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
import { updateExistingUseTranslation } from "../ast/namespace-updater";

function parseCode(code: string): t.File {
  return parse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
}

function getUseTranslationArgs(ast: t.File): t.CallExpression["arguments"] {
  let args: t.CallExpression["arguments"] = [];

  traverse(ast, {
    CallExpression(path) {
      if (t.isIdentifier(path.node.callee, { name: "useTranslation" })) {
        args = path.node.arguments;
      }
    },
  });

  return args;
}

describe("namespace-updater", () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("adds namespace to useTranslation without arguments", () => {
    const ast = parseCode(`const { t } = useTranslation();`);

    expect(updateExistingUseTranslation(ast, "dashboard")).toBe(true);

    const args = getUseTranslationArgs(ast);
    expect(args).toHaveLength(1);
    expect(t.isStringLiteral(args[0]) && args[0].value).toBe("dashboard");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `  ✓ Added namespace "dashboard" to useTranslation()`,
    );
  });

  it("replaces empty namespace string", () => {
    const ast = parseCode(`const { t } = useTranslation("");`);

    expect(updateExistingUseTranslation(ast, "common")).toBe(true);

    const args = getUseTranslationArgs(ast);
    expect(t.isStringLiteral(args[0]) && args[0].value).toBe("common");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `  ✓ Updated namespace to "common"`,
    );
  });

  it("keeps explicit namespace unchanged", () => {
    const ast = parseCode(`const { t } = useTranslation("settings");`);

    expect(updateExistingUseTranslation(ast, "dashboard")).toBe(false);

    const args = getUseTranslationArgs(ast);
    expect(t.isStringLiteral(args[0]) && args[0].value).toBe("settings");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `  ℹ️  Keeping existing namespace "settings"`,
    );
  });
});
