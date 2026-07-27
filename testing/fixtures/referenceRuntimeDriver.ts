/**
 * In-memory test oracle used only to prove that the portable conformance suite
 * is executable. This is deliberately not a production runtime implementation.
 */
import { createHash } from "node:crypto";
import type {
  AcceptanceReceiptV1,
  DeadLetterRecordV1,
} from "../../contracts/outbound.js";
import type { RuntimeErrorV1 } from "../../contracts/errors.js";
import type { BotEventTypeV1, BotEventV1 } from "../../contracts/events.js";
import type { RuntimeHealthV1 } from "../../contracts/health.js";
import type {
  EnqueueReceiptV1,
  OutboundMessageV1,
  RuntimeLogRecordV1,
} from "../../contracts/runtime.js";
import type {
  PollingBatchV1,
  RawTransportUpdateV1,
} from "../../contracts/transport.js";
import type {
  OutboundJobSnapshotV1,
  RuntimeConformanceDriver,
  RuntimeConformanceFactory,
  RuntimeConformanceOptions,
  RuntimeStateSnapshotV1,
} from "../conformance/types.js";
import { createFakeMaxTransport, type FakeMaxTransport } from "./fakeMaxTransport.js";
import { createManualClock, type ManualClock } from "./manualClock.js";

interface StoredJob {
  jobId: string;
  message: OutboundMessageV1;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  availableAtMs: number;
  state: "ready" | "scheduled" | "leased";
  leaseOwner?: string;
}

const UPDATE_TYPES = new Set<BotEventTypeV1>([
  "message",
  "callback",
  "bot_started",
  "bot_stopped",
  "dialog_removed",
]);

function runtimeError(
  source: RuntimeErrorV1["source"],
  kind: RuntimeErrorV1["kind"],
  code: string,
  message: string,
): RuntimeErrorV1 {
  return { version: 1, source, kind, code, message };
}

function computeBackoffMs(attempt: number): number {
  return Math.min(10_000, 1_000 * 2 ** Math.max(0, attempt - 1));
}

function asRuntimeError(error: unknown): RuntimeErrorV1 {
  if (
    error &&
    typeof error === "object" &&
    "version" in error &&
    "kind" in error &&
    "code" in error
  ) {
    return error as RuntimeErrorV1;
  }
  return runtimeError("polling", "permanent", "unknown_error", String(error));
}

function payloadRecord(update: RawTransportUpdateV1): Record<string, unknown> {
  return update.payload && typeof update.payload === "object"
    ? (update.payload as Record<string, unknown>)
    : {};
}

function stringField(payload: Record<string, unknown>, key: string): string | undefined {
  return typeof payload[key] === "string" ? payload[key] : undefined;
}

function normalizeEvent(update: RawTransportUpdateV1, now: Date): BotEventV1 {
  const payload = payloadRecord(update);
  const rawType = stringField(payload, "type") ?? update.updateType;
  const type: BotEventTypeV1 = UPDATE_TYPES.has(rawType as BotEventTypeV1)
    ? (rawType as BotEventTypeV1)
    : "message";
  const messageId = stringField(payload, "messageId");
  const callbackId = stringField(payload, "callbackId");
  const explicitEventId = stringField(payload, "eventId");
  const fallback = createHash("sha256")
    .update(`${update.updateType}:${JSON.stringify(payload)}`)
    .digest("hex");
  const eventId =
    explicitEventId ??
    (messageId ? `message:${messageId}` : undefined) ??
    (callbackId ? `callback:${callbackId}` : undefined) ??
    `${update.updateType}:${fallback}`;

  const userId = stringField(payload, "userId");
  const text = stringField(payload, "text");
  const callbackData = stringField(payload, "callbackData");

  return {
    version: 1,
    eventId,
    type,
    chatId: stringField(payload, "chatId") ?? "chat-unknown",
    ...(userId === undefined ? {} : { userId }),
    ...(messageId === undefined ? {} : { messageId }),
    ...(text === undefined ? {} : { text }),
    ...(callbackData === undefined ? {} : { callbackData }),
    occurredAt: stringField(payload, "occurredAt") ?? now.toISOString(),
  };
}

