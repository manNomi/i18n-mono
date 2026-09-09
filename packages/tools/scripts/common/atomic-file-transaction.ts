import * as fs from "fs";
import * as path from "path";

export type AtomicFileSystem = Pick<
  typeof fs,
  | "existsSync"
  | "lstatSync"
  | "mkdirSync"
  | "readFileSync"
  | "readdirSync"
  | "realpathSync"
  | "renameSync"
  | "unlinkSync"
  | "writeFileSync"
>;

export interface AtomicFileWrite {
  filePath: string;
  content: string;
}

interface TransactionEntry extends AtomicFileWrite {
  stagedPath: string;
  rollbackPath: string;
  hadOriginal: boolean;
}

interface TransactionJournal {
  version: 1;
  transactionId: string;
  entries: TransactionEntry[];
}

function removeIfPresent(filePath: string, fileSystem: AtomicFileSystem): void {
  if (fileSystem.existsSync(filePath)) {
    fileSystem.unlinkSync(filePath);
  }
}

export function assertPathInsideRoot(root: string, target: string): void {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to access path outside ${resolvedRoot}: ${target}`
    );
  }
}

function assertSafeTransactionPath(
  root: string,
  target: string,
  fileSystem: AtomicFileSystem
): void {
  assertPathInsideRoot(root, target);
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relativeParent = path.relative(
    resolvedRoot,
    path.dirname(resolvedTarget)
  );
  let current = resolvedRoot;

  for (const part of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fileSystem.existsSync(current)) {
      break;
    }
    if (fileSystem.lstatSync(current).isSymbolicLink()) {
      throw new Error(`Refusing to access symbolic link path: ${current}`);
    }
  }

  const realRoot = fileSystem.realpathSync(resolvedRoot);
  const existingParent = fileSystem.existsSync(path.dirname(resolvedTarget))
    ? path.dirname(resolvedTarget)
    : current;
  if (fileSystem.existsSync(existingParent)) {
    assertPathInsideRoot(realRoot, fileSystem.realpathSync(existingParent));
  }

  if (fileSystem.existsSync(resolvedTarget)) {
    if (fileSystem.lstatSync(resolvedTarget).isSymbolicLink()) {
      throw new Error(
        `Refusing to replace symbolic link target: ${resolvedTarget}`
      );
    }
    assertPathInsideRoot(realRoot, fileSystem.realpathSync(resolvedTarget));
  }
}

function readJournal(
  journalPath: string,
  fileSystem: AtomicFileSystem
): TransactionJournal {
  const parsed = JSON.parse(
    fileSystem.readFileSync(journalPath, "utf-8")
  ) as Partial<TransactionJournal>;

  if (
    parsed.version !== 1 ||
    typeof parsed.transactionId !== "string" ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error(`Invalid transaction journal: ${journalPath}`);
  }

  return parsed as TransactionJournal;
}

export function recoverAtomicFileTransaction(
  journalPath: string,
  fileSystem: AtomicFileSystem = fs
): void {
  const root = path.dirname(path.resolve(journalPath));
  const committedPath = `${journalPath}.committed`;

  if (fileSystem.existsSync(root)) {
    for (const transactionPath of [journalPath, committedPath]) {
      assertSafeTransactionPath(root, transactionPath, fileSystem);
    }
  }

  removeIfPresent(`${journalPath}.tmp`, fileSystem);
  removeIfPresent(`${committedPath}.tmp`, fileSystem);

  if (!fileSystem.existsSync(journalPath)) {
    removeIfPresent(committedPath, fileSystem);
    return;
  }

  const journal = readJournal(journalPath, fileSystem);
  const committed =
    fileSystem.existsSync(committedPath) &&
    fileSystem.readFileSync(committedPath, "utf-8") === journal.transactionId;

  for (const entry of journal.entries) {
    for (const entryPath of [
      entry.filePath,
      entry.stagedPath,
      entry.rollbackPath,
    ]) {
      assertPathInsideRoot(root, entryPath);
      assertSafeTransactionPath(root, entryPath, fileSystem);
    }
  }

  if (committed) {
    for (const entry of journal.entries) {
      removeIfPresent(entry.stagedPath, fileSystem);
      removeIfPresent(entry.rollbackPath, fileSystem);
    }
  } else {
    for (const entry of [...journal.entries].reverse()) {
      if (fileSystem.existsSync(entry.rollbackPath)) {
        removeIfPresent(entry.filePath, fileSystem);
        fileSystem.renameSync(entry.rollbackPath, entry.filePath);
      } else if (
        !entry.hadOriginal &&
        !fileSystem.existsSync(entry.stagedPath)
      ) {
        removeIfPresent(entry.filePath, fileSystem);
      }

      removeIfPresent(entry.stagedPath, fileSystem);
    }
  }

  removeIfPresent(journalPath, fileSystem);
  removeIfPresent(committedPath, fileSystem);
}

export function writeFilesAtomically(
  writes: AtomicFileWrite[],
  journalPath: string,
  fileSystem: AtomicFileSystem = fs
): void {
  if (writes.length === 0) {
    return;
  }

  const root = path.dirname(path.resolve(journalPath));
  if (!fileSystem.existsSync(root)) {
    fileSystem.mkdirSync(root, { recursive: true });
  }

  const resolvedWritePaths = writes.map((write) =>
    path.resolve(write.filePath).toLowerCase()
  );
  if (new Set(resolvedWritePaths).size !== resolvedWritePaths.length) {
    throw new Error("File transaction contains duplicate target paths");
  }

  assertSafeTransactionPath(root, journalPath, fileSystem);

  recoverAtomicFileTransaction(journalPath, fileSystem);

  const transactionId = `${process.pid}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
  const entries: TransactionEntry[] = writes.map((write, index) => {
    assertPathInsideRoot(root, write.filePath);
    const dir = path.dirname(write.filePath);
    assertSafeTransactionPath(root, write.filePath, fileSystem);
    if (!fileSystem.existsSync(dir)) {
      fileSystem.mkdirSync(dir, { recursive: true });
    }
    assertSafeTransactionPath(root, write.filePath, fileSystem);

    const baseName = path.basename(write.filePath);
    return {
      ...write,
      stagedPath: path.join(dir, `.${baseName}.${transactionId}-${index}.tmp`),
      rollbackPath: path.join(
        dir,
        `.${baseName}.${transactionId}-${index}.rollback`
      ),
      hadOriginal: fileSystem.existsSync(write.filePath),
    };
  });
  const journal: TransactionJournal = {
    version: 1,
    transactionId,
    entries,
  };
  const journalTempPath = `${journalPath}.tmp`;
  const committedPath = `${journalPath}.committed`;
  const committedTempPath = `${committedPath}.tmp`;

  try {
    fileSystem.writeFileSync(
      journalTempPath,
      JSON.stringify(journal, null, 2),
      "utf-8"
    );
    fileSystem.renameSync(journalTempPath, journalPath);

    for (const entry of entries) {
      fileSystem.writeFileSync(entry.stagedPath, entry.content, "utf-8");
    }

    for (const entry of entries) {
      if (entry.hadOriginal) {
        fileSystem.renameSync(entry.filePath, entry.rollbackPath);
      }
      fileSystem.renameSync(entry.stagedPath, entry.filePath);
    }

    fileSystem.writeFileSync(committedTempPath, transactionId, "utf-8");
    fileSystem.renameSync(committedTempPath, committedPath);
    recoverAtomicFileTransaction(journalPath, fileSystem);
  } catch (error) {
    try {
      recoverAtomicFileTransaction(journalPath, fileSystem);
    } catch (recoveryError) {
      throw new Error(
        `File transaction failed and recovery is pending at ${journalPath}: ${
          recoveryError instanceof Error
            ? recoveryError.message
            : String(recoveryError)
        }. Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    throw error;
  } finally {
    removeIfPresent(journalTempPath, fileSystem);
    removeIfPresent(committedTempPath, fileSystem);
  }
}
