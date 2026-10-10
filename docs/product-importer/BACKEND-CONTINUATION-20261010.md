# Backend continuation evidence — 2026-10-10

Status: MOCK-TESTED hardening; LIVE-TESTED empty catalogue read; backend vertical integration BLOCKED.

## Repository and dependency baseline

Branch `chore/issue-bug-template`; HEAD `8d106c005361f3999a06d591abbb641ac658b5fe`. Dirty tree preserved. Existing tracked modifications: `.env.example`, both package manifests, `prisma/schema.prisma`, `tests/build-isolation.mjs`, `tests/production-wiring.test.mjs`; importer, authentication, Sanity, Studio and governance files were already untracked. No reset, stash, checkout, clean, commit, migration or dependency change performed.

Manifest, lock and full `npm ls next react react-dom next-sanity sanity @sanity/vision @sanity/image-url styled-components` inspected; npm ls exit 0. Versions: Next 15.5.27, React/React DOM 19.3.0, next-sanity 11.6.13, sanity/vision 4.22.1, image-url 2.1.1, styled-components 6.5.3.

Actual public configuration checked without displaying secrets: project `0tozsrrx`, dataset `production`. The server client defaults independently to those values and API version `v2024-01-01`; Studio has its own version configuration. A future deployment must reconcile both sets explicitly.

`SANITY_API_WRITE_TOKEN=missing`. Live Content Lake write: BLOCKED - CREDENTIAL REQUIRED. CLI authentication is not a server write credential or editor-to-Picksy authorization proof.

## Execution inventory

| Boundary | Status | Reproducible evidence and limits |
| --- | --- | --- |
| Sanity client | MOCK-TESTED; LIVE-TESTED read only | Explicit perspectives, restricted URL config, redirect rejection, no-store, timeout, sanitized errors and envelope checks. Six transport tests. No compile-time server-only marker or response-byte cap yet. |
| SanityDraftStore | MOCK-TESTED; CHANGES REQUIRED | Generated IDs retained, corrupt payload rejected, mandatory revision/identity guard, exact update acknowledgement, typed 409 handling. No production wiring or live write. |
| SanityCatalogAdapter | MOCK-TESTED; LIVE-TESTED empty read | Four structural tests plus integration tests; published perspective; mandatory validateCatalog. Live query returned five empty collections. |
| Import API | IMPLEMENTED - NOT VERIFIED for target architecture | Routes use legacy requireAdmin and MemoryDraftStore. No approved Sanity editor authorization. |
| Importer pipeline | MOCK-TESTED; BLOCKED live source | Normalization/provenance/URL helpers exist. Registry contains zero permitted adapters. |
| Authentication | MOCK-TESTED legacy helpers; BLOCKED target | Auth.js/GitLab cookie session, superseded for content operations. Studio login is separate. |
| Authorization | MOCK-TESTED legacy allowlist; CHANGES REQUIRED | Exact GitLab account IDs rechecked on requests; no Sanity project/dataset permission proof. |
| Editor identity handoff | BLOCKED | No reviewed supported Studio credential handoff; no shared browser secret introduced. |
| SSRF/source validation | MOCK-TESTED; BLOCKED live retrieval | Syntax/host/DNS checks exercised; no approved connected-address/redirect network adapter. |
| Duplicate protection | CHANGES REQUIRED | Sequential lookup is advisory; mock simultaneous create diagnostic returned 2 IDs/2 creates, expected 1. External ID uniqueness not enforced at create. |
| Draft concurrency | MOCK-TESTED update CAS; CHANGES REQUIRED create | Two concurrent update snapshots: one accepted mutation, one 409 CONFLICT. Missing revision means zero writes. |
| Content Lake write | BLOCKED | Missing server credential plus identity/storage gates. Zero remote mutations this session. |
| Publication boundary | MOCK-TESTED isolation; BLOCKED live workflow | No import path created/published a product; human action remains required. Legacy publisher is not a Sanity publisher. |
| Published-only retrieval | MOCK-TESTED; LIVE-TESTED empty query | Explicit published perspective and draft filters; populated draft/published comparison not proven live. |
| validateCatalog | MOCK-TESTED | Existing domain suite and adapter tests pass; no bypass introduced. |
| Public catalogue wiring | VERIFIED current hold by regression, not cutover | src/content/catalog.ts remains authority; Sanity adapter is not connected to public accessor. |
| Secret isolation | MOCK-TESTED transport/config; build audit pending | Error bodies no longer exposed; missing write token prevents mutation network work. No token displayed. |
| Live tests | LIVE-TESTED read only; BLOCKED write/publication | Anonymous published adapter read valid=true, counts all 0, errorCount 0. |

