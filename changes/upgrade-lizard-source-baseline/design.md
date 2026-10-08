# Design

本 Draft 固定升级对象、保持范围和采用门槛，围绕既有指标跟进 reader 改善。

## Context

- [分析器 owner](../../docs/development/scanner-dependencies.md)拥有产品自有 TypeScript 移植及私有 façade/adapter/Worker 边界；当前固定基线为 `1.24.0`。
- [升级调查](../../docs/investigations/assess-lizard-1-24-1-upgrade.md)保存 `1.24.1`、commit `0488a260e74e73ceba3149d7c600faac6a3616e6` 的来源核对、七个模块映射、14 项对照及 Rust/Kotlin 风险。进入实施前核对当次来源身份和工作区状态。
- [公开指南](../../docs/checks/function-metrics.md)拥有指标、贡献解释及 Finding/waiver；[来源维护](../../docs/tooling/source-mapping.md)区分人工 provenance、identity 与派生 package pin；[扩展决策](../../docs/decisions/keep-lizard-advisory-explicit-with-selected-extension-adoption.md)保持 advisory 显式及扩展采用独立。

## Goals / Non-Goals

- **目标**：取得 reader 更新收益，闭合来源、翻译一致性、公开结果和包消费者证据。
- **保持**：四项指标及默认 limits、27-reader/55-suffix 支持面、`complextags`/`nd`、私有分析链和离线 Product 行为。
- **另行承接**：两项既有 TypeScript 修复归独立 Change；Cognitive Complexity 等新扩展需独立需求与采用评估。性能工作限于本次升级成本的验收。

## Decisions

### Intended Change

暂定采用 `1.24.1` 精确 commit，以统一来源基线承接以下调整；开放问题收敛后进入 Plan。

1. 从七个模块映射核对完整差异并翻译：共享 regex、TypeScript、TSX、Python、Kotlin、PHP states、Rust。
2. 同步 provenance、source header/range/hash、identity、版本化 evidence、派生 package pin 和 advisory 基线；派生材料通过 owner 入口维护。
3. 保留原始上游 oracle；满足公开承诺所需的本地偏差单列依据及修正期望，分别证明翻译一致性和结果正确性。

### Resulting Impacts

| 影响 | 必要处理与验收 |
| --- | --- |
| 指标与兼容 | 核对函数名、位置/NLOC、CCN 和完整贡献列表，说明 Finding、thresholds 及 waiver 结算的升级影响；稳定事实交接给公开指南和分析器 owner。 |
| 来源与包材料 | 核对来源/法律材料、identity、版本化路径及 fixture/工具引用；按来源流程同步派生 pin，验证候选包的实际 Worker 材料。 |
| 行为证据 | 按[测试策略](../../docs/testing/strategy.md)从 14 项样例提取必要直接测试，覆盖 27-reader oracle/identity、malformed、扩展生命周期及公开 Worker/Finding；已知两项缺陷保留独立对照。 |
| 交付与成本 | 验证 package artifact、installed consumer 和完整 Gate；按[性能流程](../../docs/tooling/lizard-performance.md)取得代表性 corpus 成本证据，先核对比较入口的旧基线适配及运行授权。 |

## Risks / Trade-offs

- 新版 Rust 三个 arm 得到 CCN 3，但贡献列表为空；Kotlin 表达式体结束行与下一声明可能重叠。采用须满足公开承诺，Python 相等性只证明翻译一致。
- regex 改为提前匹配并 yield，需验证 Python/JS 正则语法、空白/换行及扩展生命周期；完整翻译 parity 与性能仍待取得。
- 升级和修复共享 analyzer、来源、Case 与包材料，按[协调顺序](../../docs/governance/change-coordination.md#lizard-升级与-typescript-修复)串行实施、独立验收。

## Open Questions

1. Rust 贡献解释与 Kotlin 位置如何满足公开承诺？需要本地修正时，确定必要偏差、兼容影响与验收，或调整采用方案。
2. 新基线涉及哪些 evidence/来源路径、advisory fixture 和比较工具引用？Plan 前核对完整实施面。
3. 采用哪些真实 corpus 与性能非回归门槛？运行涉及的写入、安装或联网授权需确认。

保持 Draft；采用范围和开放问题收敛后派生 tasks，实施需另获授权。
