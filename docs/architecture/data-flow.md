# Runtime Data Flow

## Purpose

Show how identifiers and durable records connect one inbound update to resulting outbound work.

## Normative references

`MAX-IN-005`, `MAX-IN-006`, `MAX-OUT-001`, `MAX-OUT-007`, `MAX-OBS-001`.

## Data or control flow

```text
raw update
→ BotEventV1(eventId)
→ sha256(eventId)
→ inbound lease
→ BotApplication.handle()
→ OutboundJobV1(jobId, idempotencyKey, correlationId)
→ transport send
→ AcceptanceReceiptV1(messageId)
```

Logs correlate `eventHash`, `jobId`, and `messageId` without storing message bodies.

## Failure behavior

Replay can repeat raw receipt, but completed event state suppresses completed business execution. A sender crash after MAX accepts a message but before receipt persistence remains a documented duplicate-send window.

## Verification

Run stable event ID, duplicate, durable enqueue, accepted-by-MAX, and receipt-redaction scenarios.

## Non-goals

The flow does not claim end-user delivery confirmation or exactly-once transport delivery.
