# Proposal

本 Change 将跨 Run 的 Scheduler duration model 与 invocation 内的 learned critical-path admission strategy 解耦为两个 private owner，并以当前实现作为行为等价基线；它不改变公共配置、调度算法或运行结果。

## Why

当前实现已按 `history load/prediction → pure Scheduler → history record/write` 执行，但 private 组合边界仍混合两种变化原因：`src/project-run/scheduler-history/critical-path.ts` 在 history owner 中实现图排名算法，`src/project-run/invocation.ts` 的 `SchedulerLearning` 同时保存 history、duration prediction、critical-path score 和 state directory，`resolved-checks` 又根据这个混合输入创建 policy。

因此，后续单独调整时长统计或 admission 算法时必须跨越对方 owner，也难以用固定 prediction input 区分“模型改善估计”与“策略改善调度”。现有长期 Decision 已要求跨 Run history 位于 Scheduler 外、Scheduler 只消费 immutable prediction、policy 保持纯 `select | wait` 决策且 Scheduler 独占 hard guards；本 Change 只让实现所有权和调用关系兑现该方向。

## Outcome

完成后，Run 的 private 组合关系可以直接恢复为：

```text
prepare duration model
  → create pure admission strategy
  → schedule
  → record terminal duration samples
```

- duration model 独占本地 history 的 load/validation、identity、prediction、terminal sample recording 和 storage，并交付 immutable prediction 与 post-drain record capability。
- learned critical-path strategy 独占 graph ranking 和 admission comparator，以高阶 factory 形成 Scheduler 可重复调用的 pure `AdmissionSelectionPolicy`；它不读取文件或更新跨 Run 状态。
- invocation 显式编排 prepare、strategy creation、schedule 和 record；`resolved-checks` 只消费已经形成的 private admission selection policy，不再识别 history、prediction 或 score table。
- static、custom 与 learned 的公共配置、fingerprint、selection order、fallback、diagnostic containment、Task/Check results 和 history bytes 保持当前语义。

## Scope

### Intended Change

- 将现有 `scheduler-history/**` 收敛为 `scheduler-duration-model/**`，使目录拥有 history、prediction、prepare/record lifecycle 与 bounded storage；不在该 owner 中保留 graph algorithm。
- 增加 closed private duration-model preparation result：`ready` 交付 prediction 和 record capability，`static-fallback` 显式表示 learned model 无法为本 invocation 准备；missing/invalid/incompatible/read-failed history 仍属于可用的 empty learned model。
- 将 critical-path score 移到 Task Scheduler owner；strategy factory 接收一次 invocation 的 immutable `SchedulerGraphSnapshot` 与 duration prediction，返回 pure policy 和只读 score snapshot，后者只服务现有有界 admission diagnostic。
- 由 invocation 在 Scheduler 前准备 model 和 strategy，在 Scheduler drain 后调用 record capability；static/custom policy 也在 invocation 映射为既有 private selection policy。
- 迁移直接测试和 Case ownership，并更新 architecture/API 文档中的 private owner 与数据流；不把内部组合 seam 投影为 public configuration。

### Resulting Impacts

- `src/project-run/invocation.ts` 不再维护 `SchedulerLearning` 混合 aggregate，但继续拥有 policy dispatch、运行顺序、fallback 和 diagnostic presentation。
- `src/project-run/check-execution/resolved-checks.ts` 不再根据 public policy kind 或 learned score table 创建 strategy，只把 private policy 交给 Task Scheduler。
- `src/project-run/scheduler-history/**` 的文件和测试迁移到 duration-model owner；`critical-path.ts` 及其证明迁移到 `task-scheduler/**`。
- 现有 history schema、model version、prediction digest、score formula、selection layers、priority/ID tie-break、`canAdmit`/`wait` 行为和 atomic write 不变。
- 测试必须证明迁移前后 admission trace、terminal facts、diagnostic classification 和 deterministic history bytes 等价；仅 typecheck 或最终 aggregate 相同不足以验收。
- 后继 `optimize-learned-admission-strategy` 只能在该 seam 验收后，以固定 duration prediction input 比较算法；本 Change 不实现 backfill 或其它策略候选。

## Success Criteria

- 代码目录和 imports 明确形成两个 private owner：Scheduler duration model 不依赖 graph ranking 或 admission policy，learned strategy 不依赖 filesystem、history model、record callback、logger 或跨 Run mutation。
- invocation 局部连续呈现 `prepare model → create strategy → execute → record`，其中 `ready | static-fallback`、post-drain record 提交点和 failure containment 可从类型与控制流直接恢复。
- `resolved-checks` 只接收 private `AdmissionSelectionPolicy`；它不再导入 public `AdmissionPolicy`、Scheduler duration model 或 critical-path snapshot。
- 相同 Definition、controls、project root 和 history input 产生与基线相同的 normalized fingerprint、prediction/digest、critical-path score、admission trace、settlement、diagnostic facts 与 history serialization。
- static/default 不进行 duration-model I/O；custom policy fault contract 不变；learned history empty-model、prepare static fallback 和 post-drain record/write failure 继续保持三类不同语义。
- 不新增 public field、algorithm registry、generic model interface、per-Check estimate、第二种 configurable algorithm 或外部依赖。
- 直接测试、installed consumer、Test Evidence、format、typecheck、lint、dependency boundary 以及 required/full Project Gate 全部通过。

## Affected Owners

- `src/project-run/invocation.ts`：learned model/strategy composition、policy dispatch、diagnostic presentation 和 post-drain record 时序。
- `src/project-run/check-execution/resolved-checks.ts`：已解析 Check execution 只消费 private admission selection policy。
- `src/project-run/scheduler-duration-model/**`：history identity、prediction、prepare/record capability、bounded model 和 storage。
- `src/project-run/task-scheduler/**`：critical-path ranking、learned strategy factory、pure admission decision 和 Scheduler hard-guard 交接。
- `docs/architecture.md`、`docs/api-mechanics.md`、`docs/configuration.md`：稳定行为、private owner 和 public/non-public 边界。
- `docs/testing.md`、`docs/testing/cases/**`：迁移后的行为证明、Case Owner/Proves 和验证入口。
- `docs/decisions/learn-check-task-durations-for-critical-path-admission.md`、`docs/decisions/use-stateless-admission-policies-with-hard-scheduler-guards.md`：本 Change 遵守的长期方向；本次不改变其语义或 alignment。
- `changes/optimize-learned-admission-strategy/**`：消费本 Change seam 的后继算法 Draft；不参与本 Change 验收。
