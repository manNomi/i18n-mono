import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  AtomicFileSystem,
  recoverAtomicFileTransaction,
  writeFilesAtomically,
} from "./atomic-file-transaction";

describe("atomic file transaction", () => {
  let root: string;
  let journalPath: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "i18nexus-transaction-"));
    journalPath = path.join(root, ".transaction.json");
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("commits every file and removes transaction artifacts", () => {
    const first = path.join(root, "common", "en.json");
    const second = path.join(root, "dashboard", "en.json");
    fs.mkdirSync(path.dirname(first), { recursive: true });
    fs.mkdirSync(path.dirname(second), { recursive: true });
    fs.writeFileSync(first, "old-common");
    fs.writeFileSync(second, "old-dashboard");

    writeFilesAtomically(
      [
        { filePath: first, content: "new-common" },
        { filePath: second, content: "new-dashboard" },
      ],
      journalPath
    );

    expect(fs.readFileSync(first, "utf-8")).toBe("new-common");
    expect(fs.readFileSync(second, "utf-8")).toBe("new-dashboard");
    expect(fs.existsSync(journalPath)).toBe(false);
    expect(
      fs
        .readdirSync(root, { recursive: true })
        .some((entry) => String(entry).includes(".rollback"))
    ).toBe(false);
  });

  it("rolls back earlier files when a later commit fails", () => {
    const first = path.join(root, "common", "en.json");
    const second = path.join(root, "dashboard", "en.json");
    fs.mkdirSync(path.dirname(first), { recursive: true });
    fs.mkdirSync(path.dirname(second), { recursive: true });
    fs.writeFileSync(first, "old-common");
    fs.writeFileSync(second, "old-dashboard");

    let injected = false;
    const fileSystem: AtomicFileSystem = {
      existsSync: fs.existsSync,
      lstatSync: fs.lstatSync,
      mkdirSync: fs.mkdirSync,
      readFileSync: fs.readFileSync,
      readdirSync: fs.readdirSync,
      realpathSync: fs.realpathSync,
      renameSync: ((source, target) => {
        if (
          !injected &&
          String(source).endsWith(".tmp") &&
          String(target) === second
        ) {
          injected = true;
          throw new Error("injected later commit failure");
        }
        fs.renameSync(source, target);
      }) as typeof fs.renameSync,
      unlinkSync: fs.unlinkSync,
      writeFileSync: fs.writeFileSync,
    };

    expect(() =>
      writeFilesAtomically(
        [
          { filePath: first, content: "new-common" },
          { filePath: second, content: "new-dashboard" },
        ],
        journalPath,
        fileSystem
      )
    ).toThrow("injected later commit failure");

    expect(fs.readFileSync(first, "utf-8")).toBe("old-common");
    expect(fs.readFileSync(second, "utf-8")).toBe("old-dashboard");
    expect(fs.existsSync(journalPath)).toBe(false);
  });

  it("recovers a prepared journal left by an interrupted commit", () => {
    const target = path.join(root, "common", "en.json");
    const stagedPath = path.join(root, "common", ".en.json.tmp");
    const rollbackPath = path.join(root, "common", ".en.json.rollback");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "new-content");
    fs.writeFileSync(rollbackPath, "old-content");
    fs.writeFileSync(
      journalPath,
      JSON.stringify({
        version: 1,
        transactionId: "interrupted",
        entries: [
          {
            filePath: target,
            content: "new-content",
            stagedPath,
            rollbackPath,
            hadOriginal: true,
          },
        ],
      })
    );

    recoverAtomicFileTransaction(journalPath);

    expect(fs.readFileSync(target, "utf-8")).toBe("old-content");
    expect(fs.existsSync(journalPath)).toBe(false);
    expect(fs.existsSync(rollbackPath)).toBe(false);
  });

  it("rejects targets outside the journal root before writing", () => {
    const outside = path.join(path.dirname(root), "outside.json");

    expect(() =>
      writeFilesAtomically(
        [{ filePath: outside, content: "do not write" }],
        journalPath
      )
    ).toThrow("Refusing to access path outside");
    expect(fs.existsSync(outside)).toBe(false);
  });

  it("rejects symbolic-link parents and targets before staging", () => {
    const outside = fs.mkdtempSync(
      path.join(os.tmpdir(), "i18nexus-transaction-outside-")
    );
    try {
      fs.symlinkSync(outside, path.join(root, "linked-namespace"));
      expect(() =>
        writeFilesAtomically(
          [
            {
              filePath: path.join(root, "linked-namespace", "en.json"),
              content: "do not write",
            },
          ],
          journalPath
        )
      ).toThrow("symbolic link path");
      expect(fs.existsSync(path.join(outside, "en.json"))).toBe(false);

      const outsideFile = path.join(outside, "secret.json");
      const linkedFile = path.join(root, "en.json");
      fs.writeFileSync(outsideFile, "secret");
      fs.symlinkSync(outsideFile, linkedFile);
      expect(() =>
        writeFilesAtomically(
          [{ filePath: linkedFile, content: "replacement" }],
          journalPath
        )
      ).toThrow("symbolic link target");
      expect(fs.readFileSync(outsideFile, "utf-8")).toBe("secret");
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("rejects duplicate targets before creating a journal", () => {
    const target = path.join(root, "en.json");

    expect(() =>
      writeFilesAtomically(
        [
          { filePath: target, content: "first" },
          { filePath: target, content: "second" },
        ],
        journalPath
      )
    ).toThrow("duplicate target paths");
    expect(fs.existsSync(journalPath)).toBe(false);
  });
});
