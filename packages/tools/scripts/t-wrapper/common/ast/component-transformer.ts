import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import type { ScriptConfig } from "../../../common/default-config";
import { isReactComponent, isReactCustomHook } from "./ast-helpers";
import { transformFunctionBody } from "./ast-transformers";

/**
 * 컴포넌트나 커스텀 훅을 변환 시도
 * @returns 변환 성공 여부
 */
export function tryTransformComponent(
  path: NodePath<t.Function>,
  code: string,
  modifiedComponentPaths: NodePath<t.Function>[],
  config: Pick<ScriptConfig, "sourceLanguage" | "keyFirst"> = {}
): boolean {
  let functionName: string | null | undefined;

  // function 형태
  if (path.isFunctionDeclaration() && path.node.id) {
    functionName = path.node.id.name;
  }
  // arrow function 형태
  else if (
    path.isArrowFunctionExpression() &&
    t.isVariableDeclarator(path.parent) &&
    t.isIdentifier(path.parent.id)
  ) {
    functionName = path.parent.id.name;
  }

  if (
    functionName &&
    (isReactComponent(functionName) || isReactCustomHook(functionName))
  ) {
    const transformResult = transformFunctionBody(path, code, {
      sourceLanguage: config.sourceLanguage,
      keyFirst: config.keyFirst,
    });
    if (transformResult.wasModified) {
      modifiedComponentPaths.push(path);
      return true;
    }
  }
  return false;
}
