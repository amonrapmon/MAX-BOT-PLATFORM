# MAX Bot Platform Standard

**Version:** 1.0.0  
**Status:** Stable long-polling standard  
**Canonical state store:** Redis 7

This document is the primary normative source of truth for the MAX bot runtime body. Project commands, scenarios, message copy, roles, business integrations, and business database schemas are outside its scope.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative. Only requirements marked PROVEN may use MUST or MUST NOT in the stable registry.

## Requirement registry

### MAX-ARCH-001 — Application code is isolated from transport internals
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#BotApplication
- Test: testing/conformance/architecture.ts#MAX-ARCH-001.application-boundary

Statement:
Application code MUST interact with the runtime only through the application port and MUST NOT access polling markers, transport leases, transport state keys, or MAX SDK clients.

Rationale:
The reusable body must remain replaceable without rewriting the project head.

Verification:
The architecture conformance driver exposes no transport internals to the application and the boundary scan finds no forbidden dependency.

### MAX-ARCH-002 — SDK types remain inside the transport adapter
- Status: PROVEN
- Level: MUST
- Contract: contracts/transport.ts#MaxTransportAdapter
- Test: testing/conformance/architecture.ts#MAX-ARCH-002.sdk-isolation

Statement:
Concrete MAX SDK types MUST NOT cross the transport-adapter boundary.

Rationale:
SDK isolation prevents vendor-library changes from leaking through runtime and application contracts.

Verification:
Type contracts use platform-owned types and the boundary scanner rejects known MAX SDK imports under contracts.

### MAX-ARCH-003 — Stable v1 supports long polling only
- Status: PROVEN
- Level: MUST
- Contract: contracts/transport.ts#MaxTransportAdapter
- Test: testing/conformance/architecture.ts#MAX-ARCH-003.long-polling-only

Statement:
Stable version 1 MUST expose MAX long polling as its only PROVEN transport; webhook transport MUST remain experimental.

Rationale:
Webhook behavior has not accumulated sufficient operational evidence for a stable requirement.

Verification:
Stable documentation, contracts, and conformance registry contain no supported webhook implementation.

### MAX-IN-001 — Runtime restores the committed marker before first poll
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#PollingMarkerV1
- Test: testing/conformance/polling.ts#MAX-IN-001.marker-restoration

Statement:
The runtime MUST restore the last committed polling marker before issuing its first update request.

Rationale:
Starting without the marker can replay historical updates or skip the intended continuation point.

Verification:
Restart the runtime with a stored marker and assert that the first poll request contains that marker.

### MAX-IN-002 — Marker advances only after the full batch succeeds
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#PollingMarkerV1
- Test: testing/conformance/polling.ts#MAX-IN-002.partial-batch-marker

Statement:
The runtime MUST commit a new polling marker only after every update in the received batch completes successfully.

Rationale:
Early marker advancement can permanently discard an unprocessed update.

Verification:
Fail one update in a multi-update batch and assert that the committed marker remains unchanged.

### MAX-IN-003 — Exactly one polling owner exists per runtime identity
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#PollingOwnerV1
- Test: testing/conformance/polling.ts#MAX-IN-003.single-owner

Statement:
At most one live polling owner MUST exist for a runtime identity and bot token.

Rationale:
Concurrent pollers can conflict, duplicate work, and corrupt marker semantics.

Verification:
Start two runtimes with the same identity and assert that only one acquires ownership and polls.

### MAX-IN-004 — Ownership loss stops polling
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#PollingOwnerV1
- Test: testing/conformance/polling.ts#MAX-IN-004.owner-loss

Statement:
A runtime that loses its polling ownership MUST stop requesting new update batches.

Rationale:
Continuing after lease loss creates split-brain polling.

Verification:
Revoke or replace the owner lease and assert that no further poll request is issued.

### MAX-IN-005 — Stable event IDs are deterministic per update type
- Status: PROVEN
- Level: MUST
- Contract: contracts/events.ts#BotEventV1
- Test: testing/conformance/inbound.ts#MAX-IN-005.stable-event-id

Statement:
Every supported inbound update type MUST map to a deterministic stable event identifier.

