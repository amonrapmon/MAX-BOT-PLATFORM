import type { RuntimeErrorV1 } from "../../contracts/errors.js";
import type {
  BotIdentityV1,
  CallbackAckRequestV1,
  MarkSeenRequestV1,
  MaxTransportAdapter,
  PollingBatchV1,
  PollingRequestV1,
  TransportSendRequestV1,
  TransportSendResultV1,
} from "../../contracts/transport.js";

type PollOutcome =
  | { kind: "batch"; batch: PollingBatchV1 }
  | { kind: "error"; error: RuntimeErrorV1 };

type SendOutcome = { result: TransportSendResultV1 };

export interface FakeMaxTransportOptions {
  identity?: BotIdentityV1;
  now?: () => Date;
}

const DEFAULT_IDENTITY: BotIdentityV1 = {
  version: 1,
  botUserId: "fake-bot-1",
  username: "fake_bot",
  displayName: "Fake MAX Bot",
};

function cloneBatch(batch: PollingBatchV1): PollingBatchV1 {
  return {
    version: 1,
    marker: batch.marker,
    updates: batch.updates.map((update) => ({ ...update })),
  };
}

function cloneSendRequest(request: TransportSendRequestV1): TransportSendRequestV1 {
  return {
    chatId: request.chatId,
    ...(request.text === undefined ? {} : { text: request.text }),
    ...(request.format === undefined ? {} : { format: request.format }),
    ...(request.attachments === undefined
      ? {}
      : { attachments: [...request.attachments] }),
  };
}

export class FakeMaxTransport implements MaxTransportAdapter {
  readonly pollingRequests: PollingRequestV1[] = [];
  readonly sent: TransportSendRequestV1[] = [];
  readonly seen: MarkSeenRequestV1[] = [];
  readonly acknowledgements: CallbackAckRequestV1[] = [];

  private identity: BotIdentityV1;
  private readonly nowProvider: () => Date;
  private readonly pollOutcomes: PollOutcome[] = [];
  private readonly sendOutcomes: SendOutcome[] = [];
  private nextMessageNumber = 1;
  private stopped = false;

  constructor(options: FakeMaxTransportOptions = {}) {
    this.identity = { ...(options.identity ?? DEFAULT_IDENTITY) };
    this.nowProvider = options.now ?? (() => new Date(0));
  }

  get isStopped(): boolean {
    return this.stopped;
  }

  setIdentity(identity: BotIdentityV1): void {
    this.ensureRunning();
    this.identity = { ...identity };
  }

  enqueueBatch(batch: PollingBatchV1): void {
    this.ensureRunning();
    this.pollOutcomes.push({ kind: "batch", batch: cloneBatch(batch) });
  }

  failNextPoll(error: RuntimeErrorV1): void {
    this.ensureRunning();
    this.pollOutcomes.push({ kind: "error", error: { ...error } });
  }

  enqueueSendResult(result: TransportSendResultV1): void {
    this.ensureRunning();
    this.sendOutcomes.push({ result });
  }

  failNextSend(error: RuntimeErrorV1): void {
    this.enqueueSendResult({ ok: false, error: { ...error } });
  }

  async getBotIdentity(): Promise<BotIdentityV1> {
    this.ensureRunning();
    return { ...this.identity };
  }

  async getUpdates(request: PollingRequestV1): Promise<PollingBatchV1> {
    this.ensureRunning();
    this.pollingRequests.push({
      ...(request.marker === undefined ? {} : { marker: request.marker }),
      timeoutSeconds: request.timeoutSeconds,
      allowedUpdateTypes: [...request.allowedUpdateTypes],
    });

    const outcome = this.pollOutcomes.shift();
    if (!outcome) {
      return {
        version: 1,
        marker: request.marker ?? "0",
        updates: [],
      };
    }
    if (outcome.kind === "error") {
      throw { ...outcome.error };
    }
    return cloneBatch(outcome.batch);
  }

  async markSeen(input: MarkSeenRequestV1): Promise<void> {
    this.ensureRunning();
    this.seen.push({ ...input });
  }

  async acknowledgeCallback(input: CallbackAckRequestV1): Promise<void> {
    this.ensureRunning();
    this.acknowledgements.push({
      callbackId: input.callbackId,
      ...(input.notification === undefined ? {} : { notification: input.notification }),
    });
  }

  async send(request: TransportSendRequestV1): Promise<TransportSendResultV1> {
    this.ensureRunning();
    this.sent.push(cloneSendRequest(request));

    const outcome = this.sendOutcomes.shift();
    if (outcome) {
      return outcome.result.ok
        ? { ok: true, receipt: { ...outcome.result.receipt } }
        : { ok: false, error: { ...outcome.result.error } };
    }

    return {
      ok: true,
      receipt: {
        messageId: `fake-message-${this.nextMessageNumber++}`,
        chatId: request.chatId,
        acceptedAt: this.nowProvider().toISOString(),
      },
    };
  }

  async stop(): Promise<void> {
    this.stopped = true;
  }

  private ensureRunning(): void {
    if (this.stopped) {
      throw new Error("FakeMaxTransport is stopped");
    }
  }
}

export function createFakeMaxTransport(
  options: FakeMaxTransportOptions = {},
): FakeMaxTransport {
  return new FakeMaxTransport(options);
}
