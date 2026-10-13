# Proposal

消除共同 Run 决策边界中已被 immutable core 覆盖的重复投影，保留完整观察事实。

## Why

shell 已持有 authoritative admission core，却每轮复制整个 shell snapshot；decision 仅消费其中 lifecycle 和取消顺序，其余投影被丢弃。canonical candidates 随后又被等值 map/freeze。调用证据与支持 Node 的公开 Run 对照见[调查报告](../../docs/investigations/evaluate-run-projection-optimization.md)。

## Outcome

在支持 Node 的完整公开 Run 上减少重复物化成本，保持调度顺序、hard guards、冻结 context、measurement、失败/drain 及终态/输出事实。Bun 提供独立性能参考和项目行为测试证据。

## Scope

### Intended Change

修改 `scheduler.ts`、`scheduler-decision.ts`、`scheduler-admission-decision.ts`：shell 使用 core + lifecycle 入口，共用单一 cycle 决策；保留 standalone snapshot 的原语义，直接复用 canonical frozen candidates。

### Resulting Impacts

增强 `task-engine.settlement.test.ts` 既有 abort/drain 实体，以非字典序多 pending 和 standalone supplied 逆序 IDs 证明取消顺序。`AUX-PARALLEL-RUNNER-001` 目的连续，无新增 entity/Case。公开回调、measurement 和调度契约不变，稳定用户文档无需扩写。

## Success Criteria

1. 生产改动限于三个模块和既有测试正文；core 持有路径不再每轮复制 shell 全态，candidate 字段、顺序及冻结保持。
2. Node P=4、N=512 两形状的两个相邻 A/B 对均改善；最终实现与已测候选的工程修正有等价证据，不建立 CI timing 门槛。
3. scheduler/admission/measurement、custom/prepared 生命周期、取消顺序、完整 Case 和工程/材料验收覆盖受影响边界。
4. 同产物 required/complete Gate 和安装消费者验收闭合；报告区分 source API 性能、本地安装验证与真实用户负载。

## Affected Owners

- 公开调度：`docs/guides/scheduling.md`。
- 内部 core/shell/measurement：`docs/development/scheduler.md`。
- Invocation 接线：`docs/development/project-run.md`。
- 证明目的：测试策略、Case 维护及 `AUX-PARALLEL-RUNNER-001`。
