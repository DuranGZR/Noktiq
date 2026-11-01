# Contributing to Noktiq

Noktiq helps people give coding agents clear visual change requests in React and Vue projects. Bug fixes, reproducible compatibility reports and focused improvements are welcome.

## Before starting

Open an issue first for a substantial feature, framework integration or UI change. Explain the problem and a concrete example. Keep the existing mascot and interaction design unless a design change has been agreed.

For bugs, include the Noktiq/framework/build-tool/browser versions, reproduction steps and expected versus actual behavior. A small repository or code sample is especially useful. Remove credentials, private project code and personal paths from shared examples. Follow [SECURITY.md](SECURITY.md) for vulnerabilities.

## Run locally

Use a Node version supported by the installed Vite toolchain. From the repository root:

```sh
npm ci
npm run build
npm run dev:react
```

Use `npm run dev:vue` in another terminal for the Vue demo. Examples consume `dist`; rebuild after library changes. The [developer guide](docs/guide.tr.md) covers Next, Nuxt, Webpack and browser fixtures.

## Before a pull request

Keep the change focused and follow the surrounding code. Add a small meaningful test for changed logic. For normal SDK changes run:

```sh
npm run build
npm run typecheck
npm test
```

For selection, targeting or UI changes, also build the examples and run the relevant browser tests. Use `npm run verify:package` for package changes and the compatibility/ecosystem suites for affected integrations. Report the exact commands run and any checks skipped; documentation-only edits do not require the entire browser matrix.

Run `npm run check:release` before sharing new report files. Published report excerpts replace the local project root with `[project]`; raw test outputs stay under ignored local directories. Do not include `.env`, installed dependencies, generated packages or raw recordings.

By submitting a contribution, offer your original changes under the project's [PolyForm Shield 1.0.0 license](LICENSE). Only contribute material you have the right to share, and preserve applicable third-party notices. This does not transfer your copyright to the maintainer.
