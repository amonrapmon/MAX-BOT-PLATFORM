# ADR 0001: Long Polling Is the Stable v1 Transport

## Status

Accepted

## Context

Existing donor bots have operational evidence for long polling, marker recovery, network disconnect/reconnect, and duplicate suppression. Webhook implementations have not yet accumulated equivalent real-operation evidence.

## Decision

MAX long polling is the only stable v1 transport. Webhook work remains non-normative under `docs/experimental/` until it completes the graduation path. This decision supports `MAX-ARCH-003`, `MAX-IN-001`, and `MAX-IN-002`.

## Consequences

The platform keeps an SDK-independent adapter seam, but stable conformance tests only long-polling behavior. New bots receive one proven road rather than two uneven roads.

## Verification

Run `MAX-IN-001.marker-restoration`, `MAX-IN-002.partial-batch-marker`, `MAX-REL-001.exponential-backoff`, and the operational recovery runbook added in Task 11.
