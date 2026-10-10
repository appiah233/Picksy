# Picksy Project Instructions and Continuity Charter

**Status:** Mandatory  
**Applies to:** Gemini, Codex, replacement agents, reviewers, and automation  
**Project:** Picksy Affiliate Marketplace  
**Current phase:** Affiliate Product Importer  

**Architecture direction (2026-10-10):** Sanity is Picksy's ONLY approved third-party business platform. React, Next.js, TypeScript and the existing design system remain the application stack. Brevo was EVALUATED - NOT APPROVED. The newsletter remains REQUIRED - DELIVERY ARCHITECTURE NOT APPROVED. The custom `/admin` and Auth.js paths are SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY and PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT. `src/content/catalog.ts` is transitional; the target public path is Sanity Content Lake -> Picksy Catalogue Adapter -> `validateCatalog` -> Picksy domain model -> Next.js -> React UI -> validated merchant destination. Imported records begin as drafts and require human publication. Preserve URL/SSRF, source permissions, normalization, provenance, duplicates, catalogue validation and safe links. A SecurityAgent threat review is required before any reusable Studio-to-importer credential design; privileged reusable credentials must never be exposed in browser-executed Studio code.


## 1. Purpose

This file is the durable onboarding, execution, handover, and safety contract for every agent working on Picksy. An agent must read this file, the coordination log, active contracts, decisions, and evidence before changing code.

The objective is to allow another agent to resume work without relying on chat history, private reasoning, or undocumented assumptions.

## 2. Product Context

Picksy is an affiliate marketplace. Picksy owns its affiliate catalogue, editorial rules, product presentation, merchant destination references, and permitted tracking data. Sanity Content Lake is the approved managed target store; `src/content/catalog.ts` is transitional.

Picksy does not own merchant product databases, control merchant inventory, process merchant checkout, fulfil orders, or become authoritative for final merchant price and availability.

Current Product Importer journey:

`Paste affiliate URL -> validate -> identify source -> retrieve permitted data -> normalize -> editable preview -> duplicate check -> save draft or publish -> catalogue visibility -> external merchant CTA`

A pasted link must never publish automatically. Human review is required before publication.

## 3. Sources of Truth

Read in this order:

1. `PICKSY_PROJECT_INSTRUCTIONS.md`
2. `docs/product-importer/COORDINATION-LOG.md`
3. `docs/product-importer/REQUIREMENTS.md`
4. `docs/product-importer/ARCHITECTURE.md`
5. `docs/product-importer/API-CONTRACT.md`
6. `docs/product-importer/DATA-CONTRACT.md`
7. `docs/product-importer/SECURITY.md`
8. `docs/product-importer/TEST-PLAN.md`
9. `docs/product-importer/DECISIONS.md`
10. `docs/product-importer/EVIDENCE.md`
11. Current Git status, branch history, open changes, and test results

For the current managed-platform investigation, also read `docs/product-importer/MANAGED-PLATFORM-FIT.md` and re-evaluate `docs/product-importer/AUTH-CONTRACT.md` before changing admin or newsletter boundaries.

When sources conflict, stop only the affected work, record the conflict, and resolve it using accepted requirements, security, data integrity, working behavior, and documented decisions. Never silently choose one source.

## 4. Read-Before-Write Protocol

Before every implementation unit:

1. Confirm branch and working-tree state.
2. Read the latest coordination entries and unresolved blockers.
3. Review active file claims.
4. Review frozen contracts and approved decisions.
5. Inspect the actual implementation and tests.
6. Identify existing behavior and all known dependants.
7. Declare the task and files to be modified.
8. Design or update tests before implementation.
9. Change only the minimum required scope.
10. Record evidence and release file claims after completion.

Never depend solely on another agent's summary. Verify repository state directly.

## 5. Working-Component Protection

Preserve all verified working behavior unless an approved requirement explicitly changes it.

Before modifying existing code, document:

- current behavior;
- affected callers and components;
- relevant tests;
- compatibility risks;
- rollback approach;
- reason the change is necessary.

Mandatory rules:

- No unrelated refactoring.
- No broad dependency upgrade without approval and evidence.
- No silent API, schema, type, enum, route, or error-code change.
- No destructive migration without a reviewed migration and rollback strategy.
- No deletion of working tests to make a change pass.
- No weakening validation, authentication, authorization, accessibility, or security controls.
- No replacement of shared infrastructure merely because another pattern is preferred.
- No direct modification of another agent's claimed files.
- No fabricated fallback data or false success state.

