# CLI

The supported integration boundary is a project-owned Run module. Other callers invoke that Run and never ask Product to discover configuration. `scripts/quality/scan.ts` is this repository's thin dogfood caller.

`bun run product:cli` remains temporarily only to reject former `scan` and `init` requests with an actionable migration diagnostic. It performs no configuration discovery, parsing, scanner, cache, or artifact work.

## Legacy migration boundary

Every legacy request returns the same configuration exit and directs the caller to create a
TypeScript Project Definition plus a bound project Run. The diagnostic does not reflect legacy
arguments or operational values.

## Scan flags

Project Run owns any project-specific invocation adapter.
