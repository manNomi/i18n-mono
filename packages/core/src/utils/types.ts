/** i18nexus 타입 유틸리티 */

/** Serializable configuration shared by runtime setup and CLI generation. */
export interface I18nexusConfig<
  TLanguages extends readonly string[] = readonly string[],
> {
  languages: TLanguages;
  defaultLanguage: TLanguages[number];
  sourceLanguage?: TLanguages[number];
  localesDir?: string;
  sourcePattern?: string;
  translationImportSource?: string;
  fallbackNamespace?: string;
  namespaceLocation?: string;
  useNamespaceStructure?: boolean;
  namespaceStrategy?: "full" | "page-based" | "single";
  mode?: "client" | "server";
  framework?: "nextjs" | "react" | "other";
  serverTranslationFunction?: string;
  strictTypeGeneration?: boolean;
  generateTypes?: boolean;
  typesOutputPath?: string;
  staticKeyExtraction?: "off" | "safe" | "aggressive";
  staticKeyContainerPatterns?: string[];
  namespacing?: {
    enabled: boolean;
    basePath: string;
    defaultNamespace: string;
    framework?:
      | "nextjs-app"
      | "nextjs-pages"
      | "tanstack-file"
      | "tanstack-folder"
      | "react-router"
      | "remix"
      | "other";
    ignorePatterns?: string[];
    strategy?: "first-folder" | "full-path" | "last-folder";
  };
  googleSheets?: {
    spreadsheetId: string;
    credentialsPath: string;
    sheetName: string;
  };
}

/** 설정에서 언어 Union 타입 추출 */
export type ExtractLanguages<T extends I18nexusConfig<readonly string[]>> =
  T["languages"][number];

/** 엄격한 타입의 i18nexus 설정 생성 헬퍼 */
export function defineConfig<TLanguages extends readonly string[]>(
  config: I18nexusConfig<TLanguages>
): I18nexusConfig<TLanguages> {
  return config;
}
