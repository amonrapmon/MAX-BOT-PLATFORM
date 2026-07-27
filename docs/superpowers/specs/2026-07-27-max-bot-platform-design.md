# MAX Bot Platform v1: Design Specification

**Status:** Approved design draft for repository bootstrap  
**Date:** 2026-07-27  
**Target repository:** `amonrapmon/MAX-BOT-PLATFORM`  
**Initial standard version:** `1.0.0`  
**Canonical transport in v1:** MAX long polling  
**Canonical state store in v1:** Redis 7  
**Reference language:** TypeScript 5.8+ on Node.js 20+

## 1. Purpose

`MAX-BOT-PLATFORM` is the single normative source of truth for building reliable bots for the MAX messenger.

The platform is a **headless bot body**. It provides transport, lifecycle, resilience, state management, observability, testing, and operational contracts. A project supplies only the application head: commands, scenarios, texts, buttons, business APIs, and product-specific state.

The platform MUST make it possible to attach a new application head without redesigning:

- polling and polling ownership;
- update normalization and stable event identification;
- polling marker persistence;
- inbound duplicate suppression;
- processing leases;
- outbound queues and leases;
- retry classification, backoff, and `Retry-After` handling;
- rate limiting;
- acceptance receipts;
- dead-letter handling;
- health transitions;
- structured logging and secret redaction;
- graceful shutdown and restart recovery;
- conformance and recovery testing.

The platform MUST NOT define or depend on:

- project-specific commands;
- message copy or buttons;
- DIKIDI, CRM, reporting, booking, pricing, or other business integrations;
- product roles and permissions;
- project database schemas;
- project-specific state machines.

## 2. Design principles

### 2.1 Body and head boundary

The runtime body owns all transport and reliability concerns. The application head owns business behavior.

```text
┌──────────────────────────────┐
│       Application head       │
│ commands · scenarios · copy  │
│ buttons · FSM · business API │
└──────────────┬───────────────┘
               │ stable application port
┌──────────────▼───────────────┐
│       MAX Bot Runtime        │
│ transport · dedup · marker   │
│ retry · queue · receipts     │
│ health · logs · shutdown     │
└──────────────┬───────────────┘
               │
             MAX API
```

The application MUST NOT access SDK types, polling markers, transport leases, Redis transport keys, transport retries, or MAX API clients directly.

### 2.2 Proven behavior only

Stable normative requirements MUST be based on behavior that has been implemented and tested in existing projects.

Unverified mechanisms MUST remain `EXPERIMENTAL` and MUST NOT become stable `MUST` requirements.

Webhook transport is outside v1. It MAY be introduced later only after dedicated tests, real operation, documented failures, and a recovery runbook.

### 2.3 Behavioral contracts over internal layout

The standard defines observable behavior and component boundaries. It MUST NOT require one permanent internal file structure or one particular Lua script when alternative implementations pass the same conformance tests.

### 2.4 Honest delivery semantics

MAX server acceptance is not delivery and not reading.

The platform MUST use `accepted_by_max` for a successful server response containing a message identifier. It MUST NOT label this state `delivered` or `read`.

### 2.5 No magical exactly-once claim

The runtime does not promise that an update is received exactly once.

The required contract is:

> An update may be received multiple times, but completed business processing for the same stable event MUST execute no more than once within the configured deduplication window.

## 3. Repository role and scope

The first platform version consists of three layers:

```text
Normative standard
        ↓
Reference contracts and schemas
        ↓
Conformance tests and operational runbooks
```

A shared npm runtime is explicitly outside the first implementation phase. The standard and contracts must stabilize before packages such as the following are considered:

```text
@max-bot-platform/runtime
@max-bot-platform/testing
create-max-bot
```

## 4. Repository structure

