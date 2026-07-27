# Deployment

## Purpose

Define the minimum deployment contract for a conforming long-polling runtime.

## Normative references

`MAX-IN-003`, `MAX-IN-004`, `MAX-SEC-001` through `MAX-SEC-003`, `MAX-OPS-001` through `MAX-OPS-004`.

## Data or control flow

1. Inject secrets through the platform secret mechanism.
2. Mount any required CA bundle read-only and set `NODE_EXTRA_CA_CERTS`.
3. Connect the runtime to Redis 7.
4. Resolve and verify bot identity before polling.
5. Acquire fenced polling ownership.
6. Restore marker and start workers.
7. Expose health and structured logs.
8. On termination, stop new polls and claims before draining active work.

A stable long-polling deployment runs one active owner per bot runtime identity. Standby processes may exist, but they must not poll until ownership is acquired.

## Failure behavior

A bad token, identity mismatch, missing CA file, incompatible Redis state, or owner conflict blocks safe startup. Redis loss pauses polls and outbound claims. The orchestrator should restart an unexpectedly terminated process but must not mask a permanent configuration loop.

## Verification

Validate deployment configuration, run the transport recovery smoke, and attach evidence to `MAX-CONFORMANCE.md`.

## Non-goals

This document does not prescribe Kubernetes, Docker Compose, systemd, one cloud vendor, or webhook replica scaling.
