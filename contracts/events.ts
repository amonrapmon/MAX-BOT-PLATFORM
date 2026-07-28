export type BotEventTypeV1 =
  | "message"
  | "callback"
  | "bot_started"
  | "bot_stopped"
  | "dialog_removed";

export interface BotEventV1 {
  version: 1;
  eventId: string;
  type: BotEventTypeV1;
  chatId: string;
  userId?: string;
  messageId?: string;
  text?: string;
  callbackData?: string;
  occurredAt: string;
}
