import {
  ARCHITECTURE_SCENARIO_IDS,
  registerArchitectureConformance,
} from "./architecture.js";
import { INBOUND_SCENARIO_IDS, registerInboundConformance } from "./inbound.js";
import { POLLING_SCENARIO_IDS, registerPollingConformance } from "./polling.js";
import { OUTBOUND_SCENARIO_IDS, registerOutboundConformance } from "./outbound.js";
import { SHUTDOWN_SCENARIO_IDS, registerShutdownConformance } from "./shutdown.js";
import type { RuntimeConformanceFactory } from "./types.js";

export * from "./types.js";

export const REQUIRED_CONFORMANCE_SCENARIO_IDS = [
  ...ARCHITECTURE_SCENARIO_IDS,
  ...POLLING_SCENARIO_IDS,
  ...INBOUND_SCENARIO_IDS,
  ...OUTBOUND_SCENARIO_IDS,
  ...SHUTDOWN_SCENARIO_IDS,
] as const;

export function runRuntimeConformanceSuite(factory: RuntimeConformanceFactory): void {
  registerArchitectureConformance(factory);
  registerPollingConformance(factory);
  registerInboundConformance(factory);
  registerOutboundConformance(factory);
  registerShutdownConformance(factory);
}
