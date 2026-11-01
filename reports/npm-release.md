# Noktiq 0.1.0 — npm release verification

Published and verified on 1 November 2026 under the npm account **durangzr**.

- Package: [noktiq on npm](https://www.npmjs.com/package/noktiq).
- Version: `0.1.0`; public access; `latest` tag.
- Registry: `https://registry.npmjs.org/`.
- Published archive SHA-1: `3c8727a9e7fba8c0dda14348085c9ec8f5d9886c`.
- Verified SDK SHA-256: `0eb85d61e600f731a0f5343695dc29615e425c8cda1020077ec0c37e99970c7b`.

The reviewed archive was published after interactive security-key verification. The registry version returned HTTP 200 and the same archive checksum. No GitHub upload was performed.

## Actual registry installation

Separate React and Vue projects installed `noktiq@0.1.0` from the public npm registry. Their lockfiles point to the published registry tarball, and all installed compiled files match the reviewed SDK.

Both projects passed:

- Development startup with the published source plugin and framework component.
- Element selection, note saving and a numbered pin.
- Captured source verified against the original `<button>` at its exact file, line and column: React `main.tsx:2:54`; Vue `App.vue:4:11`.
- Copy-output preview containing the saved request, with clipboard permission deliberately denied to verify the fallback.
- Page reload restoring the pin from durable storage.
- An explicit production build and preview with no Noktiq toolbar or source attributes.

## Install

```sh
npm install -D noktiq
```

Then follow the [React/Vue setup](../README.md#usage). Installation alone does not mount the toolbar; keep the documented development flag and source plugin.

Repository documentation was updated after publication. Documentation-only checkout changes do not replace the immutable `0.1.0` archive; any future npm update needs a new version.