```text
MAX-BOT-PLATFORM/
├── README.md
├── STANDARD.md
├── CHANGELOG.md
├── VERSION
│
├── docs/
│   ├── architecture/
│   │   ├── boundaries.md
│   │   ├── runtime-overview.md
│   │   ├── lifecycle.md
│   │   └── data-flow.md
│   ├── transport/
│   │   ├── long-polling.md
│   │   ├── event-normalization.md
│   │   ├── marker-management.md
│   │   └── connection-recovery.md
│   ├── reliability/
│   │   ├── idempotency.md
│   │   ├── error-classification.md
│   │   ├── retries.md
│   │   ├── outbound-queue.md
│   │   └── dead-letter.md
│   ├── observability/
│   │   ├── logging.md
│   │   ├── health.md
│   │   ├── metrics.md
│   │   └── sensitive-data.md
│   ├── operations/
│   │   ├── local-development.md
│   │   ├── deployment.md
│   │   ├── transport-smoke.md
│   │   └── incident-recovery.md
│   ├── experimental/
│   ├── adr/
│   └── superpowers/specs/
│
├── contracts/
│   ├── events.ts
│   ├── transport.ts
│   ├── runtime.ts
│   ├── outbound.ts
│   ├── health.ts
│   └── errors.ts
│
├── schemas/
│   ├── redis-keys.md
│   ├── event-envelope.schema.json
│   ├── outbound-job.schema.json
│   └── health-snapshot.schema.json
│
├── testing/
│   ├── conformance/
│   ├── fixtures/
│   ├── chaos/
│   └── checklists/
│
├── examples/
│   ├── minimal-head/
│   ├── polling-runtime/
│   └── docker-compose/
│
└── references/
    ├── implementation-matrix.md
    ├── source-projects.md
    └── audits/
```

`STANDARD.md` is the primary normative document. Existing project implementations are evidence and references, not authority.

Conflict priority:

```text
STANDARD.md
→ normative contracts
→ conformance tests
→ accepted ADRs
→ explanatory documentation
→ existing implementations
```

## 5. Normative language and requirement model

The standard uses the terms `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY`.

- **MUST / MUST NOT:** mandatory for conformance.
- **SHOULD / SHOULD NOT:** expected path; deviation requires a project ADR.
- **MAY:** optional compatible behavior.

Every normative requirement MUST contain:

- a stable requirement ID;
- maturity status;
- normative level;
- statement;
- rationale;
- verification method;
- related contract;
- related conformance test.

Requirement categories:

| Prefix | Area |
|---|---|
| `MAX-ARCH-*` | Architecture and boundaries |
| `MAX-IN-*` | Inbound transport and polling |
| `MAX-OUT-*` | Outbound processing |
| `MAX-REL-*` | Reliability and idempotency |
| `MAX-OBS-*` | Logging, metrics, and health |
| `MAX-SEC-*` | Secrets and sensitive data |
| `MAX-OPS-*` | Startup, shutdown, and operation |
| `MAX-TEST-*` | Mandatory verification |

Requirement IDs MUST NOT be reused after removal.

### 5.1 Requirement maturity

- `PROVEN`: implemented, tested, and exercised through recovery verification or operation.
- `EXPERIMENTAL`: not part of stable conformance.
- `DEPRECATED`: still recognized for older versions but not recommended.
- `REMOVED`: no longer valid; ID remains reserved.

Only `PROVEN` requirements MAY become stable `MUST` rules.

### 5.2 Conformance levels

#### Level 1: Architecture

- transport is separate from application logic;
- SDK types do not escape the adapter;
- events are normalized;
- the application cannot control polling;
- direct MAX sends from application code are prohibited.

#### Level 2: Reliable

Includes Level 1 plus:

- durable polling marker;
- polling ownership;
- inbound duplicate suppression;
- retry classification and backoff;
- durable outbound queue;
- leasing and fencing;
- dead letter;
- process restart recovery;
- health transitions.

#### Level 3: Operational

Includes Level 2 plus:

- chaos and recovery tests;
- MAX API disconnect/reconnect;
- Redis restart and reconnect;
- process restart;
- duplicate replay;
- release checklist;
- incident runbook;
- secret-log scanning.

A new production bot MUST meet Level 3.

Every implementation MUST include `MAX-CONFORMANCE.md` with the standard version, level, implementation type, transport, state store, verification date, exceptions, evidence, and verified commit SHA.

## 6. Canonical runtime architecture

```text
Transport Adapter
      │
      ▼
Polling Supervisor
      │
      ▼
Inbound Processor
      │
      ▼
Application Port
      │
      ▼
Outbound Queue
      │
      ▼
Sender Worker
```

Shared infrastructure:

```text
State Store · Logger · Metrics · Health · Clock
```

### 6.1 Transport adapter

The adapter is the only component that knows a concrete MAX SDK.

