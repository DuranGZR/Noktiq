# Noktiq ecosystem validation

current: 78 scenarios passed (chrome, firefox, webkit).

Tested: 2026-11-01T11:30:13.593Z

| Dependency | Tested version |
| --- | --- |
| react: vite | 7.3.1 |
| react: typescript | 5.9.3 |
| react: react | 19.2.1 |
| react: react-dom | 19.2.1 |
| react: @vitejs/plugin-react | 5.1.1 |
| react: @mui/material | 9.5.0 |
| react: @emotion/react | 11.14.0 |
| react: @emotion/styled | 11.14.1 |
| react: @base-ui/react | 1.9.0 |
| react: radix-ui | 1.8.1 |
| react: class-variance-authority | 0.7.1 |
| react: react-router-dom | 7.18.5 |
| react: @tanstack/react-router | 1.170.46 |
| react: @tanstack/react-virtual | 3.14.24 |
| react: @tanstack/react-table | 8.21.3 |
| react: ag-grid-react | 36.2.0 |
| react: ag-grid-community | 36.2.0 |
| react: tailwindcss | 4.3.3 |
| react: @tailwindcss/vite | 4.3.3 |
| react: tw-animate-css | 1.4.0 |
| vue: vite | 7.3.1 |
| vue: typescript | 5.9.3 |
| vue: vue | 3.5.44 |
| vue: @vitejs/plugin-vue | 6.0.10 |
| vue: primevue | 5.0.4 |
| vue: vuetify | 4.3.1 |
| vue: vue-router | 4.6.4 |
| vue: @tanstack/vue-virtual | 3.13.50 |

## Verified behavior

- Original shadcn radix-nova and base-nova registry dialogs/menus; unchanged registry files, local cn/icon project dependencies, Tailwind CSS. Registry URLs and hashes are recorded in the JSON report.
- MUI, PrimeVue and Vuetify modal focus, typing, Tab, Escape, copy, source context, reopening and reload; no focus trap is disabled. Hidden keepMounted dialogs do not hide the toolbar.
- React Router, TanStack Router and Vue Router: separate notes, browser back/forward, retained drafts saved to the captured page, abandoned multi-selection cleared on navigation.
- Blocked localStorage: pending notes survive internal navigation in memory; a full browser reload cannot restore memory-only data.
- TanStack Table/Virtual and Vue Virtual: 20,000 records, fewer than 100 rendered rows, repeated labels distinguished by stable row identity. AG Grid uses its native row-id/col-id with getRowId. Pins disappear offscreen and return to the original row.

## Captured output samples

- [react radix: modal focus, typing, source, copy and reopening](ecosystem/current/react-radix-modal-focus-typing-source-copy-and-reopening.md)
- [react base: modal focus, typing, source, copy and reopening](ecosystem/current/react-base-modal-focus-typing-source-copy-and-reopening.md)
- [react mui: modal focus, typing, source, copy and reopening](ecosystem/current/react-mui-modal-focus-typing-source-copy-and-reopening.md)
- [vue prime: modal focus, typing, source, copy and reopening](ecosystem/current/vue-prime-modal-focus-typing-source-copy-and-reopening.md)
- [vue vuetify: modal focus, typing, source, copy and reopening](ecosystem/current/vue-vuetify-modal-focus-typing-source-copy-and-reopening.md)
- [react mui: library-generated button has honest source context](ecosystem/current/react-mui-library-generated-button-has-honest-source-context.md)
- [vue vuetify: library-generated button has honest source context](ecosystem/current/vue-vuetify-library-generated-button-has-honest-source-context.md)
- [react radix: menu stays open while annotating and typing](ecosystem/current/react-radix-menu-stays-open-while-annotating-and-typing.md)
- [react base: menu stays open while annotating and typing](ecosystem/current/react-base-menu-stays-open-while-annotating-and-typing.md)
- [react mui: menu stays open while annotating and typing](ecosystem/current/react-mui-menu-stays-open-while-annotating-and-typing.md)
- [vue prime: select popup remains open while the note editor is used](ecosystem/current/vue-prime-select-popup-remains-open-while-the-note-editor-is-used.md)
- [vue vuetify: select popup remains open while the note editor is used](ecosystem/current/vue-vuetify-select-popup-remains-open-while-the-note-editor-is-used.md)
- [react: virtual rows with repeated labels preserve logical row identity](ecosystem/current/react-virtual-rows-with-repeated-labels-preserve-logical-row-identity.md)
- [vue: virtual rows with repeated labels preserve logical row identity](ecosystem/current/vue-virtual-rows-with-repeated-labels-preserve-logical-row-identity.md)
- [hidden keepMounted dialogs do not hide the normal toolbar](ecosystem/current/hidden-keepmounted-dialogs-do-not-hide-the-normal-toolbar.md)
- [React Router: blocked storage retains notes across route changes for this session](ecosystem/current/react-router-blocked-storage-retains-notes-across-route-changes-for-this-session.md)

## Scope

These are real-library fixture tests, not every component/property/version combination. Shadow DOM/iframe boundaries and mobile layout have separate baseline tests. WebKit here is not a physical Safari/iPhone test. Agentation was researched from official documentation, not benchmarked against these fixtures.

Repeat: npm run prepare:ecosystem && npm run test:ecosystem && npm run report:ecosystem. NOKTIQ_ECOSYSTEM_LEGACY=1 selects the older UI-library majors; run --project=chrome for the legacy smoke suite.
