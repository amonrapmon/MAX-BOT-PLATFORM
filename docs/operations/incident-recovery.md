# Incident Recovery

## Purpose

Provide decision branches for the transport and state failures defined by the standard.

## Normative references

`MAX-REL-*`, `MAX-OBS-*`, `MAX-OPS-*`, and `schemas/redis-keys.md`.

## Permanent token or configuration error

**Signals:** `polling.permanent_failure`, HTTP 400/401/403, exit code 2 or 3.

1. Stop the restart loop.
2. Verify secret source, API base URL, CA path, and allowed update types without printing secret values.
3. Resolve bot identity using the corrected configuration.
4. Restart once and require normal identity and ownership events.
5. Do not clear marker or deduplication state for a credential-only correction.

## Polling owner conflict

**Signals:** `polling.owner_conflict`, exit code 6, two deployments using one runtime identity.

1. Identify all processes using the token and `runtimeId`.
2. Stop the unintended owner.
3. Wait for the 30-second owner TTL or perform a fenced release using the stored `ownerId`.
4. Start one owner and verify renewal every 10 seconds.
5. Never delete the owner key without confirming the previous process is stopped.

## Redis unavailable

**Signals:** `state_store.connection_lost`, health degraded/down, polls and claims paused.

1. Preserve the runtime process if it is in bounded recovery.
2. Restore network, credentials, primary role, or Redis service.
3. Require `state_store.connection_restored`.
4. Verify owner, marker, inbound state, and queued jobs before resuming traffic.
5. Do not switch to process memory as an emergency fallback.

## Invalid serialized state

**Signals:** `state_store.invalid_data`, exit code 4, unknown `version`.

1. Stop the affected runtime.
2. Copy the exact key and value into a protected incident artifact.
3. Identify the producer version and expected contract.
4. Apply an explicit migration or restore a known compatible backup.
5. Restart and verify the key through the relevant schema or contract.
6. Never silently delete marker, identity, or terminal job state.

## Outbound dead letter

**Signals:** `outbound.dead_lettered`, growing `outbound.dead` gauge.

1. Inspect `reasonCode`, attempt, timestamps, and safe identifiers.
2. Fix permanent request/configuration defects before replay.
3. Generate a new operator-approved replay record while retaining the original dead-letter evidence.
4. Reuse the original business idempotency intent and document whether a new transport `jobId` is required.
5. Verify one terminal result and no message payload in the receipt.

## Duplicate-send suspicion after worker crash

**Signals:** MAX may have accepted a send, but no local receipt exists because the worker crashed in the acceptance-persistence window.

1. Do not claim that the message was not sent.
2. Correlate `jobId`, transport request time, safe chat hash, and MAX message history when available.
3. Pause automatic replay for the affected job.
4. Decide manually whether duplicate risk or missed-message risk is safer for the product.
5. Record the decision and evidence in the incident report.
6. Add a regression or operational guard when the failure reveals a new pattern.

## Verification

After recovery, run the focused conformance scenario and the relevant section of `transport-smoke.md`. Attach commands, logs, date, and commit SHA.

## Non-goals

This runbook does not authorize deletion of transport state, disclosure of secrets, or invention of downstream delivery guarantees.
