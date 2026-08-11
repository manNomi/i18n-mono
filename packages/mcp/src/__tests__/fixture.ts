import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export function createFixture(name: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `i18nexus-mcp-${name}-`));
}

export function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function removeFixture(fixturePath: string): void {
  fs.rmSync(fixturePath, { recursive: true, force: true });
}
