# Milestone Entry Template

Use this template for all material milestones logged in `docs/product-importer/COORDINATION-LOG.md`.

---

```markdown
### Milestone [ID]: [Milestone Title]

- **Timestamp:** [ISO 8601 UTC timestamp, e.g. 2026-10-10T08:25:00Z]
- **Agent:** [Gemini | Codex | Joint]
- **Role / Ownership:** [e.g. Lead Coordinator & Frontend Owner | Backend & Security Owner]
- **Milestone Type:** [INVESTIGATION | CONTRACT_FROZEN | CHECKPOINT_COMPLETED | SCHEMA_MIGRATION | SECURITY_CONTROL | HANDOVER | CROSS_REVIEW | TEST_GATE | DEFECT_RESOLVED | RELEASE_DECISION]
- **Status:** [NOT STARTED | INVESTIGATING | IN PROGRESS | IMPLEMENTED - NOT VERIFIED | READY FOR REVIEW | PASS WITH CONDITIONS | CHANGES REQUIRED | BLOCKED | VERIFIED | REJECTED]
- **Branch & Working Tree:** [Branch name, HEAD commit SHA, clean / dirty list]

#### 1. Problem Statement
[Concise formal definition of the problem addressed in this milestone]

#### 2. Scope & Non-Goals
- **In Scope:** [What was implemented or verified]
- **Non-Goals:** [What was explicitly deferred or excluded]

#### 3. Assumptions & Invariants
- **Assumptions:** [Key operational assumptions]
- **Invariants:** [Catalog invariants, Gate 3 boundary rules, zero-leakage, SSRF protections]

#### 4. Complexity & Algorithmic Assessment
[Time/space complexity or statement: "Not material for this change — bounded linear processing"]

#### 5. Edge Cases & Failure Modes
[Edge cases considered: malformed inputs, timeouts, DNS rebinding, concurrency collisions, etc.]

#### 6. Files Claimed & Modified
- **Claimed:** [List of paths]
- **Modified:** [List of paths with additions/deletions]
- **Contracts Affected:** [Shared contracts touched or "None — conforms to frozen contract"]

#### 7. Implementation Summary
[Literate summary of changes made]

#### 8. Verification & Evidence
- **Commands Executed:** [e.g. `npm test`, `npx tsc --noEmit`, `node --test tests/...`]
- **Test Output Summary:** [Number of tests run, passed, failed, duration]
- **Build / Typecheck / Lint Evidence:** [Exit codes and relevant output excerpts]
- **Accessibility & Responsive Evidence (for UI milestones):** [WCAG 2.2 AA checks, viewports tested]

#### 9. Self-Critique & Limitations
[Known limitations, technical debt noted, or edge cases requiring downstream attention]

#### 10. Regression Assessment
[Evidence that existing catalog, build isolation, and public routing were preserved]

#### 11. Handover State & Next Action
- **Current Blocker:** [None / description]
- **Next Exact Action:** [Next unblocked action or next checkpoint]
- **Takeover Instructions:** [Clear instructions for peer or replacement agent]
```

