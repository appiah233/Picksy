# Picksy storefront discovery redesign

## Why the old section appeared

`renderHomePage` mapped all six fixed SaaS categories in `siteConfig.categories` into the “Find your next favorite” section. A category became a link only when the validated published catalogue contained both that category and a published product. The production fallback catalogue is intentionally empty, so all six cards rendered as “Upcoming / Coverage coming soon.” The page also filled four product slots with preview cards, presented disabled search, and used deal and trending labels without price or popularity data.

## Design and data decisions

- The homepage now takes product and category links only from `CatalogAccess` after validation. It shows a single editorial empty state when nothing is published.
- Hero, catalogue rail, category tiles, editorial banner, and affiliate explanation use a navy, ivory, and muted gold system inspired by the supplied composition references. The generated unbranded hero still life is illustrative and does not represent published inventory.
- Product cards link to the review once per card. Merchant attribution appears only when `getActiveOfferForProduct` returns an approved active offer. The existing detail page remains responsible for the disclosed external merchant CTA.
- Published products may optionally carry an editor-selected Sanity image with alt text. The public adapter projects its asset URL; catalogue validation accepts only a Sanity image CDN URL with meaningful alt text. Missing images receive a typographic treatment. No price, stock, rating, discount, popularity, shipping, or return promise is inferred.
- Navigation and footer use working anchors and the existing affiliate disclosure. Placeholder legal/resource links and the inert search/deals controls were removed.

## Visual evidence

The before images are from the earlier design audit. The after images are full-page screenshots of the built production app with its current empty published catalogue:

| Width | Before | After |
| --- | --- | --- |
| Desktop | [Before desktop](evidence/homepage-desktop.png) | [After desktop](evidence/redesign/home-desktop.png) |
| Mobile | [Before mobile](evidence/homepage-mobile.png) | [After mobile](evidence/redesign/home-mobile.png) |

Additional after screenshots: [laptop](evidence/redesign/home-laptop.png), [tablet](evidence/redesign/home-tablet.png), [narrow mobile](evidence/redesign/home-narrow-mobile.png). The [synthetic populated desktop](evidence/redesign/synthetic-populated-desktop.png) and [synthetic populated mobile](evidence/redesign/synthetic-populated-mobile.png) images are fixture previews injected into the built page for layout review; they are **not** evidence of a live published product.

## Verification and limits

- Focused catalogue, rendered journey, Sanity storefront, and production wiring tests: 93/93 pass after the final card and empty-state changes.
- `npm run typecheck`, `npm run lint`, `npm run build`, and build isolation: pass on the working branch before this evidence document. Final committed-SHA checks are recorded separately if run.
- Built production server: HTTP 200 on the homepage at 1440, 1280, 768, 390, and 320 pixel widths; no document overflow, browser page errors, or old placeholder text. First Tab focuses “Skip to main content.” Unknown category and product routes return 404.
- Current live catalogue is empty. Real product photography, populated categories, and merchant CTA appearance cannot be certified from production content. The optional Sanity image field has validation coverage, but a live image must be supplied by an authorized editor.
- The existing fixed `siteConfig.categories` taxonomy still constrains which Sanity categories `getCatalog` accepts. Expanding the business taxonomy needs a separate coordinated catalogue decision; this visual change does not alter that gate.
- The full `npm test` run encountered the existing built-and-served test's five-minute build timeout while a local dev server and other checks were running. A standalone production build passed. The full suite should be rerun without concurrent servers before integration.
