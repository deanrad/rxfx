#!/usr/bin/env node
// Local, no-Copilot-CLI grader for the effect-from-language skill.
//
// It runs the SAME checks as the Waza tasks (structural regex + TypeScript
// compile against the local @rxfx/effect shim) without needing any LLM CLI.
// The GENERATION step is done by you in the editor (invoke the
// effect-from-language skill with any model you're authorized for); this script
// just grades the result — so the whole loop works without Copilot CLI access.
//
// Usage:
//   node scripts/grade.mjs <taskId> path/to/effect.ts
//   node scripts/grade.mjs <taskId> --text path/to/response.txt   # ambiguous "asks" cases
//   node scripts/grade.mjs --all <dir>    # grades <dir>/<taskId>.ts for every task
//   node scripts/grade.mjs --list         # list task ids
//
// Exit code 0 = pass, 1 = fail (or usage error).

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tasks, findTask } from './checks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(HERE, '..');
const FIXTURES = join(SUITE, 'fixtures');

function grn(s) { return `\x1b[32m${s}\x1b[0m`; }
function red(s) { return `\x1b[31m${s}\x1b[0m`; }

function gradeText(task, text) {
  const reasons = [];
  for (const re of task.mustMatch) {
    if (!re.test(text)) reasons.push(`missing expected pattern ${re}`);
  }
  for (const re of task.mustNotMatch ?? []) {
    if (re.test(text)) reasons.push(`found forbidden pattern ${re}`);
  }
  return reasons;
}

function compile(candidatePath) {
  const dir = mkdtempSync(join(tmpdir(), 'effect-grade-'));
  try {
    cpSync(FIXTURES, dir, { recursive: true });
    writeFileSync(join(dir, 'effect.ts'), readFileSync(candidatePath, 'utf8'));
    execFileSync(
      'npx',
      ['--yes', '--package=typescript@5.4', 'tsc', '-p', 'tsconfig.json'],
      { cwd: dir, stdio: 'pipe' }
    );
    return null; // success
  } catch (err) {
    const out = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    return out.trim() || 'tsc failed';
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function gradeOne(taskId, candidatePath, isText) {
  const task = findTask(taskId);
  if (!task) {
    console.error(`Unknown task: ${taskId}. Try --list.`);
    return false;
  }
  if (!existsSync(candidatePath)) {
    console.log(`${red('FAIL')} ${taskId} — candidate not found: ${candidatePath}`);
    return false;
  }
  const content = readFileSync(candidatePath, 'utf8');
  const reasons = [];

  if (task.asks && !isText) {
    console.log(
      `${red('FAIL')} ${taskId} — this is an "asks" case; grade the response ` +
        `text with --text <file>, not a .ts file.`
    );
    return false;
  }

  reasons.push(...gradeText(task, content));

  if (task.compile && !isText) {
    const compileErr = compile(candidatePath);
    if (compileErr) {
      const first = compileErr.split('\n').filter(Boolean)[0] ?? 'tsc failed';
      reasons.push(`does not compile: ${first}`);
    }
  }

  if (reasons.length === 0) {
    console.log(`${grn('PASS')} ${taskId}`);
    return true;
  }
  console.log(`${red('FAIL')} ${taskId}`);
  for (const r of reasons) console.log(`   - ${r}`);
  return false;
}

function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === '--list' || argv.length === 0) {
    for (const t of tasks) console.log(`${t.id}${t.asks ? '  (asks)' : ''}`);
    process.exit(argv.length === 0 ? 1 : 0);
  }

  if (argv[0] === '--all') {
    const dir = argv[1];
    if (!dir) { console.error('Usage: grade.mjs --all <dir>'); process.exit(1); }
    let pass = 0;
    for (const t of tasks) {
      const ext = t.asks ? '.txt' : '.ts';
      const candidate = join(resolve(dir), `${t.id}${ext}`);
      if (!existsSync(candidate)) {
        console.log(`${red('MISS')} ${t.id} — no ${t.id}${ext} in ${dir}`);
        continue;
      }
      if (gradeOne(t.id, candidate, !!t.asks)) pass++;
    }
    console.log(`\n${pass}/${tasks.length} passed`);
    process.exit(pass === tasks.length ? 0 : 1);
  }

  const taskId = argv[0];
  let isText = false;
  let candidatePath = argv[1];
  if (argv[1] === '--text') { isText = true; candidatePath = argv[2]; }
  if (!candidatePath) {
    console.error('Usage: grade.mjs <taskId> <file.ts> | <taskId> --text <file.txt>');
    process.exit(1);
  }
  process.exit(gradeOne(taskId, resolve(candidatePath), isText) ? 0 : 1);
}

main();
