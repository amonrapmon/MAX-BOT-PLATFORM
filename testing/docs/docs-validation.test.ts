import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

describe("documentation set", () => {
  it("contains every required document and no broken local links", async () => {
    const { validateDocs } = await import(
      pathToFileURL(join(process.cwd(), "scripts/validate-docs.mjs")).href
    );
    expect(await validateDocs(process.cwd())).toEqual([]);
  });
});
