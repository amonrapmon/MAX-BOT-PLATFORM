import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("transport recovery runbook", () => {
  it("contains exact loss, recovery, duplicate, and evidence gates", async () => {
    const content = await readFile(
      "docs/operations/transport-smoke.md",
      "utf8",
    );
    for (const required of [
      "docker network disconnect",
      "docker network connect",
      "polling.connection_lost",
      "polling.connection_restored",
      "marker",
      "duplicate",
      "accepted_by_max",
      "commit SHA",
    ]) {
      expect(content).toContain(required);
    }
  });
});