## Concrete changes

- `src/lib/sanity-client.ts`: configuration grammar, bounded abort deadline, redirects denied, no caching, status-only errors, response envelope/acknowledgement checks.
- `src/lib/sanity-draft-store.ts`: validate stored candidate and edits against frozen shapes; reject corrupt metadata, mismatched candidate identity and missing revision; use typed HTTP conflicts; require acknowledgement for exact updated ID and operation. Removed fabricated corrupt candidate and silently discarded corrupt edits.
- `src/lib/sanity-catalog-adapter.ts`: validate unknown runtime structure before mapping; explicitly request published perspective; reject missing/invalid offer state rather than invent active state; preserve catalogue-wide fail closed and validateCatalog.
- `src/lib/importer/auth.ts`: remove shared fallback preview signing secret; require configured >=32-byte secret; validate signed fields, size and timestamps; reject future/expired tokens. Preview token format unchanged. Tokens remain reusable until expiry and are not editor authentication.
- `tests/sanity-integration.test.mjs`: mock patch now returns the actual update acknowledgement shape.
- `tests/backend-importer.test.mjs`: explicit synthetic preview-secret fixture instead of relying on production fallback.
- New tests: `tests/sanity-draft-hardening.test.mjs`, `tests/sanity-transport.test.mjs`, `tests/sanity-catalog-hardening.test.mjs`, `tests/importer-preview-token.test.mjs`.
- Documentation: this report and appended `COORDINATION-LOG.md` milestones C-RECON-1, C-HARDEN-1, C-HARDEN-2.

No frontend/schema files, package manifests or public catalogue were changed by this continuation.

## Request trace and ownership

| Boundary | Input → output | Failure / validation owner | Retry, duplicate and concurrency behavior |
| --- | --- | --- | --- |
| Authentication | Cookie session → user | Auth.js verifies session; guard catches failure; 401 | Expiry delegated to Auth.js; live expiry not tested |
| Authorization | user + configured GitLab IDs → PicksyPrincipal | Server guard, malformed/unauthorized identity 403 | Allowlist rechecked; no Sanity role proof; principal not persisted in draft audit |
| Mutation origin | Request headers → boolean | Same-origin JSON/Origin/fetch-site validator; 403 | Browser origin is additional boundary, never identity |
| Preview input | unknown JSON → sourceId/productUrl | Route type checks; 400 | Body cap absent; preview-only process-local rate limiter returns 429 |
| Source permission | sourceId → permitted adapter | Empty registry; SOURCE_NOT_AUTHORIZED 400 before retrieval | No source activation without permission evidence |
| SSRF | HTTPS URL + exact approved hosts + DNS → validated URL | URL/DNS utilities reject IP/private/reserved destinations | Connected-address pinning/redirect enforcement still required in future retrieval implementation |
| Adapter/normalizer | RawProductPayload → ProductImportCandidate | Adapter + normalizer; 502 retrieval failure | No generic scraper enabled; provenance retained; no network retry policy established |
| Duplicate preview | candidate + draft list → DuplicateCheckResult | duplicate-detector | Advisory check; case normalization and external-ID create uniqueness need reconciliation |
| Preview state | source/url/time → signed token | HMAC; missing configuration fails closed, invalid token 400 | 15-minute expiry; reusable, not bound to editor |
| Draft save | token + edits → ImportDraft | Route and current MemoryDraftStore | Legacy route bypasses Sanity store; check/create race; no durable audit identity |
| Sanity store | candidate/edits → staging document | Hardened runtime shape checks + generated ID | Single create still races; no automatic mutation retry; timeout may mean unknown commit outcome |
| Sanity update | ID, edits, expected version → draft or conflict | Store mandatory _rev CAS, typed 409 | Prevents lost update; caller refresh required; lifecycle/provenance restrictions remain |
| Public mapping | published documents → CatalogRecords | Structural checks then validateCatalog | Invalid catalogue entirely empty; transport failure propagates; no silent source fallback |

