# Runtime Lifecycle

## Purpose

Define safe startup, steady-state operation, recovery, and shutdown ordering.

## Normative references

`MAX-OPS-001` through `MAX-OPS-004`, `MAX-IN-003`, `MAX-IN-004`.

## Data or control flow

```text
validate configuration
→ connect Redis
→ verify runtime identity
→ resolve bot identity
→ acquire polling ownership
→ restore marker
→ start sender
→ start polling
→ stop new work
→ drain or release leases
→ release ownership
→ close dependencies
```

Ownership is acquired before the first poll and renewed while polling is active. Shutdown stops new work before draining existing work.

## Failure behavior

Invalid configuration fails before polling. Ownership conflict blocks startup. Ownership loss stops polling. A 30-second shutdown deadline produces `shutdown.timeout` and a non-zero process exit.

## Verification

Run `MAX-IN-003.single-owner`, `MAX-IN-004.owner-loss`, `MAX-OPS-001.invalid-config-before-poll`, and the shutdown scenarios.

## Non-goals

This document does not define container orchestration policy or product-specific startup dependencies.
