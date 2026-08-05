import type { I18nexusConfig } from "../../config-loader";
import type { ScriptConfig } from "../../common/default-config";

export function createWrapperConfig(
  projectConfig: I18nexusConfig,
  parserType?: ScriptConfig["parserType"]
): Partial<ScriptConfig> {
  return {
    sourcePattern: projectConfig.sourcePattern,
    translationImportSource: projectConfig.translationImportSource,
    sourceLanguage: projectConfig.sourceLanguage,
    mode: projectConfig.mode,
    framework: projectConfig.framework,
    serverTranslationFunction: projectConfig.serverTranslationFunction,
    keyFirst: projectConfig.keyFirst,
    parserType,
  };
}

export function applyWrapperCliOptions(
  args: string[],
  config: Partial<ScriptConfig>
): { showHelp: boolean } {
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    switch (option) {
      case "--pattern":
      case "-p":
        config.sourcePattern = requireValue(args, ++index, option);
        break;
      case "--source-language":
        config.sourceLanguage = requireValue(args, ++index, option);
        break;
      case "--key-first":
        config.keyFirst = { ...config.keyFirst, enabled: true };
        break;
      case "--no-key-first":
        config.keyFirst = { ...config.keyFirst, enabled: false };
        break;
      case "--key-first-pattern":
        config.keyFirst = {
          ...config.keyFirst,
          enabled: true,
          pattern: requireValue(args, ++index, option),
        };
        break;
      case "--help":
      case "-h":
        return { showHelp: true };
      default:
        throw new Error(`Unknown option: ${option}`);
    }
  }

  return { showHelp: false };
}

export const WRAPPER_CLI_OPTIONS_HELP = `  -p, --pattern <pattern>              Source file pattern
  --source-language <lang>             Source language: ko|en|auto
  --key-first                          Wrap matching JSX keys (config/default pattern)
  --key-first-pattern <regex>          Enable key-first with a custom exact-match regex
  --no-key-first                       Disable key-first for this run
  -h, --help                           Show this help message`;

function requireValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for option: ${option}`);
  }
  return value;
}
