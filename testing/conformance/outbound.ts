import { describe, expect, it } from "vitest";
import type { RuntimeErrorV1 } from "../../contracts/errors.js";
import type { PollingBatchV1 } from "../../contracts/transport.js";
import type { RuntimeConformanceFactory } from "./types.js";

export const OUTBOUND_SCENARIO_IDS = [
  "MAX-OUT-001.durable-enqueue",
  "MAX-OUT-002.idempotent-enqueue",
  "MAX-OUT-003.lease-fencing",
  "MAX-OUT-004.retry-same-job",
  "MAX-OUT-005.permanent-dead-letter",
  "MAX-OUT-006.attempt-eight-dead-letter",
  "MAX-OUT-007.accepted-by-max",
  "MAX-OUT-008.receipt-redaction",
  "MAX-REL-002.retry-after",
  "MAX-REL-005.atomic-terminal-transition",
  "MAX-OBS-001.structured-events",
  "MAX-OBS-003.secret-redaction",
] as const;

function retryableSendError(
  code = "http_500",
  retryAfterMs?: number,
): RuntimeErrorV1 {
  return {
    version: 1,
    source: "max_api",
    kind: "retryable",
    code,
    message: "temporary send failure",
    status: code === "http_429" ? 429 : 500,
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
  };
}

function permanentSendError(): RuntimeErrorV1 {
  return {
    version: 1,
    source: "max_api",
    kind: "permanent",
    code: "http_401",
    message: "invalid token",
    status: 401,
  };
}

function sensitiveBatch(secret: string): PollingBatchV1 {
  return {
    version: 1,
    marker: "m-secret",
    updates: [
      {
        version: 1,
        updateType: "message",
        payload: {
          type: "message",
          chatId: "chat-secret",
          messageId: "mid-secret",
          text: secret,
          occurredAt: "2026-07-27T12:00:00.000Z",
        },
      },
    ],
  };
}