```ts
export interface MaxTransportAdapter {
  getBotIdentity(): Promise<BotIdentity>;
  getUpdates(request: PollingRequest): Promise<PollingBatch>;
  markSeen(input: MarkSeenRequest): Promise<void>;
  acknowledgeCallback(input: CallbackAckRequest): Promise<void>;
  send(input: TransportSendRequest): Promise<TransportSendResult>;
  stop(): Promise<void>;
}
```

The adapter:

- MUST keep SDK types inside the adapter boundary;
- MUST normalize SDK responses and errors;
- MUST NOT execute application scenarios;
- MUST NOT decide when a marker is committed;
- MUST NOT own durable retry policy.

v1 contains one fully supported long-polling adapter. A generic adapter seam is retained for future transports.

### 6.2 Polling supervisor

```ts
export interface PollingSupervisor {
  start(signal: AbortSignal): Promise<void>;
}
```

The supervisor owns:

- polling ownership acquisition and renewal;
- marker restoration before the first poll;
- batch retrieval;
- batch delivery to the inbound processor;
- marker commit after complete batch success;
- retry classification, backoff, jitter, and `Retry-After`;
- health transitions;
- connection restoration;
- abort-aware shutdown.

The supervisor MUST NOT interpret message text, commands, callbacks as business actions, or project-specific state.

### 6.3 Inbound processor

Required processing order:

```text
raw update
→ normalize
→ derive stable eventId
→ acquire processing lease
→ suppress completed duplicate
→ execute best-effort protocol actions
→ call application
→ mark completed
→ release lease
```

Best-effort protocol actions include `mark_seen`, callback acknowledgement where applicable, and lifecycle logging. Failure of a best-effort protocol action MUST be logged but MUST NOT fail business processing unless a specific protocol contract requires it.

The event MUST NOT be marked completed when the application fails.

### 6.4 Application port

```ts
export interface BotApplication {
  handle(event: BotEvent, context: BotContext): Promise<ApplicationResult>;
}

export interface BotContext {
  send(message: OutboundMessage): Promise<EnqueueReceipt>;
}
```

The application receives normalized events and MAY enqueue outbound messages.

The application MUST NOT:

- access the MAX SDK directly;
- read or write transport Redis keys;
- manage polling markers or ownership;
- implement transport retries;
- create transport acceptance receipts;
- bypass the outbound queue.

`context.send()` means that the local durable queue accepted the message. It does not mean MAX accepted, delivered, or displayed it.

### 6.5 Outbound queue

```ts
export interface OutboundJobV1 {
  version: 1;
  jobId: string;
  idempotencyKey: string;
  chatId: string;
  payload: OutboundMessage;
  priority: number;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  availableAt: string;
}
```

The queue MUST provide:

- durable storage;
- idempotent publication;
- atomic claim;
- leases;
- owner fencing;
- retry scheduling;
- accepted completion;
- dead-letter transition;
- restart recovery.

A job MUST NOT disappear before accepted completion or dead-letter transition.

### 6.6 Sender worker

```text
claim job
→ apply rate limits
→ send through adapter
→ inspect normalized result
→ accepted_by_max
```

On failure:

```text
classify
→ permanent: dead_lettered
→ retryable: retry_scheduled
→ attempts exhausted: dead_lettered
```

```ts
export interface AcceptanceReceiptV1 {
  version: 1;
  jobId: string;
  messageId: string;
  chatId: string;
  acceptedAt: string;
}
```

### 6.7 Canonical lifecycle

```text
1. load and validate configuration
2. validate TLS prerequisites
3. connect state store
4. inspect stored runtime identity
5. resolve MAX bot identity
6. compare identity and token fingerprint
7. acquire polling ownership
8. restore polling marker
9. initialize health
10. start sender worker
11. start polling supervisor
12. process until shutdown
13. stop new polls and claims
14. finish or safely release active work
15. release polling ownership
16. close transport and state store
17. publish stopped state
```

Permanent configuration and authentication failures MUST terminate the process instead of entering an infinite retry loop.

## 7. Normalized event contract

```ts
export interface BotEventV1 {
  version: 1;
  eventId: string;
  type: "message" | "callback" | "bot_started" | "bot_stopped" | "dialog_removed";
  chatId: string;
  userId?: string;
  messageId?: string;
  text?: string;
  callbackData?: string;
  occurredAt: string;
}
```

The concrete stable event-ID derivation MUST be documented per supported update type and covered by deterministic tests.

Raw MAX updates MUST NOT be passed into application code or written to normal runtime logs.

## 8. Redis state contracts

All keys use the namespace:

