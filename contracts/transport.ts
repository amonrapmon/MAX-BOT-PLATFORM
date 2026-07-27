import type { RuntimeErrorV1 } from "./errors.js";

export interface BotIdentityV1 {
  version: 1;
  botUserId: string;
  username?: string;
  displayName?: string;
}

export interface RawTransportUpdateV1 {
  version: 1;
  updateType: string;
  payload: unknown;
}

export interface PollingRequestV1 {
  marker?: string;
  timeoutSeconds: number;
  allowedUpdateTypes: string[];
}

export interface PollingBatchV1 {
  version: 1;
  marker: string;
  updates: RawTransportUpdateV1[];
}

export interface MarkSeenRequestV1 {
  chatId: string;
  messageId: string;
}

export interface CallbackAckRequestV1 {
  callbackId: string;
  notification?: string;
}

export interface TransportSendRequestV1 {
  chatId: string;
  text?: string;
  format?: "plain" | "markdown";
  attachments?: readonly unknown[];
}

export interface MaxAcceptanceV1 {
  messageId: string;
  chatId: string;
  acceptedAt: string;
}

export type TransportSendResultV1 =
  | { ok: true; receipt: MaxAcceptanceV1 }
  | { ok: false; error: RuntimeErrorV1 };

export interface MaxTransportAdapter {
  getBotIdentity(): Promise<BotIdentityV1>;
  getUpdates(request: PollingRequestV1): Promise<PollingBatchV1>;
  markSeen(input: MarkSeenRequestV1): Promise<void>;
  acknowledgeCallback(input: CallbackAckRequestV1): Promise<void>;
  send(input: TransportSendRequestV1): Promise<TransportSendResultV1>;
  stop(): Promise<void>;
}
