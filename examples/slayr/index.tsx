import { after } from "@rxfx/after";
import { padToTime } from "@rxfx/operators";
import { THRESHOLD } from "@rxfx/perception";
import { Bus, defaultBus as _bus } from "@rxfx/bus";

import { fromEvent, of, PartialObserver } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { parseSlay } from "./convert/slay-parser";
import { convertSlayToJest } from "./convert/jest-emitter";

const bus = _bus as Bus<string>;
bus.spy(console.log);
bus.errors.subscribe(console.error);

// Trigger Events
const srcTextarea = document.getElementById("txt-slay") as HTMLTextAreaElement;
const btnConvert = document.getElementById("btn-convert") as HTMLButtonElement;
const destTextarea = document.getElementById("txt-jest") as HTMLTextAreaElement;

// An RxJS debounce on keyups (vs a bus listener debounce on conversions)
fromEvent(srcTextarea, "keyup")
  .pipe(debounceTime(THRESHOLD.Debounce))
  .subscribe((e) => {
    bus.trigger((e.target as HTMLTextAreaElement).value);
  });

//Handle Events
// An RxJS Observer to put a result in the DOM
const jestTextAreaUpdater: PartialObserver<string> = {
  next(jestTxt) {
    destTextarea.innerHTML = jestTxt;
  },
};

/** A listener that waits THRESHOLD.Debounce before computing the next jestText and updating the DOM with it.  */
const converter = bus.listenSwitching(
  // The condition for when to run this effect handler
  (srcText) => srcText.length > 0,
  // The effect (which will be observable) is to emit the converted value
  (srcText) => {
    return after(THRESHOLD.Debounce, () => {
      let result: string = "Error";
      try {
        result = convertSlayToJest(parseSlay(srcText)[0]);
      } catch (ex) {
        console.error(ex);
      }

      return result;
    });
  },
  // The observer that will consume the `next` event of the effect.
  jestTextAreaUpdater
);

converter.isActive.subscribe((isActive) => {
  btnConvert.innerText = isActive ? "⏳" : ">>";
});

after(500, () => {
  bus.trigger(srcTextarea.value);
}).subscribe();
