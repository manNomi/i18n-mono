import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { createFileIfAbsent } from "./create-file-if-absent";

describe("createFileIfAbsent", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-init-"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates a missing file exactly once", () => {
    const filePath = path.join(tempDir, ".env.sheets");

    expect(createFileIfAbsent(filePath, "first\n")).toBe(true);
    expect(fs.readFileSync(filePath, "utf8")).toBe("first\n");
  });

  it("leaves an existing file byte-identical", () => {
    const filePath = path.join(tempDir, ".env.sheets");
    fs.writeFileSync(filePath, "sentinel\n");

    expect(createFileIfAbsent(filePath, "replacement\n")).toBe(false);
    expect(fs.readFileSync(filePath, "utf8")).toBe("sentinel\n");
  });

  it("surfaces creation failures other than an existing target", () => {
    const filePath = path.join(tempDir, "missing", ".env.sheets");

    expect(() => createFileIfAbsent(filePath, "content\n")).toThrow();
  });
});
