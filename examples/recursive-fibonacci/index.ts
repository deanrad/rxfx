/**
 * See in a REPL at https://replit.com/@deanius/Recursive-Fibonacci-rxfxservice
 */
import { after, createEffect } from "@rxfx/service";

const DELAY = 500; // or zero, 

/**
 * Responds to each fibonacci pair a moment later with the next fibonacci-pair
 *   Looks like this over time:
 *
 *   --[1,1]--------[1,2]--------[2,3]------------->
 *          \------/     \------/
 */
const recurFibonacci = createEffect(
  //  map to an Observable of the next triggered event
  ([fibN, fibN1]) => {
    return after(DELAY, () => {
      const result = [fibN1, fibN + fibN1];
      recurFibonacci.request(result);
   });
  }
);

// An exit condition
recurFibonacci.observe({
  request([fibN]) {
    console.log(fibN);
    if (fibN > 100) { 
      recurFibonacci.stop() // triggers the teardown
    }
  }
})

// Get us started
recurFibonacci.request([1, 1])

// Say when we're done
recurFibonacci.addTeardown(() => {
  console.log('done')
})