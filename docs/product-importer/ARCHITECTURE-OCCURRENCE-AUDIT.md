# Architecture occurrence audit

**Date:** 2026-10-10. **Scope:** every line matching the product-owner search terms in the repository, excluding `package-lock.json`, dependencies and this generated audit. Reproduce with `rg -n -i 'Brevo|BREVO_API_KEY|/v3/contacts|doubleOptinConfirmation|newsletter provider|email marketing platform|approved platform|Auth\.js|NextAuth|custom admin|managed platform' --glob '!package-lock.json' --glob '!node_modules/**' --glob '!docs/product-importer/ARCHITECTURE-OCCURRENCE-AUDIT.md' .`.

Each row lists all requested terms on that line and its current classification. Historical coordination entries remain unchanged for traceability. `obsolete active-scope statement` requires correction before implementation; `code pending safe disposition` must be preserved until reviewed removal or reuse.

| Location | Matched terms | Classification |
| --- | --- | --- |
| `PICKSY_PROJECT_INSTRUCTIONS.md:8` | brevo, auth.js | paused implementation |
| `PICKSY_PROJECT_INSTRUCTIONS.md:238` | brevo | current approved architecture |
| `.env.example:13` | auth.js | code pending safe disposition |
| `src/auth.ts:1` | nextauth | code pending safe disposition |
| `src/auth.ts:5` | nextauth | code pending safe disposition |
| `docs/product-importer/COORDINATION-LOG.md:269` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:274` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:276` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:284` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:287` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:294` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:297` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:299` | nextauth | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:302` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:304` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:310` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:315` | nextauth | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:318` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:381` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:396` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:409` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:416` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:431` | brevo, auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:435` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:438` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:445` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:453` | brevo, auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:456` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:458` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:462` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:469` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:470` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:474` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:484` | managed platform, brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:489` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:491` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:492` | brevo, custom admin, auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:495` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:502` | auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:503` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:505` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:521` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:540` | brevo, auth.js | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:541` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:542` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:550` | brevo, custom admin | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:562` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:563` | custom admin | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:570` | brevo | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:574` | custom admin | historical evaluation |
| `docs/product-importer/COORDINATION-LOG.md:578` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:588` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:593` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:597` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:616` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:631` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:634` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:656` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:674` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:678` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:704` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:709` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:723` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:729` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:730` | custom admin, auth.js | paused implementation |
| `docs/product-importer/COORDINATION-LOG.md:770` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:777` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:806` | newsletter provider, auth.js, custom admin | paused implementation |
| `docs/product-importer/COORDINATION-LOG.md:816` | brevo, auth.js | paused implementation |
| `docs/product-importer/COORDINATION-LOG.md:821` | auth.js | paused implementation |
| `docs/product-importer/COORDINATION-LOG.md:824` | brevo, auth.js | paused implementation |
| `docs/product-importer/COORDINATION-LOG.md:827` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:836` | brevo | current approved architecture |
| `docs/product-importer/COORDINATION-LOG.md:841` | auth.js | paused implementation |
| `docs/product-importer/ARCHITECTURE.md:1` | approved platform | current approved architecture |
| `docs/product-importer/ARCHITECTURE.md:65` | auth.js | paused implementation |
| `docs/product-importer/ARCHITECTURE.md:162` | custom admin, auth.js | paused implementation |
| `docs/product-importer/ARCHITECTURE.md:163` | auth.js | historical evaluation |
| `docs/product-importer/ARCHITECTURE.md:171` | brevo, newsletter provider | historical evaluation |
| `docs/product-importer/ARCHITECTURE.md:177` | brevo | current approved architecture |
| `docs/product-importer/AUTH-CONTRACT.md:8` | auth.js | paused implementation |
| `docs/product-importer/AUTH-CONTRACT.md:50` | auth.js | paused implementation |
| `docs/product-importer/AUTH-CONTRACT.md:62` | auth.js | paused implementation |
| `docs/product-importer/API-CONTRACT.md:3` | auth.js, newsletter provider | historical evaluation |
| `docs/product-importer/API-CONTRACT.md:61` | auth.js | historical evaluation |
| `docs/product-importer/API-CONTRACT.md:63` | auth.js | historical evaluation |
| `docs/product-importer/TEST-PLAN.md:3` | brevo, auth.js, custom admin | paused implementation |
| `docs/product-importer/TEST-PLAN.md:25` | brevo | current approved architecture |
| `docs/product-importer/TEST-PLAN.md:27` | brevo | current approved architecture |
| `docs/product-importer/TEST-PLAN.md:28` | brevo | current approved architecture |
| `docs/product-importer/DECISIONS.md:69` | managed platform | current approved architecture |
| `docs/product-importer/DECISIONS.md:79` | custom admin | paused implementation |
| `docs/product-importer/DECISIONS.md:83` | brevo | current approved architecture |
| `docs/product-importer/DECISIONS.md:84` | brevo | historical evaluation |
| `docs/product-importer/DECISIONS.md:86` | brevo | current approved architecture |
| `docs/product-importer/DECISIONS.md:90` | brevo | current approved architecture |
| `docs/product-importer/DECISIONS.md:94` | custom admin, auth.js | paused implementation |
| `docs/product-importer/DECISIONS.md:95` | custom admin | paused implementation |
| `docs/product-importer/DECISIONS.md:97` | auth.js | paused implementation |
| `docs/product-importer/DECISIONS.md:100` | auth.js | paused implementation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:3` | brevo | historical evaluation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:7` | brevo | historical evaluation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:13` | auth.js | paused implementation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:35` | brevo | historical evaluation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:38` | brevo | current approved architecture |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:48` | auth.js | paused implementation |
| `docs/product-importer/MANAGED-PLATFORM-FIT.md:50` | brevo | historical evaluation |
| `docs/product-importer/SECURITY.md:3` | brevo, auth.js, custom admin | paused implementation |
| `docs/product-importer/SECURITY.md:26` | brevo, newsletter provider | historical evaluation |
| `docs/product-importer/SECURITY.md:35` | auth.js | historical evaluation |
| `docs/product-importer/SECURITY.md:37` | auth.js | paused implementation |
| `docs/product-importer/EVIDENCE.md:7` | brevo | historical evaluation |
| `docs/product-importer/EVIDENCE.md:13` | nextauth | paused implementation |
| `docs/product-importer/EVIDENCE.md:24` | custom admin, auth.js | paused implementation |
| `docs/product-importer/SANITY-INTEGRATION-PROPOSAL.md:7` | auth.js | paused implementation |
| `docs/product-importer/SANITY-INTEGRATION-PROPOSAL.md:40` | brevo | current approved architecture |
| `docs/product-importer/REQUIREMENTS.md:115` | brevo | historical evaluation |
| `docs/product-importer/REQUIREMENTS.md:117` | brevo | current approved architecture |
| `docs/product-importer/REQUIREMENTS.md:118` | brevo, newsletter provider | current approved architecture |

**Counts by matching line:** paused implementation: 25; current approved architecture: 32; code pending safe disposition: 3; historical evaluation: 59. Total: 119.

**Current decision:** Sanity alone is approved as an external business platform. Newsletter delivery is unapproved; Brevo is evaluated only. The custom admin/Auth.js code remains pending safe disposition. See [SecurityAgent review](SANITY-SECURITY-REVIEW.md) for the browser token blocker.
