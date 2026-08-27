# Proposal

本 Change 重新校准测试证据语义，并把 package acceptance 的共同运算表达为可调度、可消费的 typed-output Check DAG。

## Why

当前测试账本虽然完成实体闭合，但部分 Case 的 Owner、Proves 和可观察结果边界过宽或错配；同时少数 package acceptance 测试把安装、准备和多项下游行为封装在单一物理测试进程中，遮蔽阶段性失败并限制调度复用。测试数量本身不是主要性能瓶颈，账本合理性也不能由性能收益决定。

## Outcome

完成后，每个受影响 Case 都有合理的行为 owner 和可证伪目的；external-consumer 的共同物理安装只执行一次并以版本化 typed data 交给独立 downstream Checks，物理 mutation、只读验收、清理、timeout、transcript 和聚合责任保持明确。

## Scope

### Intended Change

- 独立审计并重构 candidate、scanner、cache、JSON Schema、progress、host environment 与测试工具相关语义 Case。
- 删除或合并已由更强证据完全覆盖的测试实体，不以减少节点数量替代语义判断。
- 将 external consumer 的共同物理安装提升为 invocation-owned typed provider Check，并由静态依赖图调度 types、docs 与 runtime 下游行为。
- 保持 artifact material、candidate lifecycle 与 external consumer 的独立验收结论，按实际 mutation 资源配置 dependency、mutex、timeout 和 cleanup。

### Resulting Impacts

- Project Gate 的 Check identity、test execution partition、profile/tag membership、typed dependency parser、process transcript 和 aggregate selection 需要同步。
- 测试实体增删、rename、split 或 merge 必须同步 current Case 账本并保持全树闭合。
- 稳定 Project Gate 与 package acceptance 行为 owner、长期决策和验证材料需要反映新的 provider/consumer DAG。
- 性能判断必须用相同 membership 和 warmed-candidate 条件重复测量；Case 合理性修正不以性能收益为验收条件。

## Success Criteria

- 受影响 Case 的 Owner 真正拥有全部 Proves，每个 Case 对应稳定且独立的可观察结果。
- 同一 invocation 中可复用的 external-consumer 安装由一个明确 provider 产生，downstream 不通过 ambient receipt 或重复安装恢复同一事实。
- 每个 acceptance 子 Check 具有独立 startup/settled transcript 与 timeout，失败路径有明确 cleanup owner。
- supported Bun test surface 恰好执行一次并完成 Case closure；目标测试、typecheck、lint、required/full Gate 通过。
- 用五次交错 A/B 或等价重复测量报告新 DAG 的 wall、离散度和最长 Check，不用单次结果宣称性能收益。

## Affected Owners

- `docs/testing.md` 与 `docs/testing/case-maintenance.md`
- `docs/testing/cases/**`
- `docs/script-tooling.md#project-gate`
- `docs/quality-metrics.md`、`docs/configuration.md`、`docs/output.md` 与相关测试行为 owner
- `scripts/package/**`、`scripts/project/gate/**`、`scripts/test-evidence/**`、`scripts/validation/**`
- `docs/decisions/**` 中 package acceptance、typed provider 与 Gate 调度决策
