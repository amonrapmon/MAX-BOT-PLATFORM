# Event Normalization

## Purpose

Convert SDK-specific updates into stable `BotEventV1` records before application dispatch.

## Normative references

`MAX-ARCH-002`, `MAX-IN-005`, `contracts/events.ts`, `contracts/transport.ts`.

## Data or control flow

```text
RawTransportUpdateV1
→ update-type-specific validation
→ stable eventId derivation
→ BotEventV1
→ application port
```

Each supported update type documents which immutable platform identifiers form `eventId`. Raw payloads never cross the application boundary.

## Failure behavior

An update missing mandatory identity fields is a permanent protocol error and must not be silently assigned a random event ID. Unsupported lifecycle updates may be normalized to an ignored application outcome when explicitly allowed.

## Verification

Run `MAX-IN-005.stable-event-id` and SDK isolation checks.

## Non-goals

Normalization does not interpret commands or business meaning.
