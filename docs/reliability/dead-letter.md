# Dead-Letter Handling

## Purpose

Preserve terminal outbound failures for diagnosis and controlled recovery.

## Normative references

`MAX-OUT-005`, `MAX-OUT-006`, `DeadLetterRecordV1`.

## Data or control flow

A permanent error or exhausted attempt budget atomically removes the active job, writes `outbound.dead.job:{jobId}`, and indexes it in `outbound.dead`.

## Failure behavior

Dead-letter records retain reason code, job identity, chat identity, attempt, and failure time. Message bodies and secrets are excluded unless an explicit project policy provides a safer encrypted recovery store.

## Verification

Run permanent-dead-letter and attempt-eight-dead-letter scenarios and inspect the Redis registry atomicity requirement.

## Non-goals

This document does not define an administrative user interface or automatic replay policy.
