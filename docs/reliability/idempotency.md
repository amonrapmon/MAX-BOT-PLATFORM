# Inbound and Outbound Idempotency

## Purpose

Define duplicate suppression without promising impossible end-to-end exactly-once behavior.

## Normative references

`MAX-IN-005` through `MAX-IN-007`, `MAX-OUT-002`, ADR `0003`.

## Data or control flow

Inbound processing hashes stable `eventId`, acquires a processing lease, calls the application, and stores completed state. Outbound publication maps one `idempotencyKey` to one durable `jobId`.

## Failure behavior

An application failure leaves the inbound event incomplete. A completed event replay is skipped. Application integrations remain responsible for idempotency of their own external writes.

## Verification

Run stable event ID, completed duplicate, application failure replay, and idempotent enqueue scenarios.

## Non-goals

The platform does not promise exactly-once receipt from MAX or exactly-once execution in external business systems.
