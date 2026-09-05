# Proposal

本 archived Change 以一个 cohesive Outcome 组织：在不改变既有开发期 evidence 契约的前提下，将 Lizard / TypeScript 比较入口按协议职责拆分为可维护模块，并消除该实现范围内的 repository-quality findings；它不声明新的 Product 行为、性能结果或优化授权。

## Why

`scripts/development/lizard-performance/command.ts` 曾在一个实现单元中同时承担 CLI、manifest、target evidence、固定 Lizard provision、A/B/C workload、sampling、comparison 与输出职责。该聚合妨碍按既有协议局部审阅，并在同一 focused repository-quality 输入中形成 29 条 finding；本 Change 的目标是处理其中属于该开发工具实现的 16 条，而不是调整质量规则或把质量结果变成 Product 事实。

## Outcome

开发者继续经同一 `command.ts` 显式入口得到既有 A/B/C evidence 协议的兼容实现；其内部职责有明确模块归属，P0 兼容修复会拒绝 inherited CLI key 并保留 non-finite canonical-order 的既有 fallthrough。相同 focused-quality 比较从 29 条 finding 收敛到 13 条剩余非目标 finding。该维护性结果不产生 benchmark 结论，也不授权任何性能优化。

## Scope

### Intended Change

保留唯一 command entry 与可测试 export façade，按既有协议职责拆分 `scripts/development/lizard-performance/**` 的 implementation 模块；只同步必要的直接 test/Case material 与本 Change。稳定行为契约仍由 `docs/script-tooling.md#lizard--typescript-performance-evidence` 拥有，本 Change 只承接这次实现和验证上下文。

### Resulting Impacts

- 保持 opt-in benchmark/evidence、CLI、A/B/C comparison、failure/cleanup 与 evidence/summary schema；不改 Product、Gate、Python/Lizard analyzer 或稳定性能结论。
- focused-quality 的 `29 → 13` 是同一范围内的 repository maintainability evidence；13 条 remaining finding 不属于本 Change 的目标路径，数字不表示 Product quality、Gate 结果或发布判断。
- fake compatibility/parity fixture 只能比较受控 façade helper 和 DTO 行为；它不执行 `runComparison`、外部进程、A/B/C workload 或 benchmark，不能证明真实运行 parity 或性能。
- 本次不运行真实 benchmark 或 full workload；后续若需要真实 evidence 或优化，须由开发者显式调用并按 stable evidence owner 与独立授权处理。

## Success Criteria

- 同一 focused-quality 比较记录从 29 条 finding 降至 13 条，且被消除的 16 条属于本 Change 的开发工具实现范围；其余 13 条不被误报为已处理或产品缺陷。
- command façade、错误、sampling/provision/layer/evidence semantics 与 summary 的不可替代声明保持兼容；P0 修复对 inherited CLI key fail-closed，并保留 non-finite canonical-order 的兼容行为。
- direct mock/fixture tests、Test Evidence、scripts type/lint/format 与 focused quality 有相应记录；fake parity 不替代真实 benchmark/full-workload 验证。
- 实施阶段没有因本计划本身获得 archive、commit 或 push 的权限；最终 lifecycle authorization 在验证后只 archive 并提交此 Change，且没有手动 push。该 lifecycle 结果仍不产生任何性能优化授权。

## Affected Owners

- `docs/script-tooling.md#lizard--typescript-performance-evidence`：开发期 evidence 边界、A/B/C、资源与输出协议；它仍是稳定行为与优化授权边界的 owner。
- `docs/testing.md`、`docs/testing/case-maintenance.md` 与 `docs/testing/cases/repository-tooling.md`：repository-tooling 实体闭合、Case 身份、owner 与可证伪证明。
- `docs/coding-style.md`：实现模块责任、局部表达和验证规范。
- `changes/archive/remediate-lizard-performance-quality/**`：本次已完成 Change 的历史实施、quality 与未验证边界记录，不拥有新的稳定事实。
