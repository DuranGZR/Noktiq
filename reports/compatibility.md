# Noktiq compatibility

Tested: 2026-11-01T11:33:33.484Z

| Project | Next / Nuxt | React / Vue | Vite | Node | Result |
| --- | --- | --- | --- | --- | --- |
| next14 | 14.2.35 | 18.3.1 | - | v24.22.2 | passed |
| next15-legacy | 15.2.9 | 18.3.1 | - | v24.22.2 | passed |
| next16 | 16.4.3 | 19.2.1 | - | v24.22.2 | passed |
| next15 | 15.5.28 | 18.3.1 | - | v24.22.2 | passed |
| react18-vite6 | - | 18.3.1 | 6.4.1 | v24.22.2 | passed |
| react19-vite7 | - | 19.2.1 | 7.3.1 | v24.22.2 | passed |
| react-three | - | 19.2.1 | 7.3.1 | v24.22.2 | passed |
| vue34-vite6 | - | 3.4.38 | 6.4.1 | v24.22.2 | passed |
| nuxt3 | 3.21.11 | Vue 3.5.44 | framework default | v24.22.2 | passed |
| nuxt4 | 4.6.3 | Vue 3.5.44 | framework default | v24.22.2 | passed |

Every case installs the actual package into a separate project, selects an element, verifies its source against the original file, copies Markdown, restores the pin after reload, builds production and verifies the absence of toolbar and source attributes.

Next 14/15/16 cover App Router, Pages Router, Webpack, Turbopack and typed TSX factories. Plain .ts factories have exact source in Webpack; old Turbopack uses DOM/ancestor fallback because applying .ts loaders also intercepts virtual HMR modules. Nuxt uses its default source directory (Nuxt 3: app.vue; Nuxt 4: app/app.vue). Vue 3.4 also covers h() and attribute fallthrough. The React Three Fiber case renders a real WebGL mesh without renderer errors, while DOM selection continues to work; individual 3D object selection is not implemented.

Next 16 / Webpack production integration: npm run verify:integrations. Baseline browser regression: reports/validation.md. These are fixture compatibility checks, not a guarantee for every application or canvas object.

Repeat: npm run build && npm run verify:compatibility. Recent Nuxt 4 requires a compatible Node version (22.21+ or 24.11+). NOKTIQ_TEST_NODE can point to a separate Node executable without changing the system installation.
