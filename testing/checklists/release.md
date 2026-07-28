# Operational Release Checklist

## Standard and scope

- [ ] `VERSION`, `STANDARD.md`, contracts, schemas, and changelog agree.
- [ ] Stable transport is MAX long polling.
- [ ] Webhook code, when present, remains experimental and outside stable conformance.
- [ ] No project command or business integration leaked into normative contracts.

## Automated gate

- [ ] `npm ci` exits 0.
- [ ] `npm run typecheck` exits 0.
- [ ] `npm test` has zero failed tests.
- [ ] `npm run check:boundaries` passes.
- [ ] `npm run check:standard` passes.
- [ ] `npm run check:schemas` passes.
- [ ] `npm run check:redis-registry` passes.
- [ ] `npm run check:docs` passes.
- [ ] Docker configuration validation exits 0.

## Implementation evidence

- [ ] Redis integration tests cover owner, marker, inbound lease, queue claim, fencing, retry, receipt, and dead letter.
- [ ] All 29 stable conformance scenarios pass through public implementation ports.
- [ ] Secret and fixture scan passes.
- [ ] MAX long-polling recovery smoke passes.
- [ ] Redis loss and restart recovery pass.
- [ ] Process restart restores marker and queued work.

## Release record

- [ ] `MAX-CONFORMANCE.md` names the standard version and conformance level.
- [ ] Verification date and verified commit SHA are recorded.
- [ ] Exact commands, pass counts, and recovery log excerpts are attached.
- [ ] Exceptions link to accepted ADRs with risk and remediation.
- [ ] Known limitations include the crash-after-send receipt window.
