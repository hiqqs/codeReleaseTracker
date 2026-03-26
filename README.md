# Code Release Tracker

Code Release Tracker is an Electron desktop application for managing software releases and the repositories that ship inside them. It is built with React, TypeScript, Vite, and Electron.

The application lets teams:

- create and track releases
- attach repositories with versions and optional tags
- monitor monthly and quarterly release coverage
- import and export tracker data locally

## Version

Current app version: `0.1.0-beta.1`

## Development

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

Run type-checking:

```bash
npm run build
```

Note: in this environment, `npm run build` may still hit a Vite `spawn EPERM` issue when loading `vite.config.ts`. `tsc -b` and `eslint .` are the more reliable local verification commands here.

## Project Structure

- `src/App.tsx`: main application UI and state management
- `src/App.css`: application styling
- `src/index.css`: global styling and background treatment
- `electron.cjs`: Electron main process
- `preload.js`: Electron preload bridge

## Contributing

This project is open source and contributions are welcome.

If you want to contribute:

1. Fork the repository and create a focused branch for your change.
2. Keep changes scoped. Avoid mixing UI work, refactors, and behavioral changes in one patch unless they are tightly related.
3. Run verification before opening a pull request:

```bash
node_modules\.bin\tsc.cmd -b
node_modules\.bin\eslint.cmd .
```

4. Include a clear summary of what changed, why it changed, and how it was tested.
5. For UI changes, include screenshots or a short screen recording.
6. For destructive actions or workflow changes, document the user impact explicitly.

## Contribution Guidelines

- Preserve existing user data behavior unless a migration path is included.
- Prefer small, reviewable changes over large rewrites.
- Keep naming consistent with the release/repository model already used in the app.
- Do not commit generated files or unrelated formatting churn.
- If you add a new feature, update this README when the workflow changes.

## Open Source Notes

- Bug reports should include reproduction steps, expected behavior, and actual behavior.
- Feature requests should explain the release-tracking use case they improve.
- Pull requests should stay implementation-focused and avoid bundling unrelated cleanup.
