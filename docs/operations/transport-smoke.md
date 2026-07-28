# MAX Long-Polling Recovery Smoke

## Purpose

Prove that a concrete runtime survives network, process, and Redis failures without losing marker state or duplicating completed business processing.

## Normative references

`MAX-IN-001` through `MAX-IN-007`, `MAX-OUT-007`, `MAX-REL-001` through `MAX-REL-003`, `MAX-TEST-004`, `MAX-TEST-005`.

## 1. Prerequisites and single owner

- Use a dedicated test bot and authorized test chat.
- Record the runtime container name as `<runtime-container>`.
- Record its Docker network as `<runtime-network>`.
- Confirm no other process uses the same bot token.
- Confirm Redis and the application dependency are healthy.
- Record the standard version and tested commit SHA.

POSIX:

```bash
docker compose ps
docker compose logs --tail=100 <runtime-service>
```

PowerShell:

```powershell
docker compose ps
docker compose logs --tail=100 <runtime-service>
```

Require one `polling.owner_acquired` and one `polling.started` event. An owner conflict fails the smoke.

## 2. Baseline health and marker capture

Capture the current marker before disruption:

```bash
docker compose exec redis redis-cli GET 'maxbot:<runtimeId>:transport:marker'
```

```powershell
docker compose exec redis redis-cli GET 'maxbot:<runtimeId>:transport:marker'
```

Send one benign test update and require one application dispatch. Record the resulting marker and baseline health snapshot.

## 3. Disconnect the runtime network

POSIX:

```bash
docker network disconnect <runtime-network> <runtime-container>
sleep 15
docker compose logs --tail=150 <runtime-service>
```

PowerShell:

```powershell
docker network disconnect <runtime-network> <runtime-container>
Start-Sleep -Seconds 15
docker compose logs --tail=150 <runtime-service>
```

The process must remain running. Require `polling.connection_lost`, `polling.retry_scheduled`, and degraded or recovering health. Marker state must not advance while the batch cannot complete.

## 4. Reconnect and verify restoration

POSIX:

```bash
docker network connect <runtime-network> <runtime-container>
sleep 15
docker compose logs --tail=200 <runtime-service>
```

PowerShell:

```powershell
docker network connect <runtime-network> <runtime-container>
Start-Sleep -Seconds 15
docker compose logs --tail=200 <runtime-service>
```

Require exactly one `polling.connection_restored`, resumed polling, and healthy state.

## 5. Duplicate replay gate

Force or replay the same normalized update twice. Require one `inbound.completed` and one `inbound.duplicate_skipped`. The duplicate must not execute application handling again.

Record the event hash, but do not record message text or a raw update.

## 6. Restart and marker restoration

POSIX and PowerShell:

```bash
docker compose restart <runtime-service>
docker compose logs --tail=150 <runtime-service>
```

Require `polling.marker_restored` with the previously captured marker and no replay of already completed application work.

## 7. Outbound acceptance gate

Enqueue one test response. Require:

```text
outbound.enqueued
outbound.sending
outbound.accepted_by_max
```

Verify `maxbot:<runtimeId>:outbound:receipt:<jobId>` contains `jobId`, `messageId`, `chatId`, and `acceptedAt`, but no message body. This proves MAX server acceptance only.

## 8. Redis disconnect and reconnect

Disconnect only the runtime from Redis or stop the isolated Redis container. Require `state_store.connection_lost`; new polls and outbound claims must pause. Restore Redis and require `state_store.connection_restored`, healthy state, and continued marker ownership semantics.

Example isolated fixture:

```bash
docker compose -f docker-compose.test.yml stop redis
docker compose -f docker-compose.test.yml start redis
```

## 9. Evidence capture

Attach to `MAX-CONFORMANCE.md`:

- standard version;
- verification date;
- tested commit SHA;
- exact commands and exit codes;
- baseline and restored marker values, redacted if necessary;
- structured log excerpts for loss, retry, recovery, duplicate suppression, restart, Redis recovery, and `accepted_by_max`;
- deviations and linked ADRs;
- known limitations, including the narrow crash-after-send receipt window.

## Failure behavior

Any process exit during a retryable network loss, marker regression, second application execution for a completed duplicate, missing ownership fencing, or leaked message body fails the smoke.

## Non-goals

This smoke does not prove end-user delivery, read status, application-specific business correctness, or webhook behavior.
