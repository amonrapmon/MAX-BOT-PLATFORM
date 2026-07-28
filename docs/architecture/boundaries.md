# Runtime Boundaries

## Purpose

Define the hard boundary between the reusable MAX runtime body and the project application head.

## Normative references

`MAX-ARCH-001`, `MAX-ARCH-002`, `MAX-OUT-001`; `contracts/runtime.ts`; `contracts/transport.ts`.

## Data or control flow

```text
┌──────────────────────────────┐
│       Application head       │
│ commands · scenarios · copy  │
│ buttons · FSM · business API │
└──────────────┬───────────────┘
               │ BotApplication / BotContext
┌──────────────▼───────────────┐
│       MAX Bot Runtime        │
│ polling · dedup · queue      │
│ retry · health · shutdown    │
└──────────────┬───────────────┘
               │ MaxTransportAdapter
             MAX API
```

The application receives `BotEventV1` and can only enqueue `OutboundMessageV1`. SDK values, Redis keys, markers, leases, and transport error classes remain inside the runtime body.

## Failure behavior

A head that bypasses `BotContext.send()` or imports a MAX SDK does not conform. Boundary violations are caught by `scripts/check-contract-boundaries.mjs` and conformance scenarios `MAX-ARCH-001.application-boundary` and `MAX-ARCH-002.sdk-isolation`.

## Verification

Run `npm run check:boundaries` and the architecture conformance module.

## Non-goals

This document does not define commands, text, buttons, business persistence, or product roles.
