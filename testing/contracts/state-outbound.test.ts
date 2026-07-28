import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  AcceptanceReceiptV1,
  InboundEventStateV1,
  OutboundJobV1,
  PollingMarkerV1,
  PollingOwnerV1,
} from "../../contracts/index.js";

describe("durable state contracts", () => {
  it("versions every serialized structure", () => {
    expectTypeOf<PollingMarkerV1["version"]>().toEqualTypeOf<1>();
    expectTypeOf<PollingOwnerV1["version"]>().toEqualTypeOf<1>();
    expectTypeOf<OutboundJobV1["version"]>().toEqualTypeOf<1>();
    expectTypeOf<AcceptanceReceiptV1["version"]>().toEqualTypeOf<1>();
  });

  it("models inbound state as processing or completed", () => {
    const state: InboundEventStateV1 = {
      version: 1,
      status: "processing",
      ownerId: "worker-1",
      startedAt: "2026-07-27T12:00:00.000Z",
    };
    expect(state.status).toBe("processing");
  });
});
