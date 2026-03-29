const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/app", "<rootDir>/features", "<rootDir>/entities"],
  testMatch: ["**/*.(test|spec).{ts,tsx,js,jsx}"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
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

module.exports = createJestConfig(customJestConfig);