class ReferenceRuntimeDriver implements RuntimeConformanceDriver {
  private readonly runtimeId: string;
  private readonly validConfig: boolean;
  private readonly shutdownTimeoutMs: number;
  private readonly clock: ManualClock;
  private readonly transport: FakeMaxTransport;
  private started = false;
  private stopping = false;
  private stopped = false;
  private pollingActive = false;
  private ownerHeld = false;
  private stateStoreConnected = true;
  private marker: string | undefined;
  private storedStateVersion = 1;
  private nextPollAtMs = 0;
  private consecutivePollErrors = 0;
  private nextJobNumber = 1;
  private shutdownDrainMs = 0;
  private shutdownTimedOut = false;
  private configError: string | undefined;
  private readonly applicationFailures = new Set<string>();
  private readonly completedEventIds = new Set<string>();
  private readonly applicationEvents: BotEventV1[] = [];
  private readonly applicationContextKeys = ["send"];
  private readonly jobs = new Map<string, StoredJob>();
  private readonly idempotency = new Map<string, string>();
  private readonly receipts = new Map<string, AcceptanceReceiptV1>();
  private readonly deadLetters = new Map<string, DeadLetterRecordV1>();
  private readonly logs: RuntimeLogRecordV1[] = [];
  private readonly retryDelaysMs: number[] = [];
  private health: RuntimeHealthV1;

  constructor(options: RuntimeConformanceOptions = {}) {
    this.runtimeId = options.runtimeId ?? "reference-runtime";
    this.validConfig = options.validConfig ?? true;
    this.shutdownTimeoutMs = options.shutdownTimeoutMs ?? 30_000;
    this.clock = createManualClock("2026-07-27T12:00:00.000Z");
    this.transport = createFakeMaxTransport({ now: () => this.clock.now() });
    this.health = this.createHealth("starting", "down", "down", "down");
  }

  async start(): Promise<void> {
    this.log("info", "bootstrap", "runtime.starting");
    if (!this.validConfig) {
      this.configError = "invalid_configuration";
      this.health = this.createHealth("unhealthy", "down", "down", "down");
      this.log("error", "bootstrap", "polling.permanent_failure", {
        errorCode: this.configError,
      });
      throw runtimeError(
        "configuration",
        "permanent",
        this.configError,
        "Invalid runtime configuration",
      );
    }
    if (this.storedStateVersion !== 1) {
      this.configError = "unknown_state_version";
      this.health = this.createHealth("unhealthy", "down", "down", "down");
      this.log("error", "state_store", "state_store.invalid_data", {
        errorCode: this.configError,
      });
      throw runtimeError(
        "state_store",
        "permanent",
        this.configError,
        "Unsupported serialized state version",
      );
    }
    this.started = true;
    this.stopping = false;
    this.stopped = false;
    this.ownerHeld = true;
    this.pollingActive = true;
    this.nextPollAtMs = this.clock.now().getTime();
    this.health = this.createHealth("healthy", "up", "up", "up");
    this.log("info", "polling", "polling.owner_acquired");
    if (this.marker !== undefined) {
      this.log("info", "polling", "polling.marker_restored");
    }
    this.log("info", "polling", "polling.started");
    this.log("info", "bootstrap", "runtime.started");
  }

  async stop(): Promise<void> {
    this.stopping = true;
    this.pollingActive = false;
    this.log("info", "shutdown", "shutdown.signal_received");
    this.log("info", "bootstrap", "runtime.stopping");
    if (this.shutdownDrainMs > this.shutdownTimeoutMs) {
      this.shutdownTimedOut = true;
      this.started = false;
      this.stopping = false;
      this.stopped = true;
      this.ownerHeld = false;
      this.health = this.createHealth("unhealthy", "down", "down", "down");
      this.log("error", "shutdown", "shutdown.timeout");
      throw runtimeError("polling", "shutdown", "shutdown_timeout", "Shutdown timed out");
    }
    await this.clock.advanceBy(this.shutdownDrainMs);
    this.ownerHeld = false;
    this.started = false;
    this.stopping = false;
    this.stopped = true;
    this.health = this.createHealth("stopped", "down", "down", "down");
    await this.transport.stop();
    this.log("info", "bootstrap", "runtime.stopped");
  }

  async crash(): Promise<void> {
    this.started = false;
    this.stopping = false;
    this.stopped = false;
    this.pollingActive = false;
    this.ownerHeld = false;
  }

  async restart(): Promise<void> {
    await this.start();
  }

  enqueuePollBatch(batch: PollingBatchV1): void {
    this.transport.enqueueBatch(batch);
  }