If a regression is found, mark the milestone `CHANGES REQUIRED` or `BLOCKED`. Do not conceal it.

## 6. Engineering Excellence Directive

Act as a world-class computer scientist inspired by Donald Knuth. This describes rigor, clarity, and craftsmanship. It does not authorize unnecessary complexity or imitation of any person's exact writing style.

Before writing code:

1. Formally define the problem.
2. List assumptions.
3. Analyze algorithmic time and space complexity where relevant.
4. State critical invariants and give a concise correctness argument where relevant.
5. Identify edge cases and failure modes.
6. Design tests before implementation.
7. Explain the implementation in clear literate-programming style.
8. Prefer maintainability and correctness over brevity.
9. Challenge the proposed design and document material flaws or alternatives.
10. Do not claim success without reproducible evidence.

Every engineering milestone must include:

- problem statement;
- scope and non-goals;
- assumptions;
- invariants;
- complexity assessment;
- edge cases;
- tests planned;
- implementation summary;
- self-critique;
- evidence;
- regression assessment;
- handover state.

Do not create theoretical analysis where it has no practical bearing. State `Not material for this change` with a reason instead.

## 7. Multi-Agent Governance

Required review roles:

- **ArchitectAgent:** architecture compatibility and unnecessary-complexity review.
- **ProductAgent:** user value, business goal, and MVP-scope review.
- **DatabaseAgent:** schema, migration, constraints, indexes, provenance, and integrity review.
- **SecurityAgent:** authentication, authorization, SSRF, redirects, remote content, secrets, rate limits, and threat review.
- **DesignAgent:** mandatory for UI, UX, product, frontend, website, mobile, dashboard, and customer-facing changes.
- **TestingAgent:** independent behavioral, regression, and evidence review.

Gemini currently owns product coordination, design, UX, frontend, accessibility, responsiveness, frontend tests, and integration coordination.

Codex currently owns backend, data, source adapters, normalization, URL security, authentication and authorization enforcement, persistence, duplicate detection, and backend/integration tests.

No implementing agent may give final approval to its own work. Cross-review and independent evidence are required.

## 8. Global Design Excellence Directive

All design, UI, UX, product, frontend, SaaS, mobile, dashboard, website, application, and customer-facing work must follow human-centred, system-first design principles.

### Philosophy

- Humans first.
- Simplicity over complexity.
- Clarity over cleverness.
- Experience over feature count.
- Systems over one-off screens.
- Accessibility by default.
- Mobile-first thinking.
- Design for trust.
- Design for conversion without manipulation.
- Design for purposeful delight.

### Mandatory process before UI implementation

1. Define the user.
2. Define the primary business goal.
3. Define the user goal.
4. Define measurable success criteria.
5. Identify friction points and failure states.
6. Create the end-to-end user flow.
7. Create or validate information architecture.
8. Define reusable component requirements.
9. Define accessibility requirements.
10. Challenge the solution before implementation.

### Design-system-first requirements

Use and extend the existing system before creating new patterns:

- design tokens;
- typography;
- colour;
- spacing;
- grid and layout;
- reusable components;
- icon strategy;
- motion strategy;
- responsive strategy;
- content and error-message patterns.

No new UI pattern should be introduced when an accessible existing component can satisfy the need.

### Product-quality requirements

- Simplify complex workflows.
- Make the product approachable.
- Use visual storytelling only when it improves comprehension.
- Favour elegant minimalism.
- Use illustrations only when purposeful and consistent.
- Build reusable components.
- Balance usability and personality.
- Use large typography and intentional spacing when a premium experience is appropriate.
- Maintain strong visual hierarchy, sophisticated colour use, high-quality imagery, minimal clutter, visible focus, and exceptional mobile behavior.

### Accessibility baseline

Target WCAG 2.2 AA for applicable customer-facing and administrative interfaces. Test keyboard navigation, focus visibility, labels, status announcements, contrast, target sizing, error recovery, reduced motion, responsive reflow, and accessible authentication.

### DesignAgent review

DesignAgent reviews:

- user flow;
- visual hierarchy;
- accessibility;
- mobile responsiveness;
- consistency;
- design-system compliance;
- conversion opportunities;
- trust and emotional quality.

Before approval, DesignAgent answers:

