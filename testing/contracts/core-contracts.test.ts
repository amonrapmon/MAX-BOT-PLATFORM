import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  BotEventV1,
  RuntimeErrorV1,
  RuntimeHealthV1,
} from "../../contracts/index.js";

describe("core contracts", () => {
  it("uses explicit v1 discriminators and stable status unions", () => {
    expectTypeOf<BotEventV1["version"]>().toEqualTypeOf<1>();
    expectTypeOf<BotEventV1["type"]>().toEqualTypeOf<
      "message" | "callback" | "bot_started" | "bot_stopped" | "dialog_removed"
    >();
    expectTypeOf<RuntimeErrorV1["kind"]>().toEqualTypeOf<
      "retryable" | "permanent" | "ownership_lost" | "shutdown"
    >();
    expectTypeOf<RuntimeHealthV1["status"]>().toEqualTypeOf<
      | "starting"
      | "healthy"
      | "degraded"
      | "recovering"
      | "unhealthy"
      | "stopping"
      | "stopped"
    >();
  });

  it("allows a minimal normalized message event", () => {
    const event: BotEventV1 = {
      version: 1,
      eventId: "message:mid-1",
      type: "message",
      chatId: "chat-1",
      messageId: "mid-1",
      occurredAt: "2026-07-27T12:00:00.000Z",
    };
    expect(event.version).toBe(1);
  });
});
