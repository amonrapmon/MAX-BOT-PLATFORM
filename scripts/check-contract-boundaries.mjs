import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SDK_IMPORTS = [
  "max-io",
  "@maxhub/max-bot-api",
  "@maxhub/max-bot-api-client",
];

const BUSINESS_WORDS = [
  "dikidi",
  "appointment",
  "booking",
  "price",
  "report",
  "operator_kpi",
  "client_record",
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (extname(entry.name) === ".ts") files.push(path);
  }
  return files;
}

export async function checkContractBoundaries(rootDir) {
  const contractsDir = join(rootDir, "contracts");
  let files = [];
  try {
    files = await walk(contractsDir);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return [];
    throw error;
  }

  const violations = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const sdk of SDK_IMPORTS) {
      if (content.includes(`from "${sdk}"`) || content.includes(`from '${sdk}'`)) {
        violations.push({
          file: relative(rootDir, file),
          rule: "sdk-import",
          value: sdk,
        });
      }
    }
    const lower = content.toLowerCase();
    for (const word of BUSINESS_WORDS) {
      if (lower.includes(word)) {
        violations.push({
          file: relative(rootDir, file),
          rule: "business-vocabulary",
          value: word,
        });
      }
    }
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = process.argv[2] ?? process.cwd();
  const violations = await checkContractBoundaries(rootDir);
  if (violations.length > 0) {
    console.error(
      JSON.stringify({ event: "boundary_check.failed", violations }, null, 2),
    );
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ event: "boundary_check.passed" }));
  }
}
