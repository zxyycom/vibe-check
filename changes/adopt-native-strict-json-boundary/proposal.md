# Proposal

采用原生语法验收和项目私有查重，降低严格 JSON 处理成本并保持消费者契约。

## Why

[调查](../../docs/investigations/evaluate-strict-json-parser-replacement.md)已取得两宿主行为对照及局部成本证据。
用户确认保留重复键拒绝，并授权由原生 `JSON.parse` 承担完整语法，项目维护合法原文上的窄查重。

## Outcome

JSON 文档完整语法由原生解析器验收，重复键由项目私有扫描器检出；JSON、Schema 本地与受控远端消费
保持字节限制、错误顺序、深冻结私有值、取消和安全结果，产品与发行包移除 Momoa 依赖。

## Scope

### Intended Change

在现有 `json-document` owner 内实现合法原文的键名查重与新解析值的迭代安全处理，替换 AST 路径。
使用 pnpm 移除 Momoa，更新发布 manifest 与独立 artifact 预期。

### Resulting Impacts

补强既有语义 Case 与 JSON/Schema 消费测试，覆盖转义、对象作用域、语法优先和深层输入。
同步当前指南、采用决定及链接，按 ai-ready-docs 和完整编码规范复审变更；保留原调查样本和旧决定的历史含义。
完成同输入性能复测、工程校验、非实施代理反查及完整 candidate/consumer Gate。

## Success Criteria

1. byte limit → BOM → fatal UTF-8 → 完整语法 → 解码键查重的顺序和闭合结果保持。
2. 同值、转义、嵌套重复均拒绝；安全值保留特殊键、负零、数值溢出和冻结属性描述符。
3. JSON/Schema 既有消费者与新增边界测试通过，当前 Case 全树闭合。
4. 同一冻结输入在 Node/Bun 下复测；正式 Gate 并发、资源配置及既有预算不变。
5. 完整 Gate、发行包和外部消费者验收通过，独立审查无阻断问题。

## Affected Owners

- [JSON Check](../../docs/checks/json-validation.md)、[Schema Check](../../docs/checks/json-schema-validation.md)：文档与值边界。
- [编码规范](../../docs/development/coding-style.md)、[测试策略](../../docs/testing/strategy.md)与 Case 维护：实现质量与证明。
- [包产物](../../docs/tooling/package-artifact.md)、[候选包](../../docs/tooling/package-lifecycle.md)：依赖和 installed consumer。
- [知识治理](../../docs/governance/knowledge-maintenance.md)：采用演进、当前说明和独立反查。