```text
maxbot:{runtimeId}:...
```

`runtimeId` MUST be stable, unique within a shared Redis deployment, and free of tokens or personal data.

### 8.1 Polling marker

```text
maxbot:{runtimeId}:transport:marker
```

```ts
export interface PollingMarkerV1 {
  version: 1;
  marker: string;
  committedAt: string;
}
```

Rules:

- no TTL;
- restored before first poll;
- treated as opaque;
- committed only after every update in the batch completes successfully;
- invalid data blocks safe startup rather than being silently discarded.

### 8.2 Transport health

```text
maxbot:{runtimeId}:transport:health
```

Recommended TTL: 24 hours after the last update.

Health is diagnostic state, not a lock.

### 8.3 Polling ownership

```text
maxbot:{runtimeId}:transport:owner
```

```ts
export interface PollingOwnerV1 {
  version: 1;
  ownerId: string;
  acquiredAt: string;
  renewedAt: string;
}
```

Canonical v1 settings:

- owner TTL: 30 seconds;
- renewal interval: 10 seconds.

Acquisition, renewal, and release MUST be atomic and fenced by `ownerId`. Loss of ownership MUST stop polling.

### 8.4 Inbound deduplication

```text
maxbot:{runtimeId}:inbound:{sha256(eventId)}
```

```ts
export type InboundEventStateV1 =
  | {
      version: 1;
      status: "processing";
      ownerId: string;
      startedAt: string;
    }
  | {
      version: 1;
      status: "completed";
      completedAt: string;
    };
```

Canonical TTLs:

- processing lease: 120 seconds;
- completed marker: 48 hours.

### 8.5 Outbound state

```text
maxbot:{runtimeId}:outbound:job:{jobId}
maxbot:{runtimeId}:outbound:ready
maxbot:{runtimeId}:outbound:scheduled
maxbot:{runtimeId}:outbound:leased
maxbot:{runtimeId}:outbound:receipt:{jobId}
maxbot:{runtimeId}:outbound:dead
maxbot:{runtimeId}:outbound:dead:job:{jobId}
```

Acceptance receipt TTL: 7 days.

Receipt records MUST NOT contain message text, attachments, tokens, phone numbers, or raw MAX responses.

### 8.6 Atomic operations

The following transitions MUST execute as one atomic operation, transaction, or Lua script:

- acquire, renew, and release polling ownership;
- acquire inbound processing lease;
- mark inbound completed;
- idempotent outbound publication;
- claim outbound job;
- renew outbound lease;
- accepted completion;
- retry scheduling;
- dead-letter transition.

Multiple unrelated Redis commands without transactional protection do not conform.

### 8.7 State versioning

Every serialized structure MUST contain a `version` field.

The runtime MUST reject unknown major versions and MUST NOT silently reinterpret unknown data.

## 9. Error and retry model

```ts
export interface RuntimeErrorV1 {
  version: 1;
  source:
    | "max_api"
    | "state_store"
    | "polling"
    | "inbound"
    | "outbound"
    | "configuration"
    | "application";
  kind: "retryable" | "permanent" | "ownership_lost" | "shutdown";
  code: string;
  message: string;
  status?: number;
  retryAfterMs?: number;
  causeName?: string;
}
```

Raw SDK exceptions MUST be normalized before entering the runtime core.

### 9.1 Retryable MAX failures

- network timeout;
- connection reset;
- DNS failure;
- `fetch failed`;
- non-shutdown `AbortError`;
- HTTP 408;
- HTTP 429;
- HTTP 500–599.

### 9.2 Permanent MAX failures

- HTTP 400;
- HTTP 401;
- HTTP 403;
- invalid token;
- invalid request contract;
- successful-looking response without mandatory protocol fields.

A permanent polling error terminates the runtime. A permanent outbound job error moves only that job to dead letter.

### 9.3 Redis failure behavior

When Redis is unavailable:

- polling MUST stop requesting new batches;
- sender workers MUST stop claiming jobs;
- runtime MUST become `degraded` or `recovering`;
- processing MUST NOT continue without the ability to preserve marker and deduplication state.

Invalid serialized state or an unknown version is a permanent operator-facing failure.

### 9.4 Application failures

When application handling fails:

- the inbound event MUST NOT become completed;
- the batch marker MUST NOT advance;
- replay is expected;
- already completed events in the replayed batch MUST be skipped.

The application remains responsible for idempotency of its own external business changes.

