# Picksy

## Project status

Picksy is a Next.js application for carefully researched business software discovery. The current site provides its landing experience and a validated catalogue architecture. The public catalogue remains empty until each product has evidence-backed editorial research, approved merchant destinations, and publication review. Catalogue routes therefore show not-found content while there are no publishable records. The site remains `noindex` until its launch requirements are met.

### Picksy Guardian

Picksy Guardian is a Merge Request reviewer bot in
[`tools/picksy-guardian/`](./tools/picksy-guardian/). It is a small standalone
service, separate from the Picksy application and from CI: GitLab sends it
Merge Request webhooks, and it reviews each new revision and keeps one summary
comment on the Merge Request up to date. Its only write to GitLab is that
comment. It never changes code, approves or merges requests, deploys,
authorizes a Gate, or publishes catalogue content; a human reviewer decides.

Setup, configuration, the bot identity and the security model are in the
[Guardian README](./tools/picksy-guardian/README.md). The service is not yet
deployed, and no bot account or webhook exists until the project owner creates
them.

Content records are held in `src/content/catalog.ts` and checked by `src/lib/catalog-validation.ts`. A category becomes a home-page link only when it has a publishable reviewed product. Merchant destinations belong in the offer registry, not page JSX. Publication requires editorial review of sources, claims, authorization, and disclosure wording; passing code validation alone does not establish those facts.

For a published category, the catalog record is authoritative for its displayed name, description, and slug; `src/config/site.ts` supplies the planned category cards and icons. An active affiliate offer references one approved destination ID owned by its merchant. That destination record contains the exact HTTPS URL, including path and query, plus an authorization-evidence reference. The validator enforces the binding and allows only one active offer per product. An editor must still verify the agreement, full URL, and disclosure wording before publication.

Editorial dates use `YYYY-MM-DD` in UTC. Validation requires evaluation date ≤ publication date ≤ last-reviewed date ≤ the current UTC date when the catalog is built. Editors should use the actual UTC dates of their work; a future date blocks publication.

Local validation uses Node.js 22. `npm test` runs lint, type checking, and unit tests. `npm run test:build` runs the production build and build-isolation checks. GitHub Actions and deployed behavior require separate evidence.

> **Helping businesses pick the right software with confidence.**

---

## What is Picksy?

**Picksy** is an independent software discovery and implementation platform designed to help modern organizations—including agencies, consultants, small-to-medium enterprises (SMEs), entrepreneurs, creators, and technical professionals—choose and adopt business software with clarity, confidence, and objective evidence.

Picksy addresses crowded SaaS markets with evidence-led evaluations and practical implementation guidance, including:

- Objective, hands-on evaluations.
- Real-world operational workflows and architecture considerations.
- Transparent trade-offs, pricing traps, and scalability ceilings.
- Actionable implementation blueprints and migration playbooks.

---

## Product Vision & Market Positioning

Picksy aims to be the gold standard in B2B software advisory. Rather than acting as a superficial directory, Picksy provides deep implementation insight that empowers technical decision makers and business owners to build resilient, cost-effective tech stacks.

### Target Audience

- **Agencies & System Integrators:** Choosing client-facing delivery platforms, marketing engines, and client portals.
- **Consultants & Fractional Leaders:** Evaluating enterprise-ready tooling for rapid client deployment.
- **SMEs & Growing Businesses:** Streamlining operations, CRM pipelines, and customer acquisition.
- **Entrepreneurs & Creators:** Building lean, high-margin digital businesses with reliable infrastructure.
- **Technical Professionals & Developers:** Demanding truthful architectural breakdowns, API quality, and data portability.

---

## MVP Scope & Category Focus

In Phase 1, Picksy establishes its core technical and editorial foundation without premature commercial integrations.

### Primary Coverage Categories

1. **CRM & Automation** (e.g., HighLevel, ActiveCampaign, HubSpot)
2. **SEO Software** (e.g., SE Ranking, Ahrefs, Semrush)
3. **Email Marketing** (e.g., systeme.io, ConvertKit, Klaviyo)
4. **Course Platforms** (e.g., Skool, Kajabi, Teachable)
5. **Managed Hosting** (e.g., Kinsta, Cloudways, WP Engine)
6. **Cybersecurity** (e.g., 1Password, Bitwarden, Cloudflare)

### Initial Product Spotlight

- **HighLevel:** Comprehensive evaluation for agency workflows, sub-account limits, and white-label CRM setups.
- **SE Ranking:** In-depth analysis of ranking accuracy, keyword clustering, and agency reporting capabilities.
- **systeme.io:** Objective review of all-in-one automation, funnel limits, and course hosting economics.

---

## Technology Stack

The platform is engineered using modern, type-safe web technologies:

