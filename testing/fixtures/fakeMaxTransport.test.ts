import { describe, expect, it } from "vitest";
import { createFakeMaxTransport } from "./fakeMaxTransport.js";

describe("FakeMaxTransport", () => {
  it("returns queued batches and controlled failures in order", async () => {
    const transport = createFakeMaxTransport();
    transport.failNextPoll({
      version: 1,
      source: "max_api",
      kind: "retryable",
      code: "http_500",
      message: "temporary",
      status: 500,
    });
    transport.enqueueBatch({
      version: 1,
      marker: "m-2",
      updates: [],
    });

    await expect(
      transport.getUpdates({ timeoutSeconds: 30, allowedUpdateTypes: [] }),
    ).rejects.toMatchObject({ code: "http_500" });

    await expect(
      transport.getUpdates({ timeoutSeconds: 30, allowedUpdateTypes: [] }),
    ).resolves.toMatchObject({ marker: "m-2" });
  });

  it("records send requests and returns server acceptance", async () => {
    const transport = createFakeMaxTransport();
    await expect(
      transport.send({ chatId: "chat-1", text: "payload" }),
    ).resolves.toMatchObject({
      ok: true,
      receipt: { chatId: "chat-1", messageId: "fake-message-1" },
    });
    expect(transport.sent).toHaveLength(1);
  });

  it("returns normalized controlled send failures", async () => {
    const transport = createFakeMaxTransport();
    transport.failNextSend({
      version: 1,
      source: "max_api",
      kind: "retryable",
      code: "http_429",
      message: "rate limited",
      status: 429,
      retryAfterMs: 3_000,
    });

    await expect(
      transport.send({ chatId: "chat-1", text: "payload" }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: "http_429", retryAfterMs: 3_000 },
    });
  });

  it("rejects transport operations after stop", async () => {
    const transport = createFakeMaxTransport();
    await transport.stop();

    await expect(transport.getBotIdentity()).rejects.toThrow("stopped");
    await expect(
      transport.getUpdates({ timeoutSeconds: 30, allowedUpdateTypes: [] }),
    ).rejects.toThrow("stopped");
    await expect(
      transport.send({ chatId: "chat-1", text: "payload" }),
    ).rejects.toThrow("stopped");
  });

});
