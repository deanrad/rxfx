---
name: rxfx-publish
description: Use when publishing one or more packages from this rxfx monorepo to npm, especially after version bumps. Handles Yarn npm auth, dependency-order publishing, and OTP reuse or refresh during the release flow.
---

# Rxfx Publish

## Overview

Publish rxfx workspace packages to npm with Yarn's npm plugin, not plain `npm`.
Use this skill when the user wants to release a single package or a set of bumped packages from this repo.

## Rules

- Never use `npm publish` for this Yarn monorepo.
- Publish from the target package directory with `YARN_NPM_PUBLISH_REGISTRY=https://registry.npmjs.org yarn npm publish --access public`.
- If npm auth is invalid, repair it with `yarn npm login`.
- Expect npm to require an authenticator code during login and again during publish.
- Reuse the most recent OTP when publishing multiple packages in quick succession.
- If npm returns `EOTP`, stop and ask the user for a fresh authenticator code.
- If npm returns `E401`, the saved npm credentials are invalid; rerun `yarn npm login`.
- If Yarn returns `YN0033`, the publish registry credentials are missing; rerun `yarn npm login`.
- If npm returns `404` on publish, first confirm Yarn is publishing to `https://registry.npmjs.org` rather than `https://registry.yarnpkg.com`.

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

### 0. Verify package builds

Run `yarn test:full` in the package directory

### 1. Verify package versions to publish

- Inspect changed `package.json` files.
- Confirm the target packages have the intended bumped versions before publishing.
- If the user asks to publish all bumped packages, publish only the workspaces whose `version` fields changed for the release.

### 2. Verify npm auth

- Preferred check:
  `yarn npm whoami --publish`
- If that fails with `401`, run:
  `yarn npm login`

Login flow:

1. Enter username.
2. Enter password.
3. Enter public email if prompted.
4. Ask the user for the authenticator code when npm prompts for OTP.

### 3. Publish a single package

From the package directory:

```bash
YARN_NPM_PUBLISH_REGISTRY=https://registry.npmjs.org yarn npm publish --access public
```

If npm asks for `Enter OTP:` or the command returns `EOTP`, request the code from the user and retry with `--otp=<code>`.

### 4. Publish multiple packages

- Walk the dependency order listed above.
- Skip packages the user does not want to publish.
- For each package, run:

```bash
YARN_NPM_PUBLISH_REGISTRY=https://registry.npmjs.org yarn npm publish --access public --otp=<latest_code>
```

- Keep reusing the latest code until npm rejects it.
- On `EOTP`, ask the user for a fresh code and retry the current package.

## Verify in CodeSandbox

Update the dependencies using a logged in browser here:
https://codesandbox.io/p/sandbox/rxfx-bell-effect-1-1-zk6289

Verify that no errors appear on load, and that the "Ring" button can be clicked without causing an error.

## Reporting

When done, report:

- which packages published successfully
- which package, if any, failed
- whether npm auth was refreshed during the process
- any package-order or dependency caveats noticed during publish
