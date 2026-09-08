# Design

Gate 依据静态工作特征配置逻辑资源预算，Product 继续拥有准入合法性与资源生命周期。

## Context

- [Project Gate](../../docs/tooling/project-gate.md)拥有唯一 process entry `scripts/project/gate/run.ts` 和组合 manifest `scripts/project/gate/definition.ts`；当前 root `maxParallel: 3` 与现有 mutex 保留。
- [Scheduler](../../docs/development/scheduler.md)与[静态容量 Decision](../../docs/decisions/enforce-static-named-resource-capacities.md)已定义 capacities、claims、原子 accounting 和合法性。本 Change 只消费已有能力。
- [Gate 时长调查](../../docs/investigations/calibrate-gate-duration-variation.md)提供四类 profile 的波动线索，未证明竞争因果。报告形成时建议的后续隔离测量不作为本 Change 的配置前置；本设计以静态工作分类承接当前实施范围。

## Goals / Non-Goals

目标是用少量可解释的逻辑预算表达 Gate 中的潜在共享资源压力，并交接稳定映射。资源分类和配置值由实施者根据 Check owner 决定，不要求用户选择数值，也不等待竞争实测。

不新增 Product API、resource type、第二 Gate entry 或诊断 selector；不替换 mutex、调优算法或证明真实加速。后续性能观察可触发独立调整，不是配置成立的先决条件。

## Decisions

### Intended Change

1. **从行为建立清单。** 阅读 manifest、被引用的 Check 和开发命令；逐项记录执行类别、主要 CPU/文件扫描/共享对象需求、现有 mutex 和拟议资源。只记录影响配置的依据，不复制全部 Check 实现。
2. **保持资源少而明确。** 合并确实代表同一压力预算的工作，不把“所有 Check 都用 CPU”当作全部统一限流的理由。先采用同类工作 claim=1 的逻辑单位；只有可解释的相对需求才引入权重。capacity 是允许同时占用的逻辑预算，不是硬件测量值。
3. **按独立约束配置。** root 和 mutex 原样保留；capacity 必须容纳每个单项 claim，并满足 Product 正整数规则。不为无已知共享用途的 Check 强加资源；已有 mutex 足以表达的独占关系不再复制成新资源。映射表与数值在配置实施任务中形成并接受评审，不要求 Plan 预先猜定全部条目。
4. **最小接线与退出。** 在 `definition.ts` 落地映射，近邻测试证明实际定义而不是平行 fixture。对无法解释的新声明保留原状并记录理由；对引入的非法配置、执行失败或明显无谓串行化先修正或撤回该声明，不通过调整 root、mutex 或验收 selection 规避问题。

### Resulting Impacts

- 直接测试验证资源声明、claims、未声明项、保留的 root/mutex 和 Product validation；在既有 Gate 配置测试中维护相关 Case。
- 正式 `bun run check -- --all` 验证配置后仍能完成真实接线。耗时作为观察记录，不设置机器依赖的加速百分比或性能 required Check。
- 在 Gate owner 说明逻辑单位、分类理由和维护规则；public authoring 未变化，无需制造用户 API 变更。非实施代理仍分别核对用户说明与内部设计影响。
- 向[平台](../build-admission-simulation-workbench/proposal.md)交接稳定配置提交和映射。平台基础实现可以独立推进，最终 Gate 场景才消费该映射；[算法](../redesign-learned-admission-heuristic/proposal.md)不反向决定 Gate 配置。

## Risks / Trade-offs

静态判断可能高估或漏掉资源竞争；初始预算保持少量、可调整且理由明确，不把它当成通用性能模型。配置改变 admission 顺序不等于发生错误，但额外约束必须有独立用途。模拟竞争系数不能从 resource 声明或单次 Gate 时长反推。

## Open Questions

无阻止开始配置工作的未决范围或用户选择。具体映射和预算是 Implementation 1.1 的工程产物，由上述规则和配置评审闭合；逐项竞争实测不是准备门禁。
