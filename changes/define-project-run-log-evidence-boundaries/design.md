# Design

本 Draft 将当前 Gate diagnostics、Product progress 和未来 durable receipt/event sink 分层；它不把尚无 consumer 的 protocol 伪装为已实现能力。

## Context

- [`docs/architecture.md`](../../docs/architecture.md#execution-boundary) defines Product-owned per-Check durations, private lifecycle feedback, final-snapshot `RunResult.checkDurations`, and a progress stream. Detailed child process output stays in project-owned transcripts.
- [`docs/output.md`](../../docs/output.md#发布与并发读取边界) defines machine v4 publication. `RunResult.outputs` carries machine-publication and progress-rendering status; machine v4 contains neither output status nor per-Check timing.
- [`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate) defines `.log/project-gate/<unique>/` as a Gate-owned local diagnostic directory. Eligible started Checks get separate transcripts; identity/preparation failures do not create an invocation log.

Product lifecycle feedback has `prepared`, `started`, `settled`, and `final` facts. TTY rendering adds temporary running rows; non-TTY rendering is append-only human diagnostics, not a machine event protocol. Terminal messages are settled Check presentation and are not durable logging or machine publication.

The current Product has no logs output. Gate transcripts and any future receipt are Gate-owned local evidence, not release artifacts.

## Goals / Non-Goals

### Goals

- Fix the respective owners and failure boundaries for future logging work.
- Preserve current human-readable non-TTY progress without creating an event-reader contract.
- Require a named consumer before adding durable receipts or chronological events.
- Preserve per-Check stdout/stderr isolation.

### Non-Goals

- Do not modify the formal Gate, Product runtime, machine schema, terminal layout, or CI binding.
- Do not introduce a logs output, `summary.json`, `events.ndjson`, logger/decorator, aggregate log, `latest` pointer, retention, or cleanup policy.
- Do not reconstruct chronological lifecycle history from stdout, final snapshots, or transcript timestamps.

## Decisions

### Intended Change

1. **Three owners, not one logger.** Foundation may offer explicit process/filesystem primitives; Product owns lifecycle facts and any future authoritative event sink; Gate owns transcript layout, local receipt, and Gate-specific result mapping. No owner recomputes the others' facts.
2. **Per-Check transcripts remain default durable diagnostics.** Each started process Check owns a transcript under its unique invocation directory. Records and summaries retain only bounded command/status/signal/log-reference facts. Aggregate output and `latest.log` are not a common denominator.
3. **Non-TTY progress is human output, not an event sink.** A future structured event consumer must justify why final Run results and transcripts are insufficient, then define Product event variants, ordering, cancellation and writer failure at the lifecycle handoff.
4. **A future `summary.json` is a Gate receipt.** It may project final Gate facts beside transcripts only for a named consumer, closes atomically, and maps its publication failure to Gate infrastructure unavailable. It never duplicates child stdout/stderr or substitutes for `RunResult`.
5. **No default discovery/retention.** The unique directory path emitted by the adapter is the only current discovery information. Retention/discovery requires separate consumer, storage, cleanup and privacy decisions.
6. **No generic decorator now.** Callback decorators cannot prove dependency blocking, pre-start cancellation, scheduler settlement order or final output status, while Product does not own child transcript layout.

### Resulting Impacts

Future logging must select the owner demanded by its named consumer. Current Product outputs remain exactly machine publication and progress rendering; Gate transcripts remain local diagnostics.

## Risks / Trade-offs

Durable protocols impose compatibility, ordering, privacy, size and writer-failure obligations. Deferral preserves the smaller current contract but makes a future consumer fund the whole design.

## Open Questions

None until a named durable receipt or event consumer exists.
