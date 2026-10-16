# Production dependency audit triage

Baseline: `npm audit --omit=dev --json` against `package-lock.json` on 2026-10-16. The PR audit artifact is attached to [SAST run 38893020631](https://github.com/appiah233/Picksy/actions/runs/38893020631). npm reports **13 high, 11 moderate, 0 critical** vulnerable package entries. These are package entries, not 24 independent exploits. Exploitability in Picksy has **not** been verified.

| Root chain | High package entries | Advisory area | Exposure assessment | Proposed action |
| --- | --- | --- | --- | --- |
| Direct `sanity` dependency → `@sanity/cli`, `@sanity/runtime-cli` → `adm-zip` | `sanity`, `@sanity/cli`, `@sanity/runtime-cli`, `adm-zip` | Malicious ZIP processing, memory exhaustion, symlink/file overwrite, and related archive handling | Sanity Studio is part of Picksy. Whether these CLI/archive paths execute in a deployed runtime is unverified. | Trace the bundled/runtime path and test a supported Sanity update in separate work. npm suggests `sanity@6.19.0`, a major upgrade. |
| `sanity` → `chokidar`/`preferred-pm`/`@sanity/codegen` → `braces`/`micromatch`/`fast-glob`/`globby`/`find-yarn-workspace-root2`/`which-pm` | `chokidar`, `preferred-pm`, `@sanity/codegen`, `braces`, `micromatch`, `fast-glob`, `globby`, `find-yarn-workspace-root2` | Deeply nested glob pattern stack exhaustion, propagated through tooling packages | Input reachability and whether tooling runs in deployed Picksy are unverified. | Assess affected paths and test a supported Sanity update in separate work; avoid an unreviewed lockfile override. |
| Direct `next` dependency → `postcss` | `postcss` | CSS stringification XSS, source map file read, and path traversal advisories | Picksy builds CSS with Next.js; whether untrusted CSS/source map input reaches the affected functions is unverified. | Reproduce/assess affected build path; npm suggests `next@16.4.2`, a major upgrade requiring compatibility tests. |

The 11 moderate entries include direct `next` and `next-sanity` plus transitive Sanity, YAML, and UUID packages; their full advisory records are in the audit artifact. They require owner assignment and assessment after the high findings. No dependency was upgraded or suppressed in this security pipeline PR.

**Disposition:** open. The high audit job remains failing. SecurityAgent recommends leaving PR #2 unmerged until the findings are triaged and remediated, or a specific, time-bound risk exception is approved and recorded. Do not treat a CodeQL or ZAP pass as clearance of these dependency findings.
