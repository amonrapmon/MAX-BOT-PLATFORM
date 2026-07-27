import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const HEADING = /^### (MAX-(?:ARCH|IN|OUT|REL|OBS|SEC|OPS|TEST)-\d{3}) — (.+)$/gm;
const VALID_STATUS = new Set(["PROVEN", "EXPERIMENTAL", "DEPRECATED", "REMOVED"]);
const VALID_LEVEL = new Set(["MUST", "MUST NOT", "SHOULD", "SHOULD NOT", "MAY"]);

function readField(block, field) {
  const match = block.match(new RegExp(`^- ${field}: (.+)$`, "m"));
  return match?.[1]?.trim();
}

function readSection(block, name) {
  const match = block.match(
    new RegExp(
      `(?:^|\\n)${name}:\\n([\\s\\S]*?)(?=\\n(?:Statement|Rationale|Verification):\\n|\\n### MAX-|$)`,
    ),
  );
  return match?.[1]?.trim();
}

export function parseStandard(markdown) {
  const matches = [...markdown.matchAll(HEADING)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? markdown.length;
    const block = markdown.slice(start, end);
    return {
      id: match[1],
      title: match[2].trim(),
      status: readField(block, "Status"),
      level: readField(block, "Level"),
      contract: readField(block, "Contract"),
      test: readField(block, "Test"),
      statement: readSection(block, "Statement"),
      rationale: readSection(block, "Rationale"),
      verification: readSection(block, "Verification"),
    };
  });
}

export function validateStandard(markdown) {
  const requirements = parseStandard(markdown);
  const errors = [];
  const seen = new Set();

  for (const requirement of requirements) {
    if (seen.has(requirement.id)) {
      errors.push({ code: "duplicate-id", id: requirement.id });
    }
    seen.add(requirement.id);

    for (const field of [
      "status",
      "level",
      "contract",
      "test",
      "statement",
      "rationale",
      "verification",
    ]) {
      if (!requirement[field]) {
        errors.push({ code: "missing-field", id: requirement.id, field });
      }
    }

    if (requirement.status && !VALID_STATUS.has(requirement.status)) {
      errors.push({ code: "invalid-status", id: requirement.id, value: requirement.status });
    }
    if (requirement.level && !VALID_LEVEL.has(requirement.level)) {
      errors.push({ code: "invalid-level", id: requirement.id, value: requirement.level });
    }
    if (
      ["MUST", "MUST NOT"].includes(requirement.level) &&
      requirement.status !== "PROVEN"
    ) {
      errors.push({ code: "stable-must-not-proven", id: requirement.id });
    }
  }

  if (requirements.length === 0) {
    errors.push({ code: "no-requirements" });
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const standardPath = process.argv[2] ?? "STANDARD.md";
  const markdown = await readFile(standardPath, "utf8");
  const requirements = parseStandard(markdown);
  const errors = validateStandard(markdown);
  if (errors.length > 0) {
    console.error(
      JSON.stringify(
        { event: "standard_validation.failed", requirementCount: requirements.length, errors },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    console.log(
      JSON.stringify({
        event: "standard_validation.passed",
        requirementCount: requirements.length,
      }),
    );
  }
}
