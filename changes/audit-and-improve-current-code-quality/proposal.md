# Proposal

本 Plan 规定如何对当前仓库拥有的代码与行为配置执行一次全量轻筛、风险触发深审和 owner-bounded 定向优化，并用最终内容摘要证明没有遗漏。

## Why

现有 lint、typecheck、测试、quality 和 Project Gate 能证明各自的机械属性与既有行为，不能证明每个实现都符合编码规范对 owner、边界、类型、控制流、失败模型、命名和最小抽象的要求。随机抽查已经发现规则重复、职责混合与控制流表达问题；继续抽样会漏审，要求每个文件都修改或重复深审又会制造对抗式重构和验证过载。

本 Change 因此把“全量”限定为每个最终语料条目至少完成一次轻量风险筛查，把 focused/deep review、独立复核和更宽验证只用于实际修改与实质风险。

## Outcome

最终 manifest 中的每个代码或行为配置条目都在其最终 SHA-256 上获得 owner-based 处置；所有修改文件、S0–S2 finding 和 deferred 路由完成独立复核，accepted finding 均被修复或按受控条件交接，且完整覆盖、处置、验证和剩余边界可从 Change evidence 独立恢复。

## Scope

### Intended Change

- 枚举当前代码、可编辑行为配置和实际执行的生成配置，建立工作树 bytes 摘要绑定的 manifest。
- 对每个条目执行一次 lightweight screen；只在风险信号或实际修改触发时升级 focused/deep review。
- 由写入互斥的 owner batch 使用子代理完成主要审计、最小修复和局部验证，再由不同 reviewer 复核修改与实质风险。
- 用 Change-local ledger、finding 摘要、验证记录和 freshness verifier 证明最终语料与处置双向闭合。

### Resulting Impacts

- 测试节点、正文、discovery 或 Case 变化必须同步 Test Evidence；Product、Output、package、Project consumer 或文档投影变化必须同步对应 owner 与契约证据。
- 新增、删除、重命名或内容变化只使受影响 ledger 条目失效；最终验收重新发现整个 current tree。
- Public contract、machine schema、长期方向、发布或外部状态问题不能由质量批次静默决定，必须路由到相应 owner、Decision 或独立 Change。
- Change 归档后 ledger 只保存形成时证据，不成为未来局部修改必须重复执行的永久 Gate。

## Success Criteria

1. 最终发现集合、manifest 与 ledger 双向闭合；没有未知代码候选、过期摘要、未分类条目或静默排除。
2. 每个最终条目至少完成一次 lightweight screen；每个修改文件、S0–S2 finding 和 deferred 路由都有不同 reviewer 的结论。
3. 没有未闭合 S0/S1；S2 已修复，或具备 owner、风险、后续入口、当前 defer 理由和 reviewer acceptance。
4. 每个改动都由最窄语义证据和影响相称的 owner 验证支持；测试与契约材料按触发条件同步。
5. Change-local freshness、文档/Decision/Test Evidence 检查、quality 与 Full Project Gate 全部通过，最终报告明确实际结果和未覆盖边界。

## Affected Owners

- [`docs/coding-style.md`](../../docs/coding-style.md) 与相关行为 owner：定义实现判断和允许的最小修复。
- [`docs/architecture.md`](../../docs/architecture.md)、[`docs/quality-metrics.md`](../../docs/quality-metrics.md)、[`docs/configuration.md`](../../docs/configuration.md)、[`docs/output.md`](../../docs/output.md)：拥有 Product、Core/Run、Check/Record 与 publication contract。
- [`docs/script-tooling.md`](../../docs/script-tooling.md)：拥有 repository automation、package/project consumer、工具链与行为配置。
- [`docs/testing.md`](../../docs/testing.md) 与 [`docs/testing/case-maintenance.md`](../../docs/testing/case-maintenance.md)：拥有测试层级、实体与 Case 闭合。
- 各项目 Skill 的 `SKILL.md`、根 [`AGENTS.md`](../../AGENTS.md) 与 Change governance：拥有 Skill runtime/config、项目指令和本次 evidence 生命周期。
