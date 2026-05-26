import { PerformanceReporter } from "./performance-reporter";
import { PerformanceReport } from "./performance-monitor";

describe("PerformanceReporter", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const report: PerformanceReport = {
    totalDuration: 45,
    summary: {
      averageDuration: 15,
      slowestOperation: "file_processing (30.00ms)",
      fastestOperation: "parse (5.00ms)",
      totalOperations: 3,
    },
    metrics: [
      {
        name: "parse",
        duration: 5,
        timestamp: 1,
      },
      {
        name: "file_processing",
        duration: 30,
        timestamp: 2,
        metadata: { filePath: "src/slow.tsx" },
        memoryUsage: {
          heapUsed: 1024 * 1024 * 5,
          heapTotal: 1024 * 1024 * 10,
          external: 0,
          rss: 1024 * 1024 * 20,
        },
      },
      {
        name: "file_processing",
        duration: 10,
        timestamp: 3,
        metadata: { filePath: "src/fast.tsx" },
      },
    ],
  };

  it("prints empty report message", () => {
    PerformanceReporter.printReport({ ...report, metrics: [] });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Performance monitoring disabled or no metrics collected",
    );
  });

  it("prints summary and verbose metric details", () => {
    PerformanceReporter.printReport(report, true);

    expect(consoleLogSpy).toHaveBeenCalledWith("\n📊 Performance Report");
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "🐌 Slowest: file_processing (30.00ms)",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("   Metadata:", {
      filePath: "src/slow.tsx",
    });
  });

  it("prints a single metric with metadata", () => {
    PerformanceReporter.printMetric(report.metrics[1]);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 file_processing: 30.00ms | Memory: 5.00MB",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("   Metadata:", {
      filePath: "src/slow.tsx",
    });
  });

  it("prints a single metric without memory or metadata", () => {
    PerformanceReporter.printMetric({
      name: "parse",
      duration: 3,
      timestamp: 1,
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 parse: 3.00ms | Memory: N/A",
    );
  });

  it("prints errors with optional context", () => {
    const error = new Error("boom");

    PerformanceReporter.printError(error, { namespace: "home" });

    expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Error:", error);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Context:", {
      namespace: "home",
    });
  });

  it("prints errors without context", () => {
    const error = new Error("boom");

    PerformanceReporter.printError(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith("❌ Error:", error);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      "Context:",
      expect.anything(),
    );
  });

  it("prints completion report with slowest files", () => {
    PerformanceReporter.printCompletionReport(
      report,
      ["src/slow.tsx", "src/fast.tsx"],
      50,
      "Wrapper Done",
    );

    expect(consoleLogSpy).toHaveBeenCalledWith("✅ Wrapper Done");
    expect(consoleLogSpy).toHaveBeenCalledWith(`\n🐌 Slowest Files:`);
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        String(call[0]).includes("slow.tsx"),
      ),
    ).toBe(true);
  });

  it("prints completion report without slowest files", () => {
    PerformanceReporter.printCompletionReport(
      { ...report, metrics: [] },
      [],
      0,
      "Nothing Done",
    );

    expect(consoleLogSpy).toHaveBeenCalledWith("✅ Nothing Done");
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        String(call[0]).includes("Slowest Files"),
      ),
    ).toBe(false);
  });
});
