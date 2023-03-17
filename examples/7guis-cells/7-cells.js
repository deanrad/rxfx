"use strict";
const React = require("react");
const { Text, Box, useInput, useApp, useStdout } = require("ink");
const InkText = require("ink-text-input");
const { useEffect, useState } = require("react");
const UncontrolledTextInput = InkText.UncontrolledTextInput;
const { bufferTime } = require("rxjs/operators");

const { bus } = require("./bus");

const contents = {};
const deps = {};
const values = { A1: null, B1: null, C1: null };

const evaluateFormula = (formula) => {
  // console.log({ formula });
  const depCells = formula.substr(1).split("+");
  const newValue = depCells.reduce(
    (total, one) =>
      total +
      (Number.parseInt(one, 10) ? Number(one) : Number(values[one] || 0)),
    0
  );
  return [newValue, depCells];
};

bus.listen(
  ({ type }) => type === "cell/content/set",
  ({ payload: [field, value] }) => {
    contents[field] = value;
    let newValue;
    if (value.startsWith("=")) {
      const [val, depCells] = evaluateFormula(value);
      newValue = val;
      deps[field] = depCells;
    } else {
      newValue = Number(value);
    }
    values[field] = newValue;
    bus.trigger({ type: "cell/value/set", payload: [field, newValue] });
  }
);

bus.listen(
  ({ type }) => type === "cell/value/set",
  ({ payload }) => {
    const [field] = payload;
    for (let [key, depArray] of Object.entries(deps)) {
      if (depArray.includes(field)) {
        const [newValue] = evaluateFormula(contents[key]);
        values[key] = newValue;
        bus.trigger({ type: "cell/value/set", payload: [key, newValue] });
      }
    }
    // console.log(JSON.stringify(values));
  }
);

const runawayDetect = (fnExit) => () => {
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
};

const Cell = ({ label, isActive }) => {
  return (
    <Box borderStyle="single" color={isActive ? "green" : "white"}>
      <UncontrolledTextInput
        key={label}
        focus={isActive}
        placeholder={isActive ? "Formula" : "-------"}
        onSubmit={(value) =>
          bus.trigger({ type: "cell/content/set", payload: [label, value] })
        }
      />
    </Box>
  );
};

const Current = () => {
  const [vals, setVals] = useState(values);
  useEffect(() => {
    bus.listen(
      (e) => e.type === "cell/value/set",
      () => {
        setVals({ ...values });
      }
    );
  }, []);

  return (
    <Box
      height={5}
      width={72}
      color="green"
      borderStyle="single"
      borderColor="white"
      flexGrow="1"
      justifyContent="space-around"
    >
      <Text key="v1">Values: </Text>
      {Object.keys(vals).map((label) => {
        return (
          <Text key={"v" + label}>
            {vals[label] === null ? " " : vals[label]}
          </Text>
        );
      })}
    </Box>
  );
};

const App = () => {
  const [active, setActive] = React.useState("A1");
  const { exit } = useApp();
  const { stdout } = useStdout();

  // runaway detection if we exceed 10 in 5 msec
  useEffect(
    runawayDetect(() => {
      stdout.write(
        "\n!!! Runaway calculation detected. (Do you have a dependency cycle?) !!!\n\n"
      );
      exit();
    }),
    []
  );

  useInput((input, key) => {
    if (key.rightArrow || key.return) {
      setActive((old) => (old === "A1" ? "B1" : old === "B1" ? "C1" : "A1"));
    }
    if (key.leftArrow) {
      setActive((old) => (old === "A1" ? "C1" : old === "B1" ? "A1" : "B1"));
    }
    if (input === "q") {
      process.exit(0);
    }
  });

  return (
    <>
      <Text>Enter to Save. Arrows to move. 'q' to Quit.</Text>
      <Text>
        Formula may contain A1,B1,C1, or number, with + (example: =A1+5)
      </Text>
      <Box
        height={3}
        width={72}
        borderStyle="double"
        borderColor="cyanBright"
        justifyContent="center"
      >
        <Text key="h1" color="cyan" flexGrow="1" bold={true}>
          7GUIs - Cells
        </Text>
      </Box>
      <Box
        height={4}
        width={72}
        color="green"
        borderStyle="single"
        borderColor="white"
        flexGrow="1"
        justifyContent="space-around"
      >
        <Text key="h1">\</Text>
        <Text key="h2">A1</Text>
        <Text key="h3">B1</Text>
        <Text key="h4">C1</Text>
      </Box>
      <Box
        height={5}
        width={72}
        color="green"
        borderStyle="single"
        borderColor="white"
        flexGrow="1"
        justifyContent="space-around"
      >
        <Text key="c1">Contents:</Text>
        {["A1", "B1", "C1"].map((label) => {
          return <Cell key={label} label={label} isActive={label === active} />;
        })}
      </Box>
      <Current />
    </>
  );
};

module.exports = App;