export function registerOutboundConformance(factory: RuntimeConformanceFactory): void {
  describe("outbound conformance", () => {
    it(OUTBOUND_SCENARIO_IDS[0], async () => {
      const driver = factory();
      await driver.start();
      const receipt = await driver.sendApplicationMessage({
        idempotencyKey: "durable-1",
        chatId: "chat-1",
        text: "queued",
      });
      await driver.crash();
      await driver.restart();
      const snapshot = await driver.snapshot();

      expect(snapshot.outboundJobs).toHaveLength(1);
      expect(snapshot.outboundJobs[0]!.jobId).toBe(receipt.jobId);
      expect(snapshot.sendRequestCount).toBe(0);
    });

    it(OUTBOUND_SCENARIO_IDS[1], async () => {
      const driver = factory();
      await driver.start();
      const first = await driver.sendApplicationMessage({
        idempotencyKey: "same-key",
        chatId: "chat-1",
        text: "first",
      });
      const second = await driver.sendApplicationMessage({
        idempotencyKey: "same-key",
        chatId: "chat-1",
        text: "second",
      });
      const snapshot = await driver.snapshot();

      expect(first.jobId).toBe(second.jobId);
      expect(snapshot.outboundJobs).toHaveLength(1);
    });

    it(OUTBOUND_SCENARIO_IDS[2], async () => {
      const driver = factory();
      await driver.start();
      const receipt = await driver.sendApplicationMessage({
        idempotencyKey: "lease-1",
        chatId: "chat-1",
        text: "payload",
      });
      expect(await driver.attemptStaleCompletion(receipt.jobId)).toBe("lease_lost");
      const snapshot = await driver.snapshot();
      expect(snapshot.outboundJobs).toHaveLength(1);
      expect(snapshot.outboundJobs[0]!.state).toBe("leased");
      expect(snapshot.outboundJobs[0]!.lease!.ownerId).toBe("active-worker");
      expect(snapshot.receipts).toHaveLength(0);
    });

    it(OUTBOUND_SCENARIO_IDS[3], async () => {
      const driver = factory();
      await driver.start();
      driver.failNextSend(retryableSendError());
      const receipt = await driver.sendApplicationMessage({
        idempotencyKey: "retry-1",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.outboundJobs).toHaveLength(1);
      expect(snapshot.outboundJobs[0]!.jobId).toBe(receipt.jobId);
      expect(snapshot.outboundJobs[0]!.attempt).toBe(1);
      expect(snapshot.outboundJobs[0]!.state).toBe("scheduled");
      expect(snapshot.receipts).toHaveLength(0);
    });

    it(OUTBOUND_SCENARIO_IDS[4], async () => {
      const driver = factory();
      await driver.start();
      driver.failNextSend(permanentSendError());
      const receipt = await driver.sendApplicationMessage({
        idempotencyKey: "dead-1",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.outboundJobs).toHaveLength(0);
      expect(snapshot.deadLetters).toHaveLength(1);
      expect(snapshot.deadLetters[0]!.jobId).toBe(receipt.jobId);
      expect(snapshot.deadLetters[0]!.reasonCode).toBe("http_401");
    });

    it(OUTBOUND_SCENARIO_IDS[5], async () => {
      const driver = factory();
      await driver.start();
      const receipt = await driver.sendApplicationMessage({
        idempotencyKey: "attempt-8",
        chatId: "chat-1",
        text: "payload",
      });
      for (let attempt = 1; attempt <= 8; attempt += 1) {
        driver.failNextSend(retryableSendError());
        await driver.flush();
        if (attempt < 8) await driver.advanceTime(900_000);
      }
      const snapshot = await driver.snapshot();

      expect(snapshot.outboundJobs).toHaveLength(0);
      expect(snapshot.deadLetters).toHaveLength(1);
      expect(snapshot.deadLetters[0]!.jobId).toBe(receipt.jobId);
      expect(snapshot.deadLetters[0]!.attempt).toBe(8);
    });

    it(OUTBOUND_SCENARIO_IDS[6], async () => {
      const driver = factory();
      await driver.start();
      const enqueue = await driver.sendApplicationMessage({
        idempotencyKey: "accepted-1",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.receipts).toHaveLength(1);
      expect(snapshot.receipts[0]!.jobId).toBe(enqueue.jobId);
      expect(snapshot.receipts[0]!.messageId).toBe("fake-message-1");
      expect(
        snapshot.logs.some((record) => record.event === "outbound.accepted_by_max"),
      ).toBe(true);
    });

    it(OUTBOUND_SCENARIO_IDS[7], async () => {
      const driver = factory();
      await driver.start();
      const secret = "private-message-body";
      await driver.sendApplicationMessage({
        idempotencyKey: "redact-1",
        chatId: "chat-1",
        text: secret,
      });
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(JSON.stringify(snapshot.receipts).includes(secret)).toBe(false);
      expect(Object.keys(snapshot.receipts[0]!).sort()).toEqual(
        ["acceptedAt", "chatId", "jobId", "messageId", "version"].sort(),
      );
    });

    it(OUTBOUND_SCENARIO_IDS[8], async () => {
      const driver = factory();
      await driver.start();
      driver.failNextSend(retryableSendError("http_429", 3_000));
      await driver.sendApplicationMessage({
        idempotencyKey: "retry-after",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();
      expect(snapshot.retryDelaysMs[0]).toBe(3_000);
    });

    it(OUTBOUND_SCENARIO_IDS[9], async () => {
      const driver = factory();
      await driver.start();
      const enqueue = await driver.sendApplicationMessage({
        idempotencyKey: "atomic-1",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();
      const active = snapshot.outboundJobs.some((job) => job.jobId === enqueue.jobId);
      const accepted = snapshot.receipts.some((receipt) => receipt.jobId === enqueue.jobId);

      expect(active).toBe(false);
      expect(accepted).toBe(true);
    });

    it(OUTBOUND_SCENARIO_IDS[10], async () => {
      const driver = factory();
      await driver.start();
      await driver.sendApplicationMessage({
        idempotencyKey: "logs-1",
        chatId: "chat-1",
        text: "payload",
      });
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.logs.length > 0).toBe(true);
      expect(
        snapshot.logs.every(
          (record) =>
            typeof record.timestamp === "string" &&
            typeof record.event === "string" &&
            record.event.includes(".") &&
            record.runtimeId.length > 0,
        ),
      ).toBe(true);
    });

    it(OUTBOUND_SCENARIO_IDS[11], async () => {
      const driver = factory();
      const secret = "123456:AASecretTokenValue";
      await driver.start();
      driver.enqueuePollBatch(sensitiveBatch(secret));
      await driver.sendApplicationMessage({
        idempotencyKey: "secret-1",
        chatId: "chat-secret",
        text: secret,
      });
      await driver.flush();
      const snapshot = await driver.snapshot();
      const serializedLogs = JSON.stringify(snapshot.logs);

      expect(serializedLogs.includes(secret)).toBe(false);
      expect(serializedLogs.includes("private-message-body")).toBe(false);
    });
  });
}
