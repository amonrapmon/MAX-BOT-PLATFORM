# Sensitive-Data Policy

## Purpose

Prevent credentials, personal data, and message content from entering logs, receipts, health, metrics, and fixtures.

## Normative references

`MAX-OBS-003`, `MAX-OUT-008`, `MAX-SEC-001` through `MAX-SEC-003`.

## Data or control flow

Permitted diagnostic values include `runtimeId`, `jobId`, `eventHash`, `messageId`, HTTP status, error code, attempt, and duration. User and chat identifiers should use a salted project hash.

Prohibited log fields and values:

- MAX bot token and API credentials;
- Redis passwords or credential-bearing URLs;
- message text and attachment payloads;
- raw callback payloads and raw updates;
- names, phones, email addresses, and contact cards;
- complete MAX response bodies;
- private keys and token fingerprints without redaction.

## Failure behavior

A serialization or error-redaction path that exposes a prohibited value is a release-blocking defect.

## Verification

Run receipt-redaction and secret-redaction scenarios. Task 13 adds repository-wide fixture scanning.

## Non-goals

This policy does not replace a project privacy policy or define business-data retention.
