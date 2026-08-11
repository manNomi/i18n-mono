module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.e2e.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2020",
          module: "commonjs",
          strict: true,
          esModuleInterop: true,
          types: ["jest", "node"],
        },
      },
    ],
  },
  testTimeout: 60000,
};
