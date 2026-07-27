export type RuntimeHealthStatusV1 =
  | "starting"
  | "healthy"
  | "degraded"
  | "recovering"
  | "unhealthy"
  | "stopping"
  | "stopped";

export interface ComponentHealthV1 {
  status: "up" | "degraded" | "down";
  lastSuccessAt?: string;
  lastFailureAt?: string;
  consecutiveFailures: number;
  errorCode?: string;
}

export interface RuntimeHealthV1 {
  version: 1;
  status: RuntimeHealthStatusV1;
  polling: ComponentHealthV1;
  stateStore: ComponentHealthV1;
  outbound: ComponentHealthV1;
  updatedAt: string;
}
