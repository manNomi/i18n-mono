/**
 * TypeScript type definition generator for i18nexus
 *
 * This module generates TypeScript declaration files that provide
 * type safety for translation keys in useTranslation hook.
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Extracted translations structure
 * namespace -> language -> key -> value
 */
export interface ExtractedTranslations {
  [namespace: string]: {
    [language: string]: {
      [key: string]: string;
    };
  };
}

/**
 * Configuration for type generation
 */
export interface TypeGeneratorConfig {
  /** Output file path for type definitions */
  outputPath: string;
  /** Whether to include JSDoc comments */
  includeJsDocs?: boolean;
  /** Fallback namespace for keys without explicit namespace */
  fallbackNamespace?: string;
  /** Translation import source (e.g., "i18nexus", "react-i18next") */
  translationImportSource?: string;
  /**
   * Strict validation mode for translation completeness.
   * When enabled, type generation fails if any language is missing keys
   * or if any translation value is empty.
   */
  strictValidation?: boolean;
}

export interface TranslationValidationIssue {
  namespace: string;
  language: string;
  key: string;
  type: "missing-key" | "empty-value" | "invalid-value";
  message: string;
}

/**
 * Validate translation completeness for strict type generation.
 * - Every language in a namespace must include the same keys.
 * - Every value must be a non-empty string.
 */
export function validateTranslationsForTypeGeneration(
  extractedData: ExtractedTranslations,
): TranslationValidationIssue[] {
  const issues: TranslationValidationIssue[] = [];

  for (const [namespace, languages] of Object.entries(extractedData)) {
    const allKeys = new Set<string>();

    for (const translationMap of Object.values(languages)) {
      for (const key of Object.keys(translationMap)) {
        allKeys.add(key);
      }
    }

    for (const [language, translationMap] of Object.entries(languages)) {
      for (const key of allKeys) {
        if (!Object.prototype.hasOwnProperty.call(translationMap, key)) {
          issues.push({
            namespace,
            language,
            key,
            type: "missing-key",
            message: "Missing key in this language file",
          });
        }
      }

      for (const [key, value] of Object.entries(translationMap)) {
        if (typeof value !== "string") {
          issues.push({
            namespace,
            language,
            key,
            type: "invalid-value",
            message: "Translation value must be a string",
          });
          continue;
        }

        if (value.trim().length === 0) {
          issues.push({
            namespace,
            language,
            key,
            type: "empty-value",
            message: "Translation value is empty",
          });
        }
      }
    }
  }

  return issues;
}

function formatValidationError(
  issues: TranslationValidationIssue[],
  limit: number = 20,
): string {
  const visibleIssues = issues.slice(0, limit);
  const lines = visibleIssues.map(
    (issue) =>
      `  - [${issue.namespace}/${issue.language}] "${issue.key}": ${issue.message}`,
  );
  const remaining = issues.length - visibleIssues.length;

  if (remaining > 0) {
    lines.push(`  - ...and ${remaining} more issue(s)`);
  }

  return [
    "Translation validation failed in strict type generation mode.",
    "Fix missing keys and empty values, or disable strict mode with `strictTypeGeneration: false`.",
    ...lines,
  ].join("\n");
}

/**
 * Generate TypeScript type definitions from extracted translations
 *
 * Creates a .d.ts file with Module Augmentation for type-safe translations
 *
 * @example
 * ```typescript
 * // Generated types/i18nexus.d.ts
 * declare module "i18nexus" {
 *   interface TranslationKeys {
 *     "home": "title" | "description";
 *     "about": "company" | "team";
 *   }
 * }
 * ```
 */