1. Can this be simpler?
2. Can this be clearer?
3. Can this be more accessible?
4. Can this support the business goal without manipulation?
5. Can this be more consistent?
6. Can this be faster to understand?
7. Does any delight serve the user's goal?

Reject designs that create unnecessary complexity, lack reusable patterns, prefer aesthetics over usability, fail accessibility, introduce inconsistency, or do not improve user outcomes.

Design approval requires evidence of desktop, mobile, accessibility, design-system, and user-flow validation, plus DesignAgent review.

Do not merely design screens. Design coherent experiences. Do not merely build interfaces. Build trustworthy products people can use confidently.

## 9. Security and Authentication Invariants

Sanity is the ONLY approved third-party business platform for Picksy. Brevo, Auth0, Clerk, WorkOS, or any other external CMS, authentication, newsletter, CRM, or administrative platform requires new explicit product-owner approval. Sanity Studio authenticates editors, but independently hosted Picksy APIs still require server-side verification of each editor's identity and permission. A reusable robot/shared secret in browser-executed Studio code is prohibited; see `docs/product-importer/SANITY-SECURITY-REVIEW.md`. Server-only robot tokens may perform narrowly scoped Content Lake writes after editor authorization. The newsletter delivery architecture is NOT APPROVED; no third-party delivery provider is authorized. Newsletter subscribers do not become Picksy account holders.


- Admin authentication must use the approved authentication architecture.
- Authentication and authorization are separate.
- `/admin/*` and protected `/api/admin/*` behavior must be enforced server-side.
- No hard-coded token may remain as a production fallback after the replacement is verified.
- Remote links and content are untrusted.
- SSRF protections, redirect validation, response limits, timeouts, sanitization, and administrative authorization are mandatory.
- Secrets never enter source control, logs, client bundles, screenshots, or evidence files.
- Public Picksy catalogue and product browsing must not accidentally become admin-protected.

## 10. Milestone Logging and Handover

Every material milestone must be logged in `docs/product-importer/COORDINATION-LOG.md` using `docs/product-importer/MILESTONE-TEMPLATE.md`.

Log a milestone when:

- investigation completes;
- a contract is proposed, changed, or frozen;
- a vertical integration checkpoint completes;
- a schema or migration is introduced;
- a security control is implemented or blocked;
- implementation is handed to another agent;
- cross-review completes;
- tests or build gates complete;
- a defect is discovered or resolved;
- a release decision is made;
- an agent stops work or is replaced.

Do not log every keystroke or trivial edit. Log every state transition another agent would need to resume safely.

Each milestone must include the exact commit or working-tree state, files changed, contracts affected, commands run, results, known defects, next action, and takeover instructions.

## 11. Agent Replacement Protocol

A replacement agent must:

1. Read all sources of truth.
2. Inspect the latest milestone and open handover.
3. Verify Git branch, HEAD commit, working tree, and uncommitted files.
4. Re-run the latest relevant verification commands where practical.
5. Confirm active file claims and release stale claims explicitly.
6. State its understanding, assumptions, and first bounded task in the coordination log.
7. Continue from current state. Do not restart or rewrite completed work without evidence.

The departing or interrupted agent should leave a `HANDOVER` milestone containing:

- last stable commit;
- uncommitted changes;
- completed work;
- incomplete work;
- current blocker;
- exact next action;
- expected contract behavior;
- tests last run and results;
- known risks;
- files safe to modify;
- files still claimed.

## 12. Evidence and Completion

Allowed status labels:

- NOT STARTED
- INVESTIGATING
- IN PROGRESS
- IMPLEMENTED - NOT VERIFIED
- READY FOR REVIEW
- PASS WITH CONDITIONS
- CHANGES REQUIRED
- BLOCKED
- VERIFIED
- REJECTED

Never use `DONE`, `FIXED`, `COMPLETE`, `PASS`, or `READY` without evidence.

Evidence may include:

- exact test command and output;
- typecheck and lint results;
- production build result;
- integration and regression tests;
- security tests;
- accessibility test results;
- desktop and mobile validation;
- screenshots where useful;
- migration validation;
- Guardian status;
- cross-review decision;
- commit hash or pull request reference.

A green local unit test alone does not prove end-to-end correctness.

## 13. Final Rule

Protect Picksy as one production system. Communicate before changing shared assumptions. Preserve working behavior. Keep scope bounded. Prefer evidence over confidence. Leave the repository in a state that another qualified agent can understand and continue safely.
