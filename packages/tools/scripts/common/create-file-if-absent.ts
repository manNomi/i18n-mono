import * as fs from "fs";

export function createFileIfAbsent(filePath: string, content: string): boolean {
  try {
    fs.writeFileSync(filePath, content, { flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }

    throw error;
  }
}
