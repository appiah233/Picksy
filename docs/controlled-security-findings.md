# Controlled security findings — 2026-10-16

Status: **technical remediation in progress; release blocked**. This record supplements [the release audit](release-blocker-audit.md). No MVP tag, Gate 3 content, Sanity major migration, Next.js major migration, or direct `main` change is authorized.

## Normalizer and CodeQL

Source: adapter-provided product fields enter the authenticated import/preview routes, then `normalizeCandidate` and `sanitizeText`; candidate name/description/merchant/user/workflow text may reach stored draft and published product fields. Current React components render these as text. The source search found no `dangerouslySetInnerHTML` or direct `innerHTML` sink. **A browser-executing XSS path has not been demonstrated.** The prior regex/entity sequence nevertheless allowed decoded markup to leave `sanitizeText`, so the text-only boundary was defective.

The remediation parses input as markup, discards script/style elements, decodes entities through the parser, and removes angle brackets from the final display text. The parser was already in the locked Sanity tree; it is now directly declared at the exact existing `node-html-parser@6.1.13` version. No transitive package version changed. Protocol-looking strings are display text, not URLs; URL fields retain their separate validation. Malformed script closure may discard subsequent text, a safe but editorially reviewable limitation.

| Alert | Untrusted input and transformation | Security invariant / possible sink | Regression evidence | State |
| --- | --- | --- | --- | --- |
| [#1](https://github.com/appiah233/Picksy/security/code-scanning/1) bad tag filter | Script end-tag variants bypassed regex block removal | Script/style nodes must not enter stored display text; React text is the observed sink | `</script >` case in backend importer test | Fix on PR #8; branch CodeQL passed; main alert remains open until integration |
| [#2](https://github.com/appiah233/Picksy/security/code-scanning/2) style multi-character sanitization | Repeated replacements could expose style markup | Final output has no angle-bracket markup | malformed style and encoded cases | Fix on PR #8; branch CodeQL passed; main alert remains open until integration |
| [#3](https://github.com/appiah233/Picksy/security/code-scanning/3) script multi-character sanitization | Entity decoding followed tag stripping | Final output has no angle-bracket markup | encoded/double-encoded script cases | Fix on PR #8; branch CodeQL passed; main alert remains open until integration |
| [#5](https://github.com/appiah233/Picksy/security/code-scanning/5) double escaping | `&amp;` and `&lt;` replacement order changed output after filtering | One parser decode and a final text-only barrier | encoded/double-encoded script cases | Fix on PR #8; branch CodeQL passed; main alert remains open until integration |
| [#8](https://github.com/appiah233/Picksy/security/code-scanning/8) incomplete URL scheme check | `javascript:` denylist missed other schemes | Do not infer URL safety from display-text normalization; validate URL fields separately | `javascript:`, `vbscript:`, `data:` text cases | Fix on PR #8; branch CodeQL passed; main alert remains open until integration |

Tests were written first: `node --experimental-strip-types --test tests/backend-importer.test.mjs` failed 2 of 15 before implementation and passed 15 of 15 after the final parser option fix. SecurityAgent reviewed the plain-text invariant and did not claim an executing sink. TestingAgent independently repeated the targeted 15/15 tests and malicious-input probes. On [PR #8 commit `e8f8319`](https://github.com/appiah233/Picksy/pull/8), [clean Linux CI run 38920198043](https://github.com/appiah233/Picksy/actions/runs/38920198043) completed `npm ci` (1,477 packages installed), `npm test` (lint, typecheck, 194/194 tests), and `npm run test:build` (compiled successfully, 4/4 build assertions). TestingAgent independently inspected these job logs; its local full suite stalled on Windows, so the clean Linux CI is authoritative. [CodeQL run 38920198207](https://github.com/appiah233/Picksy/actions/runs/38920198207) passed its JavaScript/TypeScript job. GitHub's open alert list still reports all eight on `refs/heads/main`; branch CodeQL success does not itself close default-branch alerts.

### Test-helper alerts

| Alert | Production artifact / data-flow finding | Disposition |
| --- | --- | --- |
| [#4](https://github.com/appiah233/Picksy/security/code-scanning/4) | HTML extraction regex is in `tests/rendered-journey.test.mjs`; no compiled local production artifact or application import contains that helper. | Test-only pattern, no production security path demonstrated. |
| [#6](https://github.com/appiah233/Picksy/security/code-scanning/6) | `.includes("impact.com")` checks static provenance in `tests/backend-importer.test.mjs`; not an application URL-authorization check. | Test-only pattern, no production security path demonstrated. |
| [#7](https://github.com/appiah233/Picksy/security/code-scanning/7) | `.includes(...)` checks a mocked Sanity URL in `tests/sanity-integration.test.mjs`. | Test-only pattern, no production security path demonstrated. |

SecurityAgent searched all 17 server NFT traces and compiled local client/server JS for the three test filenames and `tests/` and found none. `package.json` invokes these files only through `npm test`. The analyzer patterns are real, so calling them nonexistent would be inaccurate. No alert was dismissed or suppressed; a documented `used in tests`/`won't fix` classification could be considered if GitHub provides it and the owner wants closure.

## `braces` reachability

The exact installed paths are in [the decision matrix](release-remediation-options.md). `npm audit --omit=dev` proves installation in the production dependency graph. It does **not** prove deployment, execution, or attacker reachability.

| Sanity path | Invocation and input provenance | Build/deployment evidence | Production attack-path result |
| --- | --- | --- | --- |
| CLI → codegen → globby → fast-glob → micromatch → braces | Sanity CLI TypeGen/glob handling uses repository query/config patterns. These appear developer/config controlled; no Picksy HTTP input route was found. | No chain member in 17 local server NFT traces. No matching browser-bundle signatures identified. | Attacker input → production surface → vulnerable function edge **UNVERIFIED**. |
| chokidar → braces | Sanity watch mode watches workspace document-component paths or a local temporary editor file; braces expands brace-containing watched paths. Inputs appear local filesystem/tooling paths. | No chain member in local server traces; no watcher import from Picksy request handlers. | Deployed execution and attacker input edge **UNVERIFIED**. |
| preferred-pm → find-yarn-workspace-root2 → micromatch → braces | Sanity package upgrade/manager detection reads workspace roots/globs. Inputs appear developer filesystem/config. | No chain member in local server traces. | Deployed execution and attacker input edge **UNVERIFIED**. |

The local `.next` production build examined by SecurityAgent corresponds to deployed Git commit `103f33a`; its 17 server `.nft.json` traces omit `braces`, `chokidar`, `micromatch`, `fast-glob`, `globby`, `preferred-pm`, `@sanity/codegen`, and `@sanity/cli`. Studio is loaded through a client-only dynamic import. Browser chunks lacked recognizable vulnerable-library signatures, but minification limits that check. The actual Vercel deployment file artifact could not be retrieved from this environment. **SecurityAgent classification: D — UNVERIFIED for deployed production**, with strong local-build evidence of tooling-only use. Do not relabel this C without deployment-artifact evidence.

## All 13 High dependency entries

Baseline and post-normalizer `npm audit --omit=dev --json`: **13 High, 11 Moderate, 0 Critical**. The parser declaration did not alter any transitive version. `S` means direct `sanity@4.22.1`; `N` means direct `next@15.5.27`. All listed Sanity entries are in npm's production graph, but actual deployment/runtime presence is unverified as above. All fixes below need a fresh clean install, audit, and compatibility proof before being retained.

| Package / installed version | Path; direct/transitive | Advisory and affected range | Patched version / fix candidate / risk |
| --- | --- | --- | --- |
| `sanity@4.22.1` | S; direct | Inherited `adm-zip` and `braces` High advisories; npm reports affected Sanity range through pre-6 release | npm proposes Sanity 6.19.0 major; **prohibited without owner approval**. |
| `@sanity/cli@4.22.1` | S → CLI; transitive | Inherited archive and glob advisories; npm affected `>=3.36.0` in current line | Same Sanity major proposal; no supported v4 fix found. |
| `@sanity/runtime-cli@12.4.0` | S → CLI → runtime CLI; transitive | Inherits `adm-zip` advisories; npm affected `2.4.0–17.1.0` | Parent currently requires `adm-zip:^0.5.16`; patched 0.6.1 is outside range. |
| `adm-zip@0.5.18` | S → CLI → runtime CLI → adm-zip; transitive | [GitHub advisories](https://github.com/advisories/GHSA-7q85-xj36-vmfc) include archive memory/overwrite/DoS; overall affected `<=0.6.0` | Patched 0.6.1; scoped override exceeds parent range, so compatibility is unverified. CLI/archive tooling relevance; deployed execution unverified. |
| `braces@3.0.3` | S → chokidar; S → preferred-pm → find-yarn-workspace-root2 → micromatch; S → CLI → codegen → globby → fast-glob → micromatch; transitive | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), affected `<=3.0.3` | **No patched version**; supported removal within frozen architecture not found. |
| `chokidar@3.6.0` | S → chokidar → braces; transitive | Inherits braces; npm affected `2.0.0–3.6.0` | v4 drops braces but exceeds Sanity's `^3.6.0` and leaves two paths. |
| `preferred-pm@4.1.1` | S → preferred-pm → find-yarn-workspace-root2 → micromatch → braces; transitive | Inherits braces; npm affected `*` | Current parent line still reaches braces; no independent complete fix. |
| `find-yarn-workspace-root2@1.2.16` | S → preferred-pm → find-yarn-workspace-root2 → micromatch → braces; transitive | Inherits braces; npm affected `*` | No patched braces path through current parent. |
| `micromatch@4.0.8` | S → preferred-pm or CLI/codegen/globby/fast-glob → micromatch → braces; transitive | Inherits braces; npm affected `>=0.2.0` | Current micromatch still depends on braces. |
| `@sanity/codegen@4.22.1` | S → CLI → codegen → globby → fast-glob → micromatch → braces; transitive | Inherits braces; npm affected `*` | CLI pins codegen exactly; no supported independent update. |
| `globby@11.1.0` | S → CLI → codegen → globby → fast-glob → micromatch → braces; transitive | Inherits braces; npm affected `>=8.0.0` | No supported complete fix in current Sanity line. |
| `fast-glob@3.3.1` | S → CLI → codegen → globby → fast-glob → micromatch → braces; transitive | Inherits braces; npm affected `*` | Current fast-glob still uses micromatch. |
| `postcss@8.4.31` | N → nested PostCSS; transitive, **not** patched root `postcss@8.5.28` | [PostCSS map advisory](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp) and related advisories; overall affected `<=8.5.22` | Patched 8.5.23+; Next 15.5.27 pins 8.4.31 exactly. Scoped 8.x override is testable but outside declared support; Next 16 major is prohibited. CSS build relevance; attacker-supplied CSS path unverified. |

No override or major upgrade was applied. Unsupported out-of-range overrides would be compatibility experiments, not proof of upstream support, and would leave the unpatched braces gate failing.

## Governance and release

GitHub currently has no active `main` ruleset. The actual check names are `test-and-build`, `CodeQL JavaScript/TypeScript`, `Production dependency audit`, and `public-baseline`. CI runs on every PR; SAST/DAST have path filters. A documentation-only PR would leave the latter three pending if all four were required now. No ruleset was changed here.

Exact proposed `main` governance, in order:

1. Remove the `pull_request.paths` filter from `.github/workflows/security-sast.yml` and `.github/workflows/security-dast.yml` in a reviewed PR; retain their existing push, schedule, manual triggers and job implementations. Verify all four checks execute on a documentation-only PR after that change.
2. Set an active repository ruleset targeting only `refs/heads/main`, with pull requests required; one approving review from a non-author; approval of the most recent reviewable push; dismissal of stale approvals; conversation resolution; and required checks from GitHub Actions, required to pass on the current head with branch up to date. Block force pushes and deletion, and allow no routine administrator bypass. Keep direct pushes to `main` disallowed.
3. Require `test-and-build`, `CodeQL JavaScript/TypeScript`, and `public-baseline` once their trigger coverage is verified. Add `Production dependency audit` to the required list only after the owner resolves PR #7's strict-gate decision: once PR #7 is integrated, its correctly failing 13-High result will block all PRs. The final target required-check set is all four exact names above.

PR #7's strict zero High/Critical gate remains open and unmerged pending the owner risk decision. Repository administration and the strict-gate sequencing require owner action; current governance is **not configured**.

Gate 3 remains blocked by real owner-supplied merchant, authorized destination, product research, editorial review, affiliate disclosure, recheck ownership, and production origin. **Release decision: BLOCKED.**
