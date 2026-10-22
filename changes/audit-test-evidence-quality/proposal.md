# Proposal

本临时计划普查项目全部当前测试，按行为 owner 形成可执行、可复核的保留与清理判断。

## Why

用户要求重新核对测试的必要性，低质量测试无论删后能否提速都应清理。当前 Case 闭合仅证明身份与映射合法，不能代替对断言质量和独立证明价值的审查。

## Outcome

子代理逐一审读完整当前测试面及明确委托的验收材料，指出低质量证据及处理路径；官方清单与审读证据联合闭合，不以抽样、选定热点或部分批次代替全仓结论。

## Scope

### Intended Change

逐文件逐实体读取当前 owner、实现、测试与 Case，按独立可观察结果判断保留、改写、合并或删除。范围为当前 runner profile 的全部 `scripts/**` 与 `src/**` 测试，当前为 282 文件、766 实体；另核对明确声明的非日常测试入口、委托 fixture、类型和 runtime 验收材料。第三方工具未声明为本项目验收的上游测试不自动纳入。

已审的 Gate、package、Markdown link 共 47 文件、138 实体先核对输入未变，再与剩余 235 文件、628 实体的全量审读合并；分区仅是并行分工，不是交付范围缩减。报告保留复核依据，不提交第二套实体账本。

### Resulting Impacts

- 本轮只审计和交接建议，不修改测试、Case、Product 或现有 Gate 阻断策略。
- 子代理承担各完整分区的主要审查，主代理核对覆盖并集、证据和跨层重复判断；存在未读实体时继续推进，不将其留到交付之后。
- 保护上一轮未提交改动；不提交、删除 Change、重试 Gate 或调整预算。

## Success Criteria

- 所有当前实体逐一审读；最终审读并集与最新官方全树清单完全一致，遗漏和未知实体均为零。各组明确所读正文、委托材料和动态验证边界。
- 每项清理建议指向测试/断言、owner 承诺、具体证明缺陷及删除后的证据去向。
- 区分可直接删除与须保留独立义务后重写/合并，不以运行时长、Case 同名或文件重复作为充分依据。
- 主代理交叉复核高价值候选，形成全仓清理优先级、普查覆盖证明，并验证审计材料；审计未结束前不转入删测实施。

## Affected Owners

- [测试策略](../../docs/testing/strategy.md)与[Case 维护](../../docs/testing/case-maintenance.md)
- [Project Gate](../../docs/tooling/project-gate.md)与[Gate diagnostics](../../docs/tooling/gate-diagnostics.md)
- [Package lifecycle](../../docs/tooling/package-lifecycle.md)与[Package artifact](../../docs/tooling/package-artifact.md)
- [Markdown link](../../docs/checks/markdown-link-validation.md)与[解析实现](../../docs/development/markdown-link-resolution.md)
- 其余 [Product 与工具 owner](../../docs/navigation.md#如何阅读这些文档)，由各分区按当前测试实际恢复。
