/** Randomizes the timing of events, preserving the average duration.
 * @see Poisson Process
 * @link https://codesandbox.io/s/rxfx-example-poisson-process-typing-hncrl0 */
export function randomizePreservingAverage(duration: number) {
  return duration * Math.log(Math.random()) * -1;
}
