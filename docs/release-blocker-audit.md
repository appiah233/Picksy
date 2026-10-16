# Picksy release-blocker audit — 2026-10-16

Status: **BLOCKED**. No MVP release tag or production-readiness claim is authorized. Scope is security remediation only. Gate 3 business-content approval remains separate.

The owner-approved [controlled dependency investigation](release-remediation-options.md) records every `braces` path and the A–E decision matrix. ArchitectAgent and SecurityAgent independently reviewed that matrix; no supported A–D option removed all production paths, so implementation stopped before a major-version change.

The [controlled security findings](controlled-security-findings.md) record the subsequent per-alert and per-package investigation, local-build reachability limits, and PR #8 validation.

## Evidence and gate decision

- PR [#7](https://github.com/appiah233/Picksy/pull/7), revision `b4e0ed9`, replaces the dated High-severity audit exceptions with a zero High/Critical gate. SecurityAgent and TestingAgent independently reviewed the checker. Clean and malformed fixtures behave as expected; the current audit report fails on 13 High findings. The PR is open because its audit check correctly fails. GitHub reports no active branch ruleset or `main` branch protection, so a protected-branch integration process is not presently available.
- `npm audit --omit=dev --json` on the committed lockfile: 13 High, 11 Moderate, 0 Critical. `npm ls adm-zip braces postcss --omit=dev --all` confirmed the installed production dependency paths below. These are package entries, not 13 independent attack paths. Public request reachability of the affected library functions has not been demonstrated.
- Existing `main` CI, SAST action execution, and public DAST passed on `015eef0`. CodeQL action success does not close its eight open High alerts.
- On PR #7 revision `b4e0ed9`, [CI run 38908449044](https://github.com/appiah233/Picksy/actions/runs/38908449044) passed the repository's `npm ci`, `npm test`, and `npm run test:build` job; [SAST run 38908448749](https://github.com/appiah233/Picksy/actions/runs/38908448749) passed CodeQL and failed the production dependency audit as required. TestingAgent independently reran six checker fixtures (clean pass; High, Critical, metadata mismatch, malformed severity, and boolean count fail) and the live npm audit (13 High, gate fails). [Public DAST run 38906751875](https://github.com/appiah233/Picksy/actions/runs/38906751875) passed on baseline `main`; the script-only PR does not trigger DAST under its path filter.
- Local `npm test` was manually interrupted during ESLint after it stalled in this shared Windows checkout. An untracked `.next-dev` cache was present during the first attempt; it was subsequently removed by another workspace process, and a second local attempt also stalled. The clean-checkout CI run above is the full validation evidence for the PR revision.
- On [PR #8](https://github.com/appiah233/Picksy/pull/8) revision `e8f8319`, [CI run 38920198043](https://github.com/appiah233/Picksy/actions/runs/38920198043) passed clean `npm ci`, `npm test` (lint, typecheck, 194/194 tests), and `npm run test:build` (compiled, 4/4 build assertions). [SAST run 38920198207](https://github.com/appiah233/Picksy/actions/runs/38920198207) passed CodeQL, while the existing dependency audit job passed only under `main`'s dated exceptions. [Public DAST run 38920198051](https://github.com/appiah233/Picksy/actions/runs/38920198051) passed. TestingAgent independently verified CI logs and local targeted 15/15 regression tests; SecurityAgent reviewed the plain-text invariant. The five normalizer fixes are verified on this draft PR but remain open default-branch alerts until integration and a fresh `main` analysis.

## High dependency findings

Path abbreviations: `S` = direct `sanity@4.22.1`; `N` = direct `next@15.5.27`. `C` = `S → @sanity/cli@4.22.1`; `G` = `C → @sanity/codegen@4.22.1 → globby@11.1.0 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`. `W` = `S → preferred-pm@4.1.1 → find-yarn-workspace-root2@1.2.16 → micromatch@4.0.8 → braces@3.0.3`. `F` = `S → chokidar@3.6.0 → braces@3.0.3`. Each path is in the npm production graph; C/G/W/F appear to be Sanity CLI, codegen, package-manager detection, or file-watching paths, with deployed runtime execution unverified. `N → postcss@8.4.31` is a CSS build path; no untrusted CSS input path is shown.

| Package | Dependency path and relevance | Fix availability and remediation | Evidence |
| --- | --- | --- | --- |
| `sanity` | Direct S; parent of archive and glob tooling | npm proposes `sanity@6.19.0` major; compatibility not established. Requires scoped upgrade decision and tests or upstream fixes. | Audit `fixAvailable`, `npm ls`, SecurityAgent review |
| `@sanity/cli` | C; admin/build tooling | Same Sanity major proposal; no standalone supported fix established. | Audit `via`, `npm ls` |
| `@sanity/runtime-cli` | C → runtime-cli → adm-zip; archive tooling | Same Sanity major proposal; assess a supported transitive update without overriding blindly. | Audit `via`, `npm ls` |
| `adm-zip` | C → runtime-cli → `adm-zip@0.5.18`; archive extraction | Patched `0.6.1` exists for reported advisories, but compatibility with the parent dependency is unverified. Test an authorized narrow update. | [upstream advisory](https://github.com/advisories/GHSA-7q85-xj36-vmfc), audit, `npm ls` |
| `braces` | G, W, F → `braces@3.0.3`; glob handling | **No patched release** for the High stack-exhaustion advisory (affected `<=3.0.3`). Removing the vulnerable dependency path or waiting for an upstream fix requires an approved package strategy. | [upstream advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), `npm view braces version`, `npm ls` |
| `chokidar` | F; file watching, runtime reachability unverified | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, `npm ls` |
| `fast-glob` | G; codegen glob handling | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, lockfile path |
| `find-yarn-workspace-root2` | W; package-manager detection | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, `npm ls` |
| `globby` | G; codegen glob handling | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, lockfile path |
| `micromatch` | G and W; glob handling | Inherits braces; no patched braces release. | Audit `via`, `npm ls` |
| `@sanity/codegen` | C → codegen → G; build tooling | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, lockfile path |
| `preferred-pm` | W; package-manager detection | Inherits braces; npm proposes Sanity 6 major. | Audit `via`, `npm ls` |
| `postcss` | N → `postcss@8.4.31`; CSS build tooling | Patched `8.5.23` exists for the newest reported map advisory; Next pins its copy. npm proposes `next@16.4.2` major; test a supported Next update, not an unreviewed override. | [upstream advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp), audit, `npm ls` |

No dependency remediation has yet passed compatibility checks. The unpatched braces chain prevents a zero-High audit through routine patch updates; do not treat a temporary exception as remediation. SecurityAgent classified deployed `braces` reachability **D, unverified**: all 17 local production server NFT traces at deployed commit `103f33a` omit the affected chain, but the actual Vercel deployment artifact was unavailable. The remaining `adm-zip` and nested `postcss` candidates cross their parents' declared version ranges. Full package paths and owner decision needs are in the controlled findings.

## CodeQL High alert triage

`src/app/api/admin/imports` and its preview route pass adapter-supplied fields to `normalizeCandidate`, which calls `sanitizeText` and stores candidate fields in drafts; the publisher can carry them to product records. An adversarial local call showed `&lt;script&gt;alert(1)&lt;/script&gt;` becomes literal `<script>alert(1)</script>` with `hadHtml:false`, and `vbscript:` remains. A source search found no `dangerouslySetInnerHTML` or direct `innerHTML` use in `src`; React text rendering escapes markup. Thus sanitizer defects are demonstrated, but an executable browser sink is not.

| Alert | Rule and location | Classification | Data-flow decision / next step |
| --- | --- | --- | --- |
| [#1](https://github.com/appiah233/Picksy/security/code-scanning/1) | `js/bad-tag-filter`, normalizer | **Unresolved** | Script end-tag variant evades block removal; data reaches draft/product text. No executing sink shown. Replace regex sanitizer with a reviewed text-only parser or equivalent, then retest. |
| [#2](https://github.com/appiah233/Picksy/security/code-scanning/2) | `js/incomplete-multi-character-sanitization`, normalizer/style | **Unresolved** | Sequential replacements can expose markup after prior filters. Same source/sink review and fix. |
| [#3](https://github.com/appiah233/Picksy/security/code-scanning/3) | `js/incomplete-multi-character-sanitization`, normalizer/script | **Unresolved** | Encoded markup becomes literal tag text after decoding. Same source/sink review and fix. |
| [#4](https://github.com/appiah233/Picksy/security/code-scanning/4) | `js/incomplete-multi-character-sanitization`, rendered-journey test helper | **Demonstrated false positive for production security impact** | Test-only regex extracts links from fixture-rendered HTML; no application import or production sink. Retain alert evidence; no security suppression. |
| [#5](https://github.com/appiah233/Picksy/security/code-scanning/5) | `js/double-escaping`, normalizer | **Unresolved** | Entity decoding can reintroduce angle brackets and script text after filtering. Same source/sink review and fix. |
| [#6](https://github.com/appiah233/Picksy/security/code-scanning/6) | `js/incomplete-url-substring-sanitization`, backend-importer test | **Demonstrated false positive for production security impact** | `.includes("impact.com")` is a test assertion on provenance, not an authorization check or application sink. |
| [#7](https://github.com/appiah233/Picksy/security/code-scanning/7) | `js/incomplete-url-substring-sanitization`, Sanity integration test | **Demonstrated false positive for production security impact** | `.includes(...)` asserts a mocked request URL, not URL validation in production. |
| [#8](https://github.com/appiah233/Picksy/security/code-scanning/8) | `js/incomplete-url-scheme-check`, normalizer | **Unresolved** | Removing `javascript:` leaves other active schemes intact. These fields currently render as text, but the sanitizer contract and downstream usage require review. |

SecurityAgent reviewed the individual classifications. PR #8 fixes the text-only boundary behind #1, #2, #3, #5, and #8, with tests-first regression, clean CI, branch CodeQL, DAST, and independent TestingAgent review above. No browser-executing sink was demonstrated, and the five alerts remain open on `main` pending integration. #4, #6, and #7 remain test-only findings with no production path demonstrated; their analyzer patterns are real. No alert was dismissed or suppressed.

## Owner-supplied Gate 3 inputs

Before public catalogue publication, the owner must provide an approved product/category selection; verifiable merchant and affiliate-program identity; the exact HTTPS destination and redirects; agreement showing Picksy may use that destination; a stable private authorization-evidence reference; sourced product facts and named editorial review with real dates and method; approved affiliate disclosure; recheck owner/date; and an approved production HTTPS origin. These records must be independently checked under [the evidence packet](production-affiliate-evidence-packet.md). None may be fabricated to clear this gate.
