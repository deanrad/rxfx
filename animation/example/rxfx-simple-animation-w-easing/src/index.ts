import { defaultBus as bus } from "@rxfx/bus";
import { tweenToValue, Easing } from "@rxfx/animation";

// Set up a box to be animated
const box = document.createElement("div");
box.style.setProperty("background-color", "#008800");
box.style.setProperty("width", "100px");
box.style.setProperty("height", "100px");
document.body.appendChild(box);

// Create the bus listener, defined by:
//  - The criteria for when to execute the effect
//  - The Observable (or Promise) of the effect itself
//  - The callbacks for the effect lifecycle events (e.g. next,complete,error)
bus.listen(
  (cmd) => cmd === "moveIt",
  () =>
    tweenToValue(
      { x: 0, y: 0 },
      { x: 250, y: 220 },
      2000,
      Easing.Exponential.Out // or LERP, etc..
    ),
  {
    next({ x, y }) {
      box.style.setProperty("transform", `translate(${x}px, ${y}px)`);
    }
  }
);

// Trigger an event the listener is listening for
bus.trigger("moveIt");
