import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const formatsModule = require("ajv-formats") as
  | FormatsPlugin
  | { default: FormatsPlugin };
const addFormats: FormatsPlugin =
  typeof formatsModule === "function" ? formatsModule : formatsModule.default;

async function json(path: string) {
  return JSON.parse(await readFile(join(process.cwd(), path), "utf8"));
}

function validator() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv;
}

describe("platform JSON schemas", () => {
  it("accepts valid event and rejects invalid event", async () => {
    const validate = validator().compile(
      await json("schemas/event-envelope.schema.json"),
    );
    expect(validate(await json("schemas/fixtures/event.valid.json"))).toBe(true);
    expect(validate(await json("schemas/fixtures/event.invalid.json"))).toBe(false);
  });

  it.each([
    ["schemas/outbound-job.schema.json", "schemas/fixtures/outbound-job.valid.json"],
    ["schemas/health-snapshot.schema.json", "schemas/fixtures/health.valid.json"],
    ["schemas/runtime-error.schema.json", "schemas/fixtures/runtime-error.valid.json"],
  ])("validates %s", async (schemaPath, fixturePath) => {
    const validate = validator().compile(await json(schemaPath));
    expect(validate(await json(fixturePath))).toBe(true);
  });
});
