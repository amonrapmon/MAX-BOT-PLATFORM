# Experimental Platform Work

Experimental material is non-normative. It does not affect stable conformance and may change or disappear without a major standard release.

## Purpose

Provide a quarantine area for mechanisms that have not accumulated enough test and operational evidence.

## Normative references

The maturity rules in `STANDARD.md` and the approved design specification.

## Data or control flow

```text
EXPERIMENTAL
→ test implementation
→ conformance scenarios
→ real project operation
→ observed failures
→ recovery runbook
→ PROVEN
```

Webhook transport belongs here until it completes this path.

## Failure behavior

An experiment must not be imported by stable contracts, required by stable conformance, or described as production-ready platform behavior.

## Verification

`validate-docs` checks that this non-normative declaration exists and rejects positive stable-v1 webhook claims.

## Non-goals

This directory is not a backlog and does not grant experimental code an exception from security requirements.
