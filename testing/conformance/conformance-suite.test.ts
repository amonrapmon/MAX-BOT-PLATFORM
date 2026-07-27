import { describe, expect, it } from "vitest";
import {
  REQUIRED_CONFORMANCE_SCENARIO_IDS,
  runRuntimeConformanceSuite,
} from "./index.js";
import { createReferenceRuntimeConformanceFactory } from "../fixtures/referenceRuntimeDriver.js";

describe("conformance scenario registry", () => {
  it("contains every stable v1 scenario exactly once", () => {
    expect(new Set(REQUIRED_CONFORMANCE_SCENARIO_IDS).size).toBe(
      REQUIRED_CONFORMANCE_SCENARIO_IDS.length,
    );
    expect(REQUIRED_CONFORMANCE_SCENARIO_IDS).toHaveLength(29);
    expect(REQUIRED_CONFORMANCE_SCENARIO_IDS).toEqual(
      expect.arrayContaining([
        "MAX-ARCH-001.application-boundary",
        "MAX-IN-001.marker-restoration",
        "MAX-IN-002.partial-batch-marker",
        "MAX-IN-003.single-owner",
        "MAX-IN-004.owner-loss",
        "MAX-IN-006.completed-duplicate",
        "MAX-OUT-002.idempotent-enqueue",
        "MAX-OUT-003.lease-fencing",
        "MAX-OUT-006.attempt-eight-dead-letter",
        "MAX-OUT-007.accepted-by-max",
        "MAX-REL-002.retry-after",
        "MAX-REL-003.redis-loss-pauses-work",
        "MAX-OPS-002.graceful-shutdown",
      ]),
    );
  });
});

runRuntimeConformanceSuite(createReferenceRuntimeConformanceFactory());
