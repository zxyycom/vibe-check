# Proposal

本 Change 已将 Project Run diagnostic logging 收敛为少量高信噪的人读运行时事件，并把 scheduler 的选择提取为可测试、可记录、由命令式外壳应用的纯 `SchedulerDecision`。

## Why

旧日志把每个 pending Check 的 `ready` / `waiting` 翻转、同一 Check 的多次 settlement 投影，以及 accepted final data 的完整副本连续写入。维护者需要从这些重复记录中重建“槽位释放后 scheduler 为何选择、等待或停止”的核心过程；大型 package candidate data 还会被多次复制。

诊断日志仍只是一次 invocation 的人工排障 output。它不能借此成为公共 observer、可解析协议、稳定 schema、verbosity 选项或多文件系统。scheduler 的选择也不能只在多个 mutation 点分别推断，否则执行理由、测试和日志会重新分叉。

## Outcome

每个启用 diagnostic logging 的有效 Run 写入一个单独、project-root-contained 的 `run-<UTC compact timestamp>-<UUID>.log`。日志保留 Run、Check、dependency、Record 和 scheduler decision 的最小事实；同一个 immutable `SchedulerDecision` 同时供 scheduler shell 应用和记录。

正常 accepted final data 只在 owning `check.finished` 以安全 shape/size 摘要出现；成功 dependency read 只记录 producer、status 和 data presence。每个 Record report 仍完整安全输出一次；malformed、rejected 或 contained author value 仍在其最终异常事件安全输出一次。四态 Check facts、RunResult output status、logging-failure containment、machine publication 与 progress rendering 均不变。

## Scope

### Intended Change

- enabled Run 使用 `run-<UTC compact timestamp>-<UUID>.log`。UTC 时间用于人工发现，UUID 处理并发唯一性；`RunResult.outputs.diagnosticLogging.file` 继续返回 project-root-relative 目标路径。没有 directory index、`latest`、rotation、retention、cleanup、多个日志文件或跨 invocation 搜索。
- Product-private log 只记录 Run boundary/summary、Check preflight 和 callback lifecycle、dependency result、Record report、异常 Check boundary，以及 scheduler admission-cycle decision。移除 `check.ready` / `check.waiting`、逐 pending Check 的预算投影、scheduler settlement 副本和 catalog/summary 重复。
- normal path 的 `check.finished` 是唯一 final lifecycle projection，记录终态、messages、duration 和 accepted data 的安全摘要。dependency 不复制或重新测量 producing Check data；Record 与异常保持各自一次完整安全值。
- scheduler 采用 immutable snapshot + explicit trigger -> pure discriminated `SchedulerDecision` -> imperative apply shell。decision 决定 task admission、blocked settlement、pending cancellation、await/drain 或 completion；shell 不重算选择理由。每个 decision 以一个 `scheduler.decision` observation 写入，Task engine 继续使用 generic task/taskId 术语。
- 不增加 public observer、Check/preflight logger 参数、parser、NDJSON/JSON schema、稳定 event vocabulary、level/filter、远程传输或 Check-specific cache 共享。machine output、Check final data/Record contract、aggregation、progress 和 output priority 不扩张。

### Resulting Impacts

- `src/project-run/diagnostic-logging/**`、invocation/completion、progress integration：单文件 identity、安全 header + details renderer、close 前/后 output boundary 与 logging failure containment。
- `src/project-run/check-execution/**`：preflight/callback/settlement、dependency 与 Record 的 observation ownership；四态、messages、duration、直接 dependency 和 cancellation closure 保持原语义。
- `src/project-run/task-scheduler/**`：snapshot、trigger、`SchedulerDecision` 和 apply shell 保留 dependency、mutex、root/scope cap、reservation、tightening scope、cancellation 与 drain 语义，并提供直接测试。
- `RunResult.outputs.diagnosticLogging.file` 使 filename 对 consumer 可见；README、Configuration、API mechanics、script tooling、repository consumer tests 与 Case materials 必须同步命名。日志正文仍是 Product-private 人读文本，不生成 schema 或 compatibility material。
- `add-ephemeral-project-run-diagnostic-logging.md` 已覆盖一次性 output、core-owned observation、无 parser/verbosity/remote transport 和 logging-failure containment；`choose-implementation-style-by-problem-shape.md` 已覆盖 pure computation + imperative effect shell 的实现模型。本 Change 不需要新增或修改 Decision。

## Success Criteria

1. Enabled Run 只创建一个 `run-<UTC compact timestamp>-<UUID>.log`；disabled 与 configuration result 保持无日志 I/O 和既有 output/result 语义。
2. 完整日志可恢复 Check start/finish、Record/dependency handoff，以及每次 scheduler 选择或停止 admission 的原因；不含普通 ready/waiting churn、重复 scheduler settlement 或 catalog projection。
3. `SchedulerDecision` 是纯、immutable、判别联合值；focused tests 覆盖 canonical ordering、dependency/mutex block、root/scope capacity、reservation、cancellation、await/drain 和 completion，并证明 shell 记录并应用这些 decision。
4. accepted data 只在 owning final Check 安全摘要一次；dependency 不重复摘要；Record 与 malformed/rejected/contained value 分别安全完整输出一次，且不会调用 author getter、proxy 或 function。
5. 四态 Check facts、messages、durations、direct dependency、cancellation closure、aggregation、machine/progress outputs、logging failure containment 和 output priority 不回归。
6. focused runtime tests、Case/Test Evidence、docs/Decision/Change checks 及 required/full workspace Gate 均通过；日志正文仍无 parser、schema 或稳定格式承诺。

## Affected Owners

- `docs/architecture.md`、`docs/configuration.md`、`docs/api-mechanics.md`、`docs/output.md`、`docs/coding-style.md`、`docs/script-tooling.md`：Project Run/output、file readback、implementation model 和 repository-consumer boundary。
- `docs/decisions/add-ephemeral-project-run-diagnostic-logging.md`、`docs/decisions/choose-implementation-style-by-problem-shape.md`：当前长期方向输入；本 Change 不修改它们。
- `src/project-run/diagnostic-logging/**`、`invocation.ts`、`completion.ts`、`progress-rendering/**`、`check-execution/**`、`task-scheduler/**`、`src/check-settlement/**`：runtime owner 与相邻事实边界。
- `scripts/project/quality/**`、`scripts/project/gate/**`、相关 Product/runtime/consumer tests 与 `docs/testing/cases/**`：repository consumer 和证据 owner。
- `changes/reduce-project-run-diagnostics-to-runtime-decisions/**`：本次实施与验收的临时交接材料。
