# Design

本 Change 以三个职责明确的 sibling module 降低 layout characterization 的文件与函数级聚合；`layout-characterization.ts` 继续拥有唯一入口和结果聚合，不重定义 layout policy。

## Context

- `validateRepositoryLayout` 是 layout validation 的唯一调用入口，按固定顺序聚合 violations。既有测试覆盖 syntax diagnostics、type-only filtering、static/dynamic literal specifier、fixture exclusion、relative resolution 与 function-metrics private port boundary。
- 45 条 focused quality 基线中的四条目标 Record 是：`layout-characterization.ts` 的 file code-lines、`moduleSpecifiers` 的 cyclomatic-complexity/function-code-density，以及 `validateFunctionMetricsAnalyzerBoundary` 的 function-code-density。
- `docs/testing/cases/repository-tooling.md` 的 `AUX-REPOSITORY-LAYOUT-001` 是既有语义 Case；其唯一 test entity 仍是 `layout-characterization.test.ts`。
- 完成运行的完整 stable Record set 为 41 条：四个目标 ID 缺席，零新增 ID。日志与精确比较由 `proposal.md#focused-quality-evidence` 拥有。

## Goals / Non-Goals

**Goals**

- 让入口只协调 source discovery、owner 调用顺序与 aggregated error formatting。
- 将 parser analysis、ordinary import-boundary policy、function-metrics analyzer boundary 分别交给三个 sibling owner，且每个 module/function 落在现有 metrics 范围内。
- 保留所有已刻画的 layout behavior，并用组合回归防止 syntax diagnostics 误改变 required adapter value-import 判断。

**Non-Goals**

- 不改变 quality threshold、waiver、selection exclusion、scanner、layout policy、public runtime 或 Gate aggregation。
- 不建立通用 parser abstraction，不改变每个 violation 的 identity/order、错误文本或 source iteration。
- focused `quality` 通过不等同于默认 required Gate；后者由任务 2.5 的独立通过运行验证。

## Decisions

### Intended Change

1. `layout-characterization.ts` 保留 `validateRepositoryLayout`、source discovery、existing validation call order 与 final `Error` aggregation；它调用三个 internal sibling owner，不重新实现其内部规则。
2. `module-specifier-analysis.ts` 对每个 source 解析一次，返回 diagnostics、一般 module specifiers、value module specifiers 与 value import specifiers。发生 syntax error 时，保留既有 diagnostic text 和 dedupe，并返回空 specifier views。
3. `import-boundaries.ts` 保留普通 import-boundary rules、relative target resolution 和 fixture filtering；它使用 analysis owner 的对应 specifier view，不重新定义 parser 行为。
4. `function-metrics-analyzer-boundary.ts` 保留 port-façade consumer、analyzer/import role、public-entry 与 required adapter consumer rules。required adapter consumer 以独立 AST value-import predicate 判断，不能因为同一 source 后续 syntax error 导致缺失-import false positive。

### Resulting Impacts

- 所有外部调用与最终 error formatting 保持在入口；sibling import 仅是脚本内部实现组织。
- syntax error 继续阻止一般 specifier extraction；type-only / value selection、literal extraction、fixture exclusion 与 relative resolution 仍按既有职责执行。
- `analyzer-worker.ts` 和 `target-files.ts` 的 required adapter value import 独立于该分析 view；“有效 adapter import + 后续 syntax error”同时证明 syntax diagnostic 存在且不出现 required-import violation。
- 当前 semantic Case 不新建或改名，只补充其 `Proves`；Test Evidence mapping 保持一个 test entity 到原 Case。
- focused quality 比较完整 ID 集合，禁止通过 waiver、threshold 或 exclusion 隐藏四个目标 finding。

## Risks / Trade-offs

- 拆分可能改变 diagnostic/violation 的追加顺序，或错误纳入 type-only/nonliteral import。控制手段是保留入口调用顺序、TypeScript AST、现有 mutation test 和 Case。
- 若一般 parse analysis 的“syntax error → 空 specifier”语义被不当地复用到 required adapter rule，会把有效 import 误报为缺失。独立 AST predicate 与组合回归固定这条边界。
- focused quality 仅验证 quality 闭集；默认 `bun run check` 的独立 evidence 已由任务 2.5 提供，不能由 45→41 推断。

## Open Questions

无。focused quality 与默认 required Gate 的分层验证均已完成。
