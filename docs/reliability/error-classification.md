# Error Classification

## Purpose

Normalize SDK, HTTP, Redis, configuration, and application failures into `RuntimeErrorV1`.

## Normative references

`MAX-REL-001` through `MAX-REL-004`, `contracts/errors.ts`.

## Data or control flow

```text
raw error
→ source classification
→ retryable | permanent | ownership_lost | shutdown
→ component-specific action
```

Network errors, HTTP 408, 429, and 5xx are retryable. HTTP 400, 401, and 403 are permanent for polling. Shutdown cancellation is not reported as a transport failure.

## Failure behavior

Unknown serialized state versions are permanent operator-facing failures. Application errors prevent inbound completion but do not automatically classify external business writes.

## Verification

Run exponential backoff, retry-after, unknown-state-version, and invalid-config scenarios.

## Non-goals

This taxonomy does not expose raw SDK exception classes to application code.
