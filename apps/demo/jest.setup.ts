// Polyfill for environments where AbortSignal.timeout is unavailable.
type AbortSignalWithTimeout = typeof AbortSignal & {
  timeout?: (ms?: number) => AbortSignal;
};

const abortSignalWithTimeout = AbortSignal as AbortSignalWithTimeout;

if (typeof AbortSignal !== "undefined" && !abortSignalWithTimeout.timeout) {
  abortSignalWithTimeout.timeout = () => {
    const controller = new AbortController();
    return controller.signal;
  };
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
