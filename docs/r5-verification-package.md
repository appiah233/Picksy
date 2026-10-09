# R5 verification package

For the independent reviewer of R5. This document is self-contained: you do not need any earlier
report. Treat every statement here as a claim to test, not as a fact.

**Status:** R5 is implemented and hardened by its author. It has **not** been independently
verified. Gate 3 is **UNAUTHORIZED** and nothing here changes that.

## 1. What to review

|             |                                                                |
| ----------- | -------------------------------------------------------------- |
| Base commit | `4580c25` on `main`                                            |
| R5 revision | The single commit that adds this file, on branch `development` |

Find the revision and confirm it is the only R5 commit:

```bash
git log --format=%H -- docs/r5-verification-package.md
```

Review exactly that commit. If the files in scope have changed in a later commit, the proof
list below no longer describes what you are looking at; stop and ask for an updated package.

### Files in scope

| File                                            | Role                                                          |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `src/features/catalog/*.tsx`                    | Page markup, metadata and static params, given an accessor    |
| `src/app/page.tsx`, `src/app/*/[slug]/page.tsx` | Route files; each only delegates to a view                    |
| `src/lib/catalog.ts`                            | The one production accessor                                   |
| `src/lib/catalog-access.ts`                     | Accessor factory; now copies, freezes and registers accessors |
| `eslint.config.mjs`                             | Forbids imports from `tests/` under `src/`                    |
| `tests/fixtures/synthetic-catalog.ts`           | Marked synthetic records                                      |
| `tests/support/`                                | Test-only loader for the application's TypeScript and JSX     |
| `tests/rendered-journey.test.mjs`               | Populated journey and negative cases, on synthetic records    |
| `tests/production-wiring.test.mjs`              | Real route files, real accessor, real catalogue               |
| `tests/build-isolation.mjs`                     | Production build output                                       |
| `package.json`, `.gitlab-ci.yml`                | `test:build` script; CI test job                              |

Unchanged, and worth confirming with `git diff 4580c25`: `src/content/catalog.ts`,
`src/lib/catalog-validation.ts`, `src/lib/catalog-types.ts`, `tests/catalog.test.mjs`, and
everything under `tools/picksy-guardian/`.

## 2. The invariant

> A populated home → category → product/review → merchant CTA journey can be rendered and
> tested from synthetic, validated records, while production reads only
> `src/content/catalog.ts`, which stays empty, and no synthetic content reaches production
> source, production routes or build output.

## 3. How to run

Node.js 22.15 or later.

```bash
npm ci
npm test            # lint, typecheck, all tests
npm run test:build  # builds the current source, then checks the build output
git diff --check
```

Results observed by the author on this revision before it was committed: `npm test` 101 pass, 0 fail, 0
skipped; `npm run test:build` 4 pass; `git diff --check` clean. Reproduce them yourself.

## 4. Proof list

Each claim names the test that is meant to prove it. A claim with no failing mutation is not
proven: change the code and confirm the named test fails.

### Rendered journey (`tests/rendered-journey.test.mjs`, synthetic records)

| Claim                                                                  | Test                                                    |
| ---------------------------------------------------------------------- | ------------------------------------------------------- |
| Synthetic records pass normal validation                               | synthetic records pass normal catalogue and taxonomy…   |
| Home, category and product render, and every internal link has a route | home → category → product journey renders by following… |
| Every visitor-facing product and review field is rendered              | same test                                               |
| CTA has the exact approved URL, `target="_blank"`, `rel="sponsored …"` | merchant CTA renders the exact approved destination…    |
| Disclosure is inside the offer, before the CTA                         | disclosure renders inside the offer, before the CTA     |
| Source links are labelled, external and unsponsored                    | review source links are labelled, external and…         |
| A valid product with no offer, or an inactive one, shows no CTA        | a valid product without an offer renders with no…       |
| Unknown and unpublished content renders nothing                        | unknown and unpublished content renders nothing         |
| Ten kinds of broken or cross-merchant data fail and cannot be rendered | … fails validation and cannot be rendered (×10)         |
| Every synthetic record carries the marker                              | every synthetic record carries the fixture marker       |

### Production wiring (`tests/production-wiring.test.mjs`, real modules)

