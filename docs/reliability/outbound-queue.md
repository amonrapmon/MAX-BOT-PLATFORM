# Durable Outbound Queue

## Purpose

Ensure application responses survive network loss and process restart before transport acceptance.

## Normative references

`MAX-OUT-001` through `MAX-OUT-008`, `schemas/redis-keys.md`.

## Data or control flow

```text
enqueue idempotently
→ ready index
→ worker W1 claims lease
→ rate limit
→ send
→ accepted_by_max receipt or retry/dead letter
```

Lease fencing sequence:

```text
W1 claims job with lease owner=W1
→ lease expires
→ W2 reclaims job with owner=W2
→ stale W1 tries to complete
→ completion rejected because owner != W1
→ only W2 may perform the terminal transition
```

## Failure behavior

A job remains durable until accepted completion or dead-letter transition. A stale worker cannot acknowledge or dead-letter work after losing its lease.

## Verification

Run durable enqueue, idempotent enqueue, lease fencing, retry, accepted-by-MAX, and receipt-redaction scenarios.

## Non-goals

The queue does not claim that server acceptance proves end-user delivery or reading.