export function generateTypeDefinitions(
  extractedData: ExtractedTranslations,
  config: TypeGeneratorConfig,
): void {
  console.log("📝 Generating TypeScript type definitions...");

  if (config.strictValidation) {
    const validationIssues =
      validateTranslationsForTypeGeneration(extractedData);
    if (validationIssues.length > 0) {
      throw new Error(formatValidationError(validationIssues));
    }
  }

  // Step 1: Extract all namespace keys
  const namespaceKeys = extractNamespaceKeys(extractedData);
  const namespaceKeysWithInfo = extractNamespaceKeysWithInfo(extractedData);

  if (Object.keys(namespaceKeys).length === 0) {
    console.warn("⚠️  No translation keys found. Skipping type generation.");
    return;
  }

  // Step 2: Generate type definition content
  const typeContent = generateTypeContent(
    extractedData,
    namespaceKeys,
    namespaceKeysWithInfo,
    config,
  );

  // Step 3: Ensure output directory exists
  const outputDir = path.dirname(config.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Step 4: Write type definition file
  fs.writeFileSync(config.outputPath, typeContent, "utf-8");

  console.log(`✅ Generated type definitions at: ${config.outputPath}`);
  console.log(`   - ${Object.keys(namespaceKeys).length} namespaces`);
  console.log(
    `   - ${Object.values(namespaceKeys).reduce((sum, keys) => sum + keys.length, 0)} total keys`,
  );

  // Count keys with interpolation
  const keysWithVars = Object.values(namespaceKeysWithInfo)
    .flat()
    .filter((info) => info.variables.length > 0).length;
  if (keysWithVars > 0) {
    console.log(`   - ${keysWithVars} keys with interpolation variables`);
  }
}

/**
 * Extract interpolation variables from a translation key
 * @example "{{totalDays}}일 남음" -> ["totalDays"]
 */
function extractInterpolationVariables(key: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars: string[] = [];
  let match;

  while ((match = regex.exec(key)) !== null) {
    vars.push(match[1]);
  }

  return [...new Set(vars)]; // Remove duplicates
}

/**
 * Key info with interpolation variables
 */
interface KeyInfo {
  key: string;
  variables: string[];
}

/**
 * Extract keys for each namespace from translations
 */
function extractNamespaceKeys(
  extractedData: ExtractedTranslations,
): Record<string, string[]> {
  const namespaceKeys: Record<string, string[]> = {};

  for (const [namespace, languages] of Object.entries(extractedData)) {
    const keys = new Set<string>();

    for (const translationMap of Object.values(languages)) {
      for (const key of Object.keys(translationMap)) {
        keys.add(key);
      }
    }

    if (keys.size === 0) {
      console.warn(`⚠️  No translations found for namespace: ${namespace}`);
      continue;
    }

    namespaceKeys[namespace] = [...keys].sort();
  }

  return namespaceKeys;
}

/**
 * Extract keys with their interpolation variables for each namespace
 */
function extractNamespaceKeysWithInfo(
  extractedData: ExtractedTranslations,
): Record<string, KeyInfo[]> {
  const result: Record<string, KeyInfo[]> = {};

  for (const [namespace, languages] of Object.entries(extractedData)) {
    const variablesByKey = new Map<string, Set<string>>();

    for (const translationMap of Object.values(languages)) {
      for (const [key, value] of Object.entries(translationMap)) {
        const variables = variablesByKey.get(key) || new Set<string>();
        if (typeof value === "string") {
          extractInterpolationVariables(value).forEach((variable) =>
            variables.add(variable),
          );
        }
        variablesByKey.set(key, variables);
      }
    }

    result[namespace] = [...variablesByKey.entries()]
      .sort()
      .map(([key, variables]) => ({
        key,
        variables: [...variables].sort(),
      }));
  }

  return result;
}

/**
 * Generate the actual TypeScript type definition content
 */
function generateTypeContent(
  extractedData: ExtractedTranslations,
  namespaceKeys: Record<string, string[]>,
  namespaceKeysWithInfo: Record<string, KeyInfo[]>,
  config: TypeGeneratorConfig,
): string {
  const includeJsDocs = config.includeJsDocs ?? true;

  // Header
  let content = `/* eslint-disable */
/**
 * Auto-generated TypeScript type definitions for i18nexus
 * 
 * DO NOT EDIT THIS FILE MANUALLY!
 * Run 'npx i18n-type' to regenerate.
 * 
 * @generated by i18nexus-tools
 */

`;

  // Global namespace and keys types
  content += `// ============================================\n`;
  content += `// Global Translation Types\n`;
  content += `// ============================================\n\n`;

  // TranslationNamespace type (global)
  const sortedNamespaces = Object.keys(namespaceKeys).sort();
  const namespaceUnion = sortedNamespaces.map((ns) => `"${ns}"`).join(" | ");
  const fallbackNs = config.fallbackNamespace;
  const hasFallback = fallbackNs && sortedNamespaces.includes(fallbackNs);

  if (includeJsDocs) {
    content += `/**\n`;
    content += ` * All available translation namespaces\n`;
    content += ` * \n`;
    content += ` * @example "home" | "about" | "common"\n`;
    content += ` */\n`;
  }
  content += `declare type TranslationNamespace = ${namespaceUnion};\n\n`;

  // TranslationKeys for each namespace (global)
  for (const namespace of sortedNamespaces) {
    const keys = namespaceKeys[namespace];
    const keyInfoList = namespaceKeysWithInfo[namespace] || [];
    const typeName = `${capitalize(toCamelCase(namespace))}Keys`;

    if (keys.length === 0) {
      content += `declare type ${typeName} = string;\n`;
      continue;
    }

    const keyUnion = keys.map((key) => `"${escapeString(key)}"`).join(" | ");

    if (includeJsDocs && keys.length <= 10) {
      content += `/** Translation keys for "${namespace}" namespace */\n`;
    }
    content += `declare type ${typeName} = ${keyUnion};\n\n`;

    // Generate interpolation variable types for keys with variables
    const keysWithVars = keyInfoList.filter(
      (info) => info.variables.length > 0,
    );
    if (keysWithVars.length > 0) {
      const varsTypeName = `${capitalize(toCamelCase(namespace))}KeyVariables`;
      content += `/** Interpolation variables for "${namespace}" namespace keys */\n`;
      content += `declare type ${varsTypeName} = {\n`;
      for (const info of keysWithVars) {
        const escapedKey = escapeString(info.key);
        const varsUnion = info.variables.map((v) => `"${v}"`).join(" | ");
        content += `  "${escapedKey}": ${varsUnion};\n`;
      }
      content += `};\n\n`;
    }
  }

  // TranslationKeys mapping type (global)
  if (includeJsDocs) {
    content += `/**\n`;
    content += ` * Maps namespace names to their translation keys\n`;
    content += ` */\n`;
  }
  content += `declare type TranslationKeys = {\n`;
  for (const namespace of sortedNamespaces) {
    const typeName = `${capitalize(toCamelCase(namespace))}Keys`;
    content += `  "${namespace}": ${typeName};\n`;
  }
  content += `};\n\n`;

  content += generateTranslationsShapeType(
    extractedData,
    namespaceKeys,
    hasFallback ? fallbackNs : undefined,
  );

  // Module augmentation
  const importSource = config.translationImportSource || "i18nexus";
  const isI18nexus = importSource === "i18nexus";

  content += `// ============================================\n`;
  content += `// Module Augmentation\n`;
  content += `// ============================================\n\n`;

  // Import original types from the package (i18nexus only)
  if (isI18nexus) {
    content += `import type {\n`;
    content += `  UseTranslationReturn,\n`;
    content += `} from '${importSource}';\n`;
    content += `import type {\n`;
    content += `  GetTranslationReturn,\n`;
    content += `  GetTranslationOptions,\n`;
    content += `} from '${importSource}/server';\n\n`;
  }

  content += `declare module "${importSource}" {\n`;

  // useTranslation: Use original type with narrowed generics
  if (includeJsDocs) {
    content += `  /**\n`;
    content += `   * Type-safe translation hook (Client Component)\n`;
    content += `   * \n`;
    content += `   * @template NS - The namespace to use\n`;
    content += `   * @param namespace - The namespace string\n`;
    content += `   * @returns Translation utilities with type-safe keys\n`;
    if (hasFallback) {
      content += `   * \n`;
      content += `   * Note: Keys from the fallback namespace "${fallbackNs}" are automatically included.\n`;
    }
    content += `   * \n`;
    content += `   * @example\n`;
    content += `   * \`\`\`tsx\n`;
    content += `   * const { t } = useTranslation<"home">("home");\n`;
    content += `   * t("title");  // ✅ OK (from home namespace)\n`;
    if (hasFallback) {
      content += `   * t("${fallbackNs}-key");  // ✅ OK (from fallback namespace)\n`;
    }
    content += `   * t("typo");   // ❌ Compile error!\n`;
    content += `   * \`\`\`\n`;
    content += `   */\n`;
  }

  if (isI18nexus) {
    // Use original type from the package
    // If fallbackNamespace is configured, include its keys in all namespaces
    if (hasFallback) {
      const fallbackTypeName = `${capitalize(toCamelCase(fallbackNs!))}Keys`;
      content += `  export function useTranslation<NS extends TranslationNamespace = TranslationNamespace>(\n`;
      content += `    namespace: NS\n`;
      content += `  ): UseTranslationReturn<TranslationKeys[NS] | ${fallbackTypeName}>;\n\n`;
    } else {
      content += `  export function useTranslation<NS extends TranslationNamespace = TranslationNamespace>(\n`;
      content += `    namespace: NS\n`;
      content += `  ): UseTranslationReturn<TranslationKeys[NS]>;\n\n`;
    }
  } else {
    // For non-i18nexus packages, generate full type definition
    content += `  // Helper type to extract variable names from keys\n`;
    content += `  type ExtractVariables<K> = \n`;

    const varsTypeNames = sortedNamespaces
      .map((ns) => `${capitalize(toCamelCase(ns))}KeyVariables`)
      .filter((name) => {
        const ns = sortedNamespaces.find(
          (n) => `${capitalize(toCamelCase(n))}KeyVariables` === name,
        );
        const keyInfoList = namespaceKeysWithInfo[ns!] || [];
        return keyInfoList.some((info) => info.variables.length > 0);
      });

    if (varsTypeNames.length > 0) {
      content += `    K extends keyof (${varsTypeNames.join(" & ")}) ? \n`;
      content += `      (${varsTypeNames.join(" & ")})[K] : \n`;
      content += `      never;\n\n`;
    } else {
      content += `    never;\n\n`;
    }

    content += `  export function useTranslation<NS extends TranslationNamespace = TranslationNamespace>(\n`;
    content += `    namespace: NS\n`;
    content += `  ): {\n`;
    content += `    t: {\n`;
    content += `      <K extends TranslationKeys[NS]>(\n`;
    content += `        key: K\n`;
    content += `      ): string;\n`;
    content += `      <K extends TranslationKeys[NS]>(\n`;
    content += `        key: K,\n`;
    content += `        variables: Record<string, string | number>\n`;
    content += `      ): string;\n`;
    content += `      <K extends TranslationKeys[NS]>(\n`;
    content += `        key: K,\n`;
    content += `        variables: Record<string, string | number>,\n`;
    content += `        styles: Record<string, React.CSSProperties>\n`;
    content += `      ): React.ReactElement;\n`;
    content += `    };\n`;
    content += `    currentLanguage: string;\n`;
    content += `    lng: string;  // Alias for currentLanguage (react-i18next compatibility)\n`;
    content += `    isReady: boolean;\n`;
    content += `  };\n\n`;
  }

  // Export individual namespace key types for use in constants
  content += `  // Individual namespace key types (for use in constants and type definitions)\n`;
  for (const namespace of Object.keys(namespaceKeys)) {
    const typeName = capitalize(toCamelCase(namespace));
    content += `  export type ${typeName}Keys = TranslationKeys["${namespace}"];\n`;
  }

  content += `}\n\n`;

  // Server module augmentation
  content += `declare module "${importSource}/server" {\n`;

  if (includeJsDocs) {
    content += `  /**\n`;
    content += `   * Type-safe translation function (Server Component)\n`;
    content += `   * \n`;
    content += `   * @template NS - The namespace to use\n`;
    content += `   * @param namespace - The namespace string (optional, auto-inferred)\n`;
    content += `   * @param options - Optional configuration\n`;
    content += `   * @returns Translation utilities with type-safe keys\n`;
    content += `   * \n`;
    content += `   * @example\n`;
    content += `   * \`\`\`tsx\n`;
    content += `   * const { t } = await getTranslation<"home">("home");\n`;
    content += `   * t("title");  // ✅ OK\n`;
    content += `   * t("typo");   // ❌ Compile error!\n`;
    content += `   * \`\`\`\n`;
    content += `   */\n`;
  }

  if (isI18nexus) {
    // Use original type from the package
    // If fallbackNamespace is configured, include its keys in all namespaces
    if (hasFallback) {
      const fallbackTypeName = `${capitalize(toCamelCase(fallbackNs!))}Keys`;
      content += `  export function getTranslation<NS extends TranslationNamespace = TranslationNamespace>(\n`;
      content += `    namespace?: NS,\n`;
      content += `    options?: GetTranslationOptions\n`;
      content += `  ): Promise<GetTranslationReturn<NS, TranslationKeys[NS] | ${fallbackTypeName}>>;\n`;
    } else {
      content += `  export function getTranslation<NS extends TranslationNamespace = TranslationNamespace>(\n`;
      content += `    namespace?: NS,\n`;
      content += `    options?: GetTranslationOptions\n`;
      content += `  ): Promise<GetTranslationReturn<NS>>;\n`;
    }
  } else {
    // For non-i18nexus packages, generate full type definition
    content += `  export function getTranslation<NS extends TranslationNamespace>(\n`;
    content += `    namespace: NS,\n`;
    content += `    options?: {\n`;
    content += `      localesDir?: string;\n`;
    content += `      cookieName?: string;\n`;
    content += `      defaultLanguage?: string;\n`;
    content += `      availableLanguages?: string[];\n`;
    content += `    }\n`;
    content += `  ): Promise<{\n`;
    content += `    t: (key: TranslationKeys[NS]) => string;\n`;
    content += `    language: string;\n`;
    content += `    lng: string;  // Alias for language (react-i18next compatibility)\n`;
    content += `    translations: Record<string, Record<string, string>>;\n`;
    content += `    dict: Record<string, string>;\n`;
    content += `  }>;\n`;
  }

  content += `}\n`;

  return content;
}

function generateTranslationsShapeType(
  extractedData: ExtractedTranslations,
  namespaceKeys: Record<string, string[]>,
  fallbackNamespace?: string,
): string {
  const sortedNamespaces = Object.keys(namespaceKeys).sort();
  const keyTypeExpression = fallbackNamespace
    ? `TranslationKeys[NS] | ${capitalize(toCamelCase(fallbackNamespace))}Keys`
    : `TranslationKeys[NS]`;
  const lines: string[] = [
    `/**`,
    ` * Translation shape for createI18n().`,
    ` *`,
    ` * Generated locale entrypoints can use this type without importing JSON at runtime:`,
    ` * createI18n({} as I18nexusGeneratedTranslations, { fallbackNamespace: "common" })`,
    ` */`,
    `export type I18nexusGeneratedTranslations = {`,
  ];

  for (const namespace of sortedNamespaces) {
    const languageMaps = extractedData[namespace] || {};
    const sortedLanguages = Object.keys(languageMaps).sort();
    lines.push(`  readonly "${escapeString(namespace)}": {`);

    for (const language of sortedLanguages) {
      const keys = Object.keys(languageMaps[language] || {}).sort();
      lines.push(`    readonly "${escapeString(language)}": {`);

      for (const key of keys) {
        lines.push(`      readonly "${escapeString(key)}": string;`);
      }

      lines.push(`    };`);
    }

    lines.push(`  };`);
  }

  lines.push(`};`, ``);
  lines.push(
    `export type I18nexusGeneratedNamespace = keyof I18nexusGeneratedTranslations & string;`,
    ``,
    `export type I18nexusGeneratedTranslationKeys<`,
    `  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace`,
    `> = ${keyTypeExpression};`,
    ``,
    `export type I18nexusGeneratedServerTranslationFunction<`,
    `  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace`,
    `> = (`,
    `  key: I18nexusGeneratedTranslationKeys<NS>,`,
    `  variables?: Record<string, string | number>,`,
    `  fallback?: string`,
    `) => string;`,
    ``,
    `export type I18nexusGeneratedClientTranslationFunction<`,
    `  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace`,
    `> = (`,
    `  key: I18nexusGeneratedTranslationKeys<NS>,`,
    `  variables?: Record<string, string | number>`,
    `) => string;`,
    ``,
    `export type I18nexusGeneratedTranslationFunction<`,
    `  NS extends I18nexusGeneratedNamespace = I18nexusGeneratedNamespace`,
    `> = I18nexusGeneratedServerTranslationFunction<NS>;`,
    ``,
  );

  return lines.join("\n");
}

/**
 * Escape special characters in strings for TypeScript
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/**
 * Convert kebab-case or snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (char) => char.toLowerCase());
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Read extracted translations from locale files
 *
 * This is used when type generation is triggered separately
 */
export function readExtractedTranslations(
  localesDir: string,
  options: { fallbackNamespace?: string } = {},
): ExtractedTranslations {
  const translations: ExtractedTranslations = {};
  const fallbackNamespace = options.fallbackNamespace || "common";

  if (!fs.existsSync(localesDir)) {
    console.warn(`⚠️  Locales directory not found: ${localesDir}`);
    return translations;
  }

  const entries = fs.readdirSync(localesDir, { withFileTypes: true });

  // Legacy mode support: locales/{lang}.json -> fallback namespace
  const rootLanguageFiles = entries.filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      /^[A-Za-z0-9-]+\.json$/.test(entry.name),
  );

  if (rootLanguageFiles.length > 0) {
    translations[fallbackNamespace] = translations[fallbackNamespace] || {};

    for (const file of rootLanguageFiles) {
      const language = file.name.replace(".json", "");
      const filePath = path.join(localesDir, file.name);

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        translations[fallbackNamespace][language] = JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️  Failed to read ${filePath}:`, error);
      }
    }
  }

  // Namespaced mode: locales/{namespace}/{lang}.json
  const namespaces = entries
    .filter((entry) => entry.isDirectory() && entry.name !== "types")
    .map((entry) => entry.name);

  for (const namespace of namespaces) {
    const namespacePath = path.join(localesDir, namespace);
    translations[namespace] = translations[namespace] || {};

    // Read all language files in this namespace
    const files = fs
      .readdirSync(namespacePath)
      .filter((file) => file.endsWith(".json"));

    for (const file of files) {
      const language = file.replace(".json", "");
      const filePath = path.join(namespacePath, file);

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        translations[namespace][language] = JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️  Failed to read ${filePath}:`, error);
      }
    }
  }

  // Remove empty namespaces
  for (const namespace of Object.keys(translations)) {
    if (Object.keys(translations[namespace]).length === 0) {
      delete translations[namespace];
    }
  }

  return translations;
}
