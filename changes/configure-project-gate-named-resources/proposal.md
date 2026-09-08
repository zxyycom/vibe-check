# Proposal

依据 Check 的实际工作特征，为 Project Gate 配置少量命名资源限制，向虚拟平台和算法交接明确的仓库配置。

## Why

Gate 已有 root `maxParallel: 3` 和 mutex，但未使用 Product 现有 named-resource authoring。静态阅读 Check 的进程、扫描、文件访问和共享对象，可以识别主要资源需求及潜在竞争，并形成初始调度预算；无需先测出逐项竞争系数。

资源声明是仓库选择的准入约束，不是物理资源探测结果。应保留可复核的分类理由和单位，避免仅因任务耗时长或波动大就新增限流。

## Outcome

为有明确资源用途的 Check 落地 capacities/claims，保持 root `maxParallel: 3` 和现有 mutex，证明配置合法且实际接线正确。不能从工作特征判断的项保持不声明并说明理由；交接完整映射及边界，不以真实加速或逐项隔离测量作为完成条件。

## Scope

### Intended Change

- 使用 Product 已有 resource authoring，只修改 Gate Definition、直接配置测试及维护说明。
- 按静态工作特征形成资源名称、逻辑计量单位、capacity 与 claims；数值是可调整的仓库预算，不冒充 CPU 核数、内存或实测竞争参数。
- 不修改 Product、learned 算法、Gate root entry、root 并发度或现有 mutex；不增加单 Check 测量入口。

### Resulting Impacts

- 配置会改变 admission 与重叠；用配置测试和正式 Gate 验证接线、合法性及完成能力。
- 平台读取版本化的实际映射，竞争减速仍由平台模型单独定义；Gate 映射不成为 package 默认值。

## Success Criteria

- 每个资源都有用途、单位、预算理由；相关 Check 的 claims 与不声明理由可从近邻实现复核。
- capacities/claims 满足 Product contract，root 与 mutex 保持不变，目标测试及完整 Gate 通过。
- 向下游交接配置所在提交、映射和验证边界；不宣称已证明物理竞争或真实性能收益。

## Affected Owners

- `scripts/project/gate/definition.ts`、`scripts/project/gate/definition.test.ts` 及相关 `checks/**`：配置与直接证明。
- [Gate 维护说明](../../docs/tooling/project-gate.md)：资源预算与正式入口。
- [测试策略](../../docs/testing/strategy.md)：Case 与执行证据；[任务清单](tasks.md)记录交付进度。
