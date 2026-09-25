import { defineConfig } from "../utils/types";

test("accepts the CLI setup fields without widening configured languages", () => {
  const config = defineConfig({
    languages: ["en", "ko"] as const,
    defaultLanguage: "en",
    sourceLanguage: "ko",
    fallbackNamespace: "common",
    namespaceLocation: "app",
    useNamespaceStructure: true,
    mode: "client",
    framework: "nextjs",
    googleSheets: {
      spreadsheetId: "",
      credentialsPath: "./credentials.json",
      sheetName: "Translations",
    },
  });
  const language: "en" | "ko" = config.defaultLanguage;
  expect(language).toBe("en");
  defineConfig({
    languages: ["en", "ko"] as const,
    // @ts-expect-error Languages must come from the configured tuple.
    defaultLanguage: "fr",
  });
});
