/** @type {import("jest").Config} */
const customJestConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/app", "<rootDir>/features", "<rootDir>/entities"],
  testMatch: ["**/*.(test|spec).{ts,tsx,js,jsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "ts-jest",
      {
        tsconfig: {
          ...require("./tsconfig.json").compilerOptions,
          jsx: "react-jsx",
        },
        diagnostics: false,
      },
    ],
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  collectCoverageFrom: [
    "app/api/**/*.{ts,tsx}",
    "features/**/api/**/*.{ts,tsx}",
    "entities/**/api/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/index.ts",
    "!**/*.test.{ts,tsx}",
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};

module.exports = customJestConfig;
