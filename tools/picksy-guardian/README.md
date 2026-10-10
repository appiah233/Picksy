# Picksy Guardian

Guardian is a GitLab reviewer bot for Picksy. GitLab sends it a webhook when a Merge Request is
opened or receives a new commit. Guardian reviews that revision against the Picksy policy and
keeps one summary comment on the Merge Request up to date.

Guardian is a separate service. It is not part of the Picksy web application and it is not a CI
job. It needs Node.js 22 and one package, the official `openai` SDK.

**Status:** implemented and tested against simulated GitLab and OpenAI responses. It has not been
deployed, and it has not yet run against the real GitLab project or the real OpenAI API. The bot
account exists; the hosting and webhook described below do not.

## What Guardian may and may not do

| Guardian may                               | Guardian may not                               |
| ------------------------------------------ | ---------------------------------------------- |
| Read the Merge Request, its diff, pipeline | Approve or merge a Merge Request               |
| Run policy checks and an AI assessment     | Push, edit files, or change the repository     |
| Create and update its own summary comment  | Authorize a Gate or declare readiness          |
| Classify findings and ask for human review | Deploy, or state that external evidence exists |

A Guardian PASS is advisory evidence for the human reviewer. It is never an authorization.

## How a review works

1. **Receive.** `POST /webhooks/gitlab`. Anything else is rejected.
2. **Authenticate.** The delivery must carry a valid signature or secret token (see below).
3. **Filter.** Only open Merge Requests targeting `main` are eligible. Merge Request Hook events
   with action `open`, `reopen` or `update` schedule a review after the exact head pipeline has
   finished. Completed `Pipeline Hook` events also schedule that review. Other authentic events
   are acknowledged and ignored.
4. **Re-read.** Guardian takes only the Merge Request number from the webhook. The revision,
   state, diff and pipeline are read from the GitLab API for the configured project.
5. **Skip if done.** If Guardian's comment already records this revision under this policy
   version, nothing happens.
6. **Check.** Deterministic policy checks run on the diff, the production catalogue file at that
   revision, and the pipeline status.
7. **Assess.** Bounded, secret-redacted context goes to the OpenAI Responses API, which must
   return a result matching a strict schema. The result is validated again locally.
8. **Comment.** Guardian creates its comment, or updates the existing one.

### Result

| Status       | Meaning                                                                      |
| ------------ | ---------------------------------------------------------------------------- |
| FAIL         | A proven violation of a protected rule, or the AI assessment returned FAIL   |
| INCONCLUSIVE | Part of the revision was not reviewed, or the AI assessment did not complete |
| WARN         | Fully reviewed; something needs a human decision                             |
| PASS         | Fully reviewed; nothing above low severity                                   |

The final status is the worse of the deterministic result and the AI result. The AI cannot
improve a deterministic result, cannot mark external evidence as verified, and cannot change the
Gate status shown in the comment, which comes from `policy.json`.

### What is not reviewed

Guardian says so in the comment whenever it could not review something. It never reports PASS
for a revision it reviewed only in part.

- More than 100 changed files, a file diff over 40 kB, a total diff over 120 kB, or a diff GitLab
  withholds as too large: the review is INCONCLUSIVE and the AI assessment is skipped.
- Lockfiles, binary, generated and minified files get pattern checks only and are not sent to
  the AI. The comment lists them and the status is at most WARN.
- Commit messages, job logs and files outside the diff are not read. The one exception is
  `src/content/catalog.ts`, which is read at the reviewed revision to check that it is empty.
- Guardian reviews only after a completed pipeline exists for the exact revision. Configure both
  Merge Request events and Pipeline events so a review skipped while the pipeline is running is
  triggered again when it finishes.

## Policy

[`policy.json`](./policy.json) is the versioned policy: the Gate state, the approved
architecture, protected paths, limits, and the severity and decision rules.

Guardian loads the policy from its own deployment, not from the Merge Request. A Merge Request
that changes `policy.json` or any other Guardian file is reviewed under the deployed policy and
gets a HIGH finding asking for the project owner's review. A policy change takes effect only
when a human deploys it. Raise `version` with every policy change; open Merge Requests are then
reviewed again on their next event.

