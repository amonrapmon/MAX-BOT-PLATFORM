# Runtime Overview

## Purpose

Describe the canonical components of the headless runtime without prescribing one internal source-tree layout.

## Normative references

`MAX-ARCH-*`, `MAX-IN-*`, `MAX-OUT-*`; `contracts/index.ts`.

## Data or control flow

```text
Transport Adapter
      ↓
Polling Supervisor
      ↓
Inbound Processor
      ↓
Application Port
      ↓
Outbound Queue
      ↓
Sender Worker
```

`State Store`, `Clock`, `RuntimeLogger`, `RuntimeMetrics`, and health state serve the whole pipeline. The adapter normalizes SDK traffic. The supervisor owns polling and marker progression. The inbound processor owns event leases and duplicate suppression. The sender worker owns transport attempts and terminal receipts.

## Failure behavior

Critical state-store loss pauses new polls and claims. Permanent configuration or authentication errors stop the runtime. Application errors leave the inbound event incomplete so replay remains possible.

## Verification

Use the 29 scenarios exported by `testing/conformance/index.ts`.

## Non-goals

This overview is not a production runtime implementation and does not select a concrete MAX SDK.
