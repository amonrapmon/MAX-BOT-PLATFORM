# MAX-BOT-PLATFORM

## What this repository is

`MAX-BOT-PLATFORM` is the normative engineering standard for reliable bots in the MAX messenger. It defines transport, lifecycle, resilience, state, observability, testing, and operational contracts without embedding product behavior.

## Body and head

The platform is the reusable body: long polling, marker persistence, polling ownership, inbound duplicate suppression, outbound queues, retries, receipts, health, logs, and graceful shutdown.

A project supplies the head: commands, scenarios, texts, buttons, business APIs, and product-specific state. The head MUST NOT manage transport markers, Redis transport keys, SDK clients, leases, or transport retry policy.

```text
Application head
      │ stable application port
      ▼
MAX Bot Runtime body
      │ transport adapter
      ▼
MAX API
```

## Stable v1 scope

Stable v1 covers:

- MAX long polling;
- Redis 7 as the canonical state store;
- SDK-independent TypeScript contracts;
- normative requirements and conformance checks;
- recovery and operational runbooks.

## What is deliberately excluded

Stable v1 excludes:

- webhook transport;
- project-specific commands and message copy;
- DIKIDI, CRM, booking, reporting, pricing, and other business integrations;
- project roles, permissions, and business database schemas;
- a shared production runtime npm package.

## Authority order

When sources conflict, use this order:

```text
STANDARD.md
→ normative contracts
→ conformance tests
→ accepted ADRs
→ explanatory documentation
→ existing project implementations
```

## Repository verification

```bash
npm install
npm run verify
```

The verification gate performs strict TypeScript checking, tests, and the boundary scan that prevents MAX SDK imports and business-specific vocabulary from leaking into normative contracts.

## Adoption path

1. Select a standard version.
2. Adopt the normative contracts.
3. Configure a stable runtime identity and Redis namespace.
4. Attach a project `BotApplication` head.
5. Run the portable conformance suite.
6. Run recovery smoke checks.
7. Publish `MAX-CONFORMANCE.md` with evidence.
