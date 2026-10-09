# Picksy Engineering Contributing Guidelines

Welcome to the **Picksy** engineering team. We maintain rigorous standards for code quality, architectural consistency, testing, and security. Every contributor is expected to follow this guide.

---

## 1. Branch Strategy

We follow an adapted GitFlow branching model tailored for continuous integration:

| Branch      | Purpose                              | Source    | Merge Target       | Protection Rules                                      |
| ----------- | ------------------------------------ | --------- | ------------------ | ----------------------------------------------------- |
| `main`      | Production-ready, deployed state     | `develop` | N/A                | Strictly protected; requires approved MR & passing CI |
| `develop`   | Central integration branch           | `main`    | `main`             | Protected; requires passing CI & code review          |
| `feature/*` | New functionality or foundation work | `develop` | `develop`          | Ephemeral; branch from and target `develop`           |
| `fix/*`     | Non-emergency bug fixes              | `develop` | `develop`          | Ephemeral                                             |
| `hotfix/*`  | Urgent production fixes              | `main`    | `main` & `develop` | Strictly limited to verified production blockers      |

### Working on a Feature

```bash
# Ensure local develop is current
git checkout develop
git pull origin develop

# Create your dedicated feature branch
git checkout -b feature/my-feature-name
```

---

## 2. Commit Conventions

We strictly adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification (v1.0.0).

### Commit Message Format

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Allowed Types

- `feat`: A new user-facing or technical feature
- `fix`: A bug fix
- `docs`: Documentation-only changes
- `style`: Changes that do not affect the meaning of code (formatting, missing semicolons, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Maintenance tasks, dependency updates, tooling configuration
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI/CD configuration files and scripts

### Examples

- `feat(landing): implement hero and category showcase sections`
- `docs(arch): document Auto DevOps compatibility and buildpack requirements`
- `chore(deps): configure Prettier and ESLint integration`

---

## 3. Merge Request (MR) Standards

All contributions must be submitted via GitLab Merge Requests targeting `develop`.

### MR Requirements

1. **Title:** Must follow conventional commit format (e.g., `feat(foundation): initialize repository architecture and landing page`).
2. **Description:** Every MR must include:
   - **Context & Motivation:** What problem does this solve?
   - **Summary of Changes:** Concise bulleted list of modifications.
   - **Review Roles & Approvals:** Evidence that Architect, Security, and QA considerations were addressed.
   - **Validation Evidence:** Verifiable terminal outputs for `install`, `lint`, `typecheck`, and `build`.
   - **Out of Scope:** Explicit list of items intentionally deferred.
3. **No Direct Pushes:** Pushes directly to `main` or `develop` are prohibited.

---

## 4. Quality Validation & Testing Standards

Once deployed, Picksy Guardian reviews every new revision of a Merge Request
and keeps a single summary comment up to date. Treat that comment as evidence
for your own review: a PASS is advisory and is never Gate authorization,
editorial or merchant approval, or permission to merge. Guardian only comments;
it does not approve, merge, or modify repository files. Changes under
`tools/picksy-guardian/` are reviewed by the deployed Guardian, not the proposed
one, and need the project owner's review.

Before creating a Merge Request, you must execute the full validation suite locally:

```bash
# 1. Type validation
npm run typecheck

# 2. Linting validation
npm run lint

# 3. Production build validation
npm run build
```

### Evidence Requirement

Merge requests will NOT be reviewed without verifiable terminal outputs showing:

- Clean TypeScript compilation (`0 errors`).
- Clean ESLint analysis (`0 errors, 0 warnings`).
- Successful Next.js production build (`Compiled successfully`).

---

## 5. Review Standards & Code Hygiene

Every pull/merge request is evaluated against:

1. **Separation of Concerns:** Business logic belongs in `services/`, domain UI in `features/`, reusable UI in `components/`, utilities in `lib/`.
2. **Zero Unused Code:** No dead imports, unused variables, or orphaned components.
3. **Accessibility Baseline:** Semantic HTML5 elements (`<header>`, `<main>`, `<nav>`, `<section>`, `<footer>`), valid ARIA attributes, and accessible color contrast.
4. **Security Check:** Zero credentials, tokens, or live URLs committed. Zero unescaped user inputs.

---

## 6. Reporting Bugs

Bugs are tracked in [GitLab Issues](https://gitlab.com/appiah233/picksy/-/issues).

1. Create a new issue and choose the **Bug** template from the description dropdown.
2. Fill in every section; reproduction steps and evidence are required for triage.
3. The project is public: never include credentials, tokens, or personal data. Mark security vulnerabilities as confidential.
4. Reference the issue from the fix, e.g. `Closes #123` in the Merge Request description, so it closes on merge.

---

## 7. Definition of Done (DoD)

A task or feature is considered **Done** only when:

- [ ] Code is authored within a dedicated `feature/*` or `fix/*` branch.
- [ ] All TypeScript types are strictly defined with zero `any` declarations.
- [ ] `npm run lint` passes with zero warnings or errors.
- [ ] `npm run typecheck` passes with zero type mismatches.
- [ ] `npm run build` succeeds cleanly in a production configuration.
- [ ] Documentation is created or updated in `README.md` or `docs/`.
- [ ] Conventional commit messages are used throughout git history.
- [ ] Merge Request is filed targeting `develop` with complete validation logs.
