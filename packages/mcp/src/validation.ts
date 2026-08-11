import * as fs from "fs";
import * as path from "path";
import { analyzeProject } from "./project-analysis";
import type {
  I18nexusConfig,
  ValidationCheck,
  ValidationResult,
} from "./types";

function addCheck(
  checks: ValidationCheck[],
  name: string,
  condition: boolean,
  passDetail: string,
  failDetail: string,
  failureStatus: "warning" | "fail" = "fail"
): void {
  checks.push({
    name,
    status: condition ? "pass" : failureStatus,
    detail: condition ? passDetail : failDetail,
  });
}

export function validateProjectSetup(projectPath: string): ValidationResult {
  const analysis = analyzeProject(projectPath);
  const checks: ValidationCheck[] = [];
  const recommendations: string[] = [];

  addCheck(
    checks,
    "config",
    analysis.existingConfig.exists && analysis.existingConfig.valid,
    "i18nexus.config.json exists and contains a JSON object.",
    analysis.existingConfig.exists
      ? `i18nexus.config.json is invalid: ${analysis.existingConfig.error}`
      : "i18nexus.config.json does not exist."
  );

  const config = analysis.existingConfig.value as
    | Partial<I18nexusConfig>
    | undefined;
  const languages = config?.languages;
  const defaultLanguage = config?.defaultLanguage;
  const sourceLanguage = config?.sourceLanguage;
  const languageConfigValid =
    Array.isArray(languages) &&
    languages.length > 0 &&
    languages.every((language) => typeof language === "string") &&
    typeof defaultLanguage === "string" &&
    languages.includes(defaultLanguage) &&
    typeof sourceLanguage === "string" &&
    languages.includes(sourceLanguage);
  addCheck(
    checks,
    "languages",
    languageConfigValid,
    `defaultLanguage ${defaultLanguage} and sourceLanguage ${sourceLanguage} are included in languages.`,
    "languages must be a non-empty string array containing defaultLanguage and sourceLanguage."
  );

  addCheck(
    checks,
    "sourcePattern",
    typeof config?.sourcePattern === "string" &&
      config.sourcePattern.length > 0,
    `Source files use ${config?.sourcePattern}.`,
    "sourcePattern is missing or empty."
  );

  const localeFiles: string[] = [];
  let localePathEscapesProject = false;
  if (
    languageConfigValid &&
    typeof config?.localesDir === "string" &&
    typeof config?.fallbackNamespace === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(config.fallbackNamespace)
  ) {
    for (const language of languages) {
      const localeFile = config.useNamespaceStructure
        ? path.resolve(
            analysis.projectPath,
            config.localesDir,
            config.fallbackNamespace,
            `${language}.json`
          )
        : path.resolve(
            analysis.projectPath,
            config.localesDir,
            `${language}.json`
          );
      const relativePath = path.relative(analysis.projectPath, localeFile);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        localePathEscapesProject = true;
      } else {
        localeFiles.push(localeFile);
      }
    }
  }
  const missingLocaleFiles = localeFiles.filter((file) => !fs.existsSync(file));
  addCheck(
    checks,
    "initialLocales",
    !localePathEscapesProject &&
      localeFiles.length > 0 &&
      missingLocaleFiles.length === 0,
    `${localeFiles.length} initial locale files exist.`,
    localePathEscapesProject
      ? "localesDir resolves outside the project directory."
      : missingLocaleFiles.length > 0
        ? `Missing locale files: ${missingLocaleFiles.join(", ")}`
        : "Locale paths could not be derived from the config."
  );

  addCheck(
    checks,
    "i18nexusDeclared",
    analysis.dependencies.i18nexus.declared,
    `i18nexus is declared as ${analysis.dependencies.i18nexus.declaredVersion}.`,
    "i18nexus is not declared in package.json."
  );
  addCheck(
    checks,
    "i18nexusToolsDeclared",
    analysis.dependencies.i18nexusTools.declared,
    `i18nexus-tools is declared as ${analysis.dependencies.i18nexusTools.declaredVersion}.`,
    "i18nexus-tools is not declared in package.json."
  );
  addCheck(
    checks,
    "dependenciesInstalled",
    analysis.dependencies.i18nexus.installed &&
      analysis.dependencies.i18nexusTools.installed,
    "Both declared packages are installed in node_modules.",
    "Manifest declarations and node_modules installation differ. Run the detected package manager install command.",
    "warning"
  );

  if (!analysis.dependencies.i18nexus.declared) {
    recommendations.push("Install i18nexus as a runtime dependency.");
  }
  if (!analysis.dependencies.i18nexusTools.declared) {
    recommendations.push("Install i18nexus-tools as a development dependency.");
  }
  if (
    !analysis.dependencies.i18nexus.installed ||
    !analysis.dependencies.i18nexusTools.installed
  ) {
    recommendations.push(
      `Run ${analysis.packageManager.name} install so declared dependencies exist in node_modules.`
    );
  }
  if (checks.some((check) => check.status === "fail")) {
    recommendations.push(
      "Run setup_i18nexus with dryRun false after reviewing the proposed changes."
    );
  }

  return {
    projectPath: analysis.projectPath,
    valid: !checks.some((check) => check.status === "fail"),
    checks,
    dependencies: analysis.dependencies,
    recommendations,
  };
}
