import { describe, expectTypeOf, it } from "vitest";
import type {
  BotApplication,
  BotContext,
  MaxTransportAdapter,
  PollingBatchV1,
  TransportSendResultV1,
} from "../../contracts/index.js";

describe("platform ports", () => {
  it("keeps application and transport ports SDK independent", () => {
    expectTypeOf<BotApplication["handle"]>().toBeFunction();
    expectTypeOf<BotContext["send"]>().toBeFunction();
    expectTypeOf<MaxTransportAdapter["getUpdates"]>().toBeFunction();
    expectTypeOf<PollingBatchV1["marker"]>().toEqualTypeOf<string>();
    expectTypeOf<TransportSendResultV1>().toMatchTypeOf<
      | {
          ok: true;
          receipt: {
            messageId: string;
            chatId: string;
            acceptedAt: string;
          };
        }
      | {
          ok: false;
          error: unknown;
        }
    >();
  });
});
