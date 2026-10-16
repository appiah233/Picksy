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
   - Reports detailed conflict descriptors and **never auto-merges or overwrites**.

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

---

## 4. API Endpoints
- `GET /healthz`: Health check returning service status and timestamp.
- `POST /webhooks/github`: Authenticated GitHub webhook endpoint verifying `X-Hub-Signature-256` and `X-GitHub-Delivery`.
- `GET /api/v1/status`: Mobile-friendly, PWA-ready verification snapshot.
- `GET /api/v1/agents`: Registered status and active work for Codex and Gemini.
- `GET /api/v1/tasks` & `POST /api/v1/tasks`: Task inspection and dynamic owner registration.
- `GET /api/v1/conflicts`: Current file/line ownership conflicts.
- `GET /api/v1/human-review`: Pending escalation items requiring human intervention.
- `GET /api/v1/audit-log`: Structured immutable audit trail with redacted secrets.
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
