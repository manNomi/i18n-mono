import * as fs from "fs";
import * as path from "path";
import type {
  DependencyStatus,
  DetectedPackageManager,
  ExistingConfigStatus,
  I18nexusConfig,
  PackageManager,
  ProjectAnalysis,
  ProjectFramework,
} from "./types";

type PackageJson = Record<string, unknown> & {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const SOURCE_EXTENSIONS = "{js,jsx,ts,tsx}";

function exists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

function readJsonObject(filePath: string): Record<string, unknown> {
  const value: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("JSON root must be an object");
  }
  return value as Record<string, unknown>;
}

export function resolveProjectPath(projectPath: string): string {
  const absolutePath = path.resolve(projectPath);
  if (!isDirectory(absolutePath)) {
    throw new Error(`Project directory does not exist: ${absolutePath}`);
  }
  return fs.realpathSync(absolutePath);
}

function readPackageJson(projectPath: string): {
  path: string;
  exists: boolean;
  valid: boolean;
  value: PackageJson;
  error?: string;
} {
  const packageJsonPath = path.join(projectPath, "package.json");
  if (!exists(packageJsonPath)) {
    return {
      path: packageJsonPath,
      exists: false,
      valid: false,
      value: {},
    };
  }

  try {
    return {
      path: packageJsonPath,
      exists: true,
      valid: true,
      value: readJsonObject(packageJsonPath) as PackageJson,
    };
  } catch (error) {
    return {
      path: packageJsonPath,
      exists: true,
      valid: false,
      value: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function allDeclaredDependencies(
  packageJson: PackageJson
): Record<string, string> {
  return {
    ...packageJson.peerDependencies,
    ...packageJson.optionalDependencies,
    ...packageJson.devDependencies,
    ...packageJson.dependencies,
  };
}

function dependencyStatus(
  projectPath: string,
  packageJson: PackageJson,
  packageName: string
): DependencyStatus {
  const declaredVersion = allDeclaredDependencies(packageJson)[packageName];
  const installedPackageJson = path.join(
    projectPath,
    "node_modules",
    ...packageName.split("/"),
    "package.json"
  );

  let installedVersion: string | undefined;
  if (exists(installedPackageJson)) {
    try {
      const installed = readJsonObject(installedPackageJson);
      if (typeof installed.version === "string") {
        installedVersion = installed.version;
      }
    } catch {
      installedVersion = undefined;
    }
  }

  return {
    declared: Boolean(declaredVersion),
    declaredVersion,
    installed: exists(installedPackageJson),
    installedVersion,
  };
}

function detectPackageManager(projectPath: string): DetectedPackageManager {
  const candidates: Array<{
    name: PackageManager;
    files: string[];
  }> = [
    { name: "pnpm", files: ["pnpm-lock.yaml"] },
    { name: "yarn", files: ["yarn.lock"] },
    { name: "npm", files: ["package-lock.json", "npm-shrinkwrap.json"] },
  ];
  const matches = candidates.filter((candidate) =>
    candidate.files.some((file) => exists(path.join(projectPath, file)))
  );
  const selected = matches[0] ?? candidates[2];
  const evidence = candidates.flatMap((candidate) =>
    candidate.files.filter((file) => exists(path.join(projectPath, file)))
  );

  if (evidence.length === 0) {
    evidence.push("No lockfile found. npm is the fallback.");
  }

  return {
    name: selected.name,
    evidence,
    ambiguous: matches.length > 1,
  };
}

function detectRouteDirectories(projectPath: string): string[] {
  return ["src/app", "app", "src/pages", "pages"].filter((directory) =>
    isDirectory(path.join(projectPath, directory))
  );
}

function detectFramework(
  projectPath: string,
  packageJson: PackageJson
): {
  kind: ProjectFramework;
  routeDirectory?: string;
  evidence: string[];
} {
  const dependencies = allDeclaredDependencies(packageJson);
  const routeDirectories = detectRouteDirectories(projectPath);
  const appDirectory = routeDirectories.find((directory) =>
    directory.endsWith("app")
  );
  const pagesDirectory = routeDirectories.find((directory) =>
    directory.endsWith("pages")
  );
  const nextConfig = [
    "next.config.js",
    "next.config.mjs",
    "next.config.cjs",
    "next.config.ts",
  ].find((file) => exists(path.join(projectPath, file)));
  const hasNext = Boolean(dependencies.next || nextConfig);
  const evidence: string[] = [];

  if (dependencies.next) evidence.push(`next dependency ${dependencies.next}`);
  if (nextConfig) evidence.push(nextConfig);
  evidence.push(...routeDirectories.map((directory) => `${directory}/`));

  if (hasNext && appDirectory) {
    return {
      kind: "nextjs-app",
      routeDirectory: appDirectory,
      evidence,
    };
  }
  if (hasNext && pagesDirectory) {
    return {
      kind: "nextjs-pages",
      routeDirectory: pagesDirectory,
      evidence,
    };
  }
  if (hasNext) {
    return { kind: "nextjs", evidence };
  }

  if (dependencies.react) {
    evidence.unshift(`react dependency ${dependencies.react}`);
    return {
      kind: "react-spa",
      routeDirectory: pagesDirectory,
      evidence,
    };
  }

  if (evidence.length === 0) {
    evidence.push("No Next.js or React evidence found.");
  }
  return { kind: "other", evidence };
}

function detectSourceDirectories(projectPath: string): string[] {
  if (isDirectory(path.join(projectPath, "src"))) {
    return ["src"];
  }

  return ["app", "pages", "components"].filter((directory) =>
    isDirectory(path.join(projectPath, directory))
  );
}

function sourcePattern(sourceDirectories: string[]): string {
  if (sourceDirectories.length === 1) {
    return `${sourceDirectories[0]}/**/*.${SOURCE_EXTENSIONS}`;
  }
  if (sourceDirectories.length > 1) {
    return `{${sourceDirectories.join(",")}}/**/*.${SOURCE_EXTENSIONS}`;
  }
  return `{src,app,pages}/**/*.${SOURCE_EXTENSIONS}`;
}

function frameworkConfigValue(
  framework: ProjectFramework
): I18nexusConfig["framework"] {
  if (framework.startsWith("nextjs")) return "nextjs";
  if (framework === "react-spa") return "react";
  return "other";
}

function suggestedConfig(
  framework: ProjectFramework,
  routeDirectory: string | undefined,
  sourceDirectories: string[]
): I18nexusConfig {
  const hasRouteNamespace = Boolean(routeDirectory);
  return {
    languages: ["ko", "en"],
    defaultLanguage: "ko",
    sourceLanguage: "ko",
    localesDir: "./locales",
    sourcePattern: sourcePattern(sourceDirectories),
    translationImportSource: "i18nexus",
    framework: frameworkConfigValue(framework),
    fallbackNamespace: "common",
    ...(routeDirectory ? { namespaceLocation: routeDirectory } : {}),
    useNamespaceStructure: hasRouteNamespace,
    namespaceStrategy: hasRouteNamespace ? "page-based" : "single",
    generateTypes: true,
    strictTypeGeneration: false,
    lazy: true,
  };
}

function existingConfig(projectPath: string): ExistingConfigStatus {
  const configPath = path.join(projectPath, "i18nexus.config.json");
  if (!exists(configPath)) {
    return {
      path: configPath,
      exists: false,
      valid: false,
    };
  }

  try {
    return {
      path: configPath,
      exists: true,
      valid: true,
      value: readJsonObject(configPath),
    };
  } catch (error) {
    return {
      path: configPath,
      exists: true,
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function analyzeProject(inputPath: string): ProjectAnalysis {
  const projectPath = resolveProjectPath(inputPath);
  const packageJson = readPackageJson(projectPath);
  const packageManager = detectPackageManager(projectPath);
  const framework = detectFramework(projectPath, packageJson.value);
  const sourceDirectories = detectSourceDirectories(projectPath);
  const config = existingConfig(projectPath);
  const warnings: string[] = [];

  if (!packageJson.exists) {
    warnings.push(
      "package.json was not found. Dependency and script setup cannot run."
    );
  } else if (!packageJson.valid) {
    warnings.push(`package.json is invalid: ${packageJson.error}`);
  }
  if (packageManager.ambiguous) {
    warnings.push(
      "Multiple lockfiles were found. Pass packageManager explicitly before installing dependencies."
    );
  }
  if (config.exists && !config.valid) {
    warnings.push(`i18nexus.config.json is invalid: ${config.error}`);
  }
  if (
    framework.kind === "nextjs-app" &&
    framework.evidence.some((item) => item.endsWith("pages/"))
  ) {
    warnings.push(
      "Both App Router and Pages Router directories exist. App Router is used for namespace detection."
    );
  }
  if (sourceDirectories.length === 0) {
    warnings.push(
      "No conventional source directory was found. Review sourcePattern before applying setup."
    );
  }

  return {
    projectPath,
    packageJsonPath: packageJson.path,
    packageJsonExists: packageJson.exists,
    packageJsonValid: packageJson.valid,
    framework: {
      kind: framework.kind,
      evidence: framework.evidence,
    },
    packageManager,
    sourceDirectories,
    routeDirectory: framework.routeDirectory,
    existingConfig: config,
    dependencies: {
      i18nexus: dependencyStatus(projectPath, packageJson.value, "i18nexus"),
      i18nexusTools: dependencyStatus(
        projectPath,
        packageJson.value,
        "i18nexus-tools"
      ),
    },
    suggestedConfig: suggestedConfig(
      framework.kind,
      framework.routeDirectory,
      sourceDirectories
    ),
    warnings,
  };
}
