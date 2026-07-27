import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

async function loadValidator() {
  return import(
    pathToFileURL(join(process.cwd(), "scripts/validate-standard.mjs")).href
  );
}

describe("STANDARD.md validation", () => {
  it("rejects duplicate IDs and stable MUST requirements without PROVEN status", async () => {
    const { validateStandard } = await loadValidator();
    const markdown = `
### MAX-IN-001 — First
- Status: EXPERIMENTAL
- Level: MUST
- Contract: contracts/transport.ts#PollingRequestV1
- Test: testing/conformance/polling.ts#marker-restoration

Statement:
First statement.

Rationale:
First rationale.

Verification:
First verification.

### MAX-IN-001 — Duplicate
- Status: PROVEN
- Level: SHOULD
- Contract: contracts/transport.ts#PollingRequestV1
- Test: testing/conformance/polling.ts#marker-restoration

Statement:
Second statement.

Rationale:
Second rationale.

Verification:
Second verification.
`;

    const errors = validateStandard(markdown);
    expect(errors.map((error: { code: string }) => error.code)).toEqual(
      expect.arrayContaining(["duplicate-id", "stable-must-not-proven"]),
    );
  });

  it("accepts the complete stable v1 registry", async () => {
    const { parseStandard, validateStandard } = await loadValidator();
    const markdown = await readFile("STANDARD.md", "utf8");
    expect(validateStandard(markdown)).toEqual([]);
    expect(parseStandard(markdown)).toHaveLength(41);
  });
});
