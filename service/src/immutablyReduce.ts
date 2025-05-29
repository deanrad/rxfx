/** Alias for immer's produce - makes mutating code return immutable objects
 * @example `.reduceWith(immutablyReduce((state=[], item) => { state.push(item) } ))`
 */
export { produce as immutablyReduce } from 'immer';
