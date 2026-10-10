# Gate 3 synthetic browser verification

**Scope:** software behavior only. This is not evidence of a merchant relationship, a real offer,
or permission to publish. The production catalogue stayed empty throughout. Gate 3 remains
unauthorized.

## Method

On 9 October 2026 a clone of this repository at `9a16a82` was made outside the repository. In the
clone only, `src/content/catalog.ts` was replaced by a file that loads the marked records from
`tests/fixtures/synthetic-catalog.ts`, lint-during-build was switched off because the lint
rule correctly refuses that import, and the build output directory was made selectable so three
builds could coexist (Next.js then rewrote the clone's `tsconfig.json`). Nothing in this repository was changed to make the preview
possible.

Three production builds (`next build`, served by `next start` on `127.0.0.1`) were tested:

- **normal**: the synthetic catalogue as written;
- **stress**: the same records with a 240-character unbroken token and a 960-character multi-word
  string added to every text field, the merchant name, the CTA label and the disclosure, plus a
  third source with a long hostname;
- **empty**: five empty collections, equivalent to the committed production catalogue but served
  from the preview file.

Playwright 1.64.0 with `@axe-core/playwright` 4.13.0, installed outside the repository, drove
headless Chrome 155.0.8059.39 and Playwright Firefox 157.0 at emulated CSS viewports of 320×800,
360×800, 768×1024 and 1280×800. Every request to a host other than `127.0.0.1` was intercepted
and answered locally, so no merchant or source site was contacted. Axe ran the `wcag2a`,
`wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` rule sets.

The run was made twice with the same script: once against `9a16a82` unchanged, and once against
`9a16a82` plus the fixes listed below. The second run therefore describes the working tree that
introduced this document, not a commit that existed when it ran. The script, JSON results and
screenshots were kept outside the repository and are not part of this revision.

## Results

Each run made 594 checks: 297 in Chrome, 296 in Firefox (the forced-colours check is Chrome
only), and one across the whole run.

| Run                  | Passed | Failed |
| -------------------- | ------ | ------ |
| `9a16a82` unchanged  | 587    | 7      |
| `9a16a82` plus fixes | 594    | 0      |

Defects found in the first run and fixed:

| Defect                                                                                                                                                          | Fix                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Shift+Tab at 768 px left the focused home hero links entirely under the sticky header, and the category breadcrumb partly under it (both engines)               | `scroll-pt-24` on `html`                          |
| With forced colours active (Chrome, 1280 px) the focused CTA had no focus indicator: the ring is a box-shadow, which that mode removes, and the outline was off | `outline-none` replaced by `outline-hidden`       |
| Smooth scrolling ignored a reduced-motion preference (both engines)                                                                                             | `motion-safe:scroll-smooth`                       |
| At 320 px a source link broke mid-word ("opens i / n a new tab"); seen in the screenshot, not an automated failure                                              | `break-all` removed; inherited wrapping is enough |

Checks that passed in both runs, at all four viewports in both engines unless noted:

| Check                | Observed                                                                                                                                                                                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes               | Home, category, product with offer and product without offer returned 200; an unknown product returned 404 with one heading and a home link.                                                                                                                                                                                     |
| Overflow             | Document width never exceeded the viewport and no element extended past it, in normal and stress builds, with WCAG text-spacing overrides at 320 px, and at 640×400.                                                                                                                                                             |
| Structure            | `lang="en"`, one `h1`, no skipped heading level, one header, main and footer, labelled navigation, no duplicate `id`, and `noindex, nofollow` on every page.                                                                                                                                                                     |
| Keyboard order       | Tab visited 13 stops on home, 13 on category, 15 on the offer product and 14 on the plain product, then reached no further element. Shift+Tab visited the same stops in reverse. The skip link appeared on first Tab and moved focus into the main content.                                                                      |
| Visible focus        | Every stop matched `:focus-visible` and had a computed ring. The check does not measure ring colour or contrast.                                                                                                                                                                                                                 |
| Keyboard journey     | Tab and Enter went home → category → product → merchant CTA.                                                                                                                                                                                                                                                                     |
| CTA                  | Exactly one sponsored link. `href` equalled the fixture URL byte for byte, including `?ref=picksy&campaign=r5`; `target="_blank"`; the `rel` tokens were exactly `sponsored`, `noopener` and `noreferrer`; the described-by note was unique and visible; the target was at least 44×44 and stayed inside its panel under stress. |
| Disclosure           | Preceded the CTA in the document and on screen, inside the same panel, at 14 px, and, in the normal build, stayed in view when the CTA was centred. In the stress build the lengthened disclosure is taller than the viewport, so that was not asserted.                                                                         |
| Merchant hand-off    | Enter and click each opened one new tab at the exact fixture URL with `window.opener === null`. The Enter hand-off was also checked to send no `Referer` header. The Picksy tab did not navigate and made no request of its own.                                                                                                 |
| Source links         | Exact fixture URLs, `rel="noopener noreferrer"` without `sponsored`, labelled with the hostname and the new-tab notice.                                                                                                                                                                                                          |
| No-offer product     | No offer panel, sponsored link, merchant link or "Visit" heading.                                                                                                                                                                                                                                                                |
| Empty catalogue      | Home had no category or product link and no fixture marker; the category route returned 404.                                                                                                                                                                                                                                     |
| Automated a11y       | Axe reported zero violations in all 72 scans (normal, stress and empty builds). Every scan left `color-contrast` incomplete for at least one element, which needs a manual check.                                                                                                                                                |
| Production isolation | `npm run test:build` on this repository found no fixture marker and no published category or product page. No request left the machine other than the intercepted hand-offs.                                                                                                                                                     |

## What this does not establish

- Real merchant authorization, editorial claim support, or anything about a real destination,
  its redirect chain or its landing page.
- Behavior on a production host: headers, CDN, the owner-selected origin.
- Physical devices, touch, WebKit or Safari, and operating-system font scaling.
- Screen-reader announcements. Axe finding no violations is not proof of WCAG conformance.
- Forced-colours behavior beyond the one Chrome check above.
- Whether the disclosure wording is adequate; that is a human judgement on real wording.

Repeat the destination, disclosure and hand-off checks with independently approved real evidence
before any publication.
