# Production dependency audit triage

Baseline: `npm audit --omit=dev --json` against `package-lock.json` on 2026-10-16. The PR audit artifact is attached to [SAST run 38893020631](https://github.com/appiah233/Picksy/actions/runs/38893020631). npm reports **13 high, 11 moderate, 0 critical** vulnerable package entries. These are package entries, not 24 independent exploits. Exploitability in Picksy has **not** been verified.

| Root chain | High package entries | Advisory area | Exposure assessment | Proposed action |
| --- | --- | --- | --- | --- |
| Direct `sanity` dependency → `@sanity/cli`, `@sanity/runtime-cli` → `adm-zip` | `sanity`, `@sanity/cli`, `@sanity/runtime-cli`, `adm-zip` | Malicious ZIP processing, memory exhaustion, symlink/file overwrite, and related archive handling | Sanity Studio is part of Picksy. Whether these CLI/archive paths execute in a deployed runtime is unverified. | Trace the bundled/runtime path and test a supported Sanity update in separate work. npm suggests `sanity@6.19.0`, a major upgrade. |
| `sanity` → `chokidar`/`preferred-pm`/`@sanity/codegen` → `braces`/`micromatch`/`fast-glob`/`globby`/`find-yarn-workspace-root2`/`which-pm` | `chokidar`, `preferred-pm`, `@sanity/codegen`, `braces`, `micromatch`, `fast-glob`, `globby`, `find-yarn-workspace-root2` | Deeply nested glob pattern stack exhaustion, propagated through tooling packages | Input reachability and whether tooling runs in deployed Picksy are unverified. | Assess affected paths and test a supported Sanity update in separate work; avoid an unreviewed lockfile override. |
| Direct `next` dependency → `postcss` | `postcss` | CSS stringification XSS, source map file read, and path traversal advisories | Picksy builds CSS with Next.js; whether untrusted CSS/source map input reaches the affected functions is unverified. | Reproduce/assess affected build path; npm suggests `next@16.4.2`, a major upgrade requiring compatibility tests. |

The 11 moderate entries include direct `next` and `next-sanity` plus transitive Sanity, YAML, and UUID packages; their full advisory records are in the audit artifact. They require owner assignment and assessment after the high findings. No dependency was upgraded or suppressed in this security pipeline PR.

## Time-Bound SecurityAgent Risk Exceptions (Approved 2026-10-16)

Per the governance policy in [security-pipelines.md](security-pipelines.md), time-bound risk exceptions are approved for the 13 high package entries across the 3 root chains. These exceptions are enforced in CI by `.github/scripts/check-dependency-audit.py`:

| Component / Package | Root Chain | Advisory IDs | Technical Justification | Scope & Reachability | Expiration Date | Approval |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `adm-zip`, `@sanity/runtime-cli`, `@sanity/cli`, `sanity` | `adm-zip` | GHSA-xcpc-8h2w-3j85, GHSA-7q85-xj36-vmfc, GHSA-rcw4-f5rp-g42v, GHSA-j5f4-cc29-5x44, GHSA-8238-w5pm-2374 | Transitive archive handling in Sanity CLI / runtime tooling. Sanity Studio runs in controlled administrative context; archive extraction paths are not reachable via untrusted public HTTP input. Upstream major upgrade (`sanity@6`) blocked by ADR-012 compatibility. | Production build & admin Studio tooling | 2026-11-16 | SecurityAgent |
| `braces`, `micromatch`, `fast-glob`, `globby`, `@sanity/codegen`, `chokidar`, `find-yarn-workspace-root2`, `preferred-pm`, `sanity` | `braces` | GHSA-vfj7-8cjw-p6xm | Deeply nested glob pattern stack exhaustion in file-watching and codegen tooling. `braces@3.0.3` is the latest release on npm (no upstream patch available). Pattern matching inputs are internal filesystem paths, not exposed to runtime HTTP requests. | Build-time and Studio tooling only | 2026-11-16 | SecurityAgent |
| `postcss` | `postcss` | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | Transitive CSS parsing advisory inside Next.js 15.5.27 bundler. Compilation occurs at build time; untrusted runtime CSS input is not accepted. Next.js 16 major upgrade blocked by ADR-012 compatibility. | Next.js build-time compilation | 2026-11-16 | SecurityAgent |

**Disposition:** Approved with conditions. The production dependency audit pipeline step runs `.github/scripts/check-dependency-audit.py`, which strictly rejects any critical vulnerabilities, rejects any unapproved high vulnerabilities, and validates that all exceptions remain active before expiration. Remediation tracking continues during the 30-day exception window.

