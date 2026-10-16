# GitLab to GitHub migration

## Scope and invariants

**Problem:** GitLab compute availability prevents Picksy CI execution.

**Target:** GitHub is the canonical Git host, GitHub Actions runs the repository checks, and Vercel deploys from GitHub.

**Invariant:** Application behavior and architecture remain unchanged. Picksy is an affiliate marketplace that maintains its own catalogue and merchant offer references, not merchants' product databases. Next.js, React, TypeScript, Sanity, GitLab OAuth for existing admin authentication, and current database behavior remain in place.

GitLab remains available as a rollback and historical reference. Keep `.gitlab-ci.yml`, its variables, branches, and tags until the GitHub workflow and Vercel connection have been verified.

## Discovered state (2026-10-16)

- GitLab source: `https://gitlab.com/appiah233/picksy.git`; default branch `main`.
- GitLab remote branches: `main` and `develop`; no remote tags. Local `chore/issue-bug-template` and `feature/gate3-accessor-immutability` are already ancestors of GitLab `main`.
- GitHub destination: `https://github.com/appiah233/Picksy`; before migration it held only an independent initial README commit.
- `.gitlab-ci.yml` includes GitLab Auto DevOps and overrides `test` with Node 22, `npm ci`, `npm test`, and `npm run test:build`. Inherited Auto DevOps jobs depend on GitLab's template and project settings. Earlier pipeline evidence records build, code quality, container scanning, SAST, and secret detection; their exact current behavior has not been reproduced or verified here. The GitHub workflow runs the explicit project validation contract. Vercel remains the deployment platform.
- No `vercel.json` or repository deployment script exists. Vercel's current Git provider connection must be checked in the Vercel dashboard.
- Sanity Studio is mounted in the Next.js app. No repository-dependent Sanity webhook or deployment hook was found in the tracked configuration. Existing live Content Lake and editor authorization gates remain separately unverified.
- Prisma's application schema is a blueprint; no database migration command exists in the CI scripts. The separate MCP coordination database is unrelated to application deployment.
- GitLab OAuth in `src/auth.ts` and the undeployed GitLab Guardian MR bot are separate provider dependencies. GitHub pull requests will not receive Guardian reviews unless that bot is migrated as separate work. Preserve the GitLab OAuth application and credentials for admin login.

## Variables and secrets

The explicit GitLab `test` job does not reference CI variables. The GitHub Actions workflow needs no repository secrets or variables for its current validation commands. Keep application runtime values in Vercel, not GitHub Actions. Values below have **not** been copied or verified in either provider.

| Existing name | Purpose | GitHub equivalent | Class | Environment | Status |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_NAME` | Public site configuration | Same names if a future workflow needs them | Variable | Vercel production/preview | Check Vercel settings |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION` | Public Sanity configuration | Same names if a future workflow needs them | Variable | Vercel production/preview | Check Vercel settings |
| `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION` | Server Sanity configuration | Same names if a future workflow needs them | Variable | Vercel production/preview | Check Vercel settings |
| `SANITY_API_WRITE_TOKEN` | Server Content Lake mutations | Same name if a future workflow needs it | Secret | Vercel server runtime | Check provisioning; do not put in CI |
| `AUTH_SECRET`, `AUTH_GITLAB_SECRET`, `IMPORTER_PREVIEW_SECRET` | Authentication/importer secrets | Same names if a future workflow needs them | Secret | Vercel server runtime | Check Vercel settings |
| `AUTH_GITLAB_ID`, `AUTH_ADMIN_GITLAB_IDS` | GitLab OAuth identity configuration | Same names if a future workflow needs them | Variable or secret according to owner policy | Vercel server runtime | Check Vercel settings; retain GitLab OAuth |
| `DATABASE_URL`, `DIRECT_URL` | Future PostgreSQL connections | Same names if activated | Secret | Application runtime only when provisioned | No CI migration needed |
| `GUARDIAN_GITLAB_TOKEN`, `GUARDIAN_WEBHOOK_SIGNING_TOKEN` or `GUARDIAN_WEBHOOK_SECRET` | Separate Guardian service | No GitHub Actions equivalent | Secret | Guardian host if deployed | Guardian is currently documented as undeployed |
| `PICKSY_BASE_URL`, `VERCEL_AUTOMATION_BYPASS_SECRET` | Optional Checkly checks | Same names if Checkly automation is later added | Variable, secret respectively | Checkly runner | No Checkly CI job configured |

Do not transfer secret values into Git or workflow YAML. Review any inherited GitLab Auto DevOps variables in GitLab's CI/CD settings before retiring GitLab CI; repository inspection cannot reveal masked values.

## External cutover checks

1. Verify GitHub contains the imported `main` and `develop` branch tips and their GitLab ancestry. Set `main` as the default branch. Protect both branches and require the `test-and-build` check after a successful run.
2. Verify the GitHub Actions workflow is accepted and its `test-and-build` job succeeds on the exact migrated commit. Compare any required security controls from GitLab Auto DevOps with GitHub repository settings before declaring full parity.
3. In Vercel, inspect the current project's **Settings → Git** connection. Connect `appiah233/Picksy` from GitHub, set the production branch to `main`, preserve the existing build/environment settings, and verify production and preview deployments. Disconnect GitLab only after the GitHub deployment succeeds.
4. Check Sanity's project API/CORS settings and any externally configured deploy hooks for GitLab URLs. No repository configuration requires a Sanity change.
5. Verify the production admin OAuth callback still works with GitLab. Keep the GitLab OAuth application active; Git hosting does not migrate identity.
6. Keep the GitLab project and `.gitlab-ci.yml` as rollback/reference until all checks pass.
