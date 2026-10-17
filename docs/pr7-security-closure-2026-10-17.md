# PR #7 dependency security closure investigation — 2026-10-17

**Decision: BLOCKED.** [PR #7](https://github.com/appiah233/Picksy/pull/7) remains draft and unmerged. Its strict zero High/Critical gate fails. The owner deferred risk acceptance and did not authorize a security exception or a Sanity 6 / Next.js 16 migration solely for this gate. This investigation makes no dependency, source, lockfile, workflow, policy, or exception change. Picksy is not release-ready.

## Reproduction and policy

| Item | Evidence |
| --- | --- |
| PR head | `b4e0ed92359b6c0cb81ac06c571bcb114c5614cb` in an isolated clean worktree |
| Lockfile | `package-lock.json`, Git blob `cc5d68a2e25c9548475c87a7c29e6a8e454ed313` |
| Environment | Windows PowerShell; Node `v22.23.2`; npm `10.9.8` |
| Command | `npm audit --omit=dev --json`; same command as `.github/workflows/security-sast.yml` |
| Current response | **13 High / 11 Moderate / 0 Critical**; 13 affected package entries, not 13 independent exploit paths |
| Policy | `.github/scripts/check-dependency-audit.py` rejects any High or Critical metadata count or entry. Running it on this response exited **1**, reporting all 13 High entries. No threshold or exception was changed. |
| PR jobs | [PR #7 checks](https://github.com/appiah233/Picksy/pull/7/checks): CI and CodeQL passed; `Production dependency audit` failed. |

The audit covers the production-installed dependency graph. Installation does not establish deployed execution or an attacker-controlled input path. The prior SecurityAgent classification for `braces` remains **D — UNVERIFIED**; no new production artifact or runtime trace supports changing it.

## Complete High package-entry matrix

The direct advisory column lists the leaf advisory identifiers. “Inherited” means npm reports a High package entry through the named vulnerable child, without a separate direct advisory. Ranges are npm's current audit-response ranges. `sanity@4.22.1` and `next@15.5.27` are direct application dependencies; the other entries are transitive.

| High package (installed) | Direct advisory / affected range | Requiring package and dependency path | Smallest justified option; runtime class |
| --- | --- | --- | --- |
| `@sanity/cli@4.22.1` | Inherited from codegen/runtime CLI; `<=0.0.0-20260612111702 \|\| >=3.36.0` | `sanity → @sanity/cli` | D: coordinated Sanity major only; production-installed CLI/tooling, deployed reachability unverified |
| `@sanity/codegen@4.22.1` | Inherited via `globby`; `*` | `sanity → @sanity/cli → @sanity/codegen` | D/E: major changes graph but retains `braces`; production-installed code generation tooling, deployed reachability unverified |
| `@sanity/runtime-cli@12.4.0` | Inherited via `adm-zip`; `2.4.0 - 17.1.0` | `sanity → @sanity/cli → @sanity/runtime-cli` | D: coordinated Sanity major; production-installed CLI tooling, deployed reachability unverified |
| `adm-zip@0.5.18` | High: `GHSA-xcpc-8h2w-3j85` (`<0.6.0`), `GHSA-7q85-xj36-vmfc` (`<0.6.1`), `GHSA-rcw4-f5rp-g42v`, `GHSA-j5f4-cc29-5x44`, `GHSA-8238-w5pm-2374` (each `<=0.6.0`); aggregate `<=0.6.0` | `sanity → @sanity/cli → @sanity/runtime-cli → adm-zip`, parent requires `^0.5.16` | D: patched `0.6.1` is outside parent range; investigated major candidate resolves `0.6.1`; production-installed CLI tooling, deployed reachability unverified |
| `braces@3.0.3` | [`GHSA-vfj7-8cjw-p6xm`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), `<=3.0.3` | `sanity → chokidar → braces`; `sanity → @sanity/cli → @sanity/codegen → globby → fast-glob → micromatch → braces`; `sanity → preferred-pm → find-yarn-workspace-root2 → micromatch → braces` | E: advisory lists **no patched version**; latest published `3.0.3`; candidate still has vulnerable chains. Production-installed watcher/glob tooling, deployed reachability **D — UNVERIFIED** |
| `chokidar@3.6.0` | Inherited via `braces`; `2.0.0 - 3.6.0` | `sanity → chokidar → braces` | D/E: direct watcher edge changes in major candidate, but candidate retains a CLI watcher chain; production-installed file watcher, deployed reachability unverified |
| `fast-glob@3.3.1` | Inherited via `micromatch → braces`; `*` | `sanity → @sanity/cli → @sanity/codegen → globby → fast-glob` | D/E: major candidate updates it but retains `braces`; production-installed glob tooling, deployed reachability unverified |
| `find-yarn-workspace-root2@1.2.16` | Inherited via `micromatch → braces`; `*` | `sanity → preferred-pm → find-yarn-workspace-root2` | D: chain removed in major candidate; production-installed workspace tooling, deployed reachability unverified |
| `globby@11.1.0` | Inherited via `fast-glob → micromatch → braces`; `>=8.0.0` | `sanity → @sanity/cli → @sanity/codegen → globby` | D/E: candidate still contains chain; production-installed codegen/glob tooling, deployed reachability unverified |
| `micromatch@4.0.8` | Inherited via `braces`; `>=0.2.0` | Codegen `fast-glob` and `preferred-pm → find-yarn-workspace-root2` each require it | D/E: candidate retains codegen path; production-installed glob tooling, deployed reachability unverified |
| `postcss@8.4.31` | High: `GHSA-6g55-p6wh-862q` (`<=8.5.11`), `GHSA-r28c-9q8g-f849` (`<=8.5.17`); aggregate including Moderate `<=8.5.22` | `next@15.5.27 →` nested `postcss@8.4.31`; distinct from the newer root copy | D: patched `8.5.23` exists, but Next pins this nested copy; investigated Next 16 candidate resolves `8.5.23`; production-installed build/CSS tooling, deployed reachability unverified |
| `preferred-pm@4.1.1` | Inherited via `find-yarn-workspace-root2 → micromatch → braces`; `*` | `sanity → preferred-pm` | D: chain absent in major candidate; production-installed package-manager tooling, deployed reachability unverified |
| `sanity@4.22.1` | Inherited via CLI, watcher, preferred-pm; `2.29.4-purple-unicorn.509 - 2.30.1-dev-preview.1013 \|\| 3.0.0-definetype.62 - 6.0.0-next-major.20260604131049` | Direct application dependency | D/E: audit suggests `sanity@6.19.0` major, which still leaves High findings; Studio/runtime package with tooling subgraph, actual vulnerable function reachability unverified |

For `adm-zip`, the response also carries three Moderate advisories; for `postcss`, two Moderate advisories. These do not alter the High gate. The complete raw audit JSON was generated locally from the exact lockfile; the [PR SAST artifact](https://github.com/appiah233/Picksy/actions/runs/38908448749) provides independent CI evidence for the 13/11/0 baseline. `npm audit fix --package-lock-only --ignore-scripts --dry-run --json` previously proposed **zero** package changes on this lockfile. Its own vulnerability count varied; it is not a remediation.

## 13 versus 16 High

The previous local 16 High response against an unchanged committed lockfile added inherited entries for `@sanity/preview-url-secret`, `next-sanity`, and `@sanity/vision`; the first two rose from Moderate and the third appeared as High. These map to existing Sanity/Next paths, not three demonstrated new independent exploit paths. The currently reproduced exact PR #7 command and lockfile return 13/11/0. A separate earlier dry-run response returned 15/11/0 with no proposed lockfile edit. The prior 16-response environment and advisory database snapshot cannot now be reconstructed. **Cause: UNRESOLVED.** No difference in lockfile, dependency resolution, npm command, or advisory identifiers has been proven to account for it; no environment or database explanation is asserted. Fresh audit results are required for any future gate decision.

## Remediation result and owner boundary

No safe compatible package update or transitive override was established that eliminates these High paths. `adm-zip@0.6.1` is outside `@sanity/runtime-cli`'s `^0.5.16` range; Next's vulnerable nested PostCSS copy is pinned. For `braces`, [GitHub's advisory API](https://api.github.com/advisories/GHSA-vfj7-8cjw-p6xm) reports `first_patched_version: null`; the latest published version is `3.0.3`. Force overrides across parent ranges would be unverified compatibility changes and still could not patch `braces`.

The previously investigated coordinated Sanity 6.19.0 / Next 16.4.2 / `next-sanity` 13.3.4 / Vision 6.19.0 candidate was lockfile-only, outside the repository, and audited at **9 High / 10 Moderate / 0 Critical**. It resolved `adm-zip@0.6.1` and `postcss@8.5.23` but retained `braces@3.0.3` through CLI/codegen/glob/watcher paths and introduced `js-yaml` and `smol-toml` High entries. It was not installed, built, or exercised as Picksy. This major migration **does not satisfy PR #7's zero High/Critical gate and is not justified solely as dependency remediation**. The [existing residual-risk record on main](https://github.com/appiah233/Picksy/blob/main/docs/pr7-residual-risk-decision.md) details the Studio, importer, public catalogue, product, design, architecture, runtime, and data-contract compatibility risks, along with TestingAgent's full future verification matrix. No major migration or risk acceptance is authorized.

The owner may later keep Picksy release-blocked pending upstream repair, obtain stronger actual production-artifact/runtime evidence that proves non-reachability, or, if governance permits, make a formal time-bounded risk acceptance. The owner has selected **deferral** now. This investigation does not choose or grant a later exception.

## Verification, changes, and reviews

| Check | Result |
| --- | --- |
| Fresh audit | **FAIL gate:** 13 High / 11 Moderate / 0 Critical |
| Unchanged strict checker | **FAIL**, exit 1, reports 13 High entries |
| CI/CodeQL on PR #7 head | `test-and-build` **PASS** ([job](https://github.com/appiah233/Picksy/actions/runs/38908449044/job/116997881548)); `CodeQL JavaScript/TypeScript` **PASS** ([job](https://github.com/appiah233/Picksy/actions/runs/38908448749/job/116997879941)); separate CodeQL **PASS** ([check](https://github.com/appiah233/Picksy/runs/116998221241)). These are existing head checks, distinct from the failed audit. |
| Local install and regression | `npm ci --ignore-scripts --no-audit --no-fund` began installing but made no progress to a completed install after several minutes; it was interrupted (exit 1). Local lint, typecheck, tests, build, and CI-equivalent checks were **not executed** and are **not PASS**. The existing PR `test-and-build` job is the regression evidence for the unchanged source/lockfile head. |
| Package/source/lockfile diff | None. No safe remediation was implemented. |
| Agent review | Prior residual-risk record had ArchitectAgent, ProductAgent, DatabaseAgent, SecurityAgent, TestingAgent and DesignAgent review. Fresh independent review was requested for this forensic report, but agent service returned a usage-limit error; **no fresh sign-off is claimed**. |

This report is a documentation-only investigation on an isolated branch. PR #7 remains draft and blocked. Gate 3 and importer authorization are separate blockers; Gemini's Sanity/storefront work was not touched. No merge or release tag was created.
