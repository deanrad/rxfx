/**
 * Did you ever wish you could control a Promise "from the outside"?
 * Have you ever exported a function from the Promise constructor to do so?
 * Online Repl: https://replit.com/@deanius/PushPromise#index.js
 * */

/*
let pressKey // a 'setter'
const keyPressed = new Promise(resolve => {
  pressKey = resolve;
})

keyPressed.then((key) => {
  console.log(`${key} was pressed`)
});
pressKey('a')
 */

/**
 * Don't do this! instead, declare a Subject, and create a Promise
 * for its first pushed value. Then, call .next() on the subject
 * to resolve the Promise, and skip the dirty function-reference passing.
 */

import { firstValueFrom, Subject } from "rxjs";
const keysPressed = new Subject();
const pressKey = (key) => keysPressed.next(key);

firstValueFrom(keysPressed).then((key) => {
  console.log(`${key} was pressed`);
});
pressKey("a");

/**
 * You can also use bus.nextEvent(criteria) to get a Promise for a single
 * matching event on the bus.
 */
