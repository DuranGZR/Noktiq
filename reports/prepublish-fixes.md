# Noktiq pre-publication fixes

The issues found in the 30 October 2026 code audit were corrected and verified before publication. The first npm release followed this validation; see the [npm release verification](npm-release.md). No GitHub upload was performed.

| Issue | Change | Verification |
| --- | --- | --- |
| Notes overwritten by another tab | Writes now apply an individual save/delete/clear operation to the latest validated data. An IndexedDB read/write transaction coordinates localStorage writes across tabs; storage events refresh other tabs. A stale draft cannot recreate a remotely deleted note. | Simultaneous React/Vue tab saves, remote deletion with draft text preserved, synchronized clearing and reload. |
| Incorrect source for Vue kebab-case components | The template parser uses Vue DOM parser options, keeping component calls separate from native HTML definitions. Child source metadata is preserved. | Native source checked for `<child-card>`, `<ChildCard>` and `<router-link>` fixtures in Chrome, Firefox and WebKit; original child file/line/column verified. |
| Toolbar trapped in a background native dialog | Native modal hit testing and focus state identify the active dialog before selecting its overlay container. | Two dialogs opened in reverse DOM order, editor focus, closing the top dialog and returning to the remaining dialog. |
| Hidden text and custom element side effects | Text is collected with read-only DOM traversal, preserving block boundaries and excluding SVG descriptions and inert template content. Private/form/hidden subtrees are excluded without cloning or recreating custom elements. | Hidden text changes retain the visible target; custom element constructor count stays unchanged. |
| Wrong Next version in a shared installation | Next is resolved from the application's working directory rather than the Noktiq module directory. | Unit cases for Next 14, 15.2, 15.5 and 16; actual Next 14 schema accepts configuration produced by the shared integration. |
| Broken links in the npm documentation | `npm run pack:release` prepares an archive with its own text-based README and consumer documentation. Repository-only report/fixture references are labeled as source-checkout material. Packaged and installed documentation links are checked. | Actual tarball installed in separate React and Vue projects; all compiled files compared, links validated and production builds completed. |
| English UI references | README uses **Details**, Delete hover styling matches the English accessible label, and group counts use **selected**. | Source review and browser workflow coverage. |
| Stale compatibility test builds | Every framework fixture checks every installed compiled file and clears its own generated caches before testing. Reports record the tested SDK hash. Tests wait for asynchronous saves to complete before reading durable data. | Fresh framework builds and matching SDK hashes in current UI, legacy UI and framework reports. |

## Final validation

Verified again on 1 November 2026. The browser, current ecosystem, package and 10-project framework checks were rerun against the freshly built sources.

Additional regression coverage verifies that remote deletion during rebinding restores the toolbar controls, SVG descriptions and inert content are omitted, block text remains separated, and stacked native dialogs work with non-interactive backdrops.

SDK SHA-256: `0eb85d61e600f731a0f5343695dc29615e425c8cda1020077ec0c37e99970c7b`.

- 32 unit tests passed; TypeScript checking passed.
- 266 browser scenarios passed: 118 Chrome, 74 Firefox and 74 WebKit; no skipped, flaky or failed scenarios.
- 78 current UI ecosystem scenarios passed in this run. The previous 26 older UI major scenarios also passed for the exact same SDK hash; that older UI run was not repeated today.
- 10 isolated compatibility projects passed: Next 14/15/16 with App/Pages Router and Webpack/Turbopack; React 18/19 with Vite; React Three Fiber DOM integration; Vue 3.4; Nuxt 3/4.
- React-only and Vue-only consumers installed the prepared tarball and built without the other framework or optional Next runtime.
- Standalone Webpack development/production and Next 16 development/production guards were checked by the integration verifier.
- The README recording was regenerated using the real toolbar, two annotations, verified original source positions, pins and actual clipboard text.

Detailed evidence: [browser validation](validation.md), [framework matrix](compatibility.md), [current ecosystem](ecosystem-current.md), [older UI majors](ecosystem-legacy.md), [captured request](../docs/walkthrough-request.md).

## Boundaries

Notes stay in localStorage; IndexedDB coordinates writes and does not hold note content. If either durable storage or coordination is unavailable, the UI warns and preserves notes in memory. Copy memory-only notes before a full reload. Pending changes are reconciled with remote notes when storage recovers; a pending clear does not erase notes added remotely afterward.

The repository README keeps the GIF/video showcase. The prepared npm archive stays small and does not depend on media or repository URLs that have not been published. The first npm release used the reviewed archive after account, name and release metadata checks. A repository lifecycle guard prevents accidental directory publication.

Compatibility results describe the tested fixtures and versions, not every application, browser or framework combination. Installation of the published npm package was subsequently verified in clean React and Vue projects; see the [npm release verification](npm-release.md). Physical Safari/iPhone testing and deployment into the user's own projects remain outside these checks.
