# Proposal

本 Change 为 `markdownLint` 增加精确 Finding waiver：调用方能接受已确认的局部例外，同时保留完整 lint 证据。

## Why

当前 `markdownLint` 只有 `files` selection、规则集和全局 `findingPolicy`；没有原生 `findingWaivers`，inline config 也固定禁用。调用方若只接受少数已知 Finding，只能维持整个 Check 的 non-blocking、改变扫描范围或关闭规则，都会影响无关的新 Finding。

Check-owned waiver 可在完整 lint 后逐项对账，使新 Finding 继续接受原有 policy 判断；Project Gate 是否配置 waiver 是另一个采用决定。

## Outcome

`markdownLint` 调用方可以声明带理由的精确 Finding waiver。完整 lint 后，唯一匹配的 Finding 仍发布并带豁免证据；未命中或过宽配置产生可见 audit、相关 Finding 继续 actionable。省略 waiver 时，现有选择、规则、Finding、计数与 Check 结算保持不变。

## Scope

### Intended Change

- 新增闭合的 `findingWaivers: [{ identity: { path, rule, range }, reason }]`，identity 直接复制公开 lint Record 的三个同名字段。
- 完整 lint traversal 后调用既有通用 reconciliation；fresh 与 cached findings 使用同一实时结算路径。
- 保留所有 lint Records，唯一命中时增加 `waiver.reason`；零命中和多命中发布 audit 与消息。
- 不增加 inline suppression、整文件/整规则 waiver、批量 selector 或 Gate waiver，也不改变 Gate 的 non-blocking policy。

### Resulting Impacts

- 保持现有 final-data 三个计数与 parser；`findingCount` 继续包含全部 lint Findings 和 rejected inputs，不计 audit。
- 扩展 authoring/resolved types 与 Record union；更新公开指南、JSDoc、可执行示例、类型和 installed-consumer 验收。
- 维护局部测试与 Case，验证 hostile authoring、完整性失败、同 identity 多命中及 cache hit 时配置变化。

## Success Criteria

- 合法 waiver 安全快照；非法 identity、空 reason、额外字段、重复 identity 或 accessor 在 constructor 被拒绝。
- blocking Check 仅由未豁免 lint Findings 阻断；unused/overmatched 可见且不豁免任何不唯一匹配。
- 省略或空 waiver 保持现有 Records、顺序、消息、计数、limits、空输入与 unavailable 边界。
- warm cache 下新增、修改或删除 waiver 立即影响本次对账；无须修改 lint cache identity 或 payload。
- 局部测试、全树 Case 闭合、文档/类型/lint 与完整 Gate 验收通过，独立审查核对代码与用户说明。

## Affected Owners

- [`Markdown lint`](../../docs/checks/markdown-lint.md) 与 `src/package-checks/markdown-lint/**`。
- [`Finding waiver`](../../docs/guides/finding-waivers.md) 与既有通用 reconciliation/Check-owned authoring、audit helpers。
- [`测试策略`](../../docs/testing/strategy.md)、[`文档材料`](../../docs/tooling/documentation.md)与 package consumer 验收。
- [`Project Gate`](../../docs/tooling/project-gate.md) 仅作为现有 policy 不变与集成验证边界，不修改 Gate 配置。
