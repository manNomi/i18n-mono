import {
  globalPerformanceMonitor,
  measureAsync,
  measureSync,
  PerformanceMonitor,
} from "./performance-monitor";

describe("PerformanceMonitor", () => {
  let nowSpy: jest.SpyInstance<number, []>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    let now = 0;
    nowSpy = jest.spyOn(performance, "now").mockImplementation(() => {
      now += 10;
      return now;
    });
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    globalPerformanceMonitor.reset();
  });

  afterEach(() => {
    nowSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    globalPerformanceMonitor.reset();
  });

  it("records started metrics and builds a summary", () => {
    const monitor = new PerformanceMonitor({ enabled: true });

    monitor.start("extract", { filePath: "src/page.tsx" });
    const metric = monitor.end("extract", { keyCount: 2 });
    const report = monitor.getReport();

    expect(metric).toMatchObject({
      name: "extract",
      metadata: { keyCount: 2 },
    });
    expect(metric?.duration).toBeGreaterThan(0);
    expect(report.metrics).toHaveLength(1);
    expect(report.summary.totalOperations).toBe(1);
    expect(report.summary.slowestOperation).toContain("extract");
    expect(report.summary.fastestOperation).toContain("extract");
  });

  it("prints debug initialization and debug completion when env flags are enabled", () => {
    const originalPerfDebug = process.env.I18N_PERF_DEBUG;
    const originalNodeEnv = process.env.NODE_ENV;

    jest.resetModules();
    process.env.I18N_PERF_DEBUG = "true";
    process.env.NODE_ENV = "test-debug";

    jest.isolateModules(() => {
      const { PerformanceMonitor: DebugPerformanceMonitor } =
        require("./performance-monitor") as typeof import("./performance-monitor");
      const monitor = new DebugPerformanceMonitor({
        enabled: true,
        release: "test",
      });

      monitor.start("debug-task");
      monitor.end("debug-task");
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Performance Monitor] ✅ Initialized",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Performance Monitor] Environment:",
      "test-debug",
    );
    expect(
      consoleLogSpy.mock.calls.some((call) =>
        String(call[0]).includes(
          "[Performance Monitor] ✅ Finished: debug-task",
        ),
      ),
    ).toBe(true);

    if (originalPerfDebug === undefined) {
      delete process.env.I18N_PERF_DEBUG;
    } else {
      process.env.I18N_PERF_DEBUG = originalPerfDebug;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("warns about slow operations", () => {
    let now = 0;
    nowSpy.mockImplementation(() => {
      now += 1500;
      return now;
    });
    const monitor = new PerformanceMonitor({ enabled: true });

    monitor.start("slow-task");
    monitor.end("slow-task", { filePath: "src/slow.tsx" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Slow operation detected: slow-task"),
      { filePath: "src/slow.tsx" },
    );
  });

  it("returns null and warns when ending an unknown metric", () => {
    const monitor = new PerformanceMonitor({ enabled: true });

    expect(monitor.end("missing")).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "⚠️  Performance measurement not started for: missing",
    );
  });

  it("does nothing when disabled", () => {
    const monitor = new PerformanceMonitor({ enabled: false });
    const fn = jest.fn(() => "ok");

    expect(monitor.end("extract")).toBeNull();
    expect(monitor.wrap("extract", fn)).toBe(fn);
    expect(monitor.getReport().summary.totalOperations).toBe(0);
  });

  it("wraps sync, async, and throwing functions", async () => {
    const monitor = new PerformanceMonitor({ enabled: true });
    const wrappedSync = monitor.wrap("sync", (value: number) => value + 1);
    const wrappedAsync = monitor.wrap("async", async () => "done");
    const wrappedThrow = monitor.wrap("throw", () => {
      throw new Error("boom");
    });

    expect(wrappedSync(1)).toBe(2);
    await expect(wrappedAsync()).resolves.toBe("done");
    expect(() => wrappedThrow()).toThrow("boom");

    const report = monitor.getReport();
    expect(report.metrics.map((metric) => metric.name)).toEqual([
      "sync",
      "async",
      "throw",
    ]);
    expect(report.metrics[2].metadata).toMatchObject({ error: true });
  });

  it("records async wrapper rejections with error metadata", async () => {
    const monitor = new PerformanceMonitor({ enabled: true });
    const wrappedAsyncError = monitor.wrap("async-error", async () => {
      throw new Error("async boom");
    });

    await expect(wrappedAsyncError()).rejects.toThrow("async boom");

    expect(monitor.getReport().metrics[0]).toMatchObject({
      name: "async-error",
      metadata: { error: true },
    });
  });

  it("supports the measure decorator helper", () => {
    const monitor = new PerformanceMonitor({ enabled: true });
    const target = {
      constructor: { name: "Worker" },
      performanceMonitor: monitor,
      run(value: string) {
        return value.toUpperCase();
      },
    };
    const descriptor = Object.getOwnPropertyDescriptor(target, "run")!;

    PerformanceMonitor.measure({ phase: "unit" })(target, "run", descriptor);

    expect(descriptor.value.call(target, "ok")).toBe("OK");
    expect(monitor.getReport().metrics[0]).toMatchObject({
      name: "Worker.run",
      metadata: { phase: "unit" },
    });
  });

  it("measures global sync and async helpers", async () => {
    expect(measureSync("sync-helper", () => 42)).toBe(42);
    await expect(measureAsync("async-helper", async () => 7)).resolves.toBe(7);
    await expect(
      measureAsync("async-error", async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");

    const report = globalPerformanceMonitor.getReport();
    expect(report.metrics.map((metric) => metric.name)).toEqual([
      "sync-helper",
      "async-helper",
      "async-error",
    ]);
    expect(report.metrics[2].metadata).toMatchObject({ error: true });
  });

  it("prints reports, custom metrics, and errors through reporter helpers", () => {
    const monitor = new PerformanceMonitor({ enabled: true });

    monitor.printReport();
    monitor.start("reported");
    monitor.end("reported");
    monitor.printReport(true);
    monitor.captureCustomMetric("keys", 10, undefined, { namespace: "home" });
    monitor.captureError(new Error("bad"), { filePath: "src/page.tsx" });

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "📊 Performance monitoring disabled or no metrics collected",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "[Performance Monitor] 📊 Custom Metric: keys",
      {
        value: 10,
        unit: "millisecond",
        namespace: "home",
      },
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith("Context:", {
      filePath: "src/page.tsx",
    });
  });
});
