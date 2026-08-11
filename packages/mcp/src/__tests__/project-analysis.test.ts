import * as fs from "fs";
import * as path from "path";
import { analyzeProject } from "../project-analysis";
import { createFixture, removeFixture, writeJson } from "./fixture";

describe("analyzeProject", () => {
  const fixtures: string[] = [];

  afterEach(() => {
    fixtures.splice(0).forEach(removeFixture);
  });

  it("detects a Next.js App Router project and keeps manifest and install status separate", () => {
    const projectPath = createFixture("next-app");
    fixtures.push(projectPath);
    writeJson(path.join(projectPath, "package.json"), {
      dependencies: {
        next: "15.5.9",
        react: "18.2.0",
        i18nexus: "^4.0.1",
      },
      devDependencies: {
        "i18nexus-tools": "^3.2.0",
      },
    });
    writeJson(path.join(projectPath, "package-lock.json"), {
      lockfileVersion: 3,
    });
    fs.mkdirSync(path.join(projectPath, "src", "app"), { recursive: true });

    const analysis = analyzeProject(projectPath);

    expect(analysis.framework.kind).toBe("nextjs-app");
    expect(analysis.routeDirectory).toBe("src/app");
    expect(analysis.packageManager.name).toBe("npm");
    expect(analysis.suggestedConfig.sourcePattern).toBe(
      "src/**/*.{js,jsx,ts,tsx}"
    );
    expect(analysis.suggestedConfig.namespaceLocation).toBe("src/app");
    expect(analysis.dependencies.i18nexus).toMatchObject({
      declared: true,
      declaredVersion: "^4.0.1",
      installed: false,
    });
    expect(analysis.dependencies.i18nexusTools).toMatchObject({
      declared: true,
      installed: false,
    });
  });

  it("uses a single namespace for a React project without a route directory", () => {
    const projectPath = createFixture("react");
    fixtures.push(projectPath);
    writeJson(path.join(projectPath, "package.json"), {
      dependencies: { react: "^18.2.0" },
    });
    fs.mkdirSync(path.join(projectPath, "src", "components"), {
      recursive: true,
    });

    const analysis = analyzeProject(projectPath);

    expect(analysis.framework.kind).toBe("react-spa");
    expect(analysis.suggestedConfig.framework).toBe("react");
    expect(analysis.suggestedConfig.useNamespaceStructure).toBe(false);
    expect(analysis.suggestedConfig.namespaceStrategy).toBe("single");
    expect(analysis.suggestedConfig).not.toHaveProperty("namespaceLocation");
  });

  it("reports ambiguous package manager evidence", () => {
    const projectPath = createFixture("locks");
    fixtures.push(projectPath);
    writeJson(path.join(projectPath, "package.json"), {});
    fs.writeFileSync(
      path.join(projectPath, "pnpm-lock.yaml"),
      "lockfileVersion: '9'\n"
    );
    fs.writeFileSync(
      path.join(projectPath, "yarn.lock"),
      "# yarn lockfile v1\n"
    );

    const analysis = analyzeProject(projectPath);

    expect(analysis.packageManager.name).toBe("pnpm");
    expect(analysis.packageManager.ambiguous).toBe(true);
    expect(analysis.warnings).toContain(
      "Multiple lockfiles were found. Pass packageManager explicitly before installing dependencies."
    );
  });
});
