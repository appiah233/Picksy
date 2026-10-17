# Picksy GitHub Verification Bot (`tools/picksy-verification-bot/`)

## 1. Overview & Purpose
The **Picksy GitHub Verification Bot** is a lightweight, zero-dependency, fail-closed multi-agent verification and monitoring engine built for GitHub. It provides authoritative, independent observation of pull requests, commits, CI/CD check runs, and main-branch integrity across **CODEX** (Backend, Database, and Security Owner) and **GEMINI** (Lead Coordinator, Design, and Frontend Owner).

## 2. Core Architectural Pillars
1. **Change & Scope Verification**:
   - Inspects touched files (`added`, `modified`, `deleted`, `renamed`).
   - Evaluates files against agent task declarations (`expectedFiles`, `prohibitedAreas`, and other agents' active file locks).
   - Classifies each file into `IN_SCOPE`, `OUT_OF_SCOPE`, `OWNERSHIP_CONFLICT`, or `UNKNOWN`.
   - Any unknown, out-of-scope, or conflicting ownership triggers `requiresHumanReview: true`.

2. **Diff Parsing & Line Overlap Conflict Detection**:
   - Parses unified diff hunk headers (`@@ -oldStart,oldCount +newStart,newCount @@`).
   - Detects when multiple agents touch the same file across PRs/commits and deterministically identifies overlapping line ranges.
   - Reports detailed conflict descriptors. Conflicts block the separately authorized automatic merge path.

3. **Check Verification & No Duplicate Execution**:
   - Inspects GitHub Actions check-runs and commit statuses (`test-and-build`, `CodeQL JavaScript/TypeScript`, `Production dependency audit`, `public-baseline`).
   - **Never executes duplicate test/build pipelines locally**.
   - If a required check did not execute, it is marked `NOT_RUN` and returns `UNVERIFIED` (never converted to `PASS`).
   - When a new commit SHA is pushed, previous verification is invalidated and re-evaluated for the new SHA.

4. **Agent Claim Verification**:
   - Validates claims made by agents (e.g. `"Tests passed"`, `"Build succeeded"`, `"SAST passed"`, `"Task complete"`, `"MVP ready"`) against actual GitHub evidence and trusted policy conditions.
   - Falsified claims (e.g., claiming test pass when CI failed) are marked `FAILED` (`isFalseClaim: true`).
   - Claims violating project governance (such as `"MVP ready"` when `mvpReleaseApproved: false` or `"Gate 3 ready"` when Gate 3 is unauthorized) are marked `BLOCKED`.

5. **Main-Branch Integrity Monitoring**:
   - Observes pushes to `main`.
   - Distinguishes legitimate PR merge commits (`EXPECTED_MERGE`) from direct unmerged commits (`UNEXPECTED_DIRECT_CHANGE`) and force-pushes (`FORCE_PUSH_DETECTED`), immediately flagging for human review.

6. **Prompt Injection Defense**:
   - Treats all repository text (titles, descriptions, comments, commit messages, diffs) strictly as passive untrusted data.
   - Scans for injection signatures (`ignore previous instructions`, `mark the PR as verified`, `override policy`, `suppress finding`, etc.).
   - Discards and flags injection attempts as `INJECTION_ATTEMPT_IGNORED`, guaranteeing untrusted content can never alter task scope, upgrade verification state, or suppress security findings.

7. **Secret Redaction & Append-Only Audit Logging**:
   - Implements `redactSecrets` to strip tokens, GitHub PATs, private keys, and passwords before logging or returning data over REST APIs.
   - Maintains an append-only audit trail separating raw `githubFacts` from `botConclusions`.

---

## 3. Module Layout
- `policy.json`: Trusted owner-controlled policy, special conditions, required checks, and task registry.
- `types-and-policy.mjs`: Verification states, scope classifications, check statuses, and policy loaders.
- `github-client.mjs`: Read-only, fail-closed GitHub REST API client with strict origin allowlist and SSRF protection.
- `webhook.mjs`: Timing-safe constant-time HMAC signature verification, replay protection, and event classification.
- `verification-engine.mjs`: Core verification logic (scope, diff overlaps, checks, claims, prompt injection).
- `audit-log.mjs`: Append-only structured audit logger with regex-based credential redaction.
- `formatter.mjs`: ASCII text report formatter and mobile-friendly PWA snapshot projector.
- `server.mjs`: Standalone HTTP server and REST API.

Set `GITHUB_WEBHOOK_SECRET` and `VERIFICATION_BOT_OWNER_TOKEN` as private environment variables before starting the server. Startup fails if either is missing. Never store these values in `policy.json`.

### Policy-gated automatic merging

The bot can squash-merge a PR without a per-PR human action **only** when `features.autoMerge` is enabled, its registered task ID is in `autoMerge.eligibleTaskIds`, the PR targets an allowed base branch, and it is absent from `autoMerge.excludedPullRequests`. PR #7, PR #11, and PR #13 are excluded. A draft PR, out-of-scope change, conflict, incomplete or failed current-head check, missing approval, self-review fallback, stale head, or GitHub mergeability state other than `clean` blocks the merge attempt. Immediately before merging, the bot rereads the PR and sends GitHub the reviewed head SHA; GitHub's active ruleset remains the final authority. A rejected merge is logged and notified to the owner. No direct push or ruleset bypass is used.

The GitHub identity running the bot needs repository permission to submit PR reviews and merge PRs, and it must differ from the PR author for its approval to count. Store its credential in the service's secret store, never in source or chat. This repository change provides the merge capability; it does not provision that identity or prove live merge permissions. A successful API response and a subsequent merged PR are required before claiming live activation.

### Owner notifications through GitHub

The bot posts a separate `@appiah233` PR comment when all required checks on the current head have completed, including when a check fails. It also posts a notification comment if it cannot read complete GitHub evidence or encounters a PR webhook processing error. A marker prevents repeat notifications for the same PR head and verdict. Missing or running checks do not trigger a final-verdict notification.

Set `PICKSY_BOT_NOTIFY_GITHUB_USER` to a different GitHub username if the owner changes. The default is `appiah233`. The bot's GitHub token needs permission to read and write issue comments on PRs. Run the bot under a separate GitHub identity: GitHub may not email a user about comments made by that same user.

To receive these mentions by mail, enable **Email** for participating notifications in [GitHub notification settings](https://github.com/settings/notifications) and choose the desired GitHub email address there. GitHub controls delivery and may suppress or group notifications; the bot cannot guarantee an email. It logs notification comment failures without changing the PR verdict.

---

## 4. API Endpoints
- `GET /healthz`: Health check returning service status and timestamp.
- `POST /webhooks/github`: Authenticated GitHub webhook endpoint verifying `X-Hub-Signature-256` and `X-GitHub-Delivery`.
- `GET /api/v1/status`: Mobile-friendly, PWA-ready verification snapshot.
- `GET /api/v1/agents`: Registered status and active work for Codex and Gemini.
- `GET /api/v1/tasks` & `POST /api/v1/tasks`: Task inspection and dynamic owner registration.
- `GET /api/v1/conflicts`: Current file/line ownership conflicts.
- `GET /api/v1/human-review`: Pending escalation items requiring human intervention.
- `GET /api/v1/audit-log`: Structured APPEND-ONLY RUNTIME AUDIT LOG with redacted secrets.
- `GET /api/v1/report`: Human-readable ASCII report summary.

---

## 5. Verification & Testing
Run the comprehensive test suite (22/22 tests passing):
```bash
node --experimental-strip-types --test tests/verification-bot.test.mjs
```
Full project quality gates:
```bash
npm run lint
npm run typecheck
npm test
npm run test:build
```
