# Picksy

> **Helping businesses pick the right software with confidence.**

---

## What is Picksy?

**Picksy** is an independent software discovery and implementation platform designed to help modern organizations—including agencies, consultants, small-to-medium enterprises (SMEs), entrepreneurs, creators, and technical professionals—choose and adopt business software with clarity, confidence, and objective evidence.

Modern SaaS markets are crowded with aggressive marketing, inflated claims, and affiliate aggregators that rank tools based solely on commission rates. Picksy solves this problem by delivering:

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

| Layer                 | Technology                   | Specification / Role                                              |
| --------------------- | ---------------------------- | ----------------------------------------------------------------- |
| **Framework**         | Next.js 15                   | App Router, React Server Components (RSC), Edge Runtime           |
| **Language**          | TypeScript 5                 | Strict mode enabled, zero `any` allowance, `@/*` aliases          |
| **Styling**           | Tailwind CSS v4              | PostCSS integration, design system tokens, zero runtime CSS-in-JS |
| **Components**        | Radix UI / Shadcn Principles | Accessible primitives, clean B2B aesthetic, mobile-first          |
| **Icons**             | Lucide React                 | Lightweight, tree-shakable SVG icon system                        |
| **Database (Future)** | Neon PostgreSQL              | Serverless PostgreSQL with connection pooling                     |
| **ORM (Future)**      | Prisma ORM                   | Type-safe schema definition and migration blueprint               |
| **Hosting**           | Vercel                       | Global edge caching, instant preview deployments                  |
| **CI / CD**           | GitLab Auto DevOps           | Automated linting, testing, SAST, and container builds            |

---

## Auto DevOps Strategy

> **GitLab Auto DevOps manages build and deployment processes.**

Picksy strictly complies with GitLab Auto DevOps standards:

- **Minimal Test Override:** `.gitlab-ci.yml` includes the standard Auto DevOps template and overrides only its legacy Herokuish test job so checks run on the project's required Node.js 22 runtime.
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

- **Node.js:** `>= 20.x` (Recommended: `22.x` via `.nvmrc`)
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
2. **Compliant External Links:** All outbound affiliate and external links are strictly rendered with `rel="noopener noreferrer"`.
3. **FTC Compliance:** Clear, conspicuous affiliate disclosures are embedded natively in global layouts.
4. **Supply Chain Protection:** Dependencies are kept minimal, pinned, and audited regularly via `npm audit`.

---

## Engineering Governance & Definition of Done

A task or Merge Request is considered **Done** only when:

- [x] Authored within a dedicated `feature/*` branch targeting `develop`.
- [x] Zero TypeScript compilation errors (`npm run typecheck`).
- [x] Zero ESLint warnings or errors (`npm run lint`).
- [x] Successful production build generation (`npm run build`).
- [x] Mobile responsiveness and WCAG contrast verified.
- [x] Clean conventional commit history with descriptive messages.
- [x] Merge Request description submitted with complete terminal verification evidence.