| Layer                 | Technology                   | Specification / Role                                               |
| --------------------- | ---------------------------- | ------------------------------------------------------------------ |
| **Framework**         | Next.js 15                   | App Router, React Server Components (RSC), Edge Runtime            |
| **Language**          | TypeScript 5                 | Strict mode enabled, zero `any` allowance, `@/*` aliases           |
| **Styling**           | Tailwind CSS v4              | PostCSS integration, design system tokens, zero runtime CSS-in-JS  |
| **UI**                | React 19                      | Application and Sanity Studio tooling                               |
| **Styling**           | Tailwind CSS 4                | Utility-first responsive styling                                    |
| **Content platform**  | Sanity                        | Approved editorial and catalogue control plane                      |
| **Hosting**            | Vercel                        | Application hosting and preview deployments                         |
| **CI / CD**            | GitHub Actions                | Repository tests and production build checks                        |
| **Monitoring checks** | Checkly + Playwright          | External API and browser checks; deployment needs project config     |

Sanity is Picksy's only currently approved third-party business platform. Newsletter delivery is required, but its provider and delivery architecture have not been approved. Affiliate retrieval remains disabled until source permissions and credentials are documented. Imported content must remain a draft until a human publishes it; the public catalogue adapter validates published records before rendering.

---

## CI and deployment

`.github/workflows/ci.yml` runs `npm ci`, `npm test`, and `npm run test:build` on Node.js 22 for pushes and pull requests to `main` and `develop`. Vercel hosts deployments; its GitHub connection and environment settings must be verified separately. The [migration record](docs/github-migration.md) tracks the remaining cutover checks.

`.gitlab-ci.yml` remains as a temporary rollback reference. GitLab OAuth for admin sign-in also remains active; changing the Git host does not change the app's identity provider.

---

## Branching Strategy & Git Workflow

We adhere to a disciplined GitFlow model:

- **`main`**: Production-ready branch. Deployed automatically by Auto DevOps to production.
- **`develop`**: Integration branch where completed feature branches land after review.
- **`feature/*`**: Dedicated feature branches branched from and targeting `develop` (e.g., `feature/initial-foundation`).
- **`fix/*`**: Bug fixes targeting `develop`.

### Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```bash
feat(landing): implement hero and category showcase sections
docs(readme): add Auto DevOps and governance specifications
chore(config): configure strict TypeScript and ESLint standards
```

---

## Local Development Steps

### Prerequisites

- **Node.js:** `22.x` via `.nvmrc`
- **Package Manager:** `npm` (or `pnpm`)

### Setup Instructions

```bash
# 1. Clone the repository
  git clone https://github.com/appiah233/Picksy.git
cd picksy

# 2. Checkout the integration branch
git checkout develop

# 3. Use the prescribed Node version
nvm use

# 4. Install dependencies
npm ci

# 5. Configure local settings from the example as needed
Copy-Item .env.example .env.local

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Quality checks

Picksy requires all code to pass static analysis, type checking, and production build gates before submission:

```bash
# Type check TypeScript definitions
npm run typecheck

# Lint codebase with ESLint
npm run lint

# Run unit tests, lint, and TypeScript checks
npm test

# Run production build and catalogue-isolation checks
npm run test:build

# Optional formatting check
npm run format:check
```

Checkly checks are configured in `checkly.config.ts` and `__checks__/`. Set `PICKSY_BASE_URL` to the deployed application URL before running them. If the deployment is protected by Vercel Deployment Protection, configure `VERCEL_AUTOMATION_BYPASS_SECRET` in the local environment; never commit the value. The agentic homepage and heartbeat checks are intentionally inactive placeholders.

---

## Security Principles

1. **Zero Hardcoded Secrets:** Credentials, database connection strings, and third-party tokens must never be committed. Always use `.env.example` as a sanitised guide.
2. **Affiliate Links:** Future published offers must use reviewed HTTPS destinations, adjacent disclosure, and sponsored link attributes.
3. **Editorial Review:** Technical validation cannot replace verification of merchant authorization, sources, and legal wording.
4. **Supply Chain Protection:** Dependencies are kept minimal and locked for clean CI installation; audit status requires separate evidence.

---

## Engineering Governance & Definition of Done

A task or Merge Request is considered **Done** only when:

- [x] Authored within a dedicated `feature/*` branch targeting `develop`.
- [x] Zero TypeScript compilation errors (`npm run typecheck`).
- [x] Zero ESLint warnings or errors (`npm run lint`).
- [x] Successful production build generation (`npm run build`).
- [ ] Mobile responsiveness and WCAG contrast verified in a browser.
- [ ] Clean conventional commit history with descriptive messages.
- [ ] Merge Request description submitted with complete terminal verification evidence.
