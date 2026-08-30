# Proposal

本 Plan 已将 functionMetrics 的 exact-input language eligibility 从 TypeScript/Rust 子集对齐到本地 pinned Lizard 1.23.0 官方 reader registry。

## Why

仅允许 `.ts`/`.rs` 会人为缩小 private Lizard adapter 的正式能力；直接取消过滤又会让 Markdown 等未知文本进入 CLike fallback 并产生伪 measurement。实现必须按官方 extension registry 放宽，同时保留 eligibility boundary。

## Outcome

functionMetrics 现在以 adapter-owned、case-insensitive 的 55 个 lower-cased extension set 选择 Lizard 1.23.0 官方支持 source files（包含 `.cjs`），并在 exact-input handoff 前拒绝无点裸文件与 unknown fallback inputs；现有 area、metric、Record 与 finding-policy 语义保持不变。

## Scope

### Intended Change

- 已从本地 pinned Lizard 1.23.0 official reader registry 恢复完整 language/extension mapping，并将它实现为 adapter-owned immutable target selection。
- 已用完整 set 替换 TypeScript/Rust-only predicate；target selection tests 覆盖每个 supported extension、大小写不敏感、`.cjs` 与 Markdown/JSON/YAML/no-extension rejection。
- 已验证 target selection、exact-input handoff、adapter、no-input、area-overlap 与现有 failure behavior；functionMetrics 没有 cache，因此没有 cache identity 或 invalidation work。
- 已同步实际受影响的 scan-scope/check documentation 和长期 Decision alignment；machine schema/examples 未受影响。

### Resulting Impacts

- 新语言路径仍遵守既有 dedupe、area membership、metric comparison、Record publication 和 final-status flow，未修改 limits 或 blocking semantics。
- 官方 registry 或 pinned Lizard baseline 变化时，extension mapping 和相应 evidence 必须重新核对。

## Success Criteria

- 官方 Lizard 1.23.0 reader extensions 均由 functionMetrics eligibility 接受，并有表驱动 target-selection evidence。
- Markdown/任意未知文本、无点裸文件不会被传给 Lizard CLike fallback，也不能形成 function findings。
- TypeScript/Rust contract 保持兼容；function-metrics local suite 13 项（constructor 3、target 1、Lizard scanner 5、parser 4）、test-evidence 281/84、typecheck/lint/format/docs/diff 及完整 required Gate 36/36 已通过。

## Affected Owners

- `src/package-checks/function-metrics/**` 与 local `lizard/**`：eligibility、adapter handoff 与 tests。
- `docs/checks/function-metrics.md` 与 `docs/scan-scope.md`：当前 source eligibility 与 exact-input facts。
- `docs/decisions/align-function-metrics-inputs-with-lizard-supported-languages.md`：长期范围判断和已核对 alignment。
- functionMetrics 无 cache；machine schema/examples 未受影响。
