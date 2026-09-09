import pluginJs from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["index.ts", "bin/**/*.ts", "scripts/**/*.ts"];

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "scripts/t-wrapper-rust/**",
      "**/*.test.ts",
      "**/*.e2e.test.ts",
      "**/__tests__/**",
    ],
  },
  {
    ...pluginJs.configs.recommended,
    files: sourceFiles,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: sourceFiles,
  })),
  {
    files: sourceFiles,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off",
    },
  }
);