Gate 3 can be marked authorized only by changing `gate` in the policy and deploying it. There is
no environment switch.

## No database

Guardian stores nothing. Its comment starts with a hidden marker that records the policy
version, project, Merge Request, reviewed revision, status and the last ten earlier revisions.
The marker holds no secrets.

Guardian only trusts a marker in a comment written by its own account, so a marker pasted by
someone else has no effect. In memory it keeps the last 1,000 delivery IDs, and it reviews each
Merge Request one delivery at a time. Losing that memory on restart is harmless because the
marker still prevents a repeat review.

Run a single instance. Two instances could both create a comment for the same new Merge Request.

## Setup

These steps need the project owner. Step 1 is done; hosting, configuration and the webhook are not.

### 1. Bot account (done)

Guardian has its own GitLab identity, created on 8 October 2026 as a project access token. It
was reported by the agent that created it and has not been checked from this repository.

| Item          | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Project ID    | `87130489`                                              |
| Bot name      | Picksy Guardian                                         |
| Bot username  | `project_87130489_bot_ce37914448e785e1ff88a2a665d85415` |
| Bot user ID   | `43173033`                                              |
| Role          | Reporter                                                |
| Token scope   | `api`                                                   |
| Token expires | 8 October 2027                                          |

The token value is held by the project owner and is not in this repository. Guardian stops
working when the token expires, so rotate it before then and update `GUARDIAN_GITLAB_TOKEN`.

The project is on GitLab.com Free. GitLab's documentation says project access tokens need a paid
plan on GitLab.com, yet the project offered one. If that option is ever withdrawn, the
replacement is a separate GitLab user added as **Reporter** with a personal access token of
scope **`api`**. Never use a team member's personal token.

GitLab has no narrower scope that allows writing a comment, so `api` is required. The Reporter
role is what limits the bot: a Reporter cannot push, merge, delete branches, change protected
branches, deploy or administer the project. Confirm in a private project that a Reporter can
read pipelines and comment on Merge Requests before relying on this.

### 2. Hosting

Guardian needs a public HTTPS address that GitLab can reach. Run it behind a platform or reverse
proxy that terminates TLS; Guardian itself speaks plain HTTP. Any host that runs a long-lived
Node.js 22 process works. No hosting has been chosen.

```bash
npm ci
node tools/picksy-guardian/server.mjs
```

`openai` is a development dependency of the repository, so it is not part of the Picksy web
application. Install with `npm ci`, not `npm ci --omit=dev`, on the Guardian host.

`GET /healthz` returns `200` for health checks.

### 3. Configuration

Set these as secrets on the host. Never commit them, and do not add them to GitLab CI variables.

| Variable                         | Required | Purpose                                                     |
| -------------------------------- | -------- | ----------------------------------------------------------- |
| `GUARDIAN_GITLAB_PROJECT_ID`     | yes      | Numeric ID of the one project Guardian reviews: `87130489`  |
| `GUARDIAN_GITLAB_TOKEN`          | yes      | The bot account's access token                              |
| `GUARDIAN_WEBHOOK_SIGNING_TOKEN` | one of   | Webhook signing token (`whsec_…`), GitLab 19.1 or later     |
| `GUARDIAN_WEBHOOK_SECRET`        | one of   | Legacy webhook secret token, at least 32 characters         |
| `GUARDIAN_GITLAB_PROJECT_PATH`   | no       | Also require this path, for example `appiah233/picksy`      |
| `GUARDIAN_GITLAB_URL`            | no       | Defaults to `https://gitlab.com`                            |
| `OPENAI_API_KEY`                 | no       | Without it every review is INCONCLUSIVE, deterministic only |
| `OPENAI_MODEL`                   | no       | Defaults to `gpt-4.1-mini`                                  |
| `GUARDIAN_HOST`                  | no       | Defaults to `127.0.0.1`; use `0.0.0.0` in a container       |
| `PORT`                           | no       | Defaults to `8080`                                          |

