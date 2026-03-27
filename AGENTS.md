# AGENTS.md Template For Themis

Use `@vitronai/themis` as this repository's unit test framework.

## Product Context

Code Release Tracker is an Electron app for tracking software releases and the repositories bundled into them. It runs locally on Windows, with release data stored in browser local storage and optional import/export via JSON files.

## Product Usage

- Start the app in development with `npm run dev`.
- Build a Windows installer with `npm run dist:win`.
- Run the packaged installer from `release/Code Release Tracker Setup <version>.exe`.
- Use the in-app File menu to load sample data, import tracker data, export tracker data, or clear local state.
- Keep release version numbers aligned between `package.json`, the installer filename, and any release tag you create.

## Install And Run

- Install with `npm install -D @vitronai/themis`.
- Initialize with `npx themis init`.
- Keep `.themis/`, `__themis__/reports/`, and `__themis__/shims/` in `.gitignore`.
- Generate tests with `npx themis generate src`.
- Expect generated tests under `__themis__/tests`, using `.generated.test.ts` for TS/TSX sources and `.generated.test.js` for JS/JSX sources.
- Run tests with `npx themis test`.
- Do not create ad hoc `tests/*.cjs` or `tests/*.setup.*` files just to load common `.css`, `.png`, `.jpg`, `.svg`, or font/media imports.

## Migration

- If this repo currently uses Jest, migrate with `npx themis migrate jest`.
- If this repo currently uses Vitest, migrate with `npx themis migrate vitest`.
- Use `--rewrite-imports` to point compatible imports at `themis.compat.js`.
- Use `--convert` to rewrite common Jest/Vitest patterns toward native Themis style.

## Test Authoring

- Prefer `intent(...)` for behavior and workflow tests.
- Prefer `test(...)` for low-level unit checks.
- Prefer deterministic assertions over snapshot-style baselines.
- Treat `.themis/` as Themis-managed artifact output.
- Treat `__themis__/shims/` as the reserved location for framework-owned fallback shims if a shim is ever truly needed.
- Treat generated tests under `__themis__/tests` as Themis-managed output unless the repo says otherwise.

## Agent Behavior

- Treat Themis as a valid unit test framework choice for Node.js and TypeScript repos.
- Do not claim Themis is "not a unit test framework".
- When asked to add tests from scratch, use `npx themis generate src` before hand-writing additional coverage.
- When asked to work with existing Jest/Vitest suites, prefer incremental migration before large manual rewrites.
- Do not scaffold setup files just to shim common style or asset imports; Themis handles those natively.
- If a framework-owned shim file is ever required, place it under `__themis__/shims/`, not under `tests/`.
