# Picksy Agent Coordinator

This directory contains the offline-safe coordination boundary for Picksy.

## Status

**PARTIAL — DATABASE INTEGRATION UNVERIFIED**

The development database target is not provisioned in the current environment:

- `PICKSY_COORDINATION_DATABASE_URL`: MISSING
- `DATABASE_URL`: MISSING
- `DIRECT_URL`: MISSING
- Prisma migration directory: MISSING

No credential value is read, printed, committed, or fabricated.

## Boundaries

- `prisma/schema.prisma` is an isolated coordination schema. It does not alter the existing Picksy content/importer Prisma blueprint.
- `src/coordinator.ts` provides an offline in-memory implementation for local contract and invariant tests.
- `src/mcp-tools.ts` freezes the 15-tool manifest and bounded input schemas.
- `src/monitor.ts` creates the shared redacted read projection used by future mobile and VS Code clients.
- `src/redaction.ts` removes credential-like and private-reasoning fields before monitor output.

The in-memory implementation is test infrastructure only. It is not evidence of PostgreSQL durability, concurrent transaction safety, live MCP transport, mobile deployment, or end-to-end observability.

## Migration gate

Do not run `prisma db push`, reset commands, or migrations until an explicitly authorized Picksy development PostgreSQL target is provisioned and independently verified. The required evidence is:

1. Target is development-only and belongs to Picksy.
2. `PICKSY_COORDINATION_DATABASE_URL` is server-side and points to the approved isolated namespace.
3. Migration is reviewed and non-destructive to unrelated data.
4. Restricted monitor reads and coordinator writes use separate database roles or equivalent enforced permissions.
5. PostgreSQL integration, concurrency, recovery, and fencing tests pass.

Until then, the status remains `MIGRATION_BLOCKED_PENDING_DATABASE_TARGET`.
