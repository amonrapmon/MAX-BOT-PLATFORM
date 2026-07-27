import type {
  AcceptanceReceiptV1,
  DeadLetterRecordV1,
  OutboundJobV1,
} from "../../contracts/outbound.js";
import type { RuntimeErrorV1 } from "../../contracts/errors.js";
import type { BotEventV1 } from "../../contracts/events.js";
import type { RuntimeHealthV1 } from "../../contracts/health.js";
import type {
  EnqueueReceiptV1,
  OutboundMessageV1,
  RuntimeLogRecordV1,
} from "../../contracts/runtime.js";
import type { PollingBatchV1 } from "../../contracts/transport.js";

export interface OutboundJobSnapshotV1 extends OutboundJobV1 {
  state: "ready" | "scheduled" | "leased";
}

export interface RuntimeStateSnapshotV1 {
  version: 1;
  started: boolean;
  stopping: boolean;
  stopped: boolean;
  pollingActive: boolean;
  ownerHeld: boolean;
  stateStoreConnected: boolean;
  marker?: string;
  pollRequestCount: number;
  pollingRequestMarkers: Array<string | undefined>;
  sendRequestCount: number;
  applicationEvents: BotEventV1[];
  applicationContextKeys: string[];
  sdkObjectsExposed: boolean;
  completedEventIds: string[];
  outboundJobs: OutboundJobSnapshotV1[];
  receipts: AcceptanceReceiptV1[];
  deadLetters: DeadLetterRecordV1[];
  logs: RuntimeLogRecordV1[];
  retryDelaysMs: number[];
  health: RuntimeHealthV1;
  shutdownTimedOut: boolean;
  configError?: string;
}

export interface RuntimeConformanceOptions {
  validConfig?: boolean;
  runtimeId?: string;
  shutdownTimeoutMs?: number;
}

export interface RuntimeConformanceDriver {
  start(): Promise<void>;
  stop(): Promise<void>;
  crash(): Promise<void>;
  restart(): Promise<void>;

  enqueuePollBatch(batch: PollingBatchV1): void;
  failNextPoll(error: RuntimeErrorV1): void;
  failNextSend(error: RuntimeErrorV1): void;
  losePollingOwnership(): Promise<void>;
  disconnectStateStore(): Promise<void>;
  reconnectStateStore(): Promise<void>;

  sendApplicationMessage(message: OutboundMessageV1): Promise<EnqueueReceiptV1>;
  advanceTime(ms: number): Promise<void>;
  flush(): Promise<void>;
  snapshot(): Promise<RuntimeStateSnapshotV1>;

  setStoredMarker(marker: string): void;
  setStoredStateVersion(version: number): void;
  failApplicationOnce(eventId: string): void;
  setShutdownDrainMs(ms: number): void;
  simulateCompetingOwner(): Promise<"rejected">;
  attemptStaleCompletion(jobId: string): Promise<"lease_lost">;
}

export type RuntimeConformanceFactory = (
  options?: RuntimeConformanceOptions,
) => RuntimeConformanceDriver;