Rationale:
Duplicate suppression depends on identical updates producing identical identities.

Verification:
Normalize the same update twice and assert equal event IDs; change its protocol identity and assert a different ID.

### MAX-IN-006 — Completed duplicates do not reach the application
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#InboundEventStateV1
- Test: testing/conformance/inbound.ts#MAX-IN-006.completed-duplicate

Statement:
An inbound event already marked completed MUST NOT invoke application handling again within the completed-state TTL.

Rationale:
The transport may replay updates after network failures or partial batches.

Verification:
Submit the same completed event again and assert that application invocation count does not increase.

### MAX-IN-007 — Application failure does not complete the event or advance marker
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#BotApplication
- Test: testing/conformance/inbound.ts#MAX-IN-007.application-failure-replay

Statement:
When application handling fails, the runtime MUST NOT mark the event completed and MUST NOT advance the enclosing batch marker.

Rationale:
Failed business work must remain replayable after recovery.

Verification:
Force the application to fail and assert absent completion state, unchanged marker, and later replay.

### MAX-OUT-001 — Application sends only through durable enqueue
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#BotContext
- Test: testing/conformance/outbound.ts#MAX-OUT-001.durable-enqueue

Statement:
Application code MUST create outbound work through the durable enqueue port and MUST NOT call MAX transport sending directly.

Rationale:
Durability and recovery are impossible when project handlers bypass the queue.

Verification:
Invoke the application send port and assert that a persistent outbound job exists before any transport send.

### MAX-OUT-002 — Outbound publication is idempotent
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#OutboundJobV1
- Test: testing/conformance/outbound.ts#MAX-OUT-002.idempotent-enqueue

Statement:
Publishing the same outbound idempotency key MUST create at most one active or terminal job identity.

Rationale:
Repeated application execution must not multiply equivalent outbound work.

Verification:
Publish the same idempotency key twice and assert one job and one job ID.

### MAX-OUT-003 — Job claim and completion are lease-fenced
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#OutboundLeaseV1
- Test: testing/conformance/outbound.ts#MAX-OUT-003.lease-fencing

Statement:
Only the current outbound lease owner MUST be allowed to renew, complete, retry, or dead-letter a claimed job.

Rationale:
A stale worker must not overwrite the decision of the current worker.

Verification:
Transfer or expire a lease and assert that the former owner cannot perform a terminal transition.

### MAX-OUT-004 — Retryable errors schedule the same job
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#OutboundJobV1
- Test: testing/conformance/outbound.ts#MAX-OUT-004.retry-same-job

Statement:
A retryable transport failure MUST reschedule the same outbound job ID with an incremented attempt.

Rationale:
Creating a replacement job breaks idempotency and audit continuity.

Verification:
Force a retryable send failure and assert stable job ID, incremented attempt, and future availability.

### MAX-OUT-005 — Permanent errors move the job to dead letter
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#DeadLetterRecordV1
- Test: testing/conformance/outbound.ts#MAX-OUT-005.permanent-dead-letter

Statement:
A permanent outbound transport error MUST move the affected job to dead letter without retrying it.

Rationale:
Authentication and contract errors require operator action rather than repeated traffic.

Verification:
Return a permanent error and assert one dead-letter record and no scheduled retry.

### MAX-OUT-006 — Attempt 8 moves the job to dead letter
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#OutboundJobV1
- Test: testing/conformance/outbound.ts#MAX-OUT-006.attempt-eight-dead-letter

Statement:
The eighth failed outbound attempt MUST move the job to dead letter instead of scheduling attempt nine.

Rationale:
A bounded attempt count prevents immortal poison jobs.

Verification:
Fail the same job eight times and assert a dead-letter transition with attempt equal to 8.

### MAX-OUT-007 — Successful server response is accepted_by_max
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#AcceptanceReceiptV1
- Test: testing/conformance/outbound.ts#MAX-OUT-007.accepted-by-max

Statement:
A successful MAX response containing a message identifier MUST be recorded as accepted_by_max and MUST NOT be labeled delivered or read.

Rationale:
The available protocol evidence proves server acceptance only.

Verification:
Return a valid server message ID and assert the accepted receipt and canonical event name.

