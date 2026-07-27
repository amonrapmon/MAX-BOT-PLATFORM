# ADR 0003: Completed Inbound Events Are Deduplicated

## Status

Accepted

## Context

Long polling can replay a batch after application failure or process restart. Advancing the marker early loses events, while blindly replaying completed work duplicates side effects.

## Decision

The runtime derives a stable event ID, acquires a processing lease, and stores completed state after successful application handling. Completed replay is suppressed within the configured TTL. The runtime does not promise exactly-once receipt or exactly-once external business effects. This decision supports `MAX-IN-005`, `MAX-IN-006`, and `MAX-IN-007`.

## Consequences

Application integrations remain responsible for idempotency of their own external mutations. A failed application call leaves the event replayable.

## Verification

Run `MAX-IN-005.stable-event-id`, `MAX-IN-006.completed-duplicate`, and `MAX-IN-007.application-failure-replay`.
