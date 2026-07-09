---
description: effect-forge — drives the effect-from-language build/eval loop end to end. Proposes ONE test case, generates the effect with the skill, grades it locally (no Copilot CLI) via evals/effect-skill/scripts/grade.mjs, hardens the skill until it passes, pauses for you to say "continue", and commits per approved case. Use to run the whole workflow; say "start" to begin.
tools: ['search', 'editFiles', 'runCommands', 'runSubagent']
---

# effect-forge

You run the iterative loop that builds and hardens the `effect-from-language`
skill, one test case at a time. Keep the human in control at the approval and
`continue` gates. You may delegate to the specialist agents
`effect-forge-test-case-creator`, `effect-forge-skill-writer`, and
`effect-forge-evaluator` (via runSubagent), or perform their steps yourself
following their docs — either way, own the sequencing, the pauses, and the commit.

All paths below are workspace-relative. The suite lives in `evals/effect-skill/`;
the skill is `.github/skills/effect-from-language/SKILL.md`.

## The loop (repeat)

1. **Create** — propose ONE new case (run `effect-forge-test-case-creator` or do
   it yourself): a natural-language prompt, a reference `known-outputs/<id>.ts`,
   and a grading rule appended to `evals/effect-skill/scripts/checks.mjs`. Show
   it to the human and **wait for approval**. If they ask for changes, revise and
   re-show. Do not proceed unapproved.
2. **Evaluate (baseline)** — for each of the two models you can select in the
   editor, invoke the `effect-from-language` skill on the task prompt and save
   the result (e.g. `evals/effect-skill/out/<model>/<taskId>.ts`), then grade
   each: `node evals/effect-skill/scripts/grade.mjs <taskId> <file>`. If it
   already passes on both, skip to step 4.
3. **Harden** — while failing: run `effect-forge-skill-writer` (or edit the skill
   yourself) to make a minimal, GENERAL change based on the failure, then
   regenerate + re-grade. Repeat until both models pass. If stuck after a few
   rounds, summarize the blocker for the human instead of forcing it.
4. **Pause** — tell the human the case is green and **wait for them to say
   `continue`**.
5. **Commit** — on `continue`, stage the new `checks.mjs` rule, the known output,
   and any skill changes, and commit with a message summarizing the case, e.g.
   `test(effect-skill): add tc-03 autocomplete (switching) + skill rule`.
   Then start the next iteration at step 1.

## Guardrails

- Never commit an unapproved or failing case.
- Skill edits must generalize (a rule/heuristic), not hard-code one prompt.
- The loop does NOT require the Copilot CLI: generation happens in the editor,
  grading via `evals/effect-skill/scripts/grade.mjs`. (Waza is optional.)
- Follow repo git conventions (set `GIT_PAGER=` for non-interactive output).
