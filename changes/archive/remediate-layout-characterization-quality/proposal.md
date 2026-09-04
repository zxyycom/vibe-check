# Proposal

本 Change 已将 repository layout characterization 的三类内部职责拆至三个 sibling owner，消除 `layout-characterization.ts` 的四条既有 quality Record，同时保持入口、validation 顺序与聚合错误契约不变。

## Why

`scripts/validation/layout-characterization.ts` 曾同时拥有 TypeScript module-specifier analysis、ordinary import-boundary policy 与 function-metrics 私有 analyzer port boundary。这个职责聚合造成一条 file-metrics Record、`moduleSpecifiers` 的两条 function-metrics Record，以及 `validateFunctionMetricsAnalyzerBoundary` 的一条 function-metrics Record；阈值超限不是维持这种聚合的理由。

## Outcome

`validateRepositoryLayout` 仍是唯一 layout validation 入口，并以既有顺序汇总 violations。三个 internal sibling owner 分别承接 module-specifier analysis、ordinary import boundaries 与 function-metrics analyzer boundary。focused quality 的完整 stable Record set 从 45 条变为 41 条：四个目标 ID 全部消失，零新增 ID；没有通过 threshold、waiver 或 selection exclusion 达成该结果。

## Scope

### Intended Change

- `scripts/validation/layout-characterization.ts` 保留 `validateRepositoryLayout`、source discovery、validation 调用顺序和最终 aggregated error formatting。
- `module-specifier-analysis.ts` 拥有单次 TypeScript AST analysis、既有 syntax diagnostic 文本/去重、static/dynamic literal extraction、unwrap，以及 type-only/value import views。
- `import-boundaries.ts` 拥有普通 Product/Project/package/environment/process-execution import-boundary policy、relative resolution 与 fixture exclusion。
- `function-metrics-analyzer-boundary.ts` 拥有 analyzer import roles、private port-façade consumer、required adapter value-import 和 public-entry restriction。
- 不修改 threshold、waiver、selection exclusion、scanner、layout policy、public runtime 或其它 quality Record。

### Resulting Impacts

- 所有调用方继续只调用 `validateRepositoryLayout`；source iteration、validation 顺序、violation identity/order 与最终错误格式不变。
- syntax error 仍以既有 `module-specifier-parse: <path>:<line>:<column>: syntax error TS…` 形式报告，且该 analysis 不提取 specifier。
- required adapter consumer 另以独立 AST value-import predicate 判断。有效 adapter value import 后出现 syntax error 时，仍报告 syntax error，但不得伪报 `function-metrics-required-adapter-import`。
- 现有 semantic Case 与 test entity 保持连续；Case 的 `Proves` 补充该组合回归边界，而非为拆分创建新 Case。
- 质量验收比较完整 stable Record set，不只检查目标路径或函数缺席。

## Success Criteria

1. 下列四个基线 ID 均不在 focused quality output 中：
   - `scripts/validation/layout-characterization.ts` 的 file-metrics code-lines；
   - `moduleSpecifiers` 的 cyclomatic-complexity 与 function-code-density；
   - `validateFunctionMetricsAnalyzerBoundary` 的 function-code-density。
2. 同一 focused quality 配置从 45 条 Record 变为 41 条；上述四条消失，零新增 stable ID。
3. layout characterization mutation test、syntax-error + valid adapter import regression、scripts typecheck/lint/format、Test Evidence closure 与 focused quality 均通过。
4. 入口、普通 layout policy、parse/type filtering、static/dynamic literal handling、fixture exclusion、relative resolution、violation order/identity 和 aggregated error formatting 不变。
5. 没有 threshold 调整、waiver 或 selection exclusion；focused quality 不能替代默认 `bun run check` 的 required workspace evidence。

## Affected Owners

- `docs/coding-style.md#2-owner-与实现归属先行`：模块职责与最小拆分规则。
- `docs/script-tooling.md#project-gate`：repository-quality 证据、selection 与 Gate 验证边界。
- `docs/testing.md#测试所有权` 与 `docs/testing/cases/repository-tooling.md`：layout semantic Case 的 owner、entity 与 `Proves`。
- `scripts/validation/layout-characterization.ts`：唯一入口与 ordered aggregator；`module-specifier-analysis.ts`、`import-boundaries.ts`、`function-metrics-analyzer-boundary.ts`：三个内部 sibling owner。

## Focused Quality Evidence

- 基线：`.log/project-gate/2026-09-04T16-18-07.438Z-1210662-a9796ea8-88d2-488a-a456-ee6d0fdc5641/machine/records.ndjson`，45 条 Record（duplicate 1、file 11、function 33）。
- 验收：`.log/project-gate/2026-09-04T16-32-33.273Z-1248234-da4f88ec-2d3d-41e2-ae88-f4f27c52c985/machine/records.ndjson`，focused `quality` Gate 通过，41 条 Record（duplicate 1、file 10、function 30）。
- 按 stable ID 比较，唯一移除的四项是：`scripts/validation/layout-characterization.ts`；`function:{"file":"scripts/validation/layout-characterization.ts","name":"moduleSpecifiers"}:cyclomatic-complexity`；同一函数的 `:function-code-density`；以及 `function:{"file":"scripts/validation/layout-characterization.ts","name":"validateFunctionMetricsAnalyzerBoundary"}:function-code-density`。没有新增 ID。
- 默认 workspace 验收：`.log/project-gate/2026-09-04T16-37-15.494Z-1264356-d4a8b385-3ea3-4100-9609-8a247dc322ff` 的 `bun run check` 通过，31 个 Check `passed`、5 个 `not-applicable`、零 `failed`/`unavailable`。它提供独立 required Gate evidence，不由 focused quality 推断。
