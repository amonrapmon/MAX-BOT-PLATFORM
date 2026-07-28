import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

describe("normative contract boundaries", () => {
  it("rejects SDK imports and business-specific concepts", async () => {
    const root = await mkdtemp(join(tmpdir(), "max-platform-boundary-"));
    await mkdir(join(root, "contracts"), { recursive: true });
    await writeFile(
      join(root, "contracts", "bad.ts"),
      [
        'import { Bot } from "max-io";',
        'export const dikidiAppointment = "business leakage";',
      ].join("\n"),
    );

    const moduleUrl = pathToFileURL(
      join(process.cwd(), "scripts/check-contract-boundaries.mjs"),
    ).href;
    const { checkContractBoundaries } = await import(moduleUrl);
    const violations = await checkContractBoundaries(root);

    expect(violations.map((item: { rule: string }) => item.rule)).toEqual(
      expect.arrayContaining(["sdk-import", "business-vocabulary"]),
    );
  });
});
