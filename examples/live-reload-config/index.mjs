import express from "express";
import { defaultBus as bus } from "@rxfx/bus";
import {
  CONFIG_CHANGED,
  configFileAsObject,
  setupApp,
} from "./services/config.mjs";
import "./services/file-events.mjs";

const app = express();
const port = 4200;

setupApp(app);

// Expose to the world
app.listen(port, () => {
  console.log(`Listening on port ${port}..
  
  Instructions for Demo:

  - Go to http://localhost:${port}/config and see the SECRET_KEY from config.json.
  - Change the SECRET_KEY in config.json and change it.
  - See the logs pick up the change and change the server's state.
  - Go to http://localhost:${port}/config and see the new SECRET_KEY in effect.
  `);

  // Send the first config
  bus.trigger(CONFIG_CHANGED(configFileAsObject()));
});

// Instrumentation
bus.errors.subscribe(console.error);
// bus.spy(console.log);
