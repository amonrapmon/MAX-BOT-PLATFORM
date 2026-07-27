import type { BotEventV1 } from "./events.js";

export interface OutboundMessageV1 {
  idempotencyKey: string;
  chatId: string;
  text?: string;
  format?: "plain" | "markdown";
  attachments?: readonly unknown[];
  priority?: number;
  correlationId?: string;
}

export interface EnqueueReceiptV1 {
  version: 1;
  jobId: string;
  acceptedAt: string;
}

export interface ApplicationResultV1 {
  version: 1;
  outcome: "completed" | "ignored";
}

export interface BotContext {
  send(message: OutboundMessageV1): Promise<EnqueueReceiptV1>;
}

export interface BotApplication {
  handle(
    event: BotEventV1,
    context: BotContext,
  ): Promise<ApplicationResultV1>;
}

export interface Clock {
  now(): Date;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export interface RuntimeLogRecordV1 {
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

export interface RuntimeLogger {
  write(record: RuntimeLogRecordV1): void;
}

export interface RuntimeMetrics {
  increment(name: string, value?: number): void;
  gauge(name: string, value: number): void;
  observe(name: string, value: number): void;
}
