# Picksy Product Importer Authentication Contract

Status: SUPERSEDED FOR ADMIN CONTENT OPERATIONS BY SANITY  
Disposition: PRESERVED PENDING SAFE REMOVAL OR REUSE ASSESSMENT  
Contract Version: AUTH-1 (Historical)  
Scope: Picksy Admin + Affiliate Product Importer  

> **Authoritative Decision (2026-10-10):** Sanity is Picksy's ONLY approved third-party business platform and handles content-editor sign-in. Auth.js for admin content operations is superseded and preserved pending safe disposition. Any independent Picksy importer endpoint still requires server-side verification of the individual editor and permission; a reusable robot/shared token in browser-executed Studio code is prohibited. The exact supported identity handoff remains under [SecurityAgent review](SANITY-SECURITY-REVIEW.md), and no production authorization mechanism is frozen here.


## 1. Objective

Replace the unsafe hard-coded administrator token with a proper authentication and authorization boundary.

This contract introduces administrator authentication without changing the fundamental Product Importer workflow.

Authentication and authorization are separate concerns:

- Authentication: Who is making this request?
- Authorization: Is the authenticated identity permitted to perform this administrative operation?

Both must succeed for protected administrative operations.

## 2. Protected Boundaries

Authenticated and authorized access is required for:

Frontend:

- `/admin`
- `/admin/*`

Backend:

- `/api/admin/*`

Including the Product Importer operations:

- `POST /api/admin/imports/preview`
- `POST /api/admin/imports`
- `GET /api/admin/imports/:id`
- `POST /api/admin/imports/:id/publish`

Authentication and authorization MUST be enforced server-side.

Hiding navigation or redirecting unauthenticated users in client code is not sufficient security.

## 3. Authentication Architecture

Preferred authentication library: Auth.js.

Verify compatibility with the existing Picksy repository before implementation.

Do not build a custom Picksy username/password database unless separately approved.

Target architecture:

```text
External Identity Provider
        |
        v
     Auth.js
        |
        v
Authenticated Session
        |
        v
Canonical Picksy Principal
        |
        v
Picksy Authorization
        +----------------------+
        |                      |
        v                      v
    Admin UI              Admin APIs
```

Provider-specific identity information must not propagate throughout Product Importer business logic.

## 4. Canonical Principal Contract

Use one application-level principal:

```ts
export interface PicksyPrincipal {
  id: string;
  email: string;
  name?: string | null;
  roles: PicksyRole[];
}

export type PicksyRole = "ADMIN";
```

## Review state

The supplied contract text ends after the `PicksyRole` definition. Additional sections or approval from Gemini and Codex have not yet been recorded. This file remains **PROPOSED** until the review is complete.
