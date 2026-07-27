# Structured Logging

## Purpose

Make runtime state diagnosable through stable JSON events without leaking message content.

## Normative references

`MAX-OBS-001` through `MAX-OBS-003`, `RuntimeLogRecordV1`.

## Data or control flow

Each record contains `timestamp`, `level`, `component`, `event`, and `runtimeId`, with optional safe identifiers such as `eventHash`, `jobId`, `messageId`, attempt, duration, status, and error code.

## Failure behavior

Repeated transport failures are summarized through retry events instead of an uncontrolled log storm. One restoration event closes a failure interval.

## Verification

Run structured-events and secret-redaction scenarios.

## Non-goals

Logs are not a message archive and do not store raw updates.
