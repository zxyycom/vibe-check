# Design

本 Design 将当前可用的 Gate 诊断与 Product 人读反馈同未来的持久 evidence/event 能力分层，避免把尚无消费者的抽象或文件格式伪装成既定实现。

## Context

当前事实由稳定 owner 定义：

- [`docs/architecture.md`](../../docs/architecture.md#execution-boundary) 规定 Product 在 execution owner 中取得 Check duration、交给 private lifecycle feedback 与 final-snapshot `RunResult.checkDurations`；详细 process output 留在 project-owned logs，不与 Product progress stream 穿插。
- [`docs/output.md`](../../docs/output.md#publication-lifecycle-and-trust-boundary) 与 [`docs/output.md`](../../docs/output.md#progress-and-presentation-boundaries) 规定 `RunResult` 承载运行/effect 状态，machine v3 artifact 不承载 effect status 或 per-Check timing；Product progress 是人读投影。
- [`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate) 规定 Project Gate 在 candidate identity 校验后创建 `.log/project-gate/<unique>/`，每个实际启动并到达 transcript 边界的 eligible Check 写入独立 transcript；Product-owned progress 是唯一 shared progress stream。准备、导入或 identity 校验失败不创建 invocation log。

当前 Gate transcript 记录 Check/command、stdout、stderr、exit status、signal 与安全 error summary。只有真正启动并到达 transcript 写入步骤的 Check 有该文件；profile/tag `not-applicable` 与启动前取消不产生 transcript。一个 nonzero process exit 以不复制 child output 的 failure Record 引用其 log filename；transcript 写入失败映射为 Check unavailable。

Product 当前的 private lifecycle feedback 有 `prepared`、`started`、`settled` 与 `final` 事实。其 renderer 在 TTY 额外显示临时 running rows；非 TTY 不显示 running rows，但仍写 execution header、每个 settled Check 的 status/duration/reason 和 final summary。因此 non-TTY stdout 可作为人读、append-only 的运行记录，但不是稳定 machine event protocol，消费者不得反向解析它恢复 Check events。

已归档的 [`add-check-terminal-messages-and-visibility`](../archive/add-check-terminal-messages-and-visibility/)（archived）另行交付 structured terminal messages、`RunResult` readback 与显式 visibility；messages 只在 owning Check settlement 后输出，不提供 live/intermediate writer，也不进入 durable machine publication。Terminal presentation 不是 durable logging、Gate receipt 或 chronological event persistence，不触发本 Draft 的 receipt/event 准入条件。

`effects.logs` 不是 durable log store：在启用时，它只将 publication summary 打印到 stdout 并报告该 effect 的状态。Project Gate 明确禁用该 effect；它的 per-Check transcript 属于 Gate 自己的本地诊断 evidence。所有这些本地 logs 与 artifacts 均不是 release artifact。

## Goals / Non-Goals

### Goals

- 为未来日志相关 Change 固定三个互不替代的 owner 及其输入、输出和失败责任。
- 保留当前 non-TTY progress 的人读价值，同时明确其不是 Check event API。
- 规定 durable Gate receipt 和 chronological Check events 的触发条件，防止无消费者时提前建设协议。
- 让未来实现能保留 per-Check stdout/stderr 隔离，而不回退到并发混写的单一聚合日志。

### Non-Goals

- 不修改正式 Project Gate、Product runtime、foundation、machine schema、console layout、CI/root binding 或 legacy workspace verifier。
- 不把 `effects.logs` 扩展或重新解释为 durable logs。
- 不在此 Draft 批准 `summary.json`、`events.ndjson`、generic logger/decorator、legacy-style aggregate log、`latest` pointer、默认 retention 或 cleanup。
- 不从当前 stdout、final snapshot 或 transcript 集合合成并声称得到真实 chronological lifecycle history。

## Decisions

以下为本 Draft 建议性默认边界，不授权实现、不改变当前 owner；未来 Change 只有出现命名 consumer 时才收敛实施决定。

### Intended Change

#### 1. Future logging has three owners, not one global logger

| Layer | Owns | May provide | Does not own |
| --- | --- | --- | --- |
| Foundation primitives | Generic process capture and filesystem/text-writing primitives. | Command result capture and explicit write failures for a caller-owned path. | Check identity, lifecycle, policy, invocation identity, retention, event order or Gate exit mapping. |
| Product lifecycle | Facts whose truth depends on Product scheduling and settlement. | Product-owned lifecycle feedback, final `RunResult` and per-Check durations; a future event sink only if Product defines its contract. | Child stdout/stderr persistence, project-specific transcript layout, Gate policy or local evidence directory. |
| Gate evidence | A Gate invocation's local evidence selection, layout and Gate-specific failure mapping. | Unique invocation directory, per-Check transcripts, optional receipt, local evidence references and Gate adapter summary. | Recomputing Product lifecycle facts, inventing event order or becoming a shared product logger. |

The current Gate already follows this direction: it uses foundation process/file helpers, its Process Check maps process and transcript facts into Check results, and Product exclusively renders the shared progress stream. Future extraction is justified only when two or more callers share the same explicit primitive contract; it must not move Gate semantics into foundation.

#### 2. Per-Check transcripts remain the default durable diagnostic evidence

A process command is independently diagnosable only when its stdout/stderr cannot interleave with unrelated concurrent commands. The default Gate evidence shape therefore remains one transcript per started Check under an invocation-specific directory. The transcript owns detailed child output; Check failure Records and terminal summaries retain only bounded command/status/signal/log-reference facts.

This is intentionally different from the legacy verifier's timestamped aggregate log and overwrite-style `latest.log`. A single aggregate file is not the common denominator of concurrent Project Run checks: it loses output isolation and cannot become a new contract merely because the legacy tool used it.

#### 3. Non-TTY progress is an existing human-readable log, not an event sink

The Product renderer owns the rendering and writes settled feedback in non-TTY mode. It may continue to be captured by CI as textual diagnostics. Its layout, wording and terminal details remain presentation behavior, so no Gate or external consumer may parse it as a source of Check lifecycle truth.

If a consumer needs structured events, it must name why a final `RunResult`, per-Check transcript and human progress output are insufficient. The next Change must add a Product-owned sink at the lifecycle handoff, define event variants, ordering and settlement/cancellation semantics, and give a concrete consumer responsibility for writing or transporting those events. A Gate-written `events.ndjson` assembled inside process callbacks, a tee of stdout, or a chronology reconstructed from final state is explicitly not equivalent.

#### 4. `summary.json` is an optional Gate receipt, not a required log layer

A Gate invocation receipt may be added only when a concrete consumer must inspect final Gate-wide facts after terminal stdout is unavailable. If added, it belongs beside transcripts in that invocation directory and projects already-final facts: invocation identity/timing, candidate identity, selection, terminal Run kind and effect status, policy/adapter result, per-Check outcome/duration and transcript reference or null.

The receipt must not duplicate child stdout/stderr, recompute Product facts, or substitute for the Product `RunResult`. It must close atomically (temporary file followed by rename); failure to publish a receipt is an unavailable Gate infrastructure result, never a passing Gate. An unclosed invocation may legitimately leave transcripts without a receipt after abrupt termination. This is a future option, not a cutover prerequisite.

#### 5. No retention or discovery convention exists by default

Invocation directories are ignored local diagnostics. The current unique directory path is the only discovery information guaranteed by the adapter's terminal output. No `latest` pointer, retention policy, cleanup job, aggregate index or CI artifact publishing contract is implied.

A future retention/discovery Change requires a named operator or tool consumer, explicit storage/cleanup ownership, failure behavior and privacy/size review. It must not delete evidence or overwrite a prior invocation merely to make a new logging abstraction appear convenient.

#### 6. Generic logger/decorator is not the present common denominator

A generic logger or a decorator around Check execution cannot observe all Product-owned lifecycle facts: dependency blocking, pre-start cancellation, scheduler settlement order, final effect status and policy/result closure remain outside an individual callback. Conversely, Product does not own a project's child command output or transcript layout.

Therefore a future implementation should begin at the owner required by the stated consumer: foundation for a generic primitive, Product for authoritative lifecycle events, or Gate for local evidence. It should not introduce a cross-cutting decorator merely to centralize a name called “log”.

### Resulting Impacts

- future logging 必须分别由 foundation primitives、Product lifecycle 与 Gate evidence owner 承担；只有出现命名 consumer 才能收敛新持久 receipt 或 event sink。
- 当前 per-Check transcript 与 Product progress 继续是默认事实，不得借本 Draft 引入聚合日志、retention/discovery 约定或泛化 logger/decorator，也不得把 Gate semantics 下沉到 foundation。

## Risks / Trade-offs

- **Protocol without a consumer:** A durable event stream creates compatibility, ordering and writer-failure obligations. Deferring it preserves the current smaller contract, but future consumers must fund its complete Product-level design.
- **Receipt reliability:** Treating a receipt as proof of a completed Gate requires atomic close and explicit failure mapping; hard process termination can still leave only transcripts.
- **Evidence size and sensitivity:** Capturing full child stdout/stderr is valuable for diagnosis but local and potentially large. A receipt must retain references and bounded facts rather than duplicate this material.
- **Presentation drift:** CI may retain non-TTY stdout, but progress wording is allowed to evolve. Calling it a machine event protocol would make a human renderer a hidden compatibility surface.
- **Premature sharing:** Moving Gate-specific mapping into foundation or deriving lifecycle from callbacks would obscure the owner that can actually prove the relevant facts.

## Open Questions

无。当前没有已识别的 consumer 要求 durable receipt 或 structured chronological events。未来出现命名 consumer 时另建 Change，并满足 Decisions 3/4 条件。
