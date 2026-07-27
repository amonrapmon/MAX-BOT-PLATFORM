export type RuntimeErrorSourceV1 =
  | "max_api"
  | "state_store"
  | "polling"
  | "inbound"
  | "outbound"
  | "configuration"
  | "application";

export type RuntimeErrorKindV1 =
  | "retryable"
  | "permanent"
  | "ownership_lost"
  | "shutdown";

export interface RuntimeErrorV1 {
  version: 1;
  source: RuntimeErrorSourceV1;
  kind: RuntimeErrorKindV1;
  code: string;
  message: string;
  status?: number;
  retryAfterMs?: number;
  causeName?: string;
}
