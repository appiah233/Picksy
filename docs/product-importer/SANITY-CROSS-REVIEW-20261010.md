# Independent Sanity Backend and Schema Cross-Review

**Date:** 2026-10-10  
**Owner:** Codex  
**Status:** CHANGES REQUIRED; LIVE PROOF BLOCKED

## Reproducible baseline

- Branch: `chore/issue-bug-template`
- HEAD: `8d106c005361f3999a06d591abbb641ac658b5fe`
- `npm ls next react react-dom next-sanity sanity @sanity/vision @sanity/image-url styled-components`: exit code 0 with no invalid peer dependencies.
- Installed versions: Next 15.5.27; React and React DOM 19.3.0; next-sanity 11.6.13; sanity and `@sanity/vision` 4.22.1; `@sanity/image-url` 2.1.1; styled-components 6.5.3.
- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and 0 warnings.
- `node --experimental-strip-types --test tests/sanity-integration.test.mjs`: 5/5 passed.

## Credential and authorization status

`SANITY_API_WRITE_TOKEN` is not provisioned in local server configuration. Its value was not displayed, logged, or recorded.

**Status: BLOCKED - CREDENTIAL REQUIRED FOR LIVE WRITE PROOF**

The existing Auth.js/GitLab `requireAdmin()` boundary is not proof of Sanity Studio editor identity. No shared browser token or robot token will be added. Anonymous, unauthorized, expired, malformed, replayed, CSRF, CORS, and rate-limit authorization proofs remain **NOT VERIFIED**.

## Findings recorded before implementation changes

1. `merchant.approvedHosts` validates lowercase and dot count but not strict DNS hostname grammar. Labels, whitespace, trailing dots, IP literals, ports, and wildcard-like values require rejection.
2. Sanity schema validation cannot establish that each approved destination URL hostname belongs to the merchant's approved host list. Runtime `validateCatalog()` remains authoritative and must stay fail-closed.
3. `importDraft` read-only fields are UX controls, not authorization. Server-side mutation boundaries must restrict lifecycle and provenance changes.
4. `SanityDraftStore` invents ordinary document IDs and performs duplicate check then create without an atomic identity strategy. This violates ordinary-ID guidance and leaves a concurrent duplicate race.
5. `SanityDraftStore.updateDraft()` checks an application `version` but does not send a Sanity `_rev` precondition, so concurrent updates can overwrite one another.
6. `SanityCatalogAdapter` filters draft IDs in GROQ but the transport does not explicitly request the published perspective.

## Scope decision

The corrective implementation is limited to Sanity server transport, draft persistence, and schema validation. The unresolved Studio editor identity handoff remains blocked rather than being weakened. No public catalogue cutover, publication bypass, third-party platform, or credential handling change is authorized.
