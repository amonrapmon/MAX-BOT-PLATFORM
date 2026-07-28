import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

async function loadValidator() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/validate-redis-registry.mjs")).href
  );
}

describe("Redis registry", () => {
  it("has unique names and explicit TTL and atomicity semantics", async () => {
    const markdown = await readFile("schemas/redis-keys.md", "utf8");
    const { validateRedisRegistry } = await loadValidator();
    expect(validateRedisRegistry(markdown)).toEqual([]);
  });

  it("rejects duplicate keys and missing atomic transitions", async () => {
    const { validateRedisRegistry } = await loadValidator();
    const markdown = `
| Name | Key | Value contract | TTL | Atomic operations | Requirement IDs |
|---|---|---|---|---|---|
| transport.owner | maxbot:{runtimeId}:transport:owner | PollingOwnerV1 | 30s | none | MAX-IN-003 |
| duplicate.owner | maxbot:{runtimeId}:transport:owner | PollingOwnerV1 | 30s | none | MAX-IN-003 |
`;
    const codes = validateRedisRegistry(markdown).map(
      (error: { code: string }) => error.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining(["duplicate-key", "missing-atomic-operations"]),
    );
  });
});