### MAX-OUT-008 — Acceptance receipts contain no message payload
- Status: PROVEN
- Level: MUST
- Contract: contracts/outbound.ts#AcceptanceReceiptV1
- Test: testing/conformance/outbound.ts#MAX-OUT-008.receipt-redaction

Statement:
Acceptance receipts MUST NOT store message text, attachments, tokens, contact data, or raw MAX responses.

Rationale:
Receipts are operational evidence, not a secondary personal-data archive.

Verification:
Serialize a receipt and assert that only version, job ID, message ID, chat ID, and acceptance time are present.

### MAX-REL-001 — Transient MAX errors use bounded exponential backoff
- Status: PROVEN
- Level: MUST
- Contract: contracts/errors.ts#RuntimeErrorV1
- Test: testing/conformance/polling.ts#MAX-REL-001.exponential-backoff

Statement:
Retryable polling failures MUST use the canonical bounded sequence 1s, 2s, 4s, 8s, then 10s plus 0–499ms jitter.

Rationale:
Backoff protects MAX and the runtime while preserving automatic recovery.

Verification:
Inject deterministic jitter and assert the canonical delay sequence and 10-second cap.

### MAX-REL-002 — Retry-After is honored within a 15-minute cap
- Status: PROVEN
- Level: MUST
- Contract: contracts/errors.ts#RuntimeErrorV1
- Test: testing/conformance/outbound.ts#MAX-REL-002.retry-after

Statement:
When MAX provides Retry-After, the runtime MUST use the greater of computed backoff and Retry-After, capped at 15 minutes.

Rationale:
Server throttling guidance must be respected without accepting pathological delays.

Verification:
Return HTTP 429 with controlled Retry-After values and assert minimum selection and maximum cap.

### MAX-REL-003 — Redis loss pauses new polls and claims
- Status: PROVEN
- Level: MUST
- Contract: contracts/health.ts#RuntimeHealthV1
- Test: testing/conformance/polling.ts#MAX-REL-003.redis-loss-pauses-work

Statement:
When the state store is unavailable, the runtime MUST pause new polling batches and outbound claims.

Rationale:
Processing without durable marker, leases, or deduplication state is unsafe.

Verification:
Disconnect the state store and assert no new poll or claim until recovery.

### MAX-REL-004 — Serialized state has an explicit version
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#SerializedStateV1
- Test: testing/conformance/polling.ts#MAX-REL-004.unknown-state-version

Statement:
Every serialized runtime state object MUST contain an explicit major version and unknown major versions MUST be rejected.

Rationale:
Silent interpretation of incompatible state can corrupt recovery behavior.

Verification:
Load an unknown state version and assert an operator-facing permanent failure before polling.

### MAX-REL-005 — Critical Redis transitions are atomic
- Status: PROVEN
- Level: MUST
- Contract: schemas/redis-keys.md#atomic-transitions
- Test: testing/conformance/outbound.ts#MAX-REL-005.atomic-terminal-transition

Statement:
Ownership, inbound leases, outbound publication, claims, retries, accepted completion, and dead-letter transitions MUST be atomic.

Rationale:
Multi-command races can lose jobs or allow stale workers to win.

Verification:
Run competing workers against each transition and assert one valid winner and consistent state.

### MAX-OBS-001 — Runtime logs are structured JSON events
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeLogRecordV1
- Test: testing/conformance/architecture.ts#MAX-OBS-001.structured-events

Statement:
Runtime operational logs MUST be structured records with stable component and event fields.

Rationale:
Machines and operators need reliable diagnostics without parsing prose.

Verification:
Capture runtime logs and validate their required fields and JSON-serializable shape.

### MAX-OBS-002 — Event names are stable within a major version
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeLogRecordV1
- Test: testing/conformance/architecture.ts#MAX-OBS-002.stable-event-catalog

Statement:
Published runtime event names MUST remain stable within a major standard version.

Rationale:
Dashboards, alerts, and incident procedures depend on event-name stability.

Verification:
Compare emitted event names with the versioned catalog and reject unknown renames.

### MAX-OBS-003 — Secrets and message bodies never enter runtime logs
- Status: PROVEN
- Level: MUST NOT
- Contract: docs/observability/sensitive-data.md#prohibited-fields
- Test: testing/conformance/architecture.ts#MAX-OBS-003.secret-redaction

