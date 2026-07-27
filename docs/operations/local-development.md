# Local Development

## Purpose

Provide a repeatable local environment for contract, schema, conformance, and Redis-state development without using a production bot token.

## Normative references

`MAX-SEC-001`, `MAX-SEC-002`, `MAX-TEST-001` through `MAX-TEST-003`.

## Data or control flow

```text
npm ci
→ docker compose -f docker-compose.test.yml up -d
→ npm run verify
→ implementation-specific conformance adapter
→ docker compose -f docker-compose.test.yml down -v
```

Use `redis://localhost:16380` only for isolated tests. A local runtime uses a dedicated `MAX_RUNTIME_ID`. Exactly one process may long-poll a given bot token.

## Failure behavior

Do not start local polling while a container or another workstation owns the same token. Do not disable TLS verification. A failed Redis health check blocks integration tests rather than silently switching to memory state.

## Verification

Run `npm run verify` and `docker compose -f docker-compose.test.yml config` before implementation-specific tests.

## Non-goals

This document does not provide a real bot token, a production secret, or a project business environment.
