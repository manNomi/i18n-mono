import * as fs from "fs";
import * as path from "path";

export interface I18nexusRuntimeConfig {
  fallbackNamespace?: string;
  enableFallback?: boolean;
  languages?: string[];
  defaultLanguage?: string;
}

export function loadI18nexusConfig(
  configPath: string = "i18nexus.config.json",
  options?: { silent?: boolean },
): I18nexusRuntimeConfig | null {
  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absolutePath)) {
    if (!options?.silent) {
      console.warn(`Config file not found: ${absolutePath}`);
    }
    return null;
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf-8");
    const parsed = JSON.parse(raw) as I18nexusRuntimeConfig;

    if (parsed.enableFallback === undefined) {
      parsed.enableFallback = true;
    }

    return parsed;
  } catch (error) {
    if (!options?.silent) {
      console.warn(`Failed to load config from ${absolutePath}:`, error);
    }
    return null;
  }
}

export function loadI18nexusConfigSilently(
  configPath: string = "i18nexus.config.json",
): I18nexusRuntimeConfig | null {
  return loadI18nexusConfig(configPath, { silent: true });
}
