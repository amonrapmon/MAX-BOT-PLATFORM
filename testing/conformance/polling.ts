import { describe, expect, it } from "vitest";
import type { RuntimeErrorV1 } from "../../contracts/errors.js";
import type { PollingBatchV1, RawTransportUpdateV1 } from "../../contracts/transport.js";
import type { RuntimeConformanceFactory } from "./types.js";

export const POLLING_SCENARIO_IDS = [
  "MAX-IN-001.marker-restoration",
  "MAX-IN-002.partial-batch-marker",
  "MAX-IN-003.single-owner",
  "MAX-IN-004.owner-loss",
  "MAX-REL-001.exponential-backoff",
  "MAX-REL-003.redis-loss-pauses-work",
  "MAX-REL-004.unknown-state-version",
  "MAX-OBS-004.health-recovery",
  "MAX-OPS-001.invalid-config-before-poll",
] as const;

function message(messageId: string, text = "hello"): RawTransportUpdateV1 {
  return {
    version: 1,
    updateType: "message",
    payload: {
      type: "message",
      chatId: "chat-1",
      messageId,
      text,
      occurredAt: "2026-07-27T12:00:00.000Z",
    },
  };
}

function batch(marker: string, updates: RawTransportUpdateV1[]): PollingBatchV1 {
  return { version: 1, marker, updates };
}

function retryablePollError(code = "http_500"): RuntimeErrorV1 {
  return {
    version: 1,
    source: "max_api",
    kind: "retryable",
    code,
    message: "temporary transport failure",
    status: 500,
  };
}

export function registerPollingConformance(factory: RuntimeConformanceFactory): void {
  describe("polling conformance", () => {
    it(POLLING_SCENARIO_IDS[0], async () => {
      const driver = factory();
      driver.setStoredMarker("m-5");
      await driver.start();
      driver.enqueuePollBatch(batch("m-6", []));
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.pollingRequestMarkers[0]).toBe("m-5");
      expect(snapshot.marker).toBe("m-6");
    });

    it(POLLING_SCENARIO_IDS[1], async () => {
      const driver = factory();
      driver.setStoredMarker("m-0");
      driver.failApplicationOnce("message:e-2");
      await driver.start();
      const replay = batch("m-1", [message("e-1"), message("e-2")]);
      driver.enqueuePollBatch(replay);
      await driver.flush();
      let snapshot = await driver.snapshot();

      expect(snapshot.marker).toBe("m-0");
      expect(snapshot.completedEventIds.includes("message:e-1")).toBe(true);
      expect(snapshot.completedEventIds.includes("message:e-2")).toBe(false);

      driver.enqueuePollBatch(replay);
      await driver.flush();
      snapshot = await driver.snapshot();
      expect(snapshot.marker).toBe("m-1");
      expect(snapshot.completedEventIds.includes("message:e-2")).toBe(true);
    });

    it(POLLING_SCENARIO_IDS[2], async () => {
      const driver = factory();
      await driver.start();
      expect(await driver.simulateCompetingOwner()).toBe("rejected");
      const snapshot = await driver.snapshot();
      expect(snapshot.ownerHeld).toBe(true);
    });

    it(POLLING_SCENARIO_IDS[3], async () => {
      const driver = factory();
      await driver.start();
      await driver.losePollingOwnership();
      const snapshot = await driver.snapshot();
      expect(snapshot.ownerHeld).toBe(false);
      expect(snapshot.pollingActive).toBe(false);
      expect(snapshot.health.status).toBe("unhealthy");
    });

    it(POLLING_SCENARIO_IDS[4], async () => {
      const driver = factory();
      await driver.start();
      const expected = [1_000, 2_000, 4_000, 8_000, 10_000];
      for (const delay of expected) {
        driver.failNextPoll(retryablePollError());
        await driver.flush();
        await driver.advanceTime(delay);
      }
      const snapshot = await driver.snapshot();
      expect(snapshot.retryDelaysMs.slice(0, 5)).toEqual(expected);
    });

    it(POLLING_SCENARIO_IDS[5], async () => {
      const driver = factory();
      await driver.start();
      driver.enqueuePollBatch(batch("m-1", [message("e-1")]));
      await driver.sendApplicationMessage({
        idempotencyKey: "out-1",
        chatId: "chat-1",
        text: "queued",
      });
      await driver.disconnectStateStore();
      await driver.flush();
      let snapshot = await driver.snapshot();

      expect(snapshot.pollRequestCount).toBe(0);
      expect(snapshot.sendRequestCount).toBe(0);
      expect(snapshot.outboundJobs).toHaveLength(1);
      expect(snapshot.health.status).toBe("degraded");

      await driver.reconnectStateStore();
      await driver.flush();
      snapshot = await driver.snapshot();
      expect(snapshot.pollRequestCount).toBe(1);
      expect(snapshot.sendRequestCount).toBe(1);
      expect(snapshot.health.status).toBe("healthy");
    });

    it(POLLING_SCENARIO_IDS[6], async () => {
      const driver = factory();
      driver.setStoredStateVersion(2);
      await expect(driver.start()).rejects.toMatchObject({
        code: "unknown_state_version",
      });
      const snapshot = await driver.snapshot();
      expect(snapshot.pollRequestCount).toBe(0);
    });

    it(POLLING_SCENARIO_IDS[7], async () => {
      const driver = factory();
      await driver.start();
      await driver.disconnectStateStore();
      let snapshot = await driver.snapshot();
      expect(snapshot.health.status).toBe("degraded");
      await driver.reconnectStateStore();
      snapshot = await driver.snapshot();
      expect(snapshot.health.status).toBe("healthy");
      expect(
        snapshot.logs.some((record) => record.event === "state_store.connection_restored"),
      ).toBe(true);
    });

    it(POLLING_SCENARIO_IDS[8], async () => {
      const driver = factory({ validConfig: false });
      await expect(driver.start()).rejects.toMatchObject({
        code: "invalid_configuration",
      });
      const snapshot = await driver.snapshot();
      expect(snapshot.pollRequestCount).toBe(0);
      expect(snapshot.configError).toBe("invalid_configuration");
    });
  });
}