### 9.5 Canonical polling backoff

```text
1s → 2s → 4s → 8s → 10s → 10s...
```

Jitter: 0–499 ms.

The backoff function MUST accept an injectable jitter source for deterministic tests.

A successful poll resets consecutive error count. Restoration produces one `polling.connection_restored` event.

### 9.6 Outbound attempts

Canonical maximum: 8 attempts.

The same `jobId` MUST be retained across retries. Attempt exhaustion moves the job to dead letter.

When `Retry-After` exists:

```ts
actualDelayMs = Math.max(computedBackoffMs, retryAfterMs);
```

Canonical upper limit for accepted `Retry-After`: 15 minutes.

## 10. Observability

All runtime logs MUST be structured JSON.

```ts
export interface RuntimeLogEventV1 {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  component:
    | "bootstrap"
    | "polling"
    | "inbound"
    | "outbound"
    | "state_store"
    | "transport"
    | "shutdown";
  event: string;
  runtimeId: string;
  eventId?: string;
  eventHash?: string;
  jobId?: string;
  messageId?: string;
  chatIdHash?: string;
  attempt?: number;
  durationMs?: number;
  errorCode?: string;
  status?: number;
}
```

Automation MUST use stable `event` values rather than parsing free-form messages.

### 10.1 Required event catalog

```text
runtime.starting
runtime.identity_resolved
runtime.started
runtime.stopping
runtime.stopped

polling.owner_acquired
polling.owner_conflict
polling.started
polling.batch_received
polling.batch_completed
polling.marker_restored
polling.marker_committed
polling.retry_scheduled
polling.connection_lost
polling.connection_restored
polling.permanent_failure

inbound.processing_started
inbound.duplicate_skipped
inbound.lease_conflict
inbound.completed
inbound.failed

outbound.enqueued
outbound.duplicate_enqueue_skipped
outbound.claimed
outbound.sending
outbound.accepted_by_max
outbound.retry_scheduled
outbound.dead_lettered
outbound.lease_lost

state_store.connection_lost
state_store.connection_restored
state_store.invalid_data

shutdown.signal_received
shutdown.timeout
```

Event names MUST remain stable within a major standard version.

### 10.2 Sensitive-data policy

Runtime logs MUST NOT contain:

- MAX tokens or API keys;
- Redis URLs containing passwords;
- message text;
- complete callback payloads;
- contact cards;
- phone numbers or email addresses;
- personal names;
- raw updates;
- complete MAX response bodies.

Allowed diagnostic identifiers include `jobId`, `eventHash`, `messageId`, `runtimeId`, HTTP status, error code, attempt number, durations, and salted hashes of chat or user IDs.

### 10.3 Health model

```ts
export interface RuntimeHealthV1 {
  version: 1;
  status:
    | "starting"
    | "healthy"
    | "degraded"
    | "recovering"
    | "unhealthy"
    | "stopping"
    | "stopped";
  polling: ComponentHealthV1;
  stateStore: ComponentHealthV1;
  outbound: ComponentHealthV1;
  updatedAt: string;
}

export interface ComponentHealthV1 {
  status: "up" | "degraded" | "down";
  lastSuccessAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  errorCode?: string;
}
```

### 10.4 Minimum metrics

Counters:

```text
polling_batches_total
polling_updates_total
polling_errors_total
polling_recoveries_total
inbound_processed_total
inbound_duplicates_total
inbound_failures_total
inbound_lease_conflicts_total
outbound_enqueued_total
outbound_accepted_total
outbound_retries_total
outbound_dead_lettered_total
outbound_lease_losses_total
state_store_errors_total
```

Gauges:

```text
outbound_ready_jobs
outbound_scheduled_jobs
outbound_leased_jobs
outbound_dead_jobs
polling_consecutive_errors
```

Histograms:

```text
polling_request_duration_ms
inbound_processing_duration_ms
outbound_send_duration_ms
outbound_queue_wait_ms
```

The standard does not mandate one exporter.

## 11. Configuration, identity, and secrets

The application head MUST NOT read transport environment variables directly.

```ts
export interface RuntimeConfigV1 {
  version: 1;
  runtimeId: string;
  max: {
    token: string;
    apiBaseUrl: string;
    pollingTimeoutSeconds: number;
    allowedUpdateTypes: string[];
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  polling: {
    ownerTtlMs: number;
    ownerRenewIntervalMs: number;
    retryMaxDelayMs: number;
  };
  inbound: {
    processingLeaseTtlMs: number;
    completedTtlMs: number;
  };
  outbound: {
    maxAttempts: number;
    receiptTtlMs: number;
    workerConcurrency: number;
  };
}
```

