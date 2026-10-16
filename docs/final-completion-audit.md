# Picksy final completion audit — 2026-10-16

Status: **IN PROGRESS; release blocked.** Baseline is freshly fetched GitHub `main` at `6420872ecd1fd5b40d509e0c083b0fb4ae072a68`. This record separates observations from changes proposed in this final pass. PR #7 remains draft and blocked; its zero High/Critical gate and the owner's decision to defer risk acceptance remain unchanged.

## Remaining-work ledger before implementation

| Area | Verified baseline | Remaining work or dependency |
| --- | --- | --- |
| Merged work | GitHub `main` at `6420872` contains PR #9 merge `f750848` and PR #8 merge `6420872`. | Verify the combined revision, rather than relying on branch-only runs. |
| Public catalogue | `src/content/catalog.ts` contains empty collections; public routes read `src/lib/catalog.ts`. The Sanity published adapter exists but is not wired to public pages. | Real publication requires Gate 3 evidence, an authorized production origin, and a separately verified Sanity read cutover. Keep the public catalogue empty meanwhile. |
| Importer | No source adapter is enabled in `src/lib/importer/adapters/registry.ts`. Studio tools and draft/publish code exist. | Source permission, safe individual-editor authorization, and live disposable-dataset proof are unavailable. Do not enable retrieval or publication by assertion. |
| Security | PR #7 strict audit fails on the documented 13 High / 11 Moderate / 0 Critical baseline. Main's older SAST audit uses time-bound exceptions and its passing result is not PR #7 clearance. | Preserve the owner's deferred risk acceptance and the strict gate. Verify post-merge main CI, CodeQL execution, DAST, and the exact audit behavior. |
| GitHub governance | Main has no branch protection or active ruleset. SAST and DAST `pull_request` path filters can skip documentation-only PRs. | Remove only the PR path filters, verify exact job names and execution, then configure or report the permission blocker for main rules. |
| Gate 3 and deployment | The production evidence packet is not supplied, the catalogue is empty, and the HTTPS production origin is unapproved. | Owner evidence and deployed-runtime verification remain outstanding. Synthetic fixtures cannot substitute for them. |

## Tests defined before workflow changes

1. Compare `.github/workflows/ci.yml`, `security-sast.yml`, and `security-dast.yml` before and after the edit. Verify both security workflows retain `pull_request` on `main`/`develop`, and have no PR path filters; preserve push, schedule, dispatch, job names, permissions, audit checker, ZAP steps, and thresholds.
2. Verify the changed YAML parses and the diff contains only the two PR trigger filters. On a PR based on this branch, inspect whether `test-and-build`, `CodeQL JavaScript/TypeScript`, `Production dependency audit`, and `public-baseline` execute, including a documentation-only PR when feasible.
3. Independently run a clean `npm ci`, `npm test`, `npm run test:build`, and `npm audit --omit=dev --json` in the isolated checkout. Treat the audit's raw counts and the main exception-aware checker result separately. Do not call the zero High/Critical gate passed while any High remains.
4. Validate the public empty-state build and fixture-based journeys, then assess actual Studio/admin and deployed behavior only where authentication and a nonproduction Sanity dataset are available. Record missing credentials or business evidence as unverified or owner required.

## Security and governance evidence from current main

