import packageJson from "../package.json";

describe("package metadata", () => {
  it("points support links at this package in the canonical monorepo", () => {
    expect(packageJson.repository).toEqual({
      type: "git",
      url: "git+https://github.com/i18n-global/i18n-mono.git",
      directory: "packages/tools",
    });
    expect(packageJson.bugs.url).toBe(
      "https://github.com/i18n-global/i18n-mono/issues",
    );
    expect(packageJson.homepage).toBe(
      "https://github.com/i18n-global/i18n-mono/tree/main/packages/tools#readme",
    );
  });
});
