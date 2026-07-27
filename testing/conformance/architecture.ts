import { describe, expect, it } from "vitest";
import type { PollingBatchV1 } from "../../contracts/transport.js";
import type { RuntimeConformanceFactory } from "./types.js";

export const ARCHITECTURE_SCENARIO_IDS = [
  "MAX-ARCH-001.application-boundary",
  "MAX-ARCH-002.sdk-isolation",
] as const;

function messageBatch(marker: string): PollingBatchV1 {
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
          messageId: "mid-1",
          text: "hello",
          occurredAt: "2026-07-27T12:00:00.000Z",
        },
      },
    ],
  };
}

export function registerArchitectureConformance(
  factory: RuntimeConformanceFactory,
): void {
  describe("architecture conformance", () => {
    it(ARCHITECTURE_SCENARIO_IDS[0], async () => {
      const driver = factory();
      await driver.start();
      driver.enqueuePollBatch(messageBatch("m-1"));
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.applicationEvents).toHaveLength(1);
      expect(snapshot.applicationContextKeys).toEqual(["send"]);
      expect("payload" in snapshot.applicationEvents[0]!).toBe(false);
    });

    it(ARCHITECTURE_SCENARIO_IDS[1], async () => {
      const driver = factory();
      await driver.start();
      driver.enqueuePollBatch(messageBatch("m-1"));
      await driver.flush();
      const snapshot = await driver.snapshot();

      expect(snapshot.sdkObjectsExposed).toBe(false);
      expect("updateType" in snapshot.applicationEvents[0]!).toBe(false);
    });
  });
}
