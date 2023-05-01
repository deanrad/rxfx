import fs from "fs";
import { defaultBus as bus } from "@rxfx/bus";
import { createEvent } from "@rxfx/fsa";
import { Observable as Process } from "rxjs";

export const CONFIG_PATH = "./config.json";
export const CONFIG_CHANGED = createEvent("next/config");

// A stateful value
let CURRENT_SECRET_KEY;

// Exposes this to an API (dont do in prod!)
export const setupApp = (app) => {
  app.get("/config", (_, res) => {
    res.json({ CURRENT_SECRET_KEY });
  });
};

// Reads the files contents into an object, synchronously.
export const configFileAsObject = () =>
  JSON.parse(fs.readFileSync(CONFIG_PATH));

// Returns an Observable of applying the SECRET_KEY from config
const runConfig = (config) => {
  const { SECRET_KEY } = config;

  return new Process(() => {
    console.log(`Configuring for SECRET_KEY: ${SECRET_KEY}`);
    CURRENT_SECRET_KEY = SECRET_KEY;

    return function handleCancelation() {
      console.log(`Shutting down for SECRET_KEY: ${SECRET_KEY}`);
      CURRENT_SECRET_KEY = null;
    };
  });
};

// On every event of a config, run it (canceling the previous)
bus.listenSwitching(CONFIG_CHANGED.match, (event) => runConfig(event.payload));
