# Backend test plan

> **Authoritative scope update (2026-10-10):** Sanity is the ONLY approved third-party platform. Brevo was **EVALUATED - NOT APPROVED** and must not be implemented; no Brevo test proofs will be conducted. Status of Auth.js / custom admin: **SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY**; Disposition: **PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT**. A Sanity proof must test Studio-to-importer authorization, draft-only creation, duplicate/provenance preservation, publication validation, public catalogue reads via `validateCatalog`, and secret isolation. See [fit assessment](MANAGED-PLATFORM-FIT.md).


- Adapter contract: approved source mapping, missing fields, malformed data, provenance and normalization.
- URL/network: URL variants, host suffix tricks, encoded credentials, IP literals, DNS resolution, redirects to private addresses, rebinding, timeouts, size caps and content type.
- Authorization: every admin endpoint denies anonymous and non-admin users before source/network access; CSRF and session expiry.
- Persistence: duplicate IDs and URLs, concurrent create, optimistic edit conflict, rollback and audit entry.
- Publication: drafts stay private; incomplete editorial records fail; authorized exact destination succeeds only after review; repeated publish is idempotent.
- Integration: frontend calls same-origin server routes only and displays stable error codes; production build and existing catalog tests pass.

Current status: planned only. No source credentials, database runtime or admin identity is configured, so live integration tests cannot yet run.

## Managed Control Plane & Sanity Integration Test Proof

- **Studio Tool Embedding**: Verify that `ProductImporter` React components mount correctly in the Sanity Studio Tool container without layout overflow.
- **Service Authorization**: Reject anonymous, wrong-project, robot-only, insufficient-role, revoked and replayed editor calls before URL/DNS/source work. Prove a supported Sanity user credential handoff; do not use a shared token in browser Studio code. Restrict CORS, and test Origin/CSRF if cookie mode is chosen.
- **Draft Creation**: Verify that importing a valid candidate creates a Sanity draft using a Sanity-generated ordinary document ID, retains field provenance and does not render publicly.
- **Webhook/Public Read**: Verify raw-body webhook signature, replay bound and deduplication; re-fetch current state. Read only the published perspective and run `validateCatalog` before mapping to Picksy's public domain model.
- **Duplicate Detection**: Verify that importing a product with an existing Sanity draft or published ID triggers a duplicate warning banner.
- **Publication Gate**: Verify that publishing a draft executes catalog validation (`validateCatalog`) and fails if required fields or disclosure statements are missing.
- **Catalog Isolation**: Verify that the public frontend catalogue remains empty and uncompromised until Gate 3 authorization.

## Newsletter Testing (Brevo REJECTED)

> **Status:** Brevo is NOT approved and must not be implemented.
- No Brevo test suites or API mocks shall be created.
- Future newsletter tests will evaluate client form accessibility (WCAG 2.2 AA), client honeypot filtering, and input validation in isolation without third-party email vendor dependencies.


## Proposed Authentication and Authorization Tests (PAUSED)

> **Status:** PAUSED pending managed-admin architectural review. The tests below are documented for reference if an independent admin portal is retained:
- Anonymous `/admin` request redirects to sign-in; anonymous `/api/admin/*` returns `401 UNAUTHORIZED`.
- Authenticated GitLab user outside the exact ID allowlist gets `403 FORBIDDEN`.
- Allowed GitLab ID reaches the handler; removing it from allowlist revokes access.
- Provider secrets never appear in browser bundles or responses.