Minimum environment variables:

```text
MAX_BOT_TOKEN
MAX_API_BASE_URL
MAX_RUNTIME_ID
REDIS_URL
```

`runtimeId` MUST be stable across restarts, unique within the Redis namespace, and free of secrets or personal data.

Secrets MUST come from environment variables or a secret manager and MUST NOT be committed, logged, exposed through health, or placed as values in `.env.example`.

### 11.1 TLS

TLS certificate verification MUST remain enabled.

The following are prohibited:

```text
NODE_TLS_REJECT_UNAUTHORIZED=0
rejectUnauthorized=false
```

Additional CA bundles MAY be mounted read-only and used through:

```text
NODE_EXTRA_CA_CERTS=/app/certs/trusted-ca-bundle.pem
```

### 11.2 Runtime identity binding

The runtime SHOULD store a salted token fingerprint and resolved bot identity:

```text
maxbot:{runtimeId}:transport:identity
```

Starting another bot token under an existing runtime identity MUST fail until an explicit migration or a new `runtimeId` is used. Existing marker state MUST NOT be silently reused by another bot.

## 12. Graceful shutdown

The runtime MUST respond to `SIGTERM`, `SIGINT`, and an application `AbortSignal`.

Canonical order:

```text
1. set stopping state
2. stop requesting new batches
3. stop claiming outbound jobs
4. wait for active work within timeout
5. complete or safely release active leases
6. release polling ownership with owner fencing
7. close transport
8. close Redis
9. publish stopped state
```

Canonical shutdown timeout: 30 seconds.

Timeout produces `shutdown.timeout` and a non-zero exit code.

Recommended process exit contract:

```text
0  normal shutdown
1  unexpected runtime failure
2  invalid configuration
3  permanent MAX API failure
4  invalid or incompatible Redis state
5  runtime identity conflict
6  polling ownership loss
```

## 13. Testing strategy

Every implementation MUST include:

```text
unit
→ Redis integration
→ conformance
→ recovery smoke
```

### 13.1 Unit tests

Must cover:

- error classification;
- backoff calculation;
- event normalization;
- stable event-ID generation;
- health transitions;
- configuration validation;
- secret redaction.

### 13.2 Redis integration tests

Must use a dedicated Redis fixture or isolated namespace and cover:

- polling ownership;
- inbound processing lease;
- completed duplicate suppression;
- idempotent outbound publication;
- atomic claim;
- lease fencing;
- retry scheduling;
- accepted completion;
- dead-letter transition;
- expired lease recovery.

### 13.3 Conformance suite

The suite tests through public platform ports rather than implementation internals.

```ts
runRuntimeConformanceSuite({
  createRuntime,
  createFakeTransport,
  createStateStore,
  inspectState,
});
```

Required scenarios include:

- marker restoration after restart;
- marker not advanced after partial batch failure;
- completed duplicate not sent to application;
- active inbound lease blocks another worker;
- expired inbound lease can be reclaimed;
- temporary poll error keeps process alive;
- permanent poll error terminates runtime;
- second polling owner is rejected;
- ownership loss stops polling;
- duplicate outbound idempotency key creates one job;
- HTTP 429 honors `Retry-After`;
- HTTP 5xx schedules retry;
- HTTP 401 dead-letters one outbound job;
- stale lease owner cannot complete a job;
- process restart recovers unfinished jobs;
- attempt 8 dead-letters a job;
- acceptance receipt contains no message text;
- shutdown prevents new polls and claims.

### 13.4 Fake transport and clock

The repository MUST provide a controllable fake MAX transport and manual clock. Tests MUST NOT wait for real TTLs or real backoff durations.

```ts
export interface Clock {
  now(): Date;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}
```

### 13.5 Operational chaos and recovery

Level 3 requires:

- MAX API disconnect/reconnect;
- Redis disconnect/reconnect;
- Redis restart;
- runtime process restart;
- Docker network disconnect;
- two processes using the same token and runtime ID;
- partial batch processing failure;
- outbound worker crash after MAX accepted the message but before receipt persistence.

