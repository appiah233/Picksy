# Gate 3 affiliate-source authorization decision — 2026-10-16

**Owner decision: OWNER REQUIRED / BLOCKED. Gate 3 has not passed.** The owner confirms that merchant/program authorization evidence and an approved importer/product source have not been provided. No merchant, product source, destination, or production origin is authorized by this record. Do not import, publish, or cut over the production catalogue on the basis of a configured adapter, reachable URL, or synthetic test.

## Evidence reviewed

- [Production affiliate evidence packet](production-affiliate-evidence-packet.md): status `not supplied`; defines the required private agreement and independent review.
- [Gate 3 entry plan](gate-3-entry-plan.md): status `NOT READY`; merchant, exact destination, authorization, product research, review, sources, disclosure, and production origin remain unselected or missing.
- [Importer backend continuation](product-importer/BACKEND-CONTINUATION-20261010.md): source registry has zero permitted adapters; live source permission and retrieval implementation remain absent.
- [Release blocker audit](release-blocker-audit.md): independently verified owner-supplied affiliate and editorial evidence is required; it cannot be fabricated to clear the gate.

## Missing owner-controlled evidence

| Item | Current status |
| --- | --- |
| Merchant and affiliate-program identity, active Picksy account, and authority to use the merchant's offer | **MISSING** |
| Approved product/importer source, permitted retrieval method, source host and credentials held server-side | **MISSING** |
| Agreement/program terms covering exact destination, redirects, link parameters, content and trademark use, promotion methods, limits, and effective/expiry dates | **MISSING** |
| Exact approved HTTPS merchant destination URL and independently checked redirect chain and landing page | **MISSING** |
| Product/category choice, official factual sources, provenance, named editorial author/reviewer, actual review dates and claim support | **MISSING** |
| Approved disclosure wording for the actual affiliate relationship and any program requirements | **MISSING** |
| Named recheck owner and date for authorization, destination, facts and review | **MISSING** |
| Owner-selected Picksy production HTTPS origin and hosting assumptions | **MISSING** |
| Independent review of the private evidence packet with stable access-controlled references | **NOT PERFORMED** |

The owner must supply the evidence and an independent reviewer must inspect the underlying records and restrictions before a PASS decision. Credentials and private agreement text must remain outside this repository. A valid URL, adapter name, synthetic record, or self-declared authorization reference is not evidence. Picksy owns its affiliate catalogue and authorized offer references, not merchants' underlying product databases.

**Execution boundary:** Live source retrieval, production importing, real-product publication, and a production catalogue cutover remain blocked. Independent technical closure may continue: Gemini owns Task 2 Sanity/storefront work; PR #7 investigation and PR #10 verification may proceed without altering their current gates. Do not overwrite Gemini's work. PR #10 was subsequently observed merged independently; this Gate 3 decision did not authorize or cause that merge. The decision does not change PR #7's zero High/Critical security gate or authorize a major migration, release tag, or production publication. Picksy is not release-ready.
