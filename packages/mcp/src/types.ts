export type PackageManager = "npm" | "pnpm" | "yarn";

export type ProjectFramework =
  | "nextjs-app"
  | "nextjs-pages"
  | "nextjs"
  | "react-spa"
  | "other";

export interface DependencyStatus {
  declared: boolean;
  declaredVersion?: string;
  installed: boolean;
  installedVersion?: string;
}

export interface DetectedPackageManager {
  name: PackageManager;
  evidence: string[];
  ambiguous: boolean;
}

export interface I18nexusConfig {
  languages: string[];
  defaultLanguage: string;
  sourceLanguage: string;
  localesDir: string;
  sourcePattern: string;
  translationImportSource: string;
  framework: "nextjs" | "react" | "other";
  fallbackNamespace: string;
  namespaceLocation?: string;
  useNamespaceStructure: boolean;
  namespaceStrategy: "full" | "page-based" | "single";
  generateTypes: boolean;
  strictTypeGeneration: boolean;
  lazy: boolean;
  [key: string]: unknown;
}

export interface ExistingConfigStatus {
  path: string;
  exists: boolean;
  valid: boolean;
  value?: Record<string, unknown>;
  error?: string;
}

export interface ProjectAnalysis {
  projectPath: string;
  packageJsonPath: string;
  packageJsonExists: boolean;
  packageJsonValid: boolean;
  framework: {
    kind: ProjectFramework;
    evidence: string[];
  };
  packageManager: DetectedPackageManager;
  sourceDirectories: string[];
  routeDirectory?: string;
  existingConfig: ExistingConfigStatus;
  dependencies: {
    i18nexus: DependencyStatus;
    i18nexusTools: DependencyStatus;
  };
  suggestedConfig: I18nexusConfig;
  warnings: string[];
}

export interface SetupOptions {
  projectPath: string;
  languages?: string[];
  defaultLanguage?: string;
  sourceLanguage?: string;
  packageManager?: PackageManager;
  dryRun?: boolean;
  overwriteExistingConfig?: boolean;
  installDependencies?: boolean;
  updatePackageScripts?: boolean;
  createLocaleFiles?: boolean;
}

export interface PlannedFileChange {
  path: string;
  action: "create" | "update" | "unchanged";
}

export interface SetupResult {
  projectPath: string;
  dryRun: boolean;
  analysis: ProjectAnalysis;
  config: I18nexusConfig;
  files: PlannedFileChange[];
  dependencyInstall: {
    requested: boolean;
    packageManager: PackageManager;
    commands: string[];
    completed: boolean;
  };
  nextCommands: string[];
  warnings: string[];
}

export interface ValidationCheck {
  name: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface ValidationResult {
  projectPath: string;
  valid: boolean;
  checks: ValidationCheck[];
  dependencies: {
    i18nexus: DependencyStatus;
    i18nexusTools: DependencyStatus;
  };
  recommendations: string[];
}

export type I18nexusToolAction =
  | "doctor"
  | "wrapper"
  | "extractor"
  | "type"
  | "clean-legacy"
  | "upload"
  | "download";

export interface RunI18nexusToolOptions {
  projectPath: string;
  tool: I18nexusToolAction;
  applyChanges?: boolean;
  pattern?: string;
  languages?: string[];
  sourceLanguage?: string;
  outputDir?: string;
  outputFormat?: "json" | "csv";
  outputFile?: string;
  localesDir?: string;
  translationImportSource?: string;
  typesOutputPath?: string;
  staticKeyExtraction?: "off" | "safe" | "aggressive";
  force?: boolean;
  flat?: boolean;
  generateTypes?: boolean;
  strictTypes?: boolean;
  keyFirst?: boolean;
  keyFirstPattern?: string;
  backup?: boolean;
  spreadsheetId?: string;
  credentialsPath?: string;
  autoTranslate?: boolean;
  timeoutMs?: number;
}

export interface I18nexusToolRunResult {
  projectPath: string;
  tool: I18nexusToolAction;
  mode: "inspect" | "preview" | "apply";
  command: {
    name: string;
    packageVersion: string;
    args: string[];
  };
  safety: {
    executesProjectCode: true;
    sandboxed: false;
    mutatesLocalFiles: boolean;
    usesNetwork: boolean;
    nativeDryRun: boolean;
    note: string;
  };
  execution: {
    status: "planned" | "completed" | "failed" | "timed-out";
    ok: boolean;
    exitCode?: number;
    signal?: NodeJS.Signals;
    stdout: string;
    stderr: string;
    stdoutTruncated: boolean;
    stderrTruncated: boolean;
  };
}