The final scenario documents a real limitation: without a MAX-side idempotency key, a crash in that narrow window can cause duplicate sending. The platform MUST describe the risk and SHOULD minimize the interval between transport acceptance and receipt persistence.

### 13.6 Release gate

Production release MUST require:

- typecheck;
- unit tests;
- Redis integration tests;
- conformance suite;
- secret-log scan;
- Docker configuration validation;
- transport recovery smoke;
- updated `MAX-CONFORMANCE.md`.

Evidence MUST include commands, date, standard version, commit SHA, pass counts, and relevant structured log excerpts.

## 14. Standard evolution

The repository uses Semantic Versioning.

- `MAJOR`: incompatible normative or contract change;
- `MINOR`: compatible new requirements or checks;
- `PATCH`: clarification or correction without changed meaning.

A normative rule change requires:

1. a concrete problem, incident, confirmed defect, or test evidence;
2. an ADR;
3. updated contract;
4. updated conformance test;
5. `CHANGELOG.md` entry;
6. compatibility assessment.

New mechanisms begin in `docs/experimental/` with a hypothesis, risks, donor implementation, required tests, and graduation criteria.

Webhook graduation path:

```text
EXPERIMENTAL
→ test implementation
→ conformance scenarios
→ real project operation
→ observed failures
→ recovery runbook
→ PROVEN
```

## 15. Adoption strategy

### 15.1 New bots

```text
1. select standard version
2. adopt reference contracts
3. configure runtimeId and Redis
4. attach BotApplication
5. run conformance suite
6. run recovery smoke
7. publish MAX-CONFORMANCE.md
```

A new application developer should not redesign transport state, TTLs, Redis keys, retries, markers, receipts, or logs.

### 15.2 Existing bots

Existing repositories are migrated incrementally. Each receives an audit in:

```text
references/audits/MAX-DKD.md
references/audits/MAX-DKD-CLIENT-BOT.md
```

Audit statuses:

```text
PASS
PARTIAL
FAIL
NOT_APPLICABLE
NOT_VERIFIED
```

Canonical migration order:

```text
1. transport/application boundary
2. normalized events
3. marker and ownership
4. inbound duplicate suppression
5. outbound queue
6. retry and dead letter
7. health and logging
8. conformance tests
9. recovery smoke
```

## 16. Initial evidence sources

The first standard version is derived from verified patterns already present in:

- `amonrapmon/MAX-DKD`;
- `amonrapmon/MAX-DKD-CLIENT-BOT`;
- `amonrapmon/MAX-YC-BOT-MINIAPP` for application/API separation and fixture practices.

These repositories are donors and evidence. Their internal implementation details are not automatically normative.

## 17. Explicit v1 exclusions

The following are outside stable v1:

- webhook transport;
- generic multi-transport production support;
- shared npm runtime package;
- project-specific business handlers;
- project-specific FSM;
- business database contracts;
- admin UI for queue and dead-letter inspection;
- claims of end-user delivery or read receipts.

## 18. Acceptance criteria for repository bootstrap

The initial repository bootstrap is complete when:

- the approved design is committed under `docs/superpowers/specs/`;
- `README.md` clearly explains body versus head;
- `STANDARD.md` contains requirement IDs and normative wording;
- reference TypeScript contracts exist and typecheck;
- Redis key and TTL schemas are documented;
- a controllable fake transport and manual clock exist;
- the initial conformance suite expresses all required v1 behaviors;
- audits for `MAX-DKD` and `MAX-DKD-CLIENT-BOT` exist;
- the transport recovery smoke runbook is executable;
- no business-specific command or scenario appears in normative contracts.

## 19. Design decisions summary

1. Separate repository: `amonrapmon/MAX-BOT-PLATFORM`.
2. Normative standard, not a loose guide.
3. Reference TypeScript contracts, Redis schemas, tests, and runbooks are included.
4. The platform is a headless runtime body; business logic is an attachable head.
5. Long polling is the only stable v1 transport.
6. Redis 7 is the canonical v1 state store.
7. Transport SDKs are isolated behind an adapter.
8. Polling ownership is mandatory.
9. Marker commit happens only after complete batch success.
10. Completed inbound processing is deduplicated; exactly-once receipt is not promised.
11. All outbound sends use a durable queue.
12. Server acceptance is recorded as `accepted_by_max`, not delivered or read.
13. Production bots must pass Operational Level conformance.
14. Webhooks remain experimental until proven through operation and recovery testing.
