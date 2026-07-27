# Runtime Metrics

## Purpose

Define minimum counters, gauges, and histograms while allowing different exporters.

## Normative references

`MAX-OBS-005` and the metric names in `STANDARD.md`.

## Data or control flow

Counters track polls, updates, duplicates, retries, accepted jobs, dead letters, lease loss, and state-store failures. Gauges track queue depth and consecutive poll errors. Histograms track poll, inbound, send, and queue-wait durations.

## Failure behavior

Metrics failure must not corrupt transport state. High-cardinality raw user IDs, chat IDs, event IDs, and message text are prohibited as labels.

## Verification

Review the minimum metric registry and exercise outbound retry, duplicate, recovery, and dead-letter scenarios.

## Non-goals

The standard does not mandate Prometheus, OpenTelemetry, or one monitoring vendor.
