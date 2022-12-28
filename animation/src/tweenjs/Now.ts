let now: () => number;

// Include a performance.now polyfill.
// In node.js, use process.hrtime.
// eslint-disable-next-line
// @ts-ignore
if (
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  process.hrtime
) {
  now = function (): number {
    // eslint-disable-next-line
    // @ts-ignore
    const time = process.hrtime();

    // Convert [seconds, nanoseconds] to milliseconds.
    return time[0] * 1000 + time[1] / 1000000;
  };
}
// In a browser, use window.performance.now if it is available.
else if (
  typeof window !== 'undefined' &&
  window.performance !== undefined &&
  window.performance.now !== undefined
) {
  // This must be bound, because directly assigning this function
  // leads to an invocation exception in Chrome.
  now = window.performance.now.bind(window.performance);
}
// Use Date.now if it is available.
else if (Date.now !== undefined) {
  now = Date.now;
}
// Otherwise, use 'new Date().getTime()'.
else {
  now = function (): number {
    return new Date().getTime();
  };
}

export default now;