Prefer the signing token. It proves the body was not altered and carries a timestamp, so
Guardian rejects deliveries older than five minutes. The legacy secret token is a shared
password with no replay protection. If both are set, both must be valid.

### 4. Webhook

In the GitLab project, under **Settings → Webhooks**, add a webhook:

- URL: `https://<guardian-host>/webhooks/gitlab`
- Signing token or secret token: the value configured above
- Trigger: **Merge request events** and **Pipeline events**
- SSL verification: enabled

Use **Test → Merge request events** and check the Merge Request for the comment.

If a review fails, for example during a GitLab outage, GitLab does not send the event again.
Use **Resend request** in the webhook's recent events, or push a new commit.

## Security model

Guardian's configuration and policy are trusted. Everything else is treated as untrusted data:
the webhook until authenticated, all repository and Merge Request content always, and the AI's
output until it passes validation.

| Threat                                          | Control                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Forged webhook                                  | HMAC signature or secret token, compared in constant time, checked before the body is parsed                 |
| Replayed webhook                                | Five-minute timestamp window with the signing token; delivery-ID memory; a reviewed revision is not repeated |
| Forged project ID, cross-project access         | The project ID comes from configuration. The payload must match it and is never used to build a request      |
| Stale or forged revision in the payload         | The revision and state are read from the GitLab API                                                          |
| Excess token privilege                          | Reporter role; the client can only read, and create or update a comment                                      |
| Secret exposure                                 | Logs hold identifiers and fixed strings only. Tokens are never logged or sent to OpenAI                      |
| Secrets in a diff                               | Credential patterns are redacted before the AI call and in the comment; the finding never shows the value    |
| Prompt injection                                | Policy and instructions are in the system message; Merge Request content is passed as a JSON data document   |
| Injection succeeds anyway                       | The AI cannot raise the status, verify evidence, change the Gate line or act; deterministic checks still run |
| Refusal, timeout, malformed or forged AI output | Strict schema plus local validation; any failure is INCONCLUSIVE. Only the API response is ever parsed       |
| Malicious Markdown in the comment               | All untrusted text is entity-encoded on one line: no markup, links, mentions, HTML or quick actions          |
| Oversized diffs, denial of service              | Limits on body size, files, diff size and response size; timeouts; at most ten Merge Requests in review      |
| SSRF, arbitrary URLs                            | Requests go only to the configured GitLab origin and `api.openai.com`; redirects are refused                 |
| Bot feedback loop                               | Guardian reacts only to Merge Request events, and its own comment does not produce one                       |

Remaining risks to accept or address:

- Diffs are sent to OpenAI. Redaction removes known credential formats, not every possible
  secret. Requests set `store: false`.
- The OpenAI call goes through the `openai` SDK and its request matches the SDK's types, but it
  has only run against a simulated API. Make one real call before relying on the AI assessment.
- The deterministic checks are deliberately narrow. Each finding is labelled `Check` when it is
  proven and `Heuristic` when it is a signal for a human.

## Tests

```bash
node --test tests/guardian.test.mjs
```

The tests run the real HTTP server and replace GitLab and OpenAI with in-memory fakes. They are
part of `npm test`.

## Files

| File                | Responsibility                                                      |
| ------------------- | ------------------------------------------------------------------- |
| `server.mjs`        | HTTP endpoint, delivery de-duplication, one review per MR at a time |
| `webhook.mjs`       | Webhook authentication and event filtering                          |
| `gitlab.mjs`        | The only GitLab access: reads, and the comment write                |
| `context.mjs`       | Diff collection, limits, file classification, pipeline evidence     |
| `policy-engine.mjs` | Deterministic checks                                                |
| `openai.mjs`        | Responses API request, strict schema and local validation           |
| `report.mjs`        | Decision rules, hidden marker and comment rendering                 |
| `reviewer.mjs`      | Orchestrates one review                                             |
| `config.mjs`        | Environment configuration and policy loading                        |
| `policy.json`       | The versioned Picksy policy                                         |