  failNextPoll(error: RuntimeErrorV1): void {
    this.transport.failNextPoll(error);
  }

  failNextSend(error: RuntimeErrorV1): void {
    this.transport.failNextSend(error);
  }

  async losePollingOwnership(): Promise<void> {
    this.ownerHeld = false;
    this.pollingActive = false;
    this.health = this.createHealth("unhealthy", "down", "up", "up");
    this.log("error", "polling", "polling.owner_conflict", {
      errorCode: "ownership_lost",
    });
  }

  async disconnectStateStore(): Promise<void> {
    this.stateStoreConnected = false;
    this.health = this.createHealth("degraded", "degraded", "down", "degraded");
    this.log("warn", "state_store", "state_store.connection_lost", {
      errorCode: "state_store_unavailable",
    });
  }

  async reconnectStateStore(): Promise<void> {
    this.stateStoreConnected = true;
    this.health = this.createHealth("recovering", "degraded", "up", "degraded");
    this.log("info", "state_store", "state_store.connection_restored");
    if (this.started && this.ownerHeld) {
      this.pollingActive = true;
      this.health = this.createHealth("healthy", "up", "up", "up");
    }
  }

  async sendApplicationMessage(message: OutboundMessageV1): Promise<EnqueueReceiptV1> {
    if (!this.started || this.stopping || this.stopped) {
      throw new Error("Runtime is not accepting application messages");
    }
    if (!this.stateStoreConnected) {
      throw new Error("State store is unavailable");
    }
    const existing = this.idempotency.get(message.idempotencyKey);
    if (existing) {
      this.log("info", "outbound", "outbound.duplicate_enqueue_skipped", {
        jobId: existing,
      });
      return {
        version: 1,
        jobId: existing,
        acceptedAt: this.clock.now().toISOString(),
      };
    }

    const jobId = `job-${this.nextJobNumber++}`;
    this.jobs.set(jobId, {
      jobId,
      message: { ...message },
      attempt: 0,
      maxAttempts: 8,
      createdAt: this.clock.now().toISOString(),
      availableAtMs: this.clock.now().getTime(),
      state: "ready",
    });
    this.idempotency.set(message.idempotencyKey, jobId);
    this.log("info", "outbound", "outbound.enqueued", { jobId });
    return {
      version: 1,
      jobId,
      acceptedAt: this.clock.now().toISOString(),
    };
  }

  async advanceTime(ms: number): Promise<void> {
    await this.clock.advanceBy(ms);
  }

  async flush(): Promise<void> {
    if (!this.started || this.stopping || this.stopped || !this.stateStoreConnected) {
      return;
    }
    if (this.pollingActive && this.ownerHeld) {
      await this.processPoll();
    }
    await this.processOutbound();
  }

  async snapshot(): Promise<RuntimeStateSnapshotV1> {
    return {
      version: 1,
      started: this.started,
      stopping: this.stopping,
      stopped: this.stopped,
      pollingActive: this.pollingActive,
      ownerHeld: this.ownerHeld,
      stateStoreConnected: this.stateStoreConnected,
      ...(this.marker === undefined ? {} : { marker: this.marker }),
      pollRequestCount: this.transport.pollingRequests.length,
      pollingRequestMarkers: this.transport.pollingRequests.map((request) => request.marker),
      sendRequestCount: this.transport.sent.length,
      applicationEvents: this.applicationEvents.map((event) => ({ ...event })),
      applicationContextKeys: [...this.applicationContextKeys],
      sdkObjectsExposed: false,
      completedEventIds: [...this.completedEventIds],
      outboundJobs: [...this.jobs.values()].map((job) => this.snapshotJob(job)),
      receipts: [...this.receipts.values()].map((receipt) => ({ ...receipt })),
      deadLetters: [...this.deadLetters.values()].map((record) => ({ ...record })),
      logs: this.logs.map((record) => ({ ...record })),
      retryDelaysMs: [...this.retryDelaysMs],
      health: {
        ...this.health,
        polling: { ...this.health.polling },
        stateStore: { ...this.health.stateStore },
        outbound: { ...this.health.outbound },
      },
      shutdownTimedOut: this.shutdownTimedOut,
      ...(this.configError === undefined ? {} : { configError: this.configError }),
    };
  }

  setStoredMarker(marker: string): void {
    this.marker = marker;
  }

