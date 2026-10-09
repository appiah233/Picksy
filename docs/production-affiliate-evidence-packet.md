# Production Affiliate Evidence Packet

Status: **not supplied**. This contract describes the evidence required before the first real
affiliate record may enter `src/content/catalog.ts`. It does not authorize publication.

## Packet fields

Keep evidence documents and correspondence in an access-controlled location outside the public
repository. Record stable references here for review; never commit agreements, credentials, or
private contacts. An editor and an independent reviewer must identify the actual evidence, not
infer it from a valid URL or a nonempty catalogue field.

| Field             | Required reviewable evidence                                                                                                                                                   | Catalogue mapping                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Merchant identity | Legal or affiliate-program identity, independently checked; relationship to the destination host                                                                               | `Merchant.id`, `name`, `approvedHosts`                  |
| Exact destination | Full HTTPS URL including path and query, stable destination ID, expected redirect chain, and intended landing page                                                             | `ApprovedDestination.id`, `url`                         |
| Permission        | Agreement or program record explicitly permitting Picksy's use of that exact destination; restrictions, effective dates, expiry, and any required affiliate parameters checked | Private evidence; `authorizationReference` points to it |
| Product identity  | Official product name, category fit, authoritative source URL, and source date                                                                                                 | `Product` and `officialSource`                          |
| Editorial review  | Named author; actual UTC evaluation, publication, and review dates; method, audience, workflow, strengths, limitations, conclusion, and claim-by-claim support                 | `Review`, `Product`                                     |
| Provenance        | Valid source URLs and a private evidence index linking factual claims to sources; editorial judgments identified as such                                                       | `Review.sources`; private evidence index                |
| Disclosure        | Approved wording that truthfully describes the actual affiliate relationship and any program-specific requirements                                                             | `AffiliateOffer.disclosure`                             |
| Production origin | Owner-selected HTTPS origin and hosting/deployment assumptions                                                                                                                 | Deployment configuration, reviewed separately           |

The catalogue model already represents the public editorial content and a stable reference to
merchant authorization. It does not need to store private agreements, claim worksheets, or a
merchant's product database. A reference string is a lookup key, not proof of permission.

## Admission sequence

1. Assemble the packet outside the repository. Record who verified each item, when, where the
   evidence is held, and any expiry or recheck date. Missing, expired, conflicting, or ambiguous
   evidence blocks activation.
2. Independently check merchant identity, agreement scope, the **exact** URL and redirect chain,
   product source, factual claims, dates, and disclosure wording. Confirm the owner-selected origin.
3. Add only the approved single-category catalogue records in a focused revision. Keep private
   evidence out of source. The destination must belong to its merchant and be selected by stable
   ID; at most one offer per product may be active.
4. Run catalogue validation, lint, type checks, tests, a production build, and rendered/browser
   journey checks. Confirm exact CTA `href`, `target`, `rel`, adjacent disclosure, missing-offer
   behavior, responsive layout, keyboard focus, and absence of synthetic fixture content.
5. Obtain a passing GitLab pipeline for that exact revision and an actual Picksy Guardian review
   of its Merge Request. Guardian's advisory result cannot verify external evidence or approve a
   Gate. An accountable human checks the packet and decides whether to publish.

Current Guardian policy explicitly forbids production catalogue population while Gate 3 is
unauthorized. Do not weaken or bypass it to admit a record. Policy authorization, if warranted by
the reviewed packet, is a separate owner-controlled decision and deployment.