## Negative proofs and limits

All tests below are mock/unit unless explicitly stated. A transport mutation attempt is distinguished from an accepted write.

| Case | Expected | Observed | Mutation evidence |
| --- | --- | --- | --- |
| Corrupt candidate/edits, absent revision/ID, invalid version | reject before patch | rejects | 0 mock mutations |
| Simultaneous update at same revision | one success, one conflict | one ok, one CONFLICT | 2 attempted, 1 accepted mock mutation |
| Empty/wrong-ID/wrong-operation update acknowledgement | reject success claim | rejects | 1 attempted mock mutation; unknown remote outcome must not be retried blindly |
| Content Lake 403/500/503 deletion | propagate failure | rejects | rejected mock request; no live mutation |
| Missing write credential | reject before network | rejects | 0 network calls |
| HTTP 409 / network error | sanitized error/status | typed 409 / generic failure | query test, no mutation |
| Missing signing secret / short secret / malformed or expired preview token | reject | rejected | pure helper, no mutation |
| Concurrent identical create | one staging record | TWO generated IDs | defect reproduced in mock, zero remote mutations |
| Anonymous, non-admin, malformed principal, CSRF | 401/403 policy | existing pure guard/origin tests green | no route-level Content Lake spy proof; do not call live security VERIFIED |
| Invalid URL/unsupported host/private destination | deny retrieval | existing URL/registry tests green | no enabled source adapter; no live mutation |
| Expired/revoked/wrong-project/robot-only Sanity editor | deny before downstream work | NOT TESTED | target identity boundary absent |
| Direct API invocation with browser credentials | independently authorize editor | target NOT VERIFIED | legacy route guard exists; no Sanity auth proof |

## CHANGE PROPOSALS — not silently implemented

### CP-1: Staging mapping and durable duplicate identity

Current contract: DATA-CONTRACT section 5 describes product drafts under drafts.<id>; ADR-011 and schema specification define importDraft staging with server-generated ordinary IDs. The latest user directive requires a real importDraft remaining unpublished. Current code uses an ordinary importDraft with importStatus=draft; this is NOT proof of native Sanity draft namespace isolation.

Proposed contract: explicitly distinguish nonpublic importer staging from publishable product drafts, decide whether staging itself must use native draft namespace, and approve a durable uniqueness mechanism for both (sourceId, canonicalUrl) and (sourceId, externalProductId). A reviewed singleton coordination/index document with revision CAS and atomic create transaction is a candidate; ordinary IDs remain Sanity-generated. Do not implement hash IDs for ordinary documents or substitute a local mutex.

Security impact: reserve uniqueness before acknowledging success; reject cross-project identity; preserve audit principal and immutable provenance. Product impact: concurrent requests return one staging identity without invented merchant records. Frontend impact: Gemini confirms edit/read ID mapping and duplicate response behavior. Testing impact: two worker clients, same URL, same external ID/different URL, timeout/retry, rollback, delete/re-import, existing duplicate reconciliation. Migration impact: inventory existing staging and duplicates; dry run and reviewed recovery required; no migration run.

Sanity documents atomic transaction semantics and revision conflicts, but these do not make application query-then-create unique by themselves: https://www.sanity.io/docs/content-lake/transactions . A concrete design must also account for query visibility and contention before implementation.

### CP-2: Editor identity handoff

Current contract: Studio authenticates editors, but Picksy API uses superseded GitLab authorization. No supported Studio identity transfer is proven.