- GitHub confirms PR [#8](https://github.com/appiah233/Picksy/pull/8) merged at `6420872` and PR [#9](https://github.com/appiah233/Picksy/pull/9) merged at `f750848`. PR [#7](https://github.com/appiah233/Picksy/pull/7) is open, draft, and unmerged at `b4e0ed9`.
- At `6420872`, [CI run 38933940324](https://github.com/appiah233/Picksy/actions/runs/38933940324) passed `test-and-build`; [SAST run 38933940108](https://github.com/appiah233/Picksy/actions/runs/38933940108) passed both `CodeQL JavaScript/TypeScript` and `Production dependency audit`; [DAST run 38933940278](https://github.com/appiah233/Picksy/actions/runs/38933940278) passed `public-baseline`. These are job results, not proof that CodeQL alerts are closed or that public DAST covers authenticated Studio/importer routes.
- Main's dependency checker still contains the older dated High exceptions. Its passing job cannot satisfy PR #7's separate zero High/Critical gate. The most recent documented raw production audit is **13 High, 11 Moderate, 0 Critical**, with `braces` production reachability classified **D, unverified**. Owner risk acceptance is deferred; no new exception or major migration is authorized. The checker and threshold are unchanged by this branch.
- The CodeQL job executed on merged main after PR #8, but the GitHub code-scanning alerts endpoint returned HTTP 401 to this review. Consequently the state of each prior alert (#1–#8) on main remains **UNVERIFIED**; a successful analysis job does not establish closure. The prior data-flow dispositions remain in [controlled security findings](controlled-security-findings.md).
- GitHub reports `main` protection disabled and no active repository ruleset. Exact observed job names are `test-and-build`, `CodeQL JavaScript/TypeScript`, `Production dependency audit`, and `public-baseline`. This branch removes only SAST/DAST pull-request path filters so future documentation-only PRs trigger both workflows. Until that change is merged and run on a documentation-only PR, required-check configuration would risk pending checks on unrelated PRs.

## Gate 3 evidence classification

| Requirement | Status | Evidence boundary |
| --- | --- | --- |
| Approved production products and categories | **OWNER REQUIRED** | Production catalogue remains empty; no approval packet is supplied. |
| Merchant identity and Picksy affiliate authority | **OWNER REQUIRED** | No agreement/program proof or independently checked merchant identity is supplied. |
| Exact HTTPS destination and redirect chain | **OWNER REQUIRED** | No authorized destination is selected; no real link may be inferred from synthetic fixtures. |
| Sourced product facts and named editorial review | **OWNER REQUIRED** | No real source packet, named review, method, or publication dates are supplied. |
| Affiliate disclosure wording | **OWNER REQUIRED** | Generic UI disclosure does not prove the wording required for a particular approved program. |
| Recheck owner and date | **OWNER REQUIRED** | No live offer or permission recheck assignment is supplied. |
| Production HTTPS origin | **OWNER REQUIRED** | `.env.example` contains only localhost and repository docs record no approved origin. |
| Live production URL and runtime behavior | **UNVERIFIED** | No authorized production origin or authenticated deployment artifact was available to inspect. |

No item is marked PASS from test fixtures. The [production evidence packet](production-affiliate-evidence-packet.md) remains the admission contract.

## Functional and deployment boundary

The public home, category, and product route implementations and synthetic rendered-journey tests exist, but the production catalogue remains intentionally empty. The Sanity published adapter is tested with mocked Content Lake responses; public pages still use the repository catalogue. The importer has UI and route code, but its source registry has no permitted adapter. Existing custom admin routes redirect to Studio. Live individual-editor authorization, a disposable-dataset draft/edit/publish round trip, authenticated Studio browser access, actual production merchant links, and deployed runtime checks have not been demonstrated. No merchant inventory system is needed or authorized.

`src/config/site.ts` still disables Guides, Reviews, and Comparisons navigation, and points Privacy Policy, Terms of Service, and Editorial Guidelines to `#`. These visitor and legal journeys are incomplete; a route or build pass does not establish usable content or approved policy text. Do not invent those documents to make navigation appear complete.

The prior [fixture browser review](gate-3-fixture-browser-verification.md) covers synthetic catalogue states on an older revision. It cannot verify the merged main design, a real merchant journey, authenticated Studio, or a hosted screen reader. Desktop, mobile, and accessibility release sign-off therefore remain outstanding even where static tests pass.

## Final release assessment

**Release-gate decision C — BLOCKED.** This is distinct from PR #7's migration recommendation C. The strict PR #7 dependency gate remains unsatisfied; Gate 3 has no owner business evidence; main governance is not yet enforced; the live Sanity/importer and production journeys remain unverified. No MVP tag, public catalogue population, or release-ready declaration is justified.

## Independent review and branch verification

ArchitectAgent and ProductAgent confirmed the empty catalogue, unwired Sanity public read, disabled importer sources, missing visitor/legal content, and blocked release classification. DatabaseAgent and SecurityAgent confirmed the frozen draft/published boundary, Gate 3 owner evidence classification, PR #7 deferral, and separation of the exception-aware main audit from the strict gate. DesignAgent and TestingAgent confirmed the workflow diff, existing fixture UX evidence limits, and the need for authenticated Studio, mobile, accessibility, and hosted screen-reader verification. None approved release readiness.

The two changed workflow YAML files parse successfully with the installed `yaml` parser, and `git diff --check` passed. The local isolated `npm ci` initially failed on npm cache permissions; an escalated retry was interrupted after prolonged installation without a definitive result. TestingAgent's local `npm test` exited during `eslint-config-next`/`@rushstack/eslint-patch` setup before application tests ran; local typecheck did not complete. These attempts provide **no local full-gate PASS**. Clean GitHub branch jobs are required before the workflow change can be called verified, and a documentation-only PR after integration is needed to prove trigger coverage under the new base workflow.
