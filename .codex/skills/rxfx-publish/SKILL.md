---
name: rxfx-publish
description: Use when publishing one or more packages from this rxfx monorepo to npm, especially after version bumps. Handles npm login, dependency-order publishing, plain npm publish commands from each package directory, and OTP reuse or refresh during the release flow.
---

# Rxfx Publish

## Overview

Publish rxfx workspace packages to npm with plain `npm`, not `yarn`.
Use this skill when the user wants to release a single package or a set of bumped packages from this repo.

## Rules

- Publish from the target package directory with `npm publish --access public --registry=https://registry.npmjs.org`.
- Do not use `yarn npm publish` unless the user explicitly asks for it.
- If npm auth is invalid, repair it with `npm login --registry=https://registry.npmjs.org`.
- Expect npm to require an authenticator code during login and again during publish.
- Reuse the most recent OTP when publishing multiple packages in quick succession.
- If npm returns `EOTP`, stop and ask the user for a fresh authenticator code.
- If npm returns `E401`, the saved npm credentials are invalid; rerun `npm login`.
- If npm returns `404` on publish, treat it as a scope/account permission problem and verify the logged-in npm identity before continuing.

## Dependency Order

Publish in dependency order so downstream packages can resolve newly published upstream versions:

1. `after`
2. `ajax`
3. `perception`
4. `animation`
5. `operators`
6. `bus`
7. `effect`
8. `fsa`
9. `service`
10. `peer`
11. `react`
12. `all`

Package-to-name mapping:

- `after` -> `@rxfx/after`
- `ajax` -> `@rxfx/ajax`
- `perception` -> `@rxfx/perception`
- `animation` -> `@rxfx/animation`
- `operators` -> `@rxfx/operators`
- `bus` -> `@rxfx/bus`
- `effect` -> `@rxfx/effect`
- `fsa` -> `@rxfx/fsa`
- `service` -> `@rxfx/service`
- `peer` -> `@rxfx/peer`
- `react` -> `@rxfx/react`
- `all` -> `rxfx`

## Release Workflow

### 1. Verify package versions to publish

- Inspect changed `package.json` files.
- Confirm the target packages have the intended bumped versions before publishing.
- If the user asks to publish all bumped packages, publish only the workspaces whose `version` fields changed for the release.

### 2. Verify npm auth

- Preferred check:
  `npm whoami --registry=https://registry.npmjs.org`
- If that fails with `401`, run:
  `npm login --registry=https://registry.npmjs.org`

Login flow:

1. Enter username.
2. Enter password.
3. Enter public email if prompted.
4. Ask the user for the authenticator code when npm prompts for OTP.

### 3. Publish a single package

From the package directory:

```bash
npm publish --access public --registry=https://registry.npmjs.org
```

If npm asks for `Enter OTP:`, request the code from the user and submit it.

### 4. Publish multiple packages

- Walk the dependency order listed above.
- Skip packages the user does not want to publish.
- For each package, run:

```bash
npm publish --access public --registry=https://registry.npmjs.org --otp=<latest_code>
```

- Keep reusing the latest code until npm rejects it.
- On `EOTP`, ask the user for a fresh code and retry the current package.

## Reporting

When done, report:

- which packages published successfully
- which package, if any, failed
- whether npm auth was refreshed during the process
- any package-order or dependency caveats noticed during publish