Proposed contract: use a supported individual credential handoff only after Gemini verifies actual Studio auth mode. Server verifies human identity online and checks exact project/dataset/action permission on every mutation; then uses a distinct server credential. Record immutable actor/request audit information. Deny robots, anonymous, revoked/expired, wrong-project and insufficient-permission callers before source/network work. If actual Studio mode cannot support a proven handoff, review a trusted Sanity-hosted execution boundary instead. Never replace this with a browser robot token.

Security impact: separate authentication, permission and service write credentials; explicit Origin/CSRF for cookies, bounded request/rate/replay policy. Product impact: editors use approved Sanity control plane. Frontend impact: Gemini owns actual mode/credential acquisition and UI states. Testing impact: real negative matrix and downstream mutation counters. Migration impact: legacy Auth.js disposition remains separate; do not delete it.

Official references inspected: https://www.sanity.io/docs/content-lake/http-auth and https://www.sanity.io/docs/http-reference/access-api . The existence of an Access API does not establish that current Studio can safely hand its credential to Picksy; that is still a proof obligation.

### CP-3: Future relationship-aware quarantine (deferred)

Current contract: any invalid catalogue record returns the entire empty catalogue. Proposed contract for later Product/Gemini approval: quarantine invalid records plus dependent product/review/offer relationships, validate the surviving graph, and report editorial diagnostics. Record-only quarantine is rejected as a sufficient design because it can leave dangling references or offers without required reviews.

Security impact: all surviving relationships and destinations must still pass validateCatalog; no default-active offers. Product impact: healthy unrelated catalogue can stay visible, but partial catalogue behavior must be explicit. Frontend impact: define empty/partial visibility and diagnostics. Testing impact: graph closure, shared merchant/category dependencies, invalid destinations, dates and multiple failures. Migration impact: no immediate data migration; observability and rollout policy needed. Current implementation retains catalogue-wide fail closed.

## Independent review decisions

- Architect: approved scoped transport hardening; overall production architecture CHANGES REQUIRED.
- Product: scoped hardening aligns with affiliate model; retain all-or-nothing contract; mapping reconciliation required.
- Database: update hardening accepted by independent Security/Testing reviews; production persistence CHANGES REQUIRED due to distributed uniqueness and mapping/lifecycle issues.
- Security: PASS WITH CONDITIONS for reviewed store/preview/catalogue correction; production authorization BLOCKED. Transport implementation independently reviewed by Architect.
- Testing: PASS WITH CONDITIONS, MOCK-TESTED for store/transport/catalogue; preview code independently reviewed by Security. Later agent spend-cap failure did not erase delivered review and does not constitute further approval.

## Regression and live evidence

- Baseline `node --experimental-strip-types --test tests/sanity-integration.test.mjs tests/backend-importer.test.mjs`: exit 0, 19/19.
- Persistence test-first: exit 1, 2/4 failed before correction; existing CAS and deletion behavior already passed.
- Catalogue test-first: 3/4 failed before correction; after correction 4/4.
- Preview test-first: 0/2 passed before correction; after correction targeted combined suite 35/35, exit 0.
- `npm test`: exit 0; includes `npm run lint` and `npm run typecheck`, then 168/168 tests, 0 failures/skips/todos.
- Live read: `node --env-file=.env.local --experimental-strip-types --input-type=module` invoking the actual SanityCatalogAdapter with verified public project/dataset, `token:undefined`, today=2026-10-10: exit 0, valid=true, all five counts zero. This is a real remote read, not a populated vertical proof.
- Build and build-isolation: pending completion when this section was written; see final coordination milestone/addendum.

## Remaining blockers and takeover

1. Server write credential missing; never paste it into chat/logs.
2. Sanity editor identity, permission and negative security proof absent.
3. Durable atomic duplicate protection and explicit staging/native-draft mapping unresolved; simultaneous-create defect reproduced.
4. No affiliate source has approved retrieval implementation/permission evidence; keep registry empty.
5. Audit actor, immutable provenance/edit policy, lifecycle restrictions, request/response bounds and replay/rate policy need completion before enabling writes.
6. Transport needs enforced server-only import boundary; current module comment alone is not enforcement.
7. Live draft, human review/publication and nonempty published relationship mapping not proven.
8. Public cutover remains a separate explicit decision. Do not delete src/content/catalog.ts.

