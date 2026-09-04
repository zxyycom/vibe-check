# Proposal

本 Plan 以 owner-aware invocation path context 收敛实施：让 Product、Gate 与每个 executable Check 从同一份已解析路径事实定位自身输出，按输出 owner 拆分 invocation evidence，并删除不再提供独立证明价值的重复内容。

## Why

当前路径和内容同时缺少稳定的 owner 边界：

- `CheckExecutionContext.project` 只有绝对项目根和 flags。Gate 必须一边通过 Run output overrides 传递 invocation directory，一边通过 Definition closure 把同一路径再次传给 process Checks。
- `gate.log` 同时保存 Gate adapter、Product progress、Check messages 与 `afterGate` 输出；2026-09-04 的 required sample（candidate `0.0.0-local.6229ebd2ba50`）共 87 行，其中只有 3 行是 Gate completion，31 行是 Check status，29 行是 Check message。
- 单个 Product diagnostic log 同时保存 Core、Scheduler 与 learned admission。同一 sample 中 63 条 `scheduler.decision` 占 1,353,867 bytes 的 92.7%，主要重复每次 decision 都相同的完整 graph identity。
- `record.reported` 重复保存 machine `records.ndjson` 已拥有的完整 Record data；`check.finished` 又重复最终 `run.json` 已拥有的 outcome data 和 progress 已呈现的 messages。
- machine publication 天然拥有原子双文件集合，Check 也可能拥有多种 artifact；因此字面上的“一 owner 一文件”不足以表达真实契约，但“一 owner 一具名 channel 或 namespace”可以稳定区分责任。

仅重命名现有文件不会解决这些问题：输出 owner 仍然共用 writer，Check 仍然靠闭包获取路径，冗余静态事实也仍会反复写入。

## Outcome

一次 Run 先形成冻结、绝对且 owner-aware 的统一路径上下文；每个输出 owner 只写自己的具名 channel 或 namespace。Gate、progress、Core、Scheduler、learned admission、machine publication 与 Check artifacts 可以从名称直接识别，Check 不再通过项目闭包重复获得 invocation directory。Gate evidence 以其 exact root 归组；Core、Scheduler 与 learned-admission diagnostic channels 另以同一 Product invocation ID、global sequence 和 monotonic elapsed 关联，而不混回单文件。

Diagnostic 只保留本 owner 的动态过程与定位完整事实所需的 identity：Scheduler graph 每次 invocation 完整记录一次，后续 decision 引用其 fingerprint；成功 Record 与 Check final data 的完整持久事实只由 machine publication 保存，diagnostic 不在 machine disabled/failed 时充当 fallback，而只保留 lifecycle、identity、status、duration、reason 和必要的失败摘要。完整 per-Check duration 直接呈现，不建立 Top-N 排名。Persistent state 与临时 workspace 继续按生命周期隔离，不因统一路径上下文而进入 invocation evidence。

## Scope

### Intended Change

- 在 Product invocation creation 中一次解析并冻结 owner-aware path facts；将最小只读 projection 提供给 executable Check，并只在 caller 配置 artifact base 时授予当前 stable Check ID 的确定性安全 namespace。
- 按 Gate、progress、Core、Scheduler、learned admission、machine publisher 与 Check artifact 的真实 owner 拆分 invocation evidence；保留一个顶层 `diagnosticLogging` 配置入口及 aggregate readback，同时公开 per-channel file/status map。
- 将 Scheduler graph 改为每次 invocation 在 scheduler channel 中完整保存一次、后续 decision 引用 fingerprint；删除 machine 或 progress canonical owner 已完整保存的成功 Record、final data、message 和 duration 重复。
- 将 Project Gate 的 machine target 移入 `<invocation>/machine/`，将 process artifacts 迁移到 `checks/<encoded-check-id>/`，采用 hard cut 移除旧混合路径与 transcript。

### Resulting Impacts

- Product path resolution、RunControls、Project Definition normalization、Check context/callback assembly、diagnostic/progress writer、machine publication 和 Gate adapter 需要共同实施新的 authority、visibility、status 与 failure boundary。
- Public readback、configuration/API mechanics、owner documentation、schema/examples/paths、test evidence 和 Gate fixtures 必须同步，并在 machine canonical bytes 未改变时保持 v4 schema 不变。
- 相关长期方向已演进为 `organize-owner-aware-project-run-and-gate-diagnostics.md`、`keep-gate-run-evidence-complete-with-owner-scoped-scheduler-context.md` 与 `publish-project-gate-machine-facts-in-machine-namespace.md`；实现和验证完成前它们保持 active + unaligned。
- 此 Change 跨 Product、Project Gate、machine output、docs 与测试边界；实施完成后应按长期决策规则核对 alignment，不由 Plan 完成或归档自动改变。

## Success Criteria

- 同一次 Run 的 Product、Gate 和 executable Check 仅消费一次解析的 absolute path facts；Check 不能观察或写入其它 owner channel，未配置 artifact base 时得到 `null`，不同 stable Check ID 的 namespace 不冲突。
- Gate evidence 精确采用已确认的 owner channel/namespace layout；旧的混合 `gate.log` 捕获、根级 `process/<check-id>.log`、旧 diagnostic shape 和兼容别名均不产生。
- Core、Scheduler 与 learned-admission channels 可按 shared invocation identity、global sequence 和 monotonic elapsed 关联；per-channel/aggregate output status 正确表达 disabled、not-run、succeeded 与 failed，并能归因 setup/write/close failure。
- Scheduler graph 每次 invocation 完整一次并由 decision fingerprint 引用；动态 admission facts 不丢失；machine/progress canonical data 不被 diagnostic 重复保存；完整 per-Check duration 含未执行 `null` 且无 Top-N。
- Gate machine publication 仅移动到 `machine/` namespace，仍只生成并验证 v4 canonical `run.json` / `records.ndjson` atomic pair，canonical bytes 与 schema 不因路径移动而改变。
- 更新后的实现、测试、文档和决定通过对应最窄验证以及日常 required `bun run check`；不以 `--all` 代替本 Change 的常规验收。

## Affected Owners

- Product invocation/Check contract：`src/**`、`src/index.ts`、[Architecture](../../docs/architecture.md)、[Configuration](../../docs/configuration.md)、[API mechanics](../../docs/api-mechanics.md) 与 [coding style](../../docs/coding-style.md)。
- Output and machine publication：[Output](../../docs/output.md)、[Output maintenance](../../docs/output-maintenance.md)、`docs/schemas/`、`docs/examples/` 与 machine-output tests。
- Project Gate/progress/process artifacts：[Script tooling](../../docs/script-tooling.md)、`scripts/project/gate/**`、`scripts/project/**`、`scripts/process-execution/**` 及其 tests。
- Test semantics and documentation：[Testing](../../docs/testing.md)、[Case maintenance](../../docs/testing/case-maintenance.md)、`docs/testing/cases/**`、Test Evidence catalog 与相关 Product/Gate tests。
- Long-term direction：`docs/decisions/organize-owner-aware-project-run-and-gate-diagnostics.md`、`docs/decisions/keep-gate-run-evidence-complete-with-owner-scoped-scheduler-context.md`、`docs/decisions/publish-project-gate-machine-facts-in-machine-namespace.md`。
