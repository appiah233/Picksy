# Picksy Milestone and Handover Template

Copy each completed entry into `docs/product-importer/COORDINATION-LOG.md`. Newest entries should go first. Do not delete or rewrite another agent's historical entry. Corrections must be appended and linked to the original milestone.

---

## MILESTONE: [M-YYYYMMDD-NNN] [Concise title]

**Timestamp:** [ISO-8601 UTC]  
**Agent:** [Gemini | Codex | replacement agent | reviewer]  
**Role:** [implementation/review role]  
**Status:** [allowed status]  
**Branch:** `[branch]`  
**HEAD commit:** `[commit SHA or UNCOMMITTED]`  
**Working tree:** [CLEAN | DIRTY, with summary]  
**Previous milestone:** `[ID or none]`  

### 1. Outcome

[What changed or what was established. One concise paragraph.]

### 2. Formal problem definition

[The bounded problem solved by this milestone.]

### 3. Scope

**Included:**
- [item]

**Excluded:**
- [item]

### 4. Assumptions

- [assumption and how it was verified]

### 5. Invariants and correctness

- [invariant]
- [concise correctness argument or `Not material`, with reason]

### 6. Complexity

- **Time:** [assessment or `Not material`, with reason]
- **Space:** [assessment or `Not material`, with reason]
- **Scaling risk:** [risk or none identified]

### 7. Edge cases and failure modes

- [case]

### 8. Design and implementation decisions

- [decision, rationale, and decision-record reference]

### 9. Files

**Claimed:**
- `[path]`

**Changed:**
- `[path]` - [purpose]

**Created:**
- `[path]` - [purpose]

**Deleted:**
- None / `[path]` - [approved reason]

**Claims released:**
- `[path]`

### 10. Contracts affected

- API: [none/reference/change]
- Data: [none/reference/change]
- Authentication/authorization: [none/reference/change]
- Error codes: [none/reference/change]
- Database/schema: [none/reference/change]
- UI/design system: [none/reference/change]

**Contract status:** [UNCHANGED | PROPOSED CHANGE | APPROVED | FROZEN]

### 11. Tests designed before implementation

- [test and intended assertion]

### 12. Commands executed

```text
[exact command]
```

### 13. Results and evidence

```text
[PASS/FAIL output summary; never fabricate]
```

Evidence references:
- [commit, artifact, screenshot, report, or file]

### 14. Regression assessment

- Existing behavior checked: [behavior]
- Regression tests: [result]
- Untested impact: [none/describe]

### 15. Security and privacy assessment

- [controls assessed, findings, secrets check]

### 16. Design evidence, when applicable

- User: [defined user]
- Business goal: [goal]
- User goal: [goal]
- User flow: [reference]
- Desktop validation: [result/evidence]
- Mobile validation: [result/evidence]
- Accessibility validation: [result/evidence]
- Design-system validation: [result/evidence]
- DesignAgent decision: [status/evidence]

### 17. Self-critique

- Weakest assumption: [item]
- Most likely defect: [item]
- Simpler alternative considered: [item]
- Why the current approach remains preferred: [reason]

### 18. Known defects, risks, and blockers

- [severity] [description] [owner] [blocking/non-blocking]

### 19. Cross-review

- Reviewer: [agent]
- Decision: [PASS WITH CONDITIONS | CHANGES REQUIRED | VERIFIED | BLOCKED]
- Findings: [summary]
- Follow-up: [action]

### 20. Next action

[Exactly one primary next action and owner.]

### 21. Takeover instructions

A replacement agent should:

1. Read: [files]
2. Inspect: [paths/components]
3. Run: [commands]
4. Avoid modifying: [claimed/risky files]
5. Resume at: [exact task]
6. Verify success by: [criteria]

---

## HANDOVER: [H-YYYYMMDD-NNN] [Agent or workstream]

Use this when an agent stops, is replaced, changes workstream, or leaves unfinished work.

**Timestamp:** [ISO-8601 UTC]  
**Outgoing agent:** [name]  
**Incoming agent:** [name/unknown]  
**Branch:** `[branch]`  
**Last stable commit:** `[SHA]`  
**Working tree:** [CLEAN/DIRTY]  

### Completed

- [item]

### Implemented but not verified

- [item]

### Incomplete

- [item]

### Uncommitted changes

- `[path]` - [state and purpose]

### Active file claims

- `[path]`

### Current blocker

- None / [blocker]

### Exact next action

[command/task]

### Frozen behavior and contracts

- [reference]

### Last verification

```text
[commands and results]
```

### Known risks

- [risk]

### Safe continuation boundary

[What the incoming agent may change safely and what requires coordination.]
