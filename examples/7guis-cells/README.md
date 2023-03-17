# 𝗥𝘅𝑓𝑥 Example - 7 GUIs cells

The [7 GUIs Cells Example App](https://eugenkiss.github.io/7guis/tasks#cells), implemented in 𝗥𝘅𝑓𝑥 bus-listener style.

## Run It
```
$ npm start
```

## Demo
![](https://s3.amazonaws.com/www.deanius.com/rxfx/7GUIs-cells.gif)


## Event Model
- Editing a cell's content raises a `cell/content/set` event, in whose payload are the field key (such as `A1`), and the entered value of its content.
- Upon every `cell/content/set`, cells whose `deps` include the `field` just set have their values recomputed.
- Upon a cell recomputing it's value, a `cell/value/set` event is triggered with the updated value, again triggering recomputations
- As long as there are no event cycles, we are fine!

## State Model

- Globals `content`, `values`, and `deps` are objects keyed on cell locations A1, B1, and C1.
- `content` holds the user's entered content
- `values` are the current computed values
- `deps` are the dependencies of the formula in `content`

## Runaway detection
- There is a query over the event bus for more than 10 updates to occur within 5ms of each other. If such an event is detected, the line `Cyclical formula detected` is logged to the console, and the process will then exit with an error code.

```js
bus
    .query(({ type }) => type === "cell/value/set")
    .pipe(bufferTime(5))
    .subscribe((buffer) => {
      if (buffer.length > 10) {
        console.log("Cyclical formula detected");
        fnExit();
        process.exit(1);
      }
    });
```

