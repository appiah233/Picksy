# Product importer security boundary

> **Authoritative Platform Decision (2026-10-10):** Sanity is the ONLY approved third-party platform for Picksy. Brevo was **EVALUATED - NOT APPROVED** and must not be implemented. Keep all importer URL, SSRF, source-permission, provenance, publication, and outbound-link controls. Sanity Studio authentication does not automatically authorize a Picksy-hosted API. No Studio browser bundle may receive Sanity write tokens or affiliate credentials. Status of Auth.js / custom admin: **SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY**; Disposition: **PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT**. Future newsletter intake must use provider-neutral interfaces, explicit consent, input validation, rate/abuse controls, and non-enumerating responses.


- Deny unauthenticated and non-admin requests before network or database work; enforce on each route, including publish.
- Permit only configured affiliate sources with documented permission. Store credentials server-side. Never scrape arbitrary URLs or expose credentials in responses.
- Normalize URLs, require HTTPS, reject credentials, fragments, nonstandard ports and IP literals, and match exact configured hostnames. Resolve DNS and reject private, loopback, link-local, multicast and reserved addresses. Recheck each redirect target; cap redirects and response size; set short timeouts.
- Avoid DNS rebinding by connecting only to the validated resolved address while preserving TLS hostname verification. Prefer approved provider API clients or fixed feed endpoints where possible.
- Rate limit per admin and source. Log request ID, source, outcome and timing without credentials or sensitive query strings.
- Treat imported strings as untrusted; validate length and types, render as text, and reject unsafe image URLs. Do not trust remote HTML or scripts.
- Require CSRF protection for cookie-authenticated mutations, signed short-lived preview state, optimistic draft versions, and audit records for edits/publication.
- Publication is server authorized and requires editorial review plus the current catalog's exact destination and review validation. Guardian is advisory and cannot grant source or editorial authorization.

No approved Sanity-editor-to-Picksy importer authorization or Sanity draft/publication persistence proof exists. These boundaries must be implemented and tested before enabling any importer endpoint.

## Security Invariants for Managed Admin (Sanity Integration)

- **Studio Secret Isolation**: Sanity Studio runs in the editor's browser. Never expose affiliate source credentials, internal API keys, or full Sanity write tokens in the Studio bundle or client environment variables.
- **Studio-to-Importer Authorization — CHANGES REQUIRED**: Browser-executed Studio code must never carry a reusable robot token or shared secret. The independent Picksy importer service must verify an individual editor's identity and permission server-side for every request. The supported Sanity credential handoff remains unproven; no importer endpoint may be enabled on the strength of Studio login alone. See [SecurityAgent threat review](SANITY-SECURITY-REVIEW.md).
- **Sanity Write Tokens**: Server-side mutations to Sanity Content Lake must use a narrowly scoped Sanity robot write token stored strictly in server environment variables (`SANITY_API_WRITE_TOKEN`).
- **Publication Guard**: Sanity publication webhooks or actions must not bypass Picksy's `validateCatalog` rules. Any published record consumed by Picksy's public frontend must satisfy all Gate 2/3 editorial and link invariants.

## Future Newsletter Security & Abuse Invariants — Delivery Architecture Not Approved

- **Vendor Exclusion**: Brevo was EVALUATED - NOT APPROVED. No Brevo or other newsletter provider key or endpoint may be configured or deployed without a new product-owner decision. No custom bulk-email delivery platform is approved.
- **Client Honeypot Protection**: Newsletter forms include an invisible honeypot field (`b_comment` or `website_url`). Submissions containing content in this field are silently dropped with a generic success response to defeat automated bots.
- **Server-Side Rate Limiting**: Any newsletter endpoint must throttle submissions per client IP (e.g. max 5 submissions per hour) to prevent email bombardment and resource exhaustion.
- **Privacy & Consent Preservation**:
  - Log anonymized consent evidence: timestamp, privacy notice version, client locale.
  - Never enumerate or disclose whether an email is already subscribed in a way that allows address harvesting.
  - Zero user accounts created in Picksy.


## Status of Proposed Auth.js Controls

- **PAUSED**: Auth.js implementation is paused pending architectural disposition.
- With Sanity Studio handling content curation and administration, administrative user authentication and RBAC are outsourced to Sanity's identity management.
- Picksy does not need a separate editor sign-in merely to use Sanity Studio. An independently hosted Picksy importer API still needs proven per-editor authorization; its mechanism remains unresolved.

