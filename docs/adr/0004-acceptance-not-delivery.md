# ADR 0004: Record Server Acceptance, Not Delivery

## Status

Accepted

## Context

A successful MAX send response supplies server message metadata but does not prove that an end user received or read the message.

## Decision

The terminal success state is `accepted_by_max`, represented by `AcceptanceReceiptV1`. The receipt stores identifiers and acceptance time but no message payload. The runtime does not expose `delivered` or `read` as transport states. This decision supports `MAX-OUT-007` and `MAX-OUT-008`.

## Consequences

Product interfaces must use honest language. Operational diagnostics can prove server acceptance without inventing downstream guarantees.

## Verification

Run `MAX-OUT-007.accepted-by-max` and `MAX-OUT-008.receipt-redaction`.
