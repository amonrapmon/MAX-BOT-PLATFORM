# Runtime Health

## Purpose

Define aggregate and component health states for polling, Redis, and outbound processing.

## Normative references

`MAX-OBS-004`, `RuntimeHealthV1`, `ComponentHealthV1`.

## Data or control flow

Component states `up`, `degraded`, and `down` roll into runtime states `starting`, `healthy`, `degraded`, `recovering`, `unhealthy`, `stopping`, and `stopped`.

## Failure behavior

Temporary MAX failures move the runtime through degraded and recovering. Redis loss marks state-store down and pauses unsafe work. Permanent configuration, ownership, or incompatible-state failures produce unhealthy state.

## Verification

Run `MAX-OBS-004.health-recovery` and the Redis-loss scenario.

## Non-goals

Health is diagnostic state, not a polling ownership lock.
