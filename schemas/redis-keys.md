# Redis State Registry

This registry is normative for the Redis 7 state layout in stable v1. `{runtimeId}` is stable, contains no secret, and isolates one bot runtime. Curly-braced identifiers are placeholders and MUST NOT be stored literally.

| Name | Key | Value contract | TTL | Atomic operations | Requirement IDs |
|---|---|---|---|---|---|
| transport.marker | `maxbot:{runtimeId}:transport:marker` | `PollingMarkerV1` | none | compare current marker and commit replacement after complete batch | MAX-IN-001, MAX-IN-002, MAX-REL-005 |
| transport.health | `maxbot:{runtimeId}:transport:health` | `RuntimeHealthV1` | 24h after last update | replace complete snapshot | MAX-OBS-004, MAX-REL-005 |
| transport.owner | `maxbot:{runtimeId}:transport:owner` | `PollingOwnerV1` | 30s | acquire, renew, and release fenced by `ownerId` | MAX-IN-003, MAX-IN-004, MAX-REL-005 |
| transport.identity | `maxbot:{runtimeId}:transport:identity` | `RuntimeIdentityV1` | none | create once or compare fingerprint and bot identity | MAX-SEC-002, MAX-SEC-003, MAX-REL-005 |
| inbound.event | `maxbot:{runtimeId}:inbound:{sha256(eventId)}` | `InboundEventStateV1` | 120s processing / 48h completed | acquire processing lease and transition processing to completed | MAX-IN-005, MAX-IN-006, MAX-IN-007, MAX-REL-005 |
| outbound.job | `maxbot:{runtimeId}:outbound:job:{jobId}` | `OutboundJobV1` | until terminal transition | idempotent publish, claim, renew, accepted completion, retry schedule, or dead-letter move | MAX-OUT-001, MAX-OUT-002, MAX-OUT-003, MAX-REL-005 |
| outbound.ready | `maxbot:{runtimeId}:outbound:ready` | ready job index | none | add on publish, remove on claim, restore expired lease | MAX-OUT-001, MAX-OUT-003, MAX-REL-005 |
| outbound.scheduled | `maxbot:{runtimeId}:outbound:scheduled` | scheduled job index by `availableAt` | none | schedule retry and atomically promote due jobs | MAX-OUT-004, MAX-REL-001, MAX-REL-002, MAX-REL-005 |
| outbound.leased | `maxbot:{runtimeId}:outbound:leased` | leased job index by `leasedUntil` | none | claim, renew, remove on terminal transition, recover expired leases | MAX-OUT-003, MAX-REL-005 |
| outbound.receipt | `maxbot:{runtimeId}:outbound:receipt:{jobId}` | `AcceptanceReceiptV1` | 7d | accepted completion fenced by current lease owner | MAX-OUT-003, MAX-OUT-007, MAX-OUT-008, MAX-REL-005 |
| outbound.dead | `maxbot:{runtimeId}:outbound:dead` | dead-letter job index | none | move terminal job and append dead index in one transition | MAX-OUT-005, MAX-OUT-006, MAX-REL-005 |
| outbound.dead.job | `maxbot:{runtimeId}:outbound:dead:job:{jobId}` | `DeadLetterRecordV1` | operator policy | create dead record and remove active job in one transition | MAX-OUT-005, MAX-OUT-006, MAX-REL-005 |

## Atomicity rule

Every operation named in the `Atomic operations` column MUST execute as one Redis transaction, one Lua script, or another state-store primitive with equivalent atomic and fencing guarantees. A sequence of independent commands without rollback or ownership checks does not conform.
