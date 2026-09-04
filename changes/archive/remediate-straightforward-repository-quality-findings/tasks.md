# Tasks

按 inventory 和 owner 风险顺序完成最小 remediation，并以同一 focused quality rerun 验收已选与延期集合。

## Readiness
- [x] 0.1 在实施前运行 `bun run test-evidence -- check --root .`，读取 affected test Cases/owners，并记录每个拟拆 test entity 的语义连续性。
- [x] 0.2 复核 Gate repository-quality options 与 `record-inventory.md` 的 72 条基线 identity；确认 26 条 in-scope、46 条 deferred、零 waiver、零未授权 exclusion。
- [x] 0.3 为每个 source extraction 定位相邻 owner test 和最窄验证命令；对 parser/path/canonicalization/selection helper 先写明须保持的 exact predicate、result、order 与 failure boundary，不能证明则退回 deferred。
- [x] 0.4 在改动任何重复测试 helper 前，确认 measurement source DTO 与 lifecycle event-order 是共同不变量，而 analyzer-adapter 的 duplicate 只属于局部 fixture data，不把 scanner overlap 归因为 adapter bug。

## Implementation
- [x] 1.1 仅在 `fileMetrics` 的 docs-specs selection 排除 `docs/investigations/_resources/**`，并更新 repository-quality configuration test，保留 investigations validation。
- [x] 1.2 从 package artifact/candidate runtime evidence 提取 runtime-layout、Worker URL predicate 与 quality/terminal-message assertion owners，保持 package/candidate contract。
- [x] 1.3 从 maintenance advisory、Gate oxlint/prepared-candidate/flag controls、machine canonicalizer 提取现有 branch/field owners，保持 network/diagnostic/candidate/selection semantics。
- [x] 1.4 从 Function Metrics analysis、Markdown link root probe/read source、Check authoring 与 RunControls validation 提取 local comparison/probe/read/field-group helpers，保持 fail-closed and containment semantics。
- [x] 1.5 提取 measurement-performance source DTO 和 lifecycle event-order shared test helpers，并以局部 fixture constructor 整改 analyzer-adapter literal duplication，不改变 analyzer or scheduler behavior。
- [x] 1.6 按既有 Case 的独立 proof boundary 拆分 Markdown default-check 与 invocation-progress test owners，并同步真实 Case entity mappings。
- [x] 1.7 从 `run.test-support.ts` 提取 cohesive support helpers，保持公开 helper signatures 与 Run behavior tests。

## Verification
- [x] 2.1 运行各 source/test owner 的最窄 Bun tests；对 test entity/Cases 变更再运行 `bun run test-evidence -- check --root .`。
- [x] 2.2 运行 repository-quality configuration test、`bun run investigations`、相关 package/candidate/Gate/docs validation tests、typecheck 与 lint。
- [x] 2.3 运行 focused Gate quality configuration，比较完整 Records：26 条 in-scope baseline IDs 全部消失，46 条 deferred IDs 仍逐条出现且零 waiver，并审查任何新增 ID。
- [x] 2.4 运行范围匹配 workspace verification（至少 `bun run check`），检查 diff 未含 threshold increases、waivers、其它 quality exclusions、Lizard performance/legal/layout/parse-facts-cache/invocation-completion-diagnostic/scheduler remediation 或未授权 public-contract change。
