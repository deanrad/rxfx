import fs from "fs";
import { defaultBus as bus } from "@rxfx/bus";
import { CONFIG_PATH, CONFIG_CHANGED, configFileAsObject } from "./config.mjs";

fs.watch(CONFIG_PATH, (eventType) => {
  if (eventType !== "change") return;

  console.log(`${CONFIG_PATH} was changed.`);
  bus.trigger(CONFIG_CHANGED(configFileAsObject()));
});
