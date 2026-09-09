import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { inferNamespaceFromPath } from "../utils/namespace-inference";

describe("core namespace inference", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-core-ns-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns the default namespace when namespacing is disabled", () => {
    expect(
      inferNamespaceFromPath("src/app/home/page.tsx", {
        enabled: false,
        basePath: "src/app",
        defaultNamespace: "common",
      })
    ).toBe("common");
  });

  it("returns the default namespace for files outside the base path", () => {
    expect(
      inferNamespaceFromPath("src/components/Button.tsx", {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
      })
    ).toBe("common");
  });

  it("handles Next.js App Router groups and dynamic segments", () => {
    expect(
      inferNamespaceFromPath("src/app/(marketing)/products/[id]/page.tsx", {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
        framework: "nextjs-app",
      })
    ).toBe("products");
  });

  it("returns the default namespace for top-level app files", () => {
    expect(
      inferNamespaceFromPath("src/app/page.tsx", {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
        framework: "nextjs-app",
      })
    ).toBe("common");
  });

  it("supports full-path and last-folder strategies", () => {
    const filePath = "src/app/gallery/folder/page.tsx";

    expect(
      inferNamespaceFromPath(filePath, {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
        strategy: "full-path",
      })
    ).toBe("gallery-folder");

    expect(
      inferNamespaceFromPath(filePath, {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
        strategy: "last-folder",
      })
    ).toBe("folder");
  });

  it("supports TanStack file route namespace inference", () => {
    expect(
      inferNamespaceFromPath("src/routes/dashboard.index.tsx", {
        enabled: true,
        basePath: "src/routes",
        defaultNamespace: "common",
        framework: "tanstack-file",
      })
    ).toBe("dashboard");
  });

  it("applies custom ignore patterns before path strategy", () => {
    expect(
      inferNamespaceFromPath("src/app/admin/dashboard/page.tsx", {
        enabled: true,
        basePath: "src/app",
        defaultNamespace: "common",
        ignorePatterns: ["admin/"],
      })
    ).toBe("dashboard");
  });
});
