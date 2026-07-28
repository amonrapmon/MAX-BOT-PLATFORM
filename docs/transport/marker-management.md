# Polling Marker Management

## Purpose

Prevent update loss while allowing safe replay after partial batch failure.

## Normative references

`MAX-IN-001`, `MAX-IN-002`, `MAX-IN-006`, `PollingMarkerV1`.

## Data or control flow

```text
restore marker M1
→ poll returns [A, B, C] and next marker M2
→ A completes
→ B fails
→ do not commit M2
→ poll again from M1
→ duplicate state skips completed A
→ B and C continue
→ commit M2 only after all complete
```

The marker is opaque and has no TTL.

## Failure behavior

Committing before full batch success can lose B and C. Silently clearing an invalid stored marker can replay an unbounded history or skip updates, so incompatible marker state blocks safe startup.

## Verification

Run `MAX-IN-001.marker-restoration`, `MAX-IN-002.partial-batch-marker`, and `MAX-IN-006.completed-duplicate`.

## Non-goals

The marker is not a business checkpoint and must not be interpreted by the application.