Statement:
Runtime logs MUST NOT contain tokens, credential URLs, message bodies, raw updates, contact data, phone numbers, email addresses, or personal names.

Rationale:
Operational telemetry must not become a sensitive-data leak.

Verification:
Feed sentinel secrets and personal data through failures and assert that no captured log contains them.

### MAX-OBS-004 — Health distinguishes operational recovery states
- Status: PROVEN
- Level: MUST
- Contract: contracts/health.ts#RuntimeHealthV1
- Test: testing/conformance/polling.ts#MAX-OBS-004.health-recovery

Statement:
Runtime health MUST distinguish healthy, degraded, recovering, unhealthy, stopping, and stopped states.

Rationale:
A single boolean cannot express whether automatic recovery is in progress or operator action is required.

Verification:
Drive connection loss, recovery, permanent failure, and shutdown and assert the expected transitions.

### MAX-OBS-005 — Minimum counters gauges and histograms are defined
- Status: PROVEN
- Level: MUST
- Contract: docs/observability/metrics.md#minimum-metrics
- Test: testing/conformance/architecture.ts#MAX-OBS-005.minimum-metrics

Statement:
An Operational implementation MUST expose the standard minimum transport, inbound, outbound, state-store, queue, and latency metrics.

Rationale:
Comparable metrics are required for release evidence and incident diagnosis.

Verification:
Inspect the metrics port after representative operations and assert every required metric name is present.

### MAX-SEC-001 — TLS certificate verification remains enabled
- Status: PROVEN
- Level: MUST
- Contract: docs/operations/deployment.md#tls
- Test: testing/conformance/architecture.ts#MAX-SEC-001.tls-verification

Statement:
Runtime configuration MUST keep TLS certificate verification enabled and MUST reject insecure bypass settings.

Rationale:
Disabling verification converts transport security into decorative paint.

Verification:
Validate configuration containing known TLS bypass settings and assert startup rejection.

### MAX-SEC-002 — Runtime identity is stable and contains no secrets
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#RuntimeIdentityV1
- Test: testing/conformance/polling.ts#MAX-SEC-002.stable-runtime-identity

Statement:
The runtime identity MUST remain stable across restarts and MUST NOT contain bot tokens or personal data.

Rationale:
State namespaces and ownership depend on a durable safe identifier.

Verification:
Restart with the same configured identity and inspect persisted keys for forbidden values.

### MAX-SEC-003 — Stored runtime identity prevents marker reuse by another bot
- Status: PROVEN
- Level: MUST
- Contract: contracts/state.ts#RuntimeIdentityV1
- Test: testing/conformance/polling.ts#MAX-SEC-003.identity-conflict

Statement:
A resolved bot identity or token fingerprint conflict under an existing runtime ID MUST stop startup before marker reuse.

Rationale:
A new bot must not inherit another bot's polling journal.

Verification:
Store one identity, start with a different bot identity, and assert a permanent conflict before polling.

### MAX-OPS-001 — Invalid configuration fails before polling
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeConfigV1
- Test: testing/conformance/shutdown.ts#MAX-OPS-001.invalid-config-before-poll

Statement:
Missing, invalid, or incompatible required configuration MUST terminate startup before the first poll.

Rationale:
Retries cannot repair operator configuration errors.

Verification:
Start with each invalid required field and assert no transport poll request.

### MAX-OPS-002 — SIGTERM and SIGINT trigger graceful shutdown
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeLifecycle
- Test: testing/conformance/shutdown.ts#MAX-OPS-002.graceful-shutdown

Statement:
The runtime MUST handle SIGTERM, SIGINT, and AbortSignal as graceful-shutdown requests.

Rationale:
Containers and operators require predictable termination behavior.

Verification:
Trigger each signal path and assert the canonical shutdown sequence.

### MAX-OPS-003 — New polls and claims stop before active work drains
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeLifecycle
- Test: testing/conformance/shutdown.ts#MAX-OPS-003.no-new-work-during-shutdown

Statement:
Shutdown MUST stop new polling requests and outbound claims before waiting for active work to finish or release.

