# Main governance closure — 2026-10-16

**Status: initial documentation-only check proof and active enforcement readback complete; final-head check confirmation pending.** This is a repository governance record, not a Picksy release approval. Gate 3, the authorized importer, PR #7, and later functional, UX, accessibility, production, and security release work remain blocked or unfinished.

## Documentation branch and verification PR

- Branch `docs/gate3-pr7-pr10-closure-20261016` was created from merged `main` `8c77637a2a9a0bd50569dfaed96b0562dde097e6` in an isolated clean worktree. The first documentation-only commit `7f13c2f30a232b508ba8523d6e920125e94fc8fe` changed only the Gate 3 decision, PR #7 residual-risk addendum, PR #10 post-merge verification, and the product-importer coordination log. It was pushed without Gemini's application changes or the unrelated verification-bot work.
- [Draft PR #11](https://github.com/appiah233/Picksy/pull/11) is the documentation-only trigger test. The initial verification head is `7f13c2f30a232b508ba8523d6e920125e94fc8fe`. The current/final head must be checked from PR #11 after this report commit, and all four checks must complete again on that SHA before the final outcome is claimed.

## Required check trigger and result on initial head `7f13c2f`

All four GitHub Actions jobs were triggered by `pull_request` on the documentation-only PR, associated with the exact initial head, and completed `success`. None was absent, skipped, or treated as passed while pending. All four check runs report GitHub Actions app ID `15368`.

| Required check | Trigger | Final result | Evidence |
| --- | --- | --- | --- |
| `test-and-build` | `pull_request`; triggered | PASS | [CI job](https://github.com/appiah233/Picksy/actions/runs/38957074087/job/117162511977) |
| `CodeQL JavaScript/TypeScript` | `pull_request`; triggered | PASS | [SAST CodeQL job](https://github.com/appiah233/Picksy/actions/runs/38957074220/job/117162512310) |
| `Production dependency audit` | `pull_request`; triggered | PASS under main's existing dated exceptions | [SAST dependency job](https://github.com/appiah233/Picksy/actions/runs/38957074220/job/117162512135) |
| `public-baseline` | `pull_request`; triggered | PASS | [Public DAST job](https://github.com/appiah233/Picksy/actions/runs/38957074210/job/117162512193) |

The dependency job's result does **not** meet PR #7's separate zero High/Critical policy. No dependency rule or threshold was changed for this governance work.

## Main protection and enforcement

Before activation, GitHub reported no repository ruleset and `main.protected = false`. The account had repository administration permission. [Ruleset `25271320`](https://github.com/appiah233/Picksy/rules/25271320), **Picksy main governance**, was created for `refs/heads/main` with `enforcement = active` and no bypass actors. Its rules require:

- a pull request with one approving review, stale-approval dismissal on push, approval from someone other than the most recent pusher, and resolved review threads;
- the four named status checks above, pinned to GitHub Actions app `15368`, with strict up-to-date branch testing;
- no force push and no deletion of `main`.

Readback from `GET /repos/appiah233/Picksy/rulesets/25271320` shows the active configuration. `GET /repos/appiah233/Picksy/rules/branches/main` returns all four effective rules from that ruleset, and `GET /repos/appiah233/Picksy/branches/main` now reports `protected: true`. PR #11 remains draft and GitHub reports `mergeStateStatus: BLOCKED` with `reviewDecision: REVIEW_REQUIRED`. These readbacks establish that the rule is attached and enforcing the review restriction; no direct-push or force-push probe was made.

## Remaining boundaries

PR #11 stays draft for independent review. No release/MVP tag was created. Main governance does not authorize Gate 3 content, a merchant source, product import, PR #7 risk acceptance, a major dependency migration, or a Picksy release.
