# Controlled release-blocker investigation — 2026-10-16

Status: **STOP — owner direction required before dependency implementation**. This is an investigation record, not approval to change framework majors, Sanity architecture, the strict audit gate, or release status. Baseline `main`: `14f86cc96358ee4719a0eb93eac62af8a31ce2ec`; PR #7 head: `b4e0ed92359b6c0cb81ac06c571bcb114c5614cb`. The unrelated, uncommitted `next.config.ts` edit in the main worktree was inspected and left untouched.

## Complete `braces` paths

The following are all paths found by walking dependency edges in `package-lock.json`, cross-checked with `npm ls braces --all --omit=dev` and `npm explain braces`. One `braces@3.0.3` installation is deduplicated across the paths.

1. **Production graph:** Picksy → `sanity@4.22.1` → `@sanity/cli@4.22.1` → `@sanity/codegen@4.22.1` → `globby@11.1.0` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. Direct parent: `micromatch`.
2. **Production graph:** Picksy → `sanity@4.22.1` → `chokidar@3.6.0` → `braces@3.0.3`. Direct parent: `chokidar`.
3. **Production graph:** Picksy → `sanity@4.22.1` → `preferred-pm@4.1.1` → `find-yarn-workspace-root2@1.2.16` → `micromatch@4.0.8` → `braces@3.0.3`. Direct parent: `micromatch`.
4. **Development graph only:** Picksy → `eslint-config-next@15.5.27` → `@next/eslint-plugin-next@15.5.27` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. `eslint-config-next` is a root `devDependency`; this path alone cannot explain the production audit.

`sanity` is used by `sanity.config.ts` and the `/studio` page via `next-sanity/studio`; it cannot be removed as unused under the current approved architecture. Picksy source does not directly import `braces`, `chokidar`, `micromatch`, `fast-glob`, or `preferred-pm`. The Sanity paths appear to serve CLI/codegen, file watching, and package-manager detection. Whether their modules are included in the deployed Vercel runtime, and whether any runtime input reaches `braces`, is **unverified**; `npm audit --omit=dev` establishes installation classification, not deployed execution. No package-path removal is claimed from a configuration setting.

The [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) covers `braces <=3.0.3` and lists **no patched version**. `npm view braces version` returned `3.0.3`. `npm view sanity@4 version` reports `4.22.1` as the latest v4 release. Current `fast-glob` and `micromatch` still depend on `micromatch` and `braces`, respectively; latest `preferred-pm` still depends on `find-yarn-workspace-root2`. Chokidar v4 drops `braces` but Sanity 4 declares `chokidar:^3.6.0`, and that change would leave two other production paths.

## Remediation decision matrix

| Rank / option | Dependency paths affected | Packages changed | Removes vulnerable chain? | Breaking-change risk | Next.js impact | Sanity impact | Runtime impact | Build impact | Testing required | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. Remove unused direct dependency | None: `sanity` is required for `/studio`; removing `eslint-config-next` affects only development path | Potential direct packages | **No** for production | High if Sanity removed | None directly | Studio stops working | Studio unavailable | Studio build fails | Full app/Studio/browser suite | Reject within frozen architecture |
| B. Upgrade immediate parents independently | Chokidar path only with v4; `preferred-pm` and `fast-glob` updates still lead to `braces`; Sanity pins `@sanity/codegen` at 4.22.1 | Transitive parents, possibly overrides | **No** across all production paths | Medium to high; unsupported overrides cross declared ranges | None directly | Tooling/watch/codegen compatibility unknown | Possibly changed tooling only; unverified | Sanity build risk | Clean install, audit/tree, Studio, CI/DAST | Reject as a complete fix; do not force overrides |
| C. Replace unnecessary tooling | CLI/codegen, watcher, package-manager detection are dependencies of the Sanity package rather than independently selected Picksy tooling | Sanity package internals or Studio packaging | **No supported replacement identified** | High | None directly | Material packaging/architecture change | Deployment boundary changes | Studio build/deploy changes | Full integration and deployment validation | Stop under frozen scope |
| D. Supported upstream/configuration remediation | All three production paths | Upstream Sanity/dependency releases or supported configuration | **No available complete A-D option** | Unknown until upstream release | None directly | Await supported package release | Unknown | Retest when available | Clean install, audit/tree, app and Studio tests | Monitor upstream; preserve strict gate |
| E. Major framework/package transition | Potentially all production paths if a new Sanity major actually removes them | Sanity, peers and possibly Next separately | **Unproven** | High | Next major only for separate PostCSS chain | Sanity major changes Studio/tooling contracts | Unknown | Full migration/build risk | Complete compatibility, security, CI/DAST and live Studio checks | **Requires separate owner approval before implementation** |

The audited tree also contains `adm-zip@0.5.18` through Sanity CLI and `postcss@8.4.31` through Next. Removing `braces` alone would not clear all 13 High package entries. The strict zero High/Critical gate in PR #7 must remain unchanged. No dependency, lockfile, or application code was changed during this investigation.

## CodeQL and Gate 3 disposition at this stop

The five normalizer alerts (#1, #2, #3, #5, #8) remain unresolved sanitization defects; no executing sink has been demonstrated. The three test-helper alerts (#4, #6, #7) have no demonstrated production path. Because the dependency investigation reached the owner's explicit stop condition before an A-D implementation candidate emerged, normalizer fixes and a new CodeQL run have **not** been performed in this worktree. Their individual classifications and owner-supplied Gate 3 inputs remain in [the release audit](release-blocker-audit.md). No alert has been suppressed.

## GitHub `main` governance

GitHub API returned no `main` branch protection and an empty repository ruleset list. Recommend an active branch ruleset targeting `main`: require pull requests with at least one approval and dismissal of stale approvals after new commits; require the branch to be current before merge; block force pushes and deletion; and apply the rule to administrators without routine bypass. Require the **actual** job/check names `test-and-build`, `CodeQL JavaScript/TypeScript`, `Production dependency audit`, and `public-baseline` after making their PR workflows run for every `main` PR. CI already runs on every PR, but SAST and DAST currently have path filters; requiring filtered jobs without changing those filters would leave documentation-only PRs pending indefinitely. Keep the strict audit failing while findings remain. Repository settings require an owner or administrator to configure and verify the ruleset; none was changed here.

## Release decision

**BLOCKED.** A-D have no supported complete chain removal within the approved scope, and E requires owner approval. No release tag. Gate 3 remains blocked by real merchant, authorized destination, research, editorial review, disclosure, recheck owner, and production origin.