Next bounded step: review CP-1 with Gemini/Product/Database and freeze staging identity plus atomic duplicate contract before wiring Sanity persistence. Independently, Gemini must establish supported Studio identity mode for CP-2. Backend hardening can continue on body limits/server-only tests without credentials; do not claim full completion.

Fresh model: read this report and latest coordination log, inspect current disk and Git status (many relevant files are untracked), verify claims, preserve Gemini work, inspect exact source/tests, then continue the approved bounded next unit. No programmatic publish to satisfy tests. Once credential AND editor authorization AND persistence gates are satisfied, perform one distinguishable live staging test, log returned ID safely, hand off for human publication, then independently verify published retrieval. No duplicate automatic retry after an ambiguous write timeout.

## Build checkpoint C-BUILD-1

First `npm run build`: exit 1. Compilation succeeded in 44s; lint/type validation and 4/4 static-page generation succeeded. Finalization failed with `ENOENT .next/server/pages-manifest.json`. Subsequent inspection found that file present. Concurrent output activity is suspected but not established.

`node --experimental-strip-types tests/build-isolation.mjs`: exit 1, 1/4 passed and 3/4 failed because BUILD_ID, routes-manifest.json and prerender-manifest.json were absent. This is not a successful isolation proof. No source changes, output deletion or process termination used to hide the failure. One plain build retry is underway. See final addendum for its outcome.

`git diff --check`: exit 0 for tracked changes; most continuation files are untracked, so this does not audit their entire contents.

## Final regression addendum

The second standard `npm run build` also exited 1: `ENOENT .next/diagnostics/build-diagnostics.json` after successful compilation (34.3s). No source correction was needed for the isolated verification.

An independent local project copy with the same 77 source files, required config/manifests, public assets and copied build-isolation test was built using parent-installed dependencies. Environment configuration was loaded into the build process, not copied into the verification directory. Command: `node --env-file=.env.local node_modules/next/dist/bin/next build .backend-verification-20261010` => exit 0. Compilation, lint/type validation and all static pages succeeded. Auth.js/jose emitted existing Edge Runtime CompressionStream/DecompressionStream compatibility warnings.

`node --experimental-strip-types .backend-verification-20261010/tests/build-isolation.mjs` => exit 0, 4/4 passed, 24537.3625ms. All 77 source files still hash-matched the working tree. Client scan: 60 static JavaScript files, zero secret identifier matches (SANITY_API_WRITE_TOKEN, IMPORTER_PREVIEW_SECRET, AUTH_SECRET, GITLAB_CLIENT_SECRET). The temporary copy is removed after validation; shared root .next is not deleted or repaired. Both standard-build failures remain material recorded evidence.

Final decision: bounded corrections are independently reviewed and MOCK-TESTED; live empty catalogue read is LIVE-TESTED. Full backend completion remains BLOCKED by the gates above. All source file claims released. Exact continuation and Gemini handoff are in milestone C-HANDOVER-1.

## Cross-review addendum after G-REMED-1 (C-GREMED-REVIEW-1)

Independent Codex cross-review confirms frontend state/model/schema/plugin behavior and current gates: `npm run typecheck` exit 0; `npm run lint` exit 0, zero warnings; `npm test` exit 0, 168/168; `npm run build` exit 0 (Next 15.5.27; 4/4 static pages; 1.75 MB Studio route); `node --experimental-strip-types tests/build-isolation.mjs` exit 0, 4/4; 60 browser JS files scanned, zero matches for four secret identifiers. `SANITY_API_WRITE_TOKEN=missing`; no live write.

The G-REMED-1 frontend work receives PASS WITH CONDITIONS for its state contract and tool mounting. The Studio importer is CHANGES REQUIRED as an operational vertical integration: Studio calls GitLab-session-protected APIs, the APIs use MemoryDraftStore and the legacy memory publisher, and no source adapter is enabled. Its Content Lake UI wording describes intended architecture only. This does not invalidate the frontend state implementation. No Gemini-owned files or contracts were changed.
