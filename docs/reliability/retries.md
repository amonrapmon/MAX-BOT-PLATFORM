# Retry Policy

## Purpose

Define bounded, observable retries for polling and outbound jobs.

## Normative references

`MAX-OUT-004` through `MAX-OUT-006`, `MAX-REL-001`, `MAX-REL-002`.

## Data or control flow

Polling delay follows `1s → 2s → 4s → 8s → 10s`, plus 0–499 ms jitter. A successful poll resets the counter. Outbound retries retain the same `jobId`, increment `attempt`, and update `availableAt`.

## Failure behavior

Permanent outbound errors move directly to dead letter. Attempt eight is terminal. Retry-after values above 15 minutes are capped.

## Verification

Run retry-same-job, permanent-dead-letter, attempt-eight-dead-letter, exponential-backoff, and retry-after scenarios.

## Non-goals

Retries do not compensate for invalid credentials or unknown state versions.
