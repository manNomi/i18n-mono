import { glob } from "glob";
import { wrapTranslations } from "../wrapper";
import { wrapTranslations as wrapWithBabel } from "../babel/wrapper";
import { wrapTranslations as wrapWithWorkers } from "../swc-worker/wrapper";

jest.mock("glob", () => ({
  glob: jest.fn(),
}));

jest.mock("../babel/wrapper", () => ({
  wrapTranslations: jest.fn(),
}));

jest.mock("../swc-worker/wrapper", () => ({
  wrapTranslations: jest.fn(),
}));

describe("adaptive t-wrapper", () => {
  let consoleLogSpy: jest.SpyInstance;
  const globMock = glob as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("uses the Babel strategy below the worker threshold", async () => {
    globMock.mockResolvedValue(["one.tsx", "two.tsx"]);
    (wrapWithBabel as jest.Mock).mockResolvedValue({
      processedFiles: ["one.tsx"],
      totalTime: 12,
    });

    const result = await wrapTranslations({ sourcePattern: "src/**/*.tsx" });

    expect(wrapWithBabel).toHaveBeenCalledWith({
      sourcePattern: "src/**/*.tsx",
    });
    expect(wrapWithWorkers).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      strategy: "babel",
      processedFiles: ["one.tsx"],
      totalTime: 12,
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🎯 Strategy: babel (single-threaded)"
    );
  });

  it("uses the SWC worker strategy at the worker threshold", async () => {
    globMock.mockResolvedValue(Array.from({ length: 3000 }));
    (wrapWithWorkers as jest.Mock).mockResolvedValue({
      processedFiles: ["many.tsx"],
      totalTime: 30,
      stats: { totalFiles: 3000 },
    });

    const result = await wrapTranslations();

    expect(wrapWithWorkers).toHaveBeenCalledWith({});
    expect(wrapWithBabel).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      strategy: "swc-worker",
      processedFiles: ["many.tsx"],
      stats: { totalFiles: 3000 },
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🎯 Strategy: swc-worker (parallel processing)"
    );
  });

  it("forces the SWC worker strategy when parserType is swc", async () => {
    globMock.mockResolvedValue(["one.tsx"]);
    (wrapWithWorkers as jest.Mock).mockResolvedValue({
      processedFiles: ["one.tsx"],
      totalTime: 8,
      stats: { totalFiles: 1 },
    });

    const config = {
      sourcePattern: "src/**/*.tsx",
      parserType: "swc" as const,
    };
    const result = await wrapTranslations(config);

    expect(wrapWithWorkers).toHaveBeenCalledWith(config);
    expect(wrapWithBabel).not.toHaveBeenCalled();
    expect(result.strategy).toBe("swc-worker");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🎯 Strategy: swc-worker (parallel processing)"
    );
  });
});
