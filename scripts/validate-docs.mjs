import { access, readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_DOCS = [
  "docs/architecture/boundaries.md",
  "docs/architecture/runtime-overview.md",
  "docs/architecture/lifecycle.md",
  "docs/architecture/data-flow.md",
  "docs/transport/long-polling.md",
  "docs/transport/event-normalization.md",
  "docs/transport/marker-management.md",
  "docs/transport/connection-recovery.md",
  "docs/reliability/idempotency.md",
  "docs/reliability/error-classification.md",
  "docs/reliability/retries.md",
  "docs/reliability/outbound-queue.md",
  "docs/reliability/dead-letter.md",
  "docs/observability/logging.md",
  "docs/observability/health.md",
  "docs/observability/metrics.md",
  "docs/observability/sensitive-data.md",
  "docs/experimental/README.md",
  "docs/adr/0001-long-polling-v1.md",
  "docs/adr/0002-redis-transport-state.md",
  "docs/adr/0003-inbound-idempotency.md",
  "docs/adr/0004-acceptance-not-delivery.md",
  "docs/operations/local-development.md",
  "docs/operations/deployment.md",
  "docs/operations/transport-smoke.md",
  "docs/operations/incident-recovery.md",
  "testing/checklists/release.md",
  "testing/checklists/MAX-CONFORMANCE.template.md",
];

const ADR_SECTIONS = ["Status", "Context", "Decision", "Consequences", "Verification"];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (["node_modules", ".git", ".superpowers", ".worktrees"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (extname(entry.name).toLowerCase() === ".md") files.push(path);
  }
  return files;
}

function stripFencedCode(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "");
}

function localLinks(markdown) {
  return [...markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1].trim())
    .filter((value) => value && !/^(?:https?:|mailto:|#)/i.test(value));
}

export async function validateDocs(rootDir) {
  const absoluteRoot = resolve(rootDir);
  const errors = [];

  for (const relativePath of REQUIRED_DOCS) {
    try {
      await access(join(absoluteRoot, relativePath));
    } catch {
      errors.push({ code: "missing-document", path: relativePath });
    }
  }

  const markdownFiles = await walk(absoluteRoot);
  for (const file of markdownFiles) {
    const relativePath = normalize(relative(absoluteRoot, file));
    const markdown = await readFile(file, "utf8");
    const prose = stripFencedCode(markdown);
    const h1Count = (prose.match(/^# [^#].*$/gm) ?? []).length;
    if (h1Count !== 1) {
      errors.push({ code: "invalid-h1-count", path: relativePath, count: h1Count });
    }

    for (const link of localLinks(markdown)) {
      const pathOnly = decodeURIComponent(link.split("#", 1)[0]);
      if (!pathOnly) continue;
      const target = resolve(dirname(file), pathOnly);
      try {
        await stat(target);
      } catch {
        errors.push({ code: "broken-local-link", path: relativePath, link });
      }
    }

    if (relativePath.startsWith(normalize("docs/adr/"))) {
      for (const section of ADR_SECTIONS) {
        if (!new RegExp(`^## ${section}$`, "m").test(markdown)) {
          errors.push({ code: "missing-adr-section", path: relativePath, section });
        }
      }
    }

    if (relativePath.startsWith(normalize("docs/superpowers/"))) continue;

    const positiveReceiptClaim = /(?:provides?|supports?|records?)\s+(?:end-user\s+)?(?:delivery|read)\s+(?:receipt|confirmation|status)/i;
    if (positiveReceiptClaim.test(prose)) {
      errors.push({ code: "unsupported-delivery-claim", path: relativePath });
    }

    const positiveWebhookClaim = /webhook[^.\n]{0,80}\b(?:is|as|becomes|serves as)\b[^.\n]{0,40}\bstable v1\b/i;
    const negativeWebhookClaim = /webhook[^.\n]{0,80}\b(?:is not|isn't|not a)\b[^.\n]{0,40}\bstable v1\b/i;
    if (positiveWebhookClaim.test(prose) && !negativeWebhookClaim.test(prose)) {
      errors.push({ code: "stable-webhook-claim", path: relativePath });
    }
  }

  const experimentalPath = join(absoluteRoot, "docs/experimental/README.md");
  try {
    const experimental = await readFile(experimentalPath, "utf8");
    if (!/experimental material is non-normative/i.test(experimental)) {
      errors.push({ code: "missing-experimental-disclaimer", path: "docs/experimental/README.md" });
    }
  } catch {
    // Missing-file error is already emitted by the required-document check.
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootDir = resolve(process.argv[2] ?? process.cwd());
  const errors = await validateDocs(rootDir);
  if (errors.length > 0) {
    console.error(JSON.stringify({ event: "docs_validation.failed", errors }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ event: "docs_validation.passed", documentCount: REQUIRED_DOCS.length }));
  }
}
