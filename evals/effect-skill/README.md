# effect-from-language — Skill Forge & Eval Suite

This directory is a [Waza](https://microsoft.github.io/waza/) evaluation suite that
**builds and hardens** the `effect-from-language` skill — a skill that turns
plain-language descriptions of side-effects (HTTP calls, streaming chat,
animation, autocomplete, etc.) into typed [`@rxfx/effect`](../../effect) code.

The skill is developed **test-case-first**: you (the human) approve one natural-language
scenario at a time, an evaluator checks whether the current skill already produces
the right effect code, and — only if needed — the skill is edited until it passes,
across two models. Each approved case ends in a git commit.

---

## What's in here

```
evals/effect-skill/
  README.md            ← you are here
  eval.yaml            Waza eval spec (models, graders, task glob)
  tasks/               One YAML per test case (natural-language prompt + expectations)
  fixtures/
    known-outputs/     Expected effect .ts per task (structural reference)
    tsconfig.json      Type-checks generated code against @rxfx/effect
    package.json       Dev shim so `tsc` can resolve @rxfx/effect
  agents/
    orchestrator.agent.md      Drives the loop, pauses for you, commits
    test-case-creator.agent.md Proposes ONE new test case at a time
    skill-writer.agent.md      Writes/extends the skill to pass cases
    evaluator.agent.md         Runs Waza across 2 models, grades pass/fail
```

The skill itself lives outside this folder, at
[`.github/skills/effect-from-language/`](../../.github/skills), so VS Code can
discover it like any other skill.

---

## Prerequisites

- macOS / Linux / Windows Bash
- Node + a working `npx tsc` (TypeScript) — used by the compile grader
- Access to the models the eval runs against (`claude-sonnet-4.6`, `gpt-4o`)
  via Waza's `copilot-sdk` executor

---

## 1. One-time setup

Run the **Setup** agent (or do it by hand). It:

1. Installs the Waza CLI:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash
   waza --version
   ```
2. Scaffolds this suite (`eval.yaml`, `tasks/`, `fixtures/`, the four `agents/`),
   and an empty skill stub at `.github/skills/effect-from-language/SKILL.md`.
3. Confirms `tsc` can resolve `@rxfx/effect` from `fixtures/`.

> No model access yet? Start with `executor: mock` in `eval.yaml` to scaffold and
> smoke-test the graders locally, then switch to `copilot-sdk` once credentials
> are available.

---

## 2. The development loop

Launch the **Orchestrator** agent. For each test case it runs:

1. **TestCaseCreator** proposes ONE new case — a natural-language prompt, the
   expected effect `.ts` (in `fixtures/known-outputs/`), and structural
   assertions (which factory, request/response/state types, `initialState`).
   → It shows you the case; **you approve** before anything is written.
2. **Evaluator** runs `waza run` and checks whether the *current* skill already
   produces passing code — on both models.
3. If it fails, **SkillWriter** edits `effect-from-language/SKILL.md` (adding a
   mapping rule, a disambiguation question, or a template) and the Evaluator
   re-runs until green.
4. The loop **pauses for you to say `continue`**, then makes a git commit
   summarizing the change and begins the next case.

You are always in the loop: nothing is committed without an approved, passing case.

---

## 3. Writing your own examples & evals

Add a case by hand any time — the agents just automate this shape.

**a. Write a task** in `tasks/`, e.g. `tasks/tc-20-poll-status.yaml`:

```yaml
id: tc-20-poll-status
name: Poll a job status (switching)
description: New status request cancels the previous poll.
inputs:
  prompt: "Poll a job's status by id; a newer request cancels the older poll."
expected:
  output_contains:
    - "createSwitchingEffect"   # correct concurrency factory
    - "jobId"                   # request type token
```

**b. Add the expected output** in `fixtures/known-outputs/tc-20-poll-status.ts`
as the structural reference a reviewer can diff against (factory + types +
`initialState` presence — formatting/naming may differ).

**c. Run it:**

```bash
# from evals/effect-skill/
waza run effect-skill --task "tc-20*" -v

# both models + compare
waza run effect-skill --model claude-sonnet-4.6 -o sonnet.json
waza run effect-skill --model gpt-4o            -o gpt4.json
waza compare sonnet.json gpt4.json

# view results
waza serve   # http://localhost:3000
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

- **Compile grader** — `tsc --noEmit` on the generated file (must type-check
  against `@rxfx/effect`).
- **Structural graders** — regex/keyword checks for the chosen factory name,
  request/response/state type tokens, and `initialState` presence.

This keeps grading tolerant of formatting and variable-name differences between
the two models while still pinning the semantics.

---

## Tips

- Keep prompts realistic and one-concern each; a few sharp graders beat many
  brittle ones.
- Tag tasks (`tags: [basic, edge-case]`) to filter runs with `--tags`.
- Cache during iteration: `waza run effect-skill --cache --cache-dir .waza-cache`.
- The `@rxfx/effect` source in [`effect/src/createEffect.ts`](../../effect/src/createEffect.ts)
  and specs in [`effect/test/createEffect.spec.ts`](../../effect/test/createEffect.spec.ts)
  are the ground truth for both known-outputs and disambiguation behavior.
