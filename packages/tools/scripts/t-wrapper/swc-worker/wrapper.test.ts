import { glob } from "glob";
import { readFileSync } from "fs";
import { wrapTranslations } from "./wrapper";
import { WorkerPool } from "./worker-pool";

jest.mock("glob", () => ({
  glob: jest.fn(),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

const mockPool = {
  initialize: jest.fn(),
  runTask: jest.fn(),
  terminate: jest.fn(),
  getStats: jest.fn(),
};

jest.mock("./worker-pool", () => ({
  WorkerPool: jest.fn(() => mockPool),
}));

describe("SWC worker wrapper", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  const globMock = glob as unknown as jest.Mock;
  const readFileSyncMock = readFileSync as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockPool.initialize.mockResolvedValue(undefined);
    mockPool.terminate.mockResolvedValue(undefined);
    mockPool.getStats.mockReturnValue({
      totalWorkers: 2,
      activeWorkers: 0,
      queuedTasks: 0,
      completedTasks: 2,
      failedTasks: 1,
      totalProcessingTime: 30,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("returns empty stats without starting workers when no files match", async () => {
    globMock.mockResolvedValue([]);

    const result = await wrapTranslations({
      sourcePattern: "missing/**/*.tsx",
    });

    expect(WorkerPool).not.toHaveBeenCalled();
    expect(result).toEqual({
      processedFiles: [],
      totalTime: 0,
      stats: {
        totalFiles: 0,
        modifiedFiles: 0,
        skippedFiles: 0,
        errorFiles: 0,
        averageTimePerFile: 0,
        workerStats: {},
      },
    });
  });

  it("aggregates success, skipped, error, and rejected worker results", async () => {
    globMock.mockResolvedValue([
      "modified.tsx",
      "skipped.tsx",
      "errored.tsx",
      "rejected.tsx",
    ]);
    readFileSyncMock.mockReturnValue("<div>안녕하세요</div>");
    mockPool.runTask
      .mockResolvedValueOnce({
        type: "success",
        filePath: "modified.tsx",
        modified: true,
      })
      .mockResolvedValueOnce({
        type: "success",
        filePath: "skipped.tsx",
        modified: false,
      })
      .mockResolvedValueOnce({
        type: "error",
        filePath: "errored.tsx",
        error: "parse failed",
      })
      .mockRejectedValueOnce(new Error("worker crashed"));

    const result = await wrapTranslations({ sourcePattern: "src/**/*.tsx" });

    expect(mockPool.initialize).toHaveBeenCalled();
    expect(mockPool.terminate).toHaveBeenCalled();
    expect(mockPool.runTask).toHaveBeenCalledTimes(4);
    expect(result.processedFiles).toEqual(["modified.tsx"]);
    expect(result.stats).toMatchObject({
      totalFiles: 4,
      modifiedFiles: 1,
      skippedFiles: 1,
      errorFiles: 2,
      workerStats: {
        totalWorkers: 2,
        completedTasks: 2,
        failedTasks: 1,
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Error processing errored.tsx: parse failed",
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "❌ Task failed for rejected.tsx: Error: worker crashed",
    );
  });
});
