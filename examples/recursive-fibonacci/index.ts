/**
 * See in a REPL at https://replit.com/@deanius/Recursive-Fibonacci#index.ts
 */
import { after } from "@rxfx/after";
import { defaultBus, Bus } from "@rxfx/bus";

const bus = defaultBus as Bus<number[]>;
// Logging
bus.spy(([n, _]) => console.log(n));

/**
 * Responds to each fibonacci pair a moment later with the next fibonacci-pair
 *   Looks like this over time:
 *
 *   --[1,1]--------[1,2]--------[2,3]------------->
 *          \------/     \------/
 */
const fibonacci = bus.listen(
  // for every event
  () => true,
  //  map to an Observable of the next triggered event
  ([fibN, fibN1]) => {
    return after(500, () => [fibN1, fibN + fibN1]);
  },
  // turn handler-returned values into new triggerings
  bus.observeAll()
);

// Terminate us if we get too big
bus.guard(
  ([fibN, _]) => fibN > 100,
  () => fibonacci.unsubscribe()
);

// Get us started
bus.trigger([1, 1]);
