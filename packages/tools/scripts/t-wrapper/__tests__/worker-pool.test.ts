/**
 * Worker Pool 유닛 테스트
 *
 * 실제 worker_threads는 Jest/ts-jest 환경에서 TypeScript worker를 직접 로드하기
 * 어렵기 때문에, 내부 큐/상태 전이를 fake worker로 검증한다.
 */

import { WorkerPool } from "../swc-worker/worker-pool";
import { WorkerTask, WorkerResult } from "../swc-worker/types";
import { SCRIPT_CONFIG_DEFAULTS } from "../../common/default-config";

type FakeWorker = {
  postMessage: jest.Mock<void, [WorkerTask]>;
  terminate: jest.Mock<Promise<number>, []>;
};

function createTask(filePath: string = "test.tsx"): WorkerTask {
  return {
    type: "process-file",
    filePath,
    code: `function Test() { return <div>안녕하세요</div>; }`,
    config: SCRIPT_CONFIG_DEFAULTS as any,
  };
}

function attachFakeWorkers(pool: WorkerPool, count: number): FakeWorker[] {
  const workers = Array.from({ length: count }, () => ({
    postMessage: jest.fn(),
    terminate: jest.fn(async () => 0),
  }));

  (pool as any).workers = workers;
  (pool as any).availableWorkers = [...workers];

  return workers;
}

function completeWorker(
  pool: WorkerPool,
  worker: FakeWorker,
  result: WorkerResult,
): void {
  (pool as any).handleWorkerMessage(worker, result);
}

describe("WorkerPool", () => {
  it("uses CPU count as the default worker count", () => {
    const pool = new WorkerPool();

    expect(pool.getStats().totalWorkers).toBeGreaterThan(0);
  });

  it("queues a task, posts it to an available worker, and resolves success", async () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    const promise = pool.runTask(createTask("success.tsx"));

    expect(worker.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: "success.tsx" }),
    );
    expect(pool.getStats()).toMatchObject({
      activeWorkers: 1,
      queuedTasks: 0,
    });

    completeWorker(pool, worker, {
      type: "success",
      filePath: "success.tsx",
      modified: true,
      processingTime: 25,
    });

    await expect(promise).resolves.toMatchObject({
      type: "success",
      filePath: "success.tsx",
    });
    expect(pool.getStats()).toMatchObject({
      activeWorkers: 0,
      completedTasks: 1,
      failedTasks: 0,
      totalProcessingTime: 25,
    });
  });

  it("rejects worker error results and tracks failures", async () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    const promise = pool.runTask(createTask("error.tsx"));

    completeWorker(pool, worker, {
      type: "error",
      filePath: "error.tsx",
      error: "parse failed",
    });

    await expect(promise).rejects.toThrow("parse failed");
    expect(pool.getStats()).toMatchObject({
      activeWorkers: 0,
      completedTasks: 0,
      failedTasks: 1,
    });
  });

  it("treats no-change results as completed tasks", async () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    const promise = pool.runTask(createTask("skip.tsx"));

    completeWorker(pool, worker, {
      type: "no-change",
      filePath: "skip.tsx",
      modified: false,
    });

    await expect(promise).resolves.toMatchObject({
      type: "no-change",
      filePath: "skip.tsx",
    });
    expect(pool.getStats()).toMatchObject({
      completedTasks: 1,
      failedTasks: 0,
    });
  });

  it("processes queued tasks when a worker becomes available", async () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    const first = pool.runTask(createTask("first.tsx"));
    const second = pool.runTask(createTask("second.tsx"));

    expect(pool.getStats()).toMatchObject({
      activeWorkers: 1,
      queuedTasks: 1,
    });
    expect(worker.postMessage).toHaveBeenCalledTimes(1);

    completeWorker(pool, worker, {
      type: "success",
      filePath: "first.tsx",
      modified: true,
    });

    await expect(first).resolves.toMatchObject({ filePath: "first.tsx" });
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
    expect(worker.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ filePath: "second.tsx" }),
    );

    completeWorker(pool, worker, {
      type: "success",
      filePath: "second.tsx",
      modified: true,
    });

    await expect(second).resolves.toMatchObject({ filePath: "second.tsx" });
    expect(pool.getStats()).toMatchObject({
      completedTasks: 2,
      queuedTasks: 0,
    });
  });

  it("rejects the active task when a worker emits an error", async () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);
    const promise = pool.runTask(createTask("crash.tsx"));

    (pool as any).handleWorkerError(worker, new Error("worker crashed"));

    await expect(promise).rejects.toThrow("worker crashed");
    expect(pool.getStats()).toMatchObject({
      failedTasks: 1,
    });
  });

  it("ignores messages from workers with no active task", () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    completeWorker(pool, worker, {
      type: "success",
      filePath: "orphan.tsx",
      modified: true,
    });

    expect(pool.getStats()).toMatchObject({
      completedTasks: 0,
      failedTasks: 0,
    });
  });

  it("removes an idle worker from the available list when it errors", () => {
    const pool = new WorkerPool(1);
    const [worker] = attachFakeWorkers(pool, 1);

    (pool as any).handleWorkerError(worker, new Error("idle crash"));

    expect((pool as any).availableWorkers).toEqual([]);
    expect(pool.getStats()).toMatchObject({
      failedTasks: 0,
    });
  });

  it("terminates all attached workers and clears state", async () => {
    const pool = new WorkerPool(2);
    const workers = attachFakeWorkers(pool, 2);

    await pool.terminate();

    expect(workers[0].terminate).toHaveBeenCalled();
    expect(workers[1].terminate).toHaveBeenCalled();
    expect((pool as any).workers).toEqual([]);
    expect((pool as any).availableWorkers).toEqual([]);
  });
});
