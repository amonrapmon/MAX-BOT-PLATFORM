# Long-Polling Transport

## Purpose

Define long polling as the only stable transport profile in platform v1.

## Normative references

`MAX-ARCH-003`, `MAX-IN-001` through `MAX-IN-004`, ADR `0001`.

## Data or control flow

The supervisor restores the marker, calls `MaxTransportAdapter.getUpdates()`, processes the returned batch, and commits the returned marker only after complete batch success. One fenced owner controls each runtime identity.

## Failure behavior

HTTP 408, 429, network failures, and 5xx responses are retryable. HTTP 400, 401, and 403 are permanent for polling. Temporary failures use bounded exponential backoff and health transitions.

## Verification

Run marker restoration, partial batch, single owner, owner loss, exponential backoff, and retry-after scenarios.

## Non-goals

Webhook transport is experimental and is not a stable v1 alternative.
