#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

/**
 * Compute reverse topological order of workspace packages.
 * Returns packages ordered such that dependencies come before dependents.
 */

// Read workspace list
const workspacesJson = execSync("yarn workspaces list --json", {
  cwd: process.cwd(),
  encoding: "utf-8",
});

const workspaces = workspacesJson
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));

// Build dependency graph
const pkgMap = new Map(); // name -> { location, version, deps }
const locMap = new Map(); // location -> name

for (const ws of workspaces) {
  locMap.set(ws.location, ws.name);
  const pkgJsonPath = path.join(ws.location, "package.json");
  try {
    const content = fs.readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const internalDeps = [];

    // Collect internal workspace dependencies
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    for (const [depName] of Object.entries(allDeps)) {
      // Find if this dependency is a workspace package
      for (const w of workspaces) {
        if (w.name === depName) {
          internalDeps.push(depName);
          break;
        }
      }
    }

    pkgMap.set(ws.name, {
      location: ws.location,
      version: pkg.version,
      deps: internalDeps,
    });
  } catch (e) {
    // Skip if can't read
  }
}

// Topological sort (dependencies first)
function topologicalSort(pkgMap) {
  const visited = new Set();
  const result = [];

  function visit(pkgName) {
    if (visited.has(pkgName)) return;
    visited.add(pkgName);

    const pkg = pkgMap.get(pkgName);
    if (!pkg) return;

    // Visit dependencies first
    for (const depName of pkg.deps) {
      visit(depName);
    }

    result.push(pkgName);
  }

  // Visit all packages
  for (const pkgName of pkgMap.keys()) {
    visit(pkgName);
  }

  return result;
}

const sorted = topologicalSort(pkgMap);

// Print the packages in reverse topological order
console.log(
  "=== Packages in reverse topological order (dependencies first) ===\n",
);
sorted.forEach((pkgName, idx) => {
  const pkg = pkgMap.get(pkgName);
  const deps = pkg.deps.length > 0 ? ` (deps: ${pkg.deps.join(", ")})` : "";
  console.log(`${idx + 1}. ${pkgName}${deps}`);
  console.log(`   location: ${pkg.location}, version: ${pkg.version}`);
});

// Generate the version bump command
console.log("\n=== Command to bump all versions (patch) ===\n");
const bumpCommands = sorted
  .filter((name) => pkgMap.get(name).location !== ".")
  .map((name) => {
    const location = pkgMap.get(name).location;
    return `yarn workspace ${name} version patch`;
  })
  .join(" && ");

const fullCommand = `${bumpCommands} && yarn version apply`;

console.log("Single command:");
console.log(fullCommand);

console.log("\n=== Or run these commands in sequence ===\n");
sorted
  .filter((name) => pkgMap.get(name).location !== ".")
  .forEach((name, idx) => {
    console.log(`${idx + 1}. yarn workspace ${name} version patch`);
  });
console.log(
  `${
    sorted.filter((name) => pkgMap.get(name).location !== ".").length + 1
  }. yarn version apply`,
);