Rationale:
Accepting new work while draining can prevent termination indefinitely.

Verification:
Begin shutdown with active work and assert no additional poll or claim occurs.

### MAX-OPS-004 — Shutdown timeout is 30 seconds
- Status: PROVEN
- Level: MUST
- Contract: contracts/runtime.ts#RuntimeConfigV1
- Test: testing/conformance/shutdown.ts#MAX-OPS-004.shutdown-timeout

Statement:
The canonical graceful-shutdown timeout MUST be 30 seconds and timeout MUST produce a non-zero process result.

Rationale:
A bounded drain protects deployment and restart procedures from hanging forever.

Verification:
Use a manual clock with non-finishing work and assert timeout at 30 seconds and shutdown.timeout logging.

### MAX-OPS-005 — Production implementations publish MAX-CONFORMANCE.md
- Status: PROVEN
- Level: MUST
- Contract: testing/checklists/MAX-CONFORMANCE.template.md
- Test: testing/conformance/architecture.ts#MAX-OPS-005.conformance-passport

Statement:
Every production implementation MUST publish a MAX-CONFORMANCE.md passport containing version, level, evidence date, commit SHA, commands, exceptions, and limitations.

Rationale:
A release claim needs inspectable evidence rather than oral tradition.

Verification:
Validate the project passport against the required headings and non-empty evidence fields.

### MAX-TEST-001 — Unit tests cover pure reliability rules
- Status: PROVEN
- Level: MUST
- Contract: testing/checklists/release.md#unit-tests
- Test: testing/conformance/architecture.ts#MAX-TEST-001.unit-evidence

Statement:
Implementations MUST unit-test normalization, event IDs, error classification, backoff, health transitions, configuration validation, and redaction.

Rationale:
Pure rules are fastest and clearest to verify in isolation.

Verification:
Inspect release evidence and require passing focused unit-test commands for every listed rule family.

### MAX-TEST-002 — Redis integration tests cover atomic state transitions
- Status: PROVEN
- Level: MUST
- Contract: testing/checklists/release.md#redis-integration
- Test: testing/conformance/outbound.ts#MAX-TEST-002.redis-integration-evidence

Statement:
Implementations MUST test polling ownership, inbound leases, queue publication, claims, fencing, retries, receipts, dead letter, and lease recovery against Redis 7.

Rationale:
Mock-only tests cannot prove Redis atomicity or expiry semantics.

Verification:
Run the dedicated Redis fixture suite and require zero skipped critical transition tests.

### MAX-TEST-003 — Portable conformance tests use public implementation ports
- Status: PROVEN
- Level: MUST
- Contract: testing/conformance/types.ts#RuntimeConformanceDriver
- Test: testing/conformance/architecture.ts#MAX-TEST-003.public-port-conformance

Statement:
The platform conformance suite MUST exercise implementations through public driver ports rather than private files or storage internals.

Rationale:
Behavioral portability depends on testing the contract instead of one implementation layout.

Verification:
Run the same suite against the reference driver and at least one implementation adapter without suite changes.

### MAX-TEST-004 — Operational Level requires network and process recovery smoke
- Status: PROVEN
- Level: MUST
- Contract: docs/operations/transport-smoke.md#procedure
- Test: testing/conformance/polling.ts#MAX-TEST-004.recovery-evidence

Statement:
Operational Level implementations MUST pass MAX network loss, Redis loss, process restart, duplicate replay, and ownership-conflict recovery smoke.

Rationale:
The standard exists to survive real failure modes, not only unit-test weather.

Verification:
Execute the runbook and attach structured log excerpts and commands to the conformance passport.

### MAX-TEST-005 — Release evidence names commands date version and commit SHA
- Status: PROVEN
- Level: MUST
- Contract: testing/checklists/MAX-CONFORMANCE.template.md
- Test: testing/conformance/architecture.ts#MAX-TEST-005.evidence-fields

Statement:
Release evidence MUST record exact commands, results, verification date, standard version, and verified commit SHA.

Rationale:
Evidence without a reproducible source revision cannot support a release claim.

Verification:
Validate the conformance passport and reject missing or placeholder evidence fields.
