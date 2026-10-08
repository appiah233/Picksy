# Picksy

## Current implementation status

Picksy currently publishes a landing page with six planned software categories. Gate 2 adds typed repository-managed catalog contracts, validation, and category/product route architecture. No category, product review, or affiliate offer is published because verified editorial research, merchant authorization, and a production origin have not been supplied. The new routes return a not-found page until publishable content is added. The site intentionally emits `noindex` metadata and does not advertise a sitemap at this stage.

Content records are held in `src/content/catalog.ts` and checked by `src/lib/catalog-validation.ts`. A category becomes a home-page link only when it has a publishable reviewed product. Merchant destinations belong in the offer registry, not page JSX. Publication requires editorial review of sources, claims, authorization, and disclosure wording; passing code validation alone does not establish those facts.

For a published category, the catalog record is authoritative for its displayed name, description, and slug; `src/config/site.ts` supplies the planned category cards and icons. An active affiliate offer references one approved destination ID owned by its merchant. That destination record contains the exact HTTPS URL, including path and query, plus an authorization-evidence reference. The validator enforces the binding and allows only one active offer per product. An editor must still verify the agreement, full URL, and disclosure wording before publication.

Editorial dates use `YYYY-MM-DD` in UTC. Validation requires evaluation date ≤ publication date ≤ last-reviewed date ≤ the current UTC date when the catalog is built. Editors should use the actual UTC dates of their work; a future date blocks publication.

Local validation uses Node.js 22: `npm test` runs ESLint, TypeScript, and catalog tests; `npm run build` verifies production compilation. GitLab pipeline and deployed behavior require separate evidence.

> **Helping businesses pick the right software with confidence.**

---

## What is Picksy?

**Picksy** is an independent software discovery and implementation platform designed to help modern organizations—including agencies, consultants, small-to-medium enterprises (SMEs), entrepreneurs, creators, and technical professionals—choose and adopt business software with clarity, confidence, and objective evidence.

Modern SaaS markets are crowded with aggressive marketing and inflated claims. Picksy aims to address this by publishing:

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
| **Components**        | Radix UI / Shadcn Principles | Accessible primitives, clean B2B aesthetic, mobile-first           |
| **Icons**             | Lucide React                 | Lightweight, tree-shakable SVG icon system                         |
| **Database (Future)** | Neon PostgreSQL              | Serverless PostgreSQL with connection pooling                      |
| **ORM (Future)**      | Prisma ORM                   | Type-safe schema definition and migration blueprint                |
| **Hosting**           | Vercel                       | Global edge caching, instant preview deployments                   |
| **CI / CD**           | GitLab Auto DevOps           | Repository test override; inherited jobs require pipeline evidence |

---

## Auto DevOps Strategy

> **GitLab Auto DevOps manages build and deployment processes.**

Picksy strictly complies with GitLab Auto DevOps standards:

- **Test Override:** `.gitlab-ci.yml` includes the standard Auto DevOps template and runs `npm ci`, `npm test`, and `npm run build` on Node.js 22.
- **Standard Lifecycle Scripts:** `package.json` provides standard, predictable scripts (`build`, `start`, `lint`, `typecheck`).
- **Cloud Native Buildpack Compatibility:** The repository adheres to standard Node.js project structures, enabling Auto DevOps to detect, build, test, and package the application automatically.
- **Zero Secret Exposure:** All runtime environment configurations are injected at the platform level; no sensitive secrets or production credentials reside within the codebase.

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
git clone https://gitlab.com/appiah233/picksy.git
cd picksy

# 2. Checkout the integration branch
git checkout develop

# 3. Use the prescribed Node version
nvm use

# 4. Install dependencies
npm install

# 5. Create local environment file from example
cp .env.example .env.local

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Quality Validation Scripts

Picksy requires all code to pass static analysis, type checking, and production build gates before submission:

```bash
# Type check TypeScript definitions
npm run typecheck

# Lint codebase with ESLint
npm run lint

# Format code with Prettier
npm run format

# Verify production build compilation
npm run build
```

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
