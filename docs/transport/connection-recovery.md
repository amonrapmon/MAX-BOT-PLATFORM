# Connection Recovery

## Purpose

Define recovery from temporary MAX API and state-store connectivity failures.

## Normative references

`MAX-REL-001` through `MAX-REL-003`, `MAX-OBS-004`.

## Data or control flow

```text
connected
→ connection_lost
→ degraded
→ bounded backoff with jitter
→ recovering
→ successful poll or state-store check
→ one connection_restored event
→ healthy
```

`Retry-After` overrides a shorter computed delay and is capped at 15 minutes.

## Failure behavior

Redis loss pauses new polls and outbound claims because the runtime cannot safely preserve marker, lease, and deduplication state. Permanent MAX errors do not loop forever.

## Verification

Run exponential backoff, retry-after, Redis-loss, and health-recovery scenarios.

## Non-goals

Recovery does not hide permanent credentials or configuration defects.
