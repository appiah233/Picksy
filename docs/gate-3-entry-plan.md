# Gate 3 entry preparation — draft for approval

Status: **NOT READY. Gate 3 is unauthorized.** This document defines the proposed first slice and the evidence needed to authorize it. It does not approve a merchant, destination, review, production origin, or public launch.

## Reviewable Gate 2 baseline

- Gate 2 revision: `f25d746dfc3fca58dd0f492317524136f7a706d6` on `feature/initial-foundation`.
- Production source: `src/content/catalog.ts`; all five collections were empty at this revision.
- GitLab pipeline [2927008619](https://gitlab.com/appiah233/picksy/-/pipelines/2927008619) names this exact SHA and finished `success` on 2026-10-08. The required `test` and `build` jobs, plus `code_quality`, `container_scanning`, `semgrep-sast`, and `secret_detection`, reported `success` through the GitLab API. The optional jobs are configured with `allow_failure: true`; none reported failure. The job trace returned HTTP 401 to this reviewer, so the individual command log and CI test count remain uninspected. Local `npm test` passed 36 tests and `npm run build` passed before the commit.
- `Template.txt` is unrelated and must remain untouched.

## Proposed first slice (requires explicit approval)

One approved MVP category → one verified product and combined review → one verified merchant → one independently authorized exact HTTPS destination → one active offer. Use the existing typed repository catalogue and direct merchant CTA. Category, product, merchant, destination, offer, editorial author, sources, and their identifiers remain **unselected** until evidence is provided.

Acceptance requires a rendered home → category → product/review → adjacent disclosure → external merchant journey; the CTA `href`, `target`, and `rel` must match the reviewed destination and link policy. Invalid or absent offers must not render a merchant CTA. Published copy must remain truthful in empty and populated states.

In scope: verified catalogue records, the smallest rendering and test changes needed for this journey, accessibility fixes found during testing, and production-origin configuration needed for approved validation. Out of scope: additional categories or products, checkout, payments, accounts, merchant portal, scraping, ingestion, analytics expansion, broad refactoring, or launch/indexing changes. A real input that breaks the Gate 2 model requires a new architectural review.

## Evidence packet required from business and editorial owners

Keep evidence itself outside public catalogue records. The catalogue may contain a traceable reference, never confidential correspondence, credentials, or proof by assertion.

| Field | Required evidence | Current status |
| --- | --- | --- |
| Merchant identity | Independently checkable legal or program identity | Missing |
| Destination | Exact HTTPS URL, including path and query, tied to that merchant | Missing |
| Authorization | Reviewable agreement or program evidence that permits this exact use, with restrictions and expiry checked | Missing |
| Authorization reference | Stable reference to the evidence, associated with the destination record | Missing |
| Product | Authoritative identity, name, category fit, and source | Missing |
| Review | Named author, actual UTC dates, method, support for factual claims, limitations, and conclusion | Missing |
| Sources | Valid source URLs and provenance; editorial judgment separated from product facts | Missing |
| Disclosure | Approved wording for the actual relationship and destination | Missing |

The names in `content/reviews/README.md` are planning notes, not verified evidence or approved selections. A reachable affiliate URL does not establish merchant authorization.

## Safe populated-content strategy

The production catalogue stays in `src/content/catalog.ts` and remains empty until authorization. Synthetic records stay in test-only fixtures under `tests/`; they must never be imported by `src/content/catalog.ts` or exposed through a production environment switch. Existing `createCatalogAccess(records)` already permits isolated domain tests with fixture records; no new fixture framework or persistence is needed for that purpose. Production pages currently import the production catalogue singleton, so the existing tests do **not** render a populated page. For rendered tests, use a test-only renderer or a narrow page-composition seam fed by fixture-derived accessors. Do not add a development data switch to the production catalogue merely for convenience.

Before using real records, independently verify: (1) an empty production build, (2) a populated synthetic journey in tests, (3) a test proving fixture data is absent from production output, (4) rejection of broken references and cross-merchant destinations, and (5) the exact URL used by the CTA. The rendered harness and its isolation tests are now implemented: `tests/rendered-journey.test.mjs` renders the real page markup from fixture-derived accessors through `src/features/catalog/`, `tests/production-wiring.test.mjs` loads the real route files and production accessor, and `npm run test:build` builds the current source and then checks the build output with `tests/build-isolation.mjs`. The package for the independent reviewer is `docs/r5-verification-package.md`. Items 1 to 5 are covered by automated tests on synthetic records only; closing this risk still needs an independent review, and item 5 must be repeated against the real destination. Architect, security, and testing review found no justification for a broader fixture framework.

## Browser, accessibility, and responsive test matrix

Actual populated results are Gate 3 exit evidence. The test plan must exist and be reviewed before entry.

| Journey/state | Desktop | Intermediate | Mobile | Keyboard/focus | Content stress |
| --- | --- | --- | --- | --- | --- |
| Home, empty and populated | Required | Required | Required | Required | Long category text |
| Category | Required | Required | Required | Required | Long product name/summary |
| Combined product/review | Required | Required | Required | Required | Long review, multiple sources |
| Disclosure and merchant CTA | Required | Required | Required | Required | Long merchant/CTA label |
| Missing/invalid offer | Required | Required | Required | Required | No misleading link |

Use representative CSS viewports of 360 × 800 (mobile), 768 × 1024 (intermediate), and 1280 × 800 (desktop), plus a narrow 320 px overflow check. Test in a supported Chromium browser and at least one other browser engine when available; record browser/version and whether the viewport is emulated or a physical device. Keyboard-only traversal must reach home navigation, category/product links, source links, disclosure navigation, and merchant CTA in meaningful order, with visible focus and no trap. Check heading order, link purpose, source and CTA distinction, external-link behavior, responsive overflow, and images/alternative text if images enter scope. Run relevant automated accessibility checks and manual browser checks. The independent testing reviewer must sign off the strategy before Gate 3 entry and record actual viewport sizes, browser/device, failures, and retest evidence at Gate 3 exit. **A populated browser run on synthetic fixtures is recorded in `docs/gate-3-fixture-browser-verification.md`. No populated test with real records has been executed.**

## Origin and CI assumptions

GitLab Auto DevOps is the intended CI authority. The current test override uses Node 22 and runs `npm ci`, lint, type checking, catalogue tests, and `next build`. A pipeline result must match the proposed revision; local success is insufficient.

The production host and canonical origin are **not established**. `NEXT_PUBLIC_APP_URL` is declared in `.env.example` with a localhost example and falls back to an empty value in `src/config/site.ts`; the resulting `siteConfig.url` currently has no runtime consumer. Layout metadata omits a canonical base and absolute Open Graph URL, while `noindex` remains deliberate. Current relative internal routes and direct merchant links do not depend on a Picksy production origin. The project owner must decide the hosting model, exact HTTPS origin, and environment value before origin-dependent metadata and deployed behavior can be validated. Confirm absolute metadata, deployed links, and robots/indexing policy on an authorized deployment. Direct merchant links must remain external merchant destinations rather than Picksy redirects. No deployment or indexing change is authorized by this plan.

## Closure and review

The next independent entry review must classify each item VERIFIED, MISSING, UNVERIFIED, or NOT APPLICABLE and inspect the actual merchant, editorial, security, CI, fixture-isolation, scope, and origin evidence. Only a READY decision with explicit authorization permits Gate 3 implementation. Public launch requires later evidence and separate approval.
