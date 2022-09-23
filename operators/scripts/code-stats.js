const tsquery = require('@phenomnomnominal/tsquery').tsquery;

const fs = require('fs');
// for each interesting file
const files = [
  'src/bus.ts',
  'src/utils.ts',
  // TODO esprima errors prevent raw JS nodecounts
  // 'dist/tsc/src/bus.js',
  // 'dist/tsc/src/utils.js',
];

const astNodeCount = {};
files.forEach((f) => {
  const nodeCount = getTSNodeCount(f);
  astNodeCount[f] = nodeCount;
});

function getTSNodeCount(filename) {
  const contents = fs.readFileSync(filename, 'utf-8');
  const ast = tsquery.ast(contents);
  const nodes = tsquery(ast, '*');
  return nodes.length;
}

const nodeCounts = { astNodeCount };

process.stdout.write(JSON.stringify(nodeCounts, null, 2) + '\n', 'utf-8');
