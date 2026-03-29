// Polyfill for environments where AbortSignal.timeout is unavailable.
if (typeof AbortSignal !== "undefined" && !(AbortSignal as any).timeout) {
  (AbortSignal as any).timeout = () => {
    const controller = new AbortController();
    return controller.signal;
  };
}
