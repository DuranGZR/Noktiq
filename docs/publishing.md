# Publication preparation

Noktiq is maintained by **Duran Gezer**, an individual. The project does not identify a company as its licensor. The [LICENSE](../LICENSE) includes the required copyright notice and the complete PolyForm Shield 1.0.0 text. Dependency licenses remain applicable separately.

## Before the first public commit

```sh
npm run build
npm run typecheck
npm test
npm run check:release
npm run verify:package
```

`check:release` checks the files selected by the repository's ignore rules, common credential patterns, machine-specific home paths, required publication files and the npm archive contents. It also verifies representative secrets and generated files are ignored. Pattern scanning is not a complete security audit or a guarantee that all secrets have been found.

The check uses a temporary Git directory outside the project, so it works before `git init` and does not create a repository here. With an existing repository it also checks tracked files, since an ignore rule does not remove an already tracked secret.

Keep sources, tests, examples, lockfile, documentation and the final README GIF/video in GitHub. Leave installed dependencies, local validation projects, test output, `.env` files, raw recordings, package archives and build output out of GitHub. A sanitized `.env.example` may be committed; real values must stay private.

The npm package is separate. Use `npm run pack:release` to build and prepare the release archive. It stages compiled files, the license, contribution/security policies and consumer documentation under ignored `.local-validation/npm-package`, then creates `noktiq-0.1.1.tgz`. Its README comes from `docs/npm-readme.md.template`, with installation wording selected from the private/public package state. The repository keeps its rich README and GIF/video. Repository-only report/fixture links in packaged guides become clearly labeled source-checkout references; no missing files or invented remote URLs are linked. The release check validates links inside the staged archive as well as the checkout.

Large GIF/PNG/MP4 media, production scripts and development fixtures are excluded. The prepared manifest retains the actual package metadata and optional peers but omits repository build scripts and development dependencies. The first public release is `noktiq@0.1.0`, owned by `durangzr`. Public access and the official npm registry are explicit in the manifest. The repository's `prepublishOnly` guard blocks direct directory publishing: publish the reviewed `.tgz` after release authorization, not the source directory. Plain `npm pack` is not the reviewed release path.

Published text report samples replace the machine's project root with `[project]`. The original local test output is left intact. Regenerate reports with the existing report commands after rerunning tests; the publishing sanitizer is applied automatically.

## After creating the GitHub repository

- The source repository is [DuranGZR/Noktiq](https://github.com/DuranGZR/Noktiq). Its repository, homepage and issue URLs are recorded in `package.json`.
- Enable private vulnerability reporting and verify the private report action before making the repository public. See [SECURITY.md](../SECURITY.md).
- Verify the issue and pull-request templates appear, and check README images/video links on GitHub.
- Repository metadata changes will appear on npm with the next authorized release; they do not update the already published `0.1.0` archive.
- Configure available repository security controls and review the initial file list before the first push.

Local checks do not change GitHub settings, upload files or deploy a website. Private vulnerability reporting was enabled for DuranGZR/Noktiq during the initial GitHub setup. Package checks do not publish; the first npm release was performed separately after account authentication and security-key verification.
