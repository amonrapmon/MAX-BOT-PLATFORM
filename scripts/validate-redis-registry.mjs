import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXPECTED_HEADERS = [
  "Name",
  "Key",
  "Value contract",
  "TTL",
  "Atomic operations",
  "Requirement IDs",
];

const ATOMIC_REQUIRED = new Set([
  "transport.owner",
  "inbound.event",
  "outbound.job",
  "outbound.scheduled",
  "outbound.receipt",
  "outbound.dead",
  "outbound.dead.job",
]);

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((value) => value.trim().replace(/^`|`$/g, ""));
}

export function parseRedisRegistry(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) =>
    line.includes("| Name | Key | Value contract | TTL | Atomic operations | Requirement IDs |"),
  );
  if (headerIndex < 0) return [];

  const headers = cells(lines[headerIndex]);
  const rows = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.trim().startsWith("|")) break;
    const values = cells(line);
    if (values.length !== headers.length) continue;
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  }
  return rows;
}

export function validateRedisRegistry(markdown) {
  const errors = [];
  const lines = markdown.split(/\r?\n/);
  const headerLine = lines.find((line) => line.includes("| Name | Key |"));
  const headers = headerLine ? cells(headerLine) : [];
  if (JSON.stringify(headers) !== JSON.stringify(EXPECTED_HEADERS)) {
    errors.push({ code: "invalid-headers", headers });
  }

  const rows = parseRedisRegistry(markdown);
  if (rows.length === 0) errors.push({ code: "no-rows" });

  const names = new Set();
  const keys = new Set();
  for (const row of rows) {
    const name = row.Name ?? "";
    const key = row.Key ?? "";
    if (!name) errors.push({ code: "blank-name" });
    if (names.has(name)) errors.push({ code: "duplicate-name", name });
    names.add(name);

    if (!key) errors.push({ code: "blank-key", name });
    if (keys.has(key)) errors.push({ code: "duplicate-key", name, key });
    keys.add(key);

    if (!(row["Value contract"] ?? "")) {
      errors.push({ code: "blank-value-contract", name });
    }
    if (!(row.TTL ?? "")) errors.push({ code: "blank-ttl", name });

    const atomic = (row["Atomic operations"] ?? "").trim().toLowerCase();
    if (ATOMIC_REQUIRED.has(name) && (!atomic || atomic === "none")) {
      errors.push({ code: "missing-atomic-operations", name });
    }

    const requirementIds = row["Requirement IDs"] ?? "";
    for (const value of requirementIds.split(",").map((item) => item.trim()).filter(Boolean)) {
      if (!/^MAX-(?:ARCH|IN|OUT|REL|OBS|SEC|OPS|TEST)-\d{3}$/.test(value)) {
        errors.push({ code: "invalid-requirement-id", name, value });
      }
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? "schemas/redis-keys.md";
  const markdown = await readFile(path, "utf8");
  const rows = parseRedisRegistry(markdown);
  const errors = validateRedisRegistry(markdown);
  if (errors.length > 0) {
    console.error(JSON.stringify({ event: "redis_registry.failed", rowCount: rows.length, errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ event: "redis_registry.passed", rowCount: rows.length }));
  }
}
