import { describe, expect, it } from "vitest";
import type { PollingBatchV1 } from "../../contracts/transport.js";
import type { RuntimeConformanceFactory } from "./types.js";

export const INBOUND_SCENARIO_IDS = [
  "MAX-IN-005.stable-event-id",
  "MAX-IN-006.completed-duplicate",
  "MAX-IN-007.application-failure-replay",
] as const;

function batch(marker: string, messageId: string, text = "hello"): PollingBatchV1 {
  return {
    version: 1,
    marker,
    updates: [
      {
        version: 1,
        updateType: "message",
        payload: {
          type: "message",
          chatId: "chat-1",
          messageId,
          text,
          occurredAt: "2026-07-27T12:00:00.000Z",
        },
      },
    ],
  };
}

export function registerInboundConformance(factory: RuntimeConformanceFactory): void {
  describe("inbound conformance", () => {
    it(INBOUND_SCENARIO_IDS[0], async () => {
      const left = factory();
      const right = factory();
      await left.start();
      await right.start();
      left.enqueuePollBatch(batch("m-1", "same-message"));
      right.enqueuePollBatch(batch("m-1", "same-message"));
      await left.flush();
      await right.flush();
      const leftSnapshot = await left.snapshot();
      const rightSnapshot = await right.snapshot();

      expect(leftSnapshot.applicationEvents[0]!.eventId).toBe(
        rightSnapshot.applicationEvents[0]!.eventId,
      );
      expect(leftSnapshot.applicationEvents[0]!.eventId).toBe(
        "message:same-message",
      );
    });

    it(INBOUND_SCENARIO_IDS[1], async () => {
      const driver = factory();
      await driver.start();
      driver.enqueuePollBatch(batch("m-1", "duplicate"));
      await driver.flush();
      driver.enqueuePollBatch(batch("m-2", "duplicate"));
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.applicationEvents).toHaveLength(1);
      expect(snapshot.completedEventIds).toEqual(["message:duplicate"]);
      expect(
        snapshot.logs.some((record) => record.event === "inbound.duplicate_skipped"),
      ).toBe(true);
    });

    it(INBOUND_SCENARIO_IDS[2], async () => {
      const driver = factory();
      driver.failApplicationOnce("message:retry-me");
      await driver.start();
      driver.enqueuePollBatch(batch("m-1", "retry-me"));
      await driver.flush();
      let snapshot = await driver.snapshot();
      expect(snapshot.completedEventIds.includes("message:retry-me")).toBe(false);

      driver.enqueuePollBatch(batch("m-1", "retry-me"));
      await driver.flush();
      snapshot = await driver.snapshot();
      expect(snapshot.applicationEvents).toHaveLength(2);
      expect(snapshot.completedEventIds.includes("message:retry-me")).toBe(true);
      expect(snapshot.marker).toBe("m-1");
    });
  });
}
