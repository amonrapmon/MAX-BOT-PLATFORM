import { describe, expect, it } from "vitest";
import { createManualClock } from "./manualClock.js";

describe("ManualClock", () => {
  it("resolves sleepers only after time advances", async () => {
    const clock = createManualClock("2026-07-27T12:00:00.000Z");
    let resolved = false;
    const sleeping = clock.sleep(1_000).then(() => {
      resolved = true;
    });

    await clock.advanceBy(999);
    expect(resolved).toBe(false);

    await clock.advanceBy(1);
    await sleeping;
    expect(resolved).toBe(true);
    expect(clock.now().toISOString()).toBe("2026-07-27T12:00:01.000Z");
  });

  it("rejects an aborted sleep without advancing time", async () => {
    const clock = createManualClock("2026-07-27T12:00:00.000Z");
    const abort = new AbortController();
    const sleeping = clock.sleep(5_000, abort.signal);
    abort.abort(new Error("shutdown"));

    await expect(sleeping).rejects.toThrow("shutdown");
    expect(clock.pendingSleepCount).toBe(0);
  });
});
