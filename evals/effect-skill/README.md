# effect-from-language — Skill Forge & Eval Suite

This directory **builds and hardens** the `effect-from-language` skill — a skill
that turns plain-language descriptions of side-effects (HTTP calls, streaming
chat, animation, autocomplete, etc.) into typed [`@rxfx/effect`](../../effect)
code.

It is developed **test-case-first**: you approve one natural-language scenario at
a time, generate the effect in the editor, a local grader checks whether the
current skill produces the right code, and — only if needed — the skill is edited
until it passes. Each approved case ends in a git commit.

> **No Copilot CLI required.** Generation happens in your editor (invoke the
> skill with any model you're authorized for). Grading is a zero-dependency Node
> script — `scripts/grade.mjs` — that runs structural checks + a TypeScript
> compile. [Waza](https://microsoft.github.io/waza/) is an **optional** path (see
> the appendix) for orgs whose Copilot CLI policy is enabled.

---

## What's in here

```
evals/effect-skill/
  README.md            ← you are here
  scripts/
    grade.mjs          Local grader (no LLM CLI): structural checks + tsc compile
    checks.mjs         Authoritative grading rules per task (single source of truth)
  known-outputs/       Reference effect .ts per task (must pass its own grade)
  fixtures/            Compile harness for the tsc check
    tsconfig.json      Type-checks generated code (strict, noEmit)
    package.json       Pins TypeScript
    types/
      rxfx-effect.d.ts Local @rxfx/effect declaration shim (self-contained)
  tasks/               Waza task YAMLs (OPTIONAL — used only if you run Waza)
  eval.yaml            Waza eval spec (OPTIONAL)
  agents/
    setup.agent.md             Verifies scaffold + local grader, prints next steps
    orchestrator.agent.md      Drives the loop, pauses for you, commits
    test-case-creator.agent.md Proposes ONE new test case at a time
    skill-writer.agent.md      Writes/extends the skill to pass cases
    evaluator.agent.md         Grades via scripts/grade.mjs across 2 models
```

The skill itself lives at
[`.github/skills/effect-from-language/`](../../.github/skills), so VS Code
discovers it like any other skill.

---

## Prerequisites

- Node 18+ (`node --version`).
- Network access on first grade so `npx` can fetch `typescript@5.4` for the
  compile check (cached afterwards).
- An editor with the `effect-from-language` skill available and at least one —
  ideally two — models you can select (to cross-check the skill across models).

No Waza, no Copilot CLI, no API keys needed for the local flow.

---

## 1. One-time setup

Run the **Setup** agent (or do it by hand). It verifies the scaffold and that the
local grader passes every known output:

```bash
cd evals/effect-skill
node --version
for f in known-outputs/*.ts; do node scripts/grade.mjs "$(basename "$f" .ts)" "$f"; done
# → every line should print: PASS <task-id>
```

---

## 2. The development loop

Launch the **Orchestrator** agent. For each test case:

1. **TestCaseCreator** proposes ONE new case — a natural-language prompt, the
   expected effect `.ts` (in `known-outputs/`), and its grading rule (in
   `scripts/checks.mjs`). → It shows you the case; **you approve** first.
2. **Generate** — in the editor, invoke the `effect-from-language` skill on the
   task prompt and save the output. To cover **two models**, switch the chat
   model and generate again (e.g. `out/claude/<id>.ts`, `out/gpt/<id>.ts`).
3. **Evaluator** grades each with `node scripts/grade.mjs <id> <file>` and checks
   whether the *current* skill already produces passing code on both models.
4. If it fails, **SkillWriter** edits
   [`effect-from-language/SKILL.md`](../../.github/skills/effect-from-language/SKILL.md)
   (a mapping rule, a disambiguation question, a template); regenerate + re-grade
   until green.
5. The loop **pauses for you to say `continue`**, then commits and starts the
   next case.

Nothing is committed without an approved, passing case.

---

## 3. Writing your own examples & evals

Add a case by hand any time — the agents just automate this shape.

**a. Add a grading rule** to `scripts/checks.mjs`:

```js
{
  id: 'tc-20-poll-status',
  prompt: "Poll a job's status by id; a newer request cancels the older poll.",
  mustMatch: [/createSwitchingEffect/, /@rxfx\/effect/, /jobId/],
  mustNotMatch: [/createQueueingEffect/, /createBlockingEffect/],
  compile: true,
}
```

For an ambiguous case (the skill should ASK), use
`{ asks: true, compile: false, mustMatch: [/concurren.../i, /\?/] }` and grade the
assistant's response text with `--text`.

**b. Add the expected output** in `known-outputs/tc-20-poll-status.ts` — the
reference a reviewer can diff against (correct factory + types + `initialState`
presence; formatting/naming may differ). It must pass its own grade.

**c. Generate + grade:**

```bash
# from evals/effect-skill/ — after generating out/claude/tc-20-poll-status.ts etc.
node scripts/grade.mjs tc-20-poll-status out/claude/tc-20-poll-status.ts
node scripts/grade.mjs tc-20-poll-status out/gpt/tc-20-poll-status.ts

# grade a whole directory at once
node scripts/grade.mjs --all out/claude

# sanity-check the reference output itself
node scripts/grade.mjs tc-20-poll-status known-outputs/tc-20-poll-status.ts

# list task ids
node scripts/grade.mjs --list
```

### Choosing the concurrency factory

The skill maps the *concurrency intent* in your prompt to a factory. Use this to
craft unambiguous prompts (or to deliberately test the disambiguation path):

| Intent in prompt | Factory | RxJS operator |
|------------------|---------|---------------|
| Run all in parallel (immediate) | `createEffect` / `createImmediateEffect` | `mergeMap` |
| Queue / one-at-a-time / serial | `createQueueingEffect` | `concatMap` |
| Ignore new while busy (blocking) | `createBlockingEffect` | `exhaustMap` |
| Cancel old, start new (switching) | `createSwitchingEffect` | `switchMap` |
| Cancel old, don't restart (toggling) | `createTogglingEffect` | `toggleMap` |
| Wait then cancel stale (debounce) | `createDebouncedEffect(ms)` | `switchMap` + delay |
| Throttle within a window | `createThrottledEffect(ms)` | `exhaustMap` + delay |

If a prompt gives **no** concurrency cue, the skill should **ask** rather than
guess — see the ambiguous seed case (`tc-08-upload-ambiguous`).

### Grading model

Cases are graded **structurally**, not by exact string match:

- **Compile check** — the generated file must type-check via `tsc` against the
  local `@rxfx/effect` shim.
- **Structural checks** — regexes for the chosen factory name, request/response/
  state type tokens, and `initialState` presence.

This keeps grading tolerant of formatting and variable-name differences between
models while still pinning the semantics.

---

## Appendix — Optional: running under Waza

If your org has the Copilot CLI policy enabled, you can also run the suite with
[Waza](https://microsoft.github.io/waza/), which drives real model runs and the
same checks via `tasks/*.yaml`:

```bash
curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash
cd evals/effect-skill
waza run eval.yaml --model claude-sonnet-4.6 -o sonnet.json
waza run eval.yaml --model gpt-4o            -o gpt4.json
waza compare sonnet.json gpt4.json
```

Notes for Waza 0.38.0: run by **spec path** (`waza run eval.yaml`), put per-task
graders at the **task root** (not under `expected:`), and set the executor in
`eval.yaml` (`copilot-sdk`). A `403 unauthorized: not authorized to use this
Copilot feature` means your policy isn't enabled — use the local grader instead.
`scripts/checks.mjs` remains the authoritative source for the local flow; keep
the `tasks/*.yaml` in sync only if you use Waza.

---

## Tips

- Keep prompts realistic and one-concern each; a few sharp checks beat many
  brittle ones.
- The `@rxfx/effect` source in [`effect/src/createEffect.ts`](../../effect/src/createEffect.ts)
  and specs in [`effect/test/createEffect.spec.ts`](../../effect/test/createEffect.spec.ts)
  are the ground truth for both known-outputs and disambiguation behavior.
