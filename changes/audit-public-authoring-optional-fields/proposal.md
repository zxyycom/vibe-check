# Proposal

从公共字段审计中收敛一个实施项：允许省略 Finding waiver 配置，在不丢失证据的前提下减少空数组填写。

## Why

实施前，`reconcileFindingWaivers` 要求无豁免的调用方也填写 `waivers: []`，而“没有配置豁免”有唯一中性语义。本 Plan 按用户授权实施这一最小范围。

[调查清单](inventory.md)保存范围选择与形成时依据；本次只实施 waiver helper。

## Outcome

调用方可省略 `waivers` 或传入 `undefined`，得到与显式 `[]` 相同的完整 reconciliation：全部 Finding 保持 actionable，仍验证 identity，audit 为空。

## Scope

### Intended Change

- 仅将 `ReconcileFindingWaiversOptions.waivers` 改为可选，在 helper 的 waiver materialization 边界补齐空数组。
- 保持 `findings`、`identify` 必填；显式非空 waiver 的 matching、audit、冻结和错误行为不变。
- collector 的 `selection.exclude`、三个 Check 的 area `files` 和 bundled `catalog` 均留在调查清单，不在本次实现。

### Resulting Impacts

- 同步 public JSDoc、[用户指南](../../docs/guides/finding-waivers.md)、[内部 owner](../../docs/development/package-tools.md)与变更日志。
- 验证省略、显式 undefined、空数组、非空配置和非法配置；复用现有 Case，补齐安装后类型与 runtime 验收。
- named-options consumers 读取 `waivers` 时需处理 undefined，变更日志明确此声明影响；输出 DTO、机器 schema、持久 identity 和其它 API 不变。

## Success Criteria

- 省略与显式 undefined/空数组的结果等价，保留 Finding 顺序与原引用、冻结输出和完整 identity 校验。
- null、非数组、稀疏/hostile array、重复 identity 与非法 reason 仍拒绝；不把非法显式配置变成无豁免。
- 最窄回归、完整 Case 闭合、文档校验、完整 Gate 与同一 exact candidate 的安装后验收通过，非实施代理反查行为及文档影响。
- 只保留目标改动。当前授权包括整理 Git 提交及照常执行已配置的自动推送 hook；正式发布与 Change 结项删除仍需另行授权。

## Affected Owners

- [Finding waiver](../../docs/guides/finding-waivers.md)与[随包工具实现](../../docs/development/package-tools.md)：公开行为与默认化责任。
- [测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)：局部行为与账本闭合。
- [包生命周期](../../docs/tooling/package-lifecycle.md)、[文档材料](../../docs/tooling/documentation.md)：安装后声明/runtime 和材料验收。