  setStoredStateVersion(version: number): void {
    this.storedStateVersion = version;
  }

  failApplicationOnce(eventId: string): void {
    this.applicationFailures.add(eventId);
  }

  setShutdownDrainMs(ms: number): void {
    this.shutdownDrainMs = ms;
  }

  async simulateCompetingOwner(): Promise<"rejected"> {
    this.log("warn", "polling", "polling.owner_conflict", {
      errorCode: "owner_exists",
    });
    return "rejected";
  }

  async attemptStaleCompletion(jobId: string): Promise<"lease_lost"> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.state = "leased";
      job.leaseOwner = "active-worker";
    }
    this.log("warn", "outbound", "outbound.lease_lost", { jobId });
    return "lease_lost";
  }

  private async processPoll(): Promise<void> {
    if (this.clock.now().getTime() < this.nextPollAtMs) return;
    try {
      const batch = await this.transport.getUpdates({
        ...(this.marker === undefined ? {} : { marker: this.marker }),
        timeoutSeconds: 30,
        allowedUpdateTypes: [
          "message",
          "callback",
          "bot_started",
          "bot_stopped",
          "dialog_removed",
        ],
      });
      if (this.consecutivePollErrors > 0) {
        this.log("info", "polling", "polling.connection_restored", {
          attempt: this.consecutivePollErrors,
        });
      }
      this.consecutivePollErrors = 0;
      this.health = this.createHealth("healthy", "up", "up", "up");
      this.log("info", "polling", "polling.batch_received");

      for (const update of batch.updates) {
        const event = normalizeEvent(update, this.clock.now());
        if (this.completedEventIds.has(event.eventId)) {
          this.log("info", "inbound", "inbound.duplicate_skipped", {
            eventId: event.eventId,
          });
          continue;
        }
        this.log("info", "inbound", "inbound.processing_started", {
          eventId: event.eventId,
        });
        this.applicationEvents.push({ ...event });
        if (this.applicationFailures.delete(event.eventId)) {
          this.log("error", "inbound", "inbound.failed", {
            eventId: event.eventId,
            errorCode: "application_failure",
          });
          return;
        }
        this.completedEventIds.add(event.eventId);
        this.log("info", "inbound", "inbound.completed", {
          eventId: event.eventId,
        });
      }

      this.marker = batch.marker;
      this.log("info", "polling", "polling.marker_committed");
      this.log("info", "polling", "polling.batch_completed");
    } catch (error) {
      const normalized = asRuntimeError(error);
      if (normalized.kind === "permanent") {
        this.pollingActive = false;
        this.health = this.createHealth("unhealthy", "down", "up", "up");
        this.log("error", "polling", "polling.permanent_failure", {
          errorCode: normalized.code,
          ...(normalized.status === undefined ? {} : { status: normalized.status }),
        });
        return;
      }
      this.consecutivePollErrors += 1;
      const computed = computeBackoffMs(this.consecutivePollErrors);
      const retryAfter = Math.min(900_000, normalized.retryAfterMs ?? 0);
      const delay = Math.max(computed, retryAfter);
      this.nextPollAtMs = this.clock.now().getTime() + delay;
      this.retryDelaysMs.push(delay);
      this.health = this.createHealth("degraded", "degraded", "up", "up");
      if (this.consecutivePollErrors === 1) {
        this.log("warn", "polling", "polling.connection_lost", {
          errorCode: normalized.code,
        });
      }
      this.log("warn", "polling", "polling.retry_scheduled", {
        attempt: this.consecutivePollErrors,
        errorCode: normalized.code,
      });
    }
  }

  private async processOutbound(): Promise<void> {
    const nowMs = this.clock.now().getTime();
    const dueJobs = [...this.jobs.values()]
      .filter((job) => job.state === "ready" || job.availableAtMs <= nowMs)
      .sort((left, right) => left.jobId.localeCompare(right.jobId));

    for (const job of dueJobs) {
      job.state = "leased";
      job.leaseOwner = "reference-worker";
      this.log("info", "outbound", "outbound.claimed", { jobId: job.jobId });
      this.log("info", "outbound", "outbound.sending", {
        jobId: job.jobId,
        attempt: job.attempt + 1,
      });
      const result = await this.transport.send({
        chatId: job.message.chatId,
        ...(job.message.text === undefined ? {} : { text: job.message.text }),
        ...(job.message.format === undefined ? {} : { format: job.message.format }),
        ...(job.message.attachments === undefined
          ? {}
          : { attachments: [...job.message.attachments] }),
      });

      if (result.ok) {
        this.jobs.delete(job.jobId);
        const receipt: AcceptanceReceiptV1 = {
          version: 1,
          jobId: job.jobId,
          messageId: result.receipt.messageId,
          chatId: result.receipt.chatId,
          acceptedAt: result.receipt.acceptedAt,
        };
        this.receipts.set(job.jobId, receipt);
        this.log("info", "outbound", "outbound.accepted_by_max", {
          jobId: job.jobId,
          messageId: receipt.messageId,
        });
        continue;
      }

      job.attempt += 1;
      if (result.error.kind === "permanent" || job.attempt >= job.maxAttempts) {
        this.jobs.delete(job.jobId);
        this.deadLetters.set(job.jobId, {
          version: 1,
          jobId: job.jobId,
          chatId: job.message.chatId,
          attempt: job.attempt,
          reasonCode: result.error.code,
          failedAt: this.clock.now().toISOString(),
        });
        this.log("error", "outbound", "outbound.dead_lettered", {
          jobId: job.jobId,
          attempt: job.attempt,
          errorCode: result.error.code,
        });
        continue;
      }

      const computed = computeBackoffMs(job.attempt);
      const retryAfter = Math.min(900_000, result.error.retryAfterMs ?? 0);
      const delay = Math.max(computed, retryAfter);
      job.state = "scheduled";
      delete job.leaseOwner;
      job.availableAtMs = nowMs + delay;
      this.retryDelaysMs.push(delay);
      this.log("warn", "outbound", "outbound.retry_scheduled", {
        jobId: job.jobId,
        attempt: job.attempt,
        errorCode: result.error.code,
      });
    }
  }

  private snapshotJob(job: StoredJob): OutboundJobSnapshotV1 {
    return {
      version: 1,
      jobId: job.jobId,
      idempotencyKey: job.message.idempotencyKey,
      chatId: job.message.chatId,
      payload: { ...job.message },
      priority: job.message.priority ?? 0,
      attempt: job.attempt,
      maxAttempts: job.maxAttempts,
      createdAt: job.createdAt,
      availableAt: new Date(job.availableAtMs).toISOString(),
      state: job.state,
      ...(job.leaseOwner === undefined
        ? {}
        : {
            lease: {
              ownerId: job.leaseOwner,
              leasedUntil: new Date(job.availableAtMs + 120_000).toISOString(),
            },
          }),
    };
  }

  private createHealth(
    status: RuntimeHealthV1["status"],
    polling: RuntimeHealthV1["polling"]["status"],
    stateStore: RuntimeHealthV1["stateStore"]["status"],
    outbound: RuntimeHealthV1["outbound"]["status"],
  ): RuntimeHealthV1 {
    return {
      version: 1,
      status,
      polling: { status: polling, consecutiveFailures: polling === "up" ? 0 : 1 },
      stateStore: {
        status: stateStore,
        consecutiveFailures: stateStore === "up" ? 0 : 1,
      },
      outbound: { status: outbound, consecutiveFailures: outbound === "up" ? 0 : 1 },
      updatedAt: this.clock.now().toISOString(),
    };
  }

  private log(
    level: RuntimeLogRecordV1["level"],
    component: RuntimeLogRecordV1["component"],
    event: string,
    extra: Partial<RuntimeLogRecordV1> = {},
  ): void {
    this.logs.push({
      timestamp: this.clock.now().toISOString(),
      level,
      component,
      event,
      runtimeId: this.runtimeId,
      ...(extra.eventId === undefined ? {} : { eventId: extra.eventId }),
      ...(extra.jobId === undefined ? {} : { jobId: extra.jobId }),
      ...(extra.messageId === undefined ? {} : { messageId: extra.messageId }),
      ...(extra.attempt === undefined ? {} : { attempt: extra.attempt }),
      ...(extra.errorCode === undefined ? {} : { errorCode: extra.errorCode }),
      ...(extra.status === undefined ? {} : { status: extra.status }),
    });
  }
}

export function createReferenceRuntimeConformanceFactory(): RuntimeConformanceFactory {
  return (options = {}) => new ReferenceRuntimeDriver(options);
}
