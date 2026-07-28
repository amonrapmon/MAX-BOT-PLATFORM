import { describe, expect, it } from "vitest";
import type { RuntimeConformanceFactory } from "./types.js";

export const SHUTDOWN_SCENARIO_IDS = [
  "MAX-OPS-002.graceful-shutdown",
  "MAX-OPS-003.no-new-work-during-shutdown",
  "MAX-OPS-004.shutdown-timeout",
] as const;

export function registerShutdownConformance(factory: RuntimeConformanceFactory): void {
  describe("shutdown conformance", () => {
    it(SHUTDOWN_SCENARIO_IDS[0], async () => {
      const driver = factory();
      await driver.start();
      await driver.stop();
      const snapshot = await driver.snapshot();

      expect(snapshot.stopped).toBe(true);
      expect(snapshot.started).toBe(false);
      expect(snapshot.pollingActive).toBe(false);
      expect(snapshot.ownerHeld).toBe(false);
      expect(snapshot.health.status).toBe("stopped");
    });

    it(SHUTDOWN_SCENARIO_IDS[1], async () => {
      const driver = factory();
      await driver.start();
      await driver.stop();
      const before = await driver.snapshot();

      await expect(
        driver.sendApplicationMessage({
          idempotencyKey: "late-1",
          chatId: "chat-1",
          text: "late",
        }),
      ).rejects.toThrow("not accepting");
      await driver.flush();
      const after = await driver.snapshot();
      expect(after.pollRequestCount).toBe(before.pollRequestCount);
      expect(after.sendRequestCount).toBe(before.sendRequestCount);
    });

    it(SHUTDOWN_SCENARIO_IDS[2], async () => {
      const driver = factory({ shutdownTimeoutMs: 30_000 });
      driver.setShutdownDrainMs(30_001);
      await driver.start();
      await expect(driver.stop()).rejects.toMatchObject({
        code: "shutdown_timeout",
      });
      const snapshot = await driver.snapshot();

      expect(snapshot.shutdownTimedOut).toBe(true);
      expect(
        snapshot.logs.some((record) => record.event === "shutdown.timeout"),
      ).toBe(true);
    });
  });
}
