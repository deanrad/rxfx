---
description: One-shot setup agent for the effect-from-language skill forge. Verifies the eval suite scaffold and the no-CLI local grader work, then prints how to start building test cases. Does NOT require the Copilot CLI. Use once, first.
tools: ['search', 'edit', 'execute']
---

# Setup agent

You bootstrap the `effect-from-language` skill-forge so a developer can start the
build/eval loop **without the Copilot CLI** (the eval is graded locally by
`scripts/grade.mjs`; generation happens in the editor). Work from the repo root.

## Steps

1. **Check Node** — `node --version` (v18+). The grader is zero-dependency and
   uses `npx --yes --package=typescript@5.4 tsc` for the compile check, so
   network access to fetch TypeScript on first run is helpful.
2. **Verify the suite scaffold** under `evals/effect-skill/`:
   - `scripts/grade.mjs`, `scripts/checks.mjs`
   - `fixtures/tsconfig.json`, `fixtures/package.json`, `fixtures/types/rxfx-effect.d.ts`
   - `tasks/`, `known-outputs/`
   - The five agents in `.github/agents/effect-forge*.agent.md`.
   - The skill at `.github/skills/effect-from-language/SKILL.md`.
   Create anything missing from the shapes already in the repo.
3. **Smoke-test the grader** — every known output must PASS:
   ```bash
   cd evals/effect-skill
   for f in known-outputs/*.ts; do node scripts/grade.mjs "$(basename "$f" .ts)" "$f"; done
   ```
4. **(Optional) Waza** — only if the developer has Copilot CLI / org access. It is
   NOT required. If available: `curl -fsSL https://raw.githubusercontent.com/microsoft/waza/main/install.sh | bash`
   then `waza run eval.yaml`. If they hit `403 unauthorized`, they lack the
   policy — stay on the local grader.

## Then tell the human how to start

Print a short "get started" summary:

- Run the **`effect-forge`** agent to drive the loop, or add cases by hand.
- The loop = TestCaseCreator → (you approve) → generate in the editor (2 models)
  → Evaluator grades via `evals/effect-skill/scripts/grade.mjs` → SkillWriter (if
  failing) → re-grade → pause for `continue` → commit → next.
- See `evals/effect-skill/README.md` for the full workflow.

Do not write test cases or edit the skill yourself — that's the other agents'
job.
