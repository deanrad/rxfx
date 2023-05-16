import fs from "fs";
import { after } from "@rxfx/after";
import { becomesInactive, defaultBus } from "@rxfx/bus";
import {
  createEffect,
  createQueueingEffect,
  createSwitchingEffect,
  createBlockingEffect,
  Observable,
} from "@rxfx/service";
import { randomizePreservingAverage as randomize } from "@rxfx/perception";

/**
 * Demo: Write a bunch of names to a file. Possibly async.
 * Possibly speaking them aloud as well.
 */
const OUTPUT_FILE = "./output.md";
const HEADER = `List of names\n\n`;
const DELAY = 1000;

// prettier-ignore
const NAMES = [
  "Chris Hemsworth",
  "Scarlett Johansson",
  "Chadwick Boseman"
];

const EFFECT_GRAPH = `
effect fileWriter (queued)
effect nameSpeaker (queued)

NAMES -> fileWriter <--  observe: nameSpeaker.request
`;
/////////////////// FILE WRITER MODES /////////////////////
// Write whenever
// const fileWriter = createEffect(writeNameSync);

// Write in the order triggered
const fileWriter = createQueueingEffect(writeNameAsync);

/////////////////// NAME SPEAKER MODES /////////////////////
// Says them all at once
// const nameSpeaker = createEffect(sayTheName);
// Says them serially
const nameSpeaker = createQueueingEffect(sayTheName);
// Says only the first one
// const nameSpeaker = createBlockingEffect(sayTheName);
// Says only the last one
// const nameSpeaker = createSwitchingEffect(sayTheName);

// "'Tap in' to requests of the file writer unobtrusively"
fileWriter.observe({
  request: nameSpeaker,
});

// Log events unobtrusively
// defaultBus.spy(console.log);

async function doDemo() {
  fs.writeFileSync(OUTPUT_FILE, HEADER, "utf-8");

  // One way messages
  NAMES.forEach((name) => {
    console.log(`Requesting write of name ${name}`);
    fileWriter.request(name);
  });

  // Detecting when done (its active as of first request)
  await Promise.all([
    becomesInactive(fileWriter),
    becomesInactive(nameSpeaker),
  ]);
  console.log("Demo done, names written and spoken!");
}

function writeNameSync(name: string) {
  const markdownLine = ` - ${name}\n`;
  console.log(`Wrote name ${name}`);
  fs.appendFileSync(OUTPUT_FILE, markdownLine, "utf8");
}

function writeNameAsync(name: string) {
  return after(randomize(DELAY), () => {
    writeNameSync(name);
  });
}

// DO DEMO
doDemo();

//////////  Utility functions ////////////
// Return an observable that begins when subscribe is called,
// and completes when say.speak ends

function sayTheName(name: string) {
  const say = require("say");

  // force an error
  if (name.includes("ss")) {
    const msg = `Cannot pronounce name ${name}`;
    return new Promise((resolve, reject) => {
      say.speak(msg, null, null, reject);
    });
  }

  return new Observable((observer) => {
    try {
      say.speak(name, null, null, () => {
        observer.complete();
      });

      // An Observable allows for cancellation by returning a
      // cancellation function
      return () => {
        say.stop();
      };
    } catch (error) {
      const msg = "-- speech synthesis not available --";
      observer.error(msg);
    }
  });
}
