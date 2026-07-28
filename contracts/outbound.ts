import type { OutboundMessageV1 } from "./runtime.js";

export interface OutboundLeaseV1 {
  ownerId: string;
  leasedUntil: string;
}

export interface OutboundJobV1 {
  version: 1;
  jobId: string;
  idempotencyKey: string;
  chatId: string;
  payload: OutboundMessageV1;
  priority: number;
  attempt: number;
  maxAttempts: number;
  createdAt: string;
  availableAt: string;
  lease?: OutboundLeaseV1;
}

export interface AcceptanceReceiptV1 {
  version: 1;
  jobId: string;
  messageId: string;
  chatId: string;
  acceptedAt: string;
}

export interface DeadLetterRecordV1 {
  version: 1;
  jobId: string;
  chatId: string;
  attempt: number;
  reasonCode: string;
  failedAt: string;
}
