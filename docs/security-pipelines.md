# GitHub security pipelines

## Baseline and scope (2026-10-16)

Picksy uses npm, `package-lock.json`, Node 22, Next.js, and JavaScript/TypeScript. The existing `.github/workflows/ci.yml` runs `npm ci`, `npm test` (lint, typecheck, unit tests), and `npm run test:build` on `main` and `develop`. Before this work, GitHub had no CodeQL analysis or DAST workflow. GitHub secret scanning and push protection were enabled. Dependabot security updates were disabled; Dependabot alerts were not available through the queried API. Vercel preview/staging connectivity remains unverified.

The current working tree contains separate, uncommitted importer/auth/Sanity/schema work. Security changes are isolated in their own worktree and change no application, authentication, Sanity, Vercel, or database code.

## SAST and dependencies

`.github/workflows/security-sast.yml` runs CodeQL `security-extended` queries for JavaScript/TypeScript with no build mode. GitHub's public repository Code Scanning supports this setup. The CodeQL job has `contents: read` and `security-events: write`; it receives no application secrets. The workflow runs for source/config/lockfile changes in pull requests and `main`/`develop` pushes, weekly, and manually. It skips documentation-only changes. CodeQL uploads to GitHub Code Scanning; a successful action execution alone does not prove there are no alerts.

The same workflow audits the production npm dependency graph from the committed lockfile and uploads the JSON result. The audit step runs `.github/scripts/check-dependency-audit.py`, which strictly fails closed on any critical vulnerabilities or unapproved high vulnerabilities. The 2026-10-16 baseline reported **13 high, 11 moderate, 0 critical** vulnerable package entries. The [dependency triage](security-dependency-triage.md) groups the advisory chains, records technical justifications, and documents approved time-bound SecurityAgent exceptions expiring on 2026-11-16. Major upgrades of Sanity and Next remain restricted by ADR-012 compatibility.

## Public DAST

`.github/workflows/security-dast.yml` builds the production app with the existing commands, serves it at `http://127.0.0.1:3000/` on an isolated GitHub runner, requires a successful Picksy homepage response, then runs the official OWASP ZAP Baseline Docker image pinned to the digest tested in run `38893020608`. Update the digest deliberately after reviewing and testing a newer image. This is a passive scan, with a one-minute spider. Public scan scope excludes `/api`, `/admin`, and `/studio`; no credentials, cookies, production URL, or Sanity write token are supplied. Reports are uploaded as HTML, JSON, and Markdown for 14 days. The report checker rejects missing results, out-of-scope reported URLs, and high-risk alerts; medium, low, and informational alerts remain visible for triage. No scanner finding is suppressed.

**Coverage:** public routes in an ephemeral local production build. **Not covered:** authenticated routes, importer mutations, Sanity Content Lake writes, Vercel/CDN configuration, and a deployed preview or production environment. The Vercel DAST target remains **BLOCKED — NO VERIFIED TARGET** until a preview or staging deployment is independently confirmed. Authenticated DAST is **NOT YET IMPLEMENTED**.

DAST runs on relevant pull requests to `main`/`develop`, relevant `main` pushes, weekly, and manually. It skips documentation-only changes and cancels superseded runs. The workflow has `contents: read` only and neither receives secrets nor writes GitHub issues.

## Security gates and triage

| Severity | Policy |
| --- | --- |
| Critical | Verified finding blocks merge/deployment. |
| High | Audit and ZAP jobs fail; verify promptly and block merge/deployment until resolved or a documented exception is approved. CodeQL alerts need review in Code Scanning and a required-check/branch-rule decision. |
| Medium | Assess impact, assign an owner, and track remediation. |
| Low | Record and triage. |
| Informational | Review when relevant. |

Any suppression requires rule ID, component, evidence, technical justification, scope, date, and SecurityAgent approval. There are no suppressions in these workflows. GitHub branch protection is currently unconfigured, so failing checks are visible but do not themselves prevent a direct push or merge; configure required checks after their behavior has been reviewed.

## Execution evidence (PR #2, 2026-10-16)

- [Existing CI run 38893020592](https://github.com/appiah233/Picksy/actions/runs/38893020592) passed `npm ci`, `npm test`, and `npm run test:build` on security workflow commit `2409562`.
- [SAST run 38893020631](https://github.com/appiah233/Picksy/actions/runs/38893020631): CodeQL JavaScript/TypeScript job passed and uploaded a PR analysis; the PR merge ref had zero Code Scanning alerts when queried. The production dependency job failed on the existing high findings and uploaded its audit artifact.
- [Public DAST run 38893020608](https://github.com/appiah233/Picksy/actions/runs/38893020608) passed on the same commit. The HTML, JSON, and Markdown reports contain one localhost site, 10 alert rules and 27 instances: **0 high, 2 medium, 5 low, 3 informational**. The medium rules are absent CSP and anti-clickjacking headers. Reported URLs are the homepage, static assets, `robots.txt`, and `sitemap.xml`; other public routes were not exercised.
- Independent TestingAgent review confirmed the workflow results, report artifact, source-only scope, and unchanged original worktree.

## Verification still required

- Review the production dependency findings without blindly applying major upgrades.
- Assess and track the two medium ZAP header findings and lower-severity alerts. No application header changes are included here.
- Verify Vercel preview/staging and production behavior externally before any deployed-environment DAST claim.
- Keep GitLab OAuth, Sanity, and database behavior unchanged and verify them separately in their live environments.