| Claim                                                                 | Test                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| The production accessor is built from `src/content/catalog.ts`        | the production accessor is built from the production…   |
| The production catalogue is empty and publishes nothing               | production publishes nothing while Gate 3 is…           |
| One catalogue file, one accessor, used only by the three route files  | there is exactly one catalogue source and one…          |
| There are exactly three routes and no middleware                      | the only routes are home, category and product          |
| The real route files, run for real, publish nothing                   | the real route modules render from the production…      |
| Route files hold no markup of their own                               | route files only delegate…                              |
| Route files do not opt into on-demand rendering                       | the real route modules are not rendered on demand       |
| Views refuse any accessor not made by `createCatalogAccess`           | views refuse an accessor that was not validated         |
| An accessor cannot be changed after validation                        | a validated accessor cannot be altered after validation |
| No hard-coded external link exists outside the catalogue and its CTA  | external links come only from catalogue records         |
| Nothing under `src/` imports from outside `src/`; no marker in `src/` | production source imports nothing from outside src…     |

### Build output (`tests/build-isolation.mjs`, via `npm run test:build`)

| Claim                                                           | Test                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| The fixture marker is nowhere in the build output               | production build output contains no synthetic fixture…  |
| The build has only the three routes, no rewrites, no middleware | the build contains only the home, category and product… |
| No category or product page is prerendered or served on demand  | the build publishes no category or product page         |

### Lint

`npm run lint` fails on any static import from `tests/` in a file under `src/`.

## 5. Tripwires that Gate 3 must change

These tests assert today's unauthorized state. They are meant to fail when the catalogue is
first populated, and must then be replaced deliberately, not deleted:

- "production publishes nothing while Gate 3 is unauthorized"
- "the real route modules render from the production accessor and publish nothing"
- "the build publishes no category or product page"

## 6. Known limitations

- **Not a browser test.** Pages are rendered to HTML in Node. Layout, focus order, responsive
  behaviour and accessibility are not covered.
- **The shared layout is not rendered.** Header, footer and the footer disclosure are outside
  these tests.
- **Link component.** Outside the bundler, `next/link` loads Next's non-App-Router build. The
  rendered `href` is the same; the module is not byte-identical to production's.
- **Synthetic proof only.** The CTA check must be repeated against the real destination.
- **Next.js internals.** The build check reads Next's manifest files, whose format may change
  with a framework upgrade. A change fails the check rather than passing it.

## 7. Residual risks

Open items the author could not close, and risks accepted with a reason.

| Risk                                                                                                             | State                                                                                  |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| CI has never run the new job; merge-blocking on a failed pipeline is unconfirmed                                 | **Open.** Owner must run a pipeline and check the project setting                      |
| A hand-written link in `src/app/layout.tsx` or a view, with its URL assembled to avoid the scan, is not detected | **Open, demonstrated.** Needs human or Guardian review of the diff                     |
| Running `node --test tests/build-isolation.mjs` directly checks whatever build is on disk                        | Accepted. `npm run test:build` and CI always build first                               |
| The same merge request can weaken these tests or the CI job                                                      | Accepted. Changes to `tests/` and `.gitlab-ci.yml` need human review                   |
| The lint rule covers static imports only                                                                         | Accepted. The source scan covers dynamic `import()` and `require()` with literal paths |
| The fixture file is present as source in the deployed image                                                      | Accepted. No route serves it and the build output does not contain it                  |
| `package.json` allows Node 22.0, the test loader needs 22.15                                                     | Accepted. Older versions fail to load the tests; they cannot pass                      |

## 8. What to attack

The author's own attempts are listed so you can repeat them and go further. All but one were
detected.

| Attempt                                                               | Detected by                        |
| --------------------------------------------------------------------- | ---------------------------------- |
| Second, unmarked catalogue file wired into the production accessor    | production-wiring (4 tests)        |
| The same, plus on-demand routes and a home page with its own accessor | production-wiring (5 tests)        |
| Hand-built accessor passed to a view                                  | view refuses it                    |
| Production catalogue imports the fixture                              | lint, and production-wiring        |
| Category route moved so its links are dead                            | journey test                       |
| Three review fields deleted from the product page                     | journey test                       |
| New hard-coded route                                                  | route list test                    |
| Product route file hard-codes a page for one slug                     | route-file markup test             |
| View stops checking its accessor; accessor stops copying its records  | production-wiring                  |
| Whole site switched to on-demand rendering in the layout              | build check                        |
| Contaminated source with a clean earlier build on disk                | build check, after its own rebuild |
| **Hand-written link in the layout with an assembled URL**             | **Not detected**                   |

Suggested lines of attack: publication paths that do not go through the catalogue at all;
ways to obtain a registered accessor over unvalidated data; anything in `next.config.ts`,
`public/` or `content/` that could serve content; and whether the tripwires in section 5 can
be satisfied while content is live.
