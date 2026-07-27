# ADR 0002: Redis 7 Stores Runtime Transport State

## Status

Accepted

## Context

Marker persistence, ownership, duplicate suppression, durable outbound jobs, receipts, dead letters, and health must survive process restart and coordinate multiple workers.

## Decision

Redis 7 is the canonical v1 state store. Keys, TTLs, value contracts, and required atomic transitions are defined in `schemas/redis-keys.md`. This decision supports `MAX-IN-003`, `MAX-REL-003`, `MAX-REL-005`, and `MAX-OUT-003`.

## Consequences

Runtime safety depends on Redis availability. New polls and claims pause when Redis is unavailable. Alternative stores may conform later only by providing equivalent atomicity and fencing behavior.

## Verification

Run `MAX-IN-003.single-owner`, `MAX-OUT-003.lease-fencing`, `MAX-REL-003.redis-loss-pauses-work`, and `MAX-REL-005.atomic-terminal-transition`.
