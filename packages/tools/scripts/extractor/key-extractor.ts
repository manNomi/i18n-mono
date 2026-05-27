/**
 * 키 추출 로직
 */

import { NodePath } from "@babel/traverse";
import * as t from "@babel/types";
import * as pathLib from "path";
import { isTFunction, getDefaultValue } from "./extractor-utils";

export interface ExtractedKey {
  key: string;
  defaultValue?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface ExtractorConfig {
  includeFilePaths?: boolean;
  includeLineNumbers?: boolean;
}

type ExtractedKeyResult = ExtractedKey | ExtractedKey[] | null;

const ITERABLE_CALLBACK_METHODS = new Set(["map", "forEach", "flatMap"]);

/**
 * t() 호출에서 번역 키 추출
 */
export function extractTranslationKey(
  path: NodePath<t.CallExpression>,
  filePath: string,
  config?: ExtractorConfig,
): ExtractedKeyResult {
  const { node } = path;

  // t() 함수 호출 감지
  if (!isTFunction(node.callee)) {
    return null;
  }

  const firstArg = node.arguments[0];
  if (
    !firstArg ||
    t.isArgumentPlaceholder(firstArg) ||
    t.isSpreadElement(firstArg)
  ) {
    return null;
  }

  const keys = resolveStaticTranslationKeys(firstArg, path);
  if (!keys || keys.length === 0) {
    return null;
  }

  const extractedKeys = [...new Set(keys)].map((key) =>
    createExtractedKey(key, node, filePath, config),
  );

  return extractedKeys.length === 1 ? extractedKeys[0] : extractedKeys;
}

function resolveStaticTranslationKeys(
  expression: t.Expression,
  callPath: NodePath<t.CallExpression>,
  visitedBindings = new Set<string>(),
): string[] | null {
  const unwrapped = unwrapExpression(expression);

  // Case 1: t("문자열") - 직접 문자열
  if (t.isStringLiteral(unwrapped)) {
    return [unwrapped.value];
  }

  // Case 2: const TITLE = "title"; t(TITLE)
  if (t.isIdentifier(unwrapped)) {
    return resolveIdentifierKeys(unwrapped, callPath, visitedBindings);
  }

  // Case 3: const KEYS = { title: "title" } as const; t(KEYS.title)
  if (t.isMemberExpression(unwrapped)) {
    return resolveMemberExpressionKeys(unwrapped, callPath, visitedBindings);
  }

  return null;
}

function resolveIdentifierKeys(
  identifier: t.Identifier,
  callPath: NodePath<t.CallExpression>,
  visitedBindings: Set<string>,
): string[] | null {
  const binding = callPath.scope.getBinding(identifier.name);
  if (!binding) {
    return null;
  }

  const callbackKeys = resolveIterableCallbackParamKeys(
    identifier,
    callPath,
    visitedBindings,
  );
  if (callbackKeys) {
    return callbackKeys;
  }

  if (visitedBindings.has(identifier.name)) {
    return null;
  }

  const init = getConstBindingInit(identifier.name, callPath);
  if (!init) {
    return null;
  }

  visitedBindings.add(identifier.name);
  return resolveStaticTranslationKeys(init, callPath, visitedBindings);
}

function resolveIterableCallbackParamKeys(
  identifier: t.Identifier,
  callPath: NodePath<t.CallExpression>,
  visitedBindings: Set<string>,
): string[] | null {
  const binding = callPath.scope.getBinding(identifier.name);
  if (!binding || binding.kind !== "param") {
    return null;
  }

  const functionPath = binding.path.findParent((parentPath) =>
    parentPath.isFunction(),
  );
  if (!functionPath?.isFunction()) {
    return null;
  }

  const paramIndex = functionPath.node.params.findIndex(
    (param) => t.isIdentifier(param) && param.name === identifier.name,
  );
  if (paramIndex !== 0) {
    return null;
  }

  const parentPath = functionPath.parentPath;
  if (!parentPath?.isCallExpression()) {
    return null;
  }

  const callbackIndex = parentPath.node.arguments.findIndex(
    (argument) => argument === functionPath.node,
  );
  if (callbackIndex !== 0) {
    return null;
  }

  const callee = parentPath.node.callee;
  if (
    !t.isMemberExpression(callee) ||
    !t.isIdentifier(callee.property) ||
    !ITERABLE_CALLBACK_METHODS.has(callee.property.name)
  ) {
    return null;
  }

  const iterable = callee.object;
  if (!t.isExpression(iterable)) {
    return null;
  }

  return resolveStaticStringArray(iterable, callPath, visitedBindings);
}

function resolveMemberExpressionKeys(
  memberExpression: t.MemberExpression,
  callPath: NodePath<t.CallExpression>,
  visitedBindings: Set<string>,
): string[] | null {
  const propertyName = getStaticPropertyName(
    memberExpression.property,
    memberExpression.computed,
  );
  if (!propertyName || !t.isExpression(memberExpression.object)) {
    return null;
  }

  const objectExpression = resolveStaticObjectExpression(
    memberExpression.object,
    callPath,
    visitedBindings,
  );
  if (objectExpression) {
    const propertyValue = getObjectPropertyValue(
      objectExpression,
      propertyName,
    );
    return propertyValue
      ? resolveStaticTranslationKeys(propertyValue, callPath, visitedBindings)
      : null;
  }

  const arrayValues = resolveStaticStringArray(
    memberExpression.object,
    callPath,
    visitedBindings,
  );
  if (arrayValues && /^\d+$/.test(propertyName)) {
    const value = arrayValues[Number(propertyName)];
    return value ? [value] : null;
  }

  return null;
}

function resolveStaticStringArray(
  expression: t.Expression,
  callPath: NodePath<t.CallExpression>,
  visitedBindings: Set<string>,
): string[] | null {
  const unwrapped = unwrapExpression(expression);

  if (t.isArrayExpression(unwrapped)) {
    const values: string[] = [];

    for (const element of unwrapped.elements) {
      if (!element || t.isSpreadElement(element)) {
        return null;
      }

      const resolved = resolveStaticTranslationKeys(
        element,
        callPath,
        visitedBindings,
      );
      if (!resolved || resolved.length !== 1) {
        return null;
      }

      values.push(resolved[0]);
    }

    return values;
  }

  if (t.isIdentifier(unwrapped)) {
    if (visitedBindings.has(unwrapped.name)) {
      return null;
    }

    const init = getConstBindingInit(unwrapped.name, callPath);
    if (!init) {
      return null;
    }

    visitedBindings.add(unwrapped.name);
    return resolveStaticStringArray(init, callPath, visitedBindings);
  }

  return null;
}

function resolveStaticObjectExpression(
  expression: t.Expression,
  callPath: NodePath<t.CallExpression>,
  visitedBindings: Set<string>,
): t.ObjectExpression | null {
  const unwrapped = unwrapExpression(expression);

  if (t.isObjectExpression(unwrapped)) {
    return unwrapped;
  }

  if (!t.isIdentifier(unwrapped) || visitedBindings.has(unwrapped.name)) {
    return null;
  }

  const init = getConstBindingInit(unwrapped.name, callPath);
  if (!init) {
    return null;
  }

  visitedBindings.add(unwrapped.name);
  return resolveStaticObjectExpression(init, callPath, visitedBindings);
}

function getConstBindingInit(
  bindingName: string,
  callPath: NodePath<t.CallExpression>,
): t.Expression | null {
  const binding = callPath.scope.getBinding(bindingName);
  if (!binding || binding.kind !== "const" || !binding.constant) {
    return null;
  }

  const declaratorPath = binding.path.isVariableDeclarator()
    ? binding.path
    : binding.path.isIdentifier()
      ? binding.path.parentPath
      : null;
  if (!declaratorPath?.isVariableDeclarator()) {
    return null;
  }

  const init = declaratorPath.node.init;
  return init && t.isExpression(init) ? init : null;
}

function getObjectPropertyValue(
  objectExpression: t.ObjectExpression,
  propertyName: string,
): t.Expression | null {
  const property = objectExpression.properties.find((prop) => {
    if (!t.isObjectProperty(prop)) {
      return false;
    }

    const keyName = getStaticPropertyName(prop.key, prop.computed);
    return keyName === propertyName;
  });

  if (
    !property ||
    !t.isObjectProperty(property) ||
    !t.isExpression(property.value)
  ) {
    return null;
  }

  return property.value;
}

function getStaticPropertyName(
  property: t.Expression | t.PrivateName,
  computed: boolean,
): string | null {
  if (t.isPrivateName(property)) {
    return null;
  }

  if (!computed && t.isIdentifier(property)) {
    return property.name;
  }

  if (t.isStringLiteral(property) || t.isNumericLiteral(property)) {
    return String(property.value);
  }

  return null;
}

function unwrapExpression(expression: t.Expression): t.Expression {
  let current = expression;

  while (
    t.isTSAsExpression(current) ||
    t.isTSSatisfiesExpression(current) ||
    t.isTSTypeAssertion(current) ||
    t.isTSNonNullExpression(current) ||
    t.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

/**
 * ExtractedKey 객체 생성
 */
export function createExtractedKey(
  key: string,
  node: t.CallExpression,
  filePath: string,
  config?: ExtractorConfig,
): ExtractedKey {
  const loc = node.loc;

  const extractedKey: ExtractedKey = {
    key,
    defaultValue: getDefaultValue(
      node.arguments.filter(
        (arg): arg is t.Expression =>
          !t.isArgumentPlaceholder(arg) && !t.isSpreadElement(arg),
      ),
    ),
  };

  if (config?.includeFilePaths) {
    extractedKey.filePath = pathLib.relative(process.cwd(), filePath);
  }

  if (config?.includeLineNumbers && loc) {
    extractedKey.lineNumber = loc.start.line;
    extractedKey.columnNumber = loc.start.column;
  }

  return extractedKey;
}
