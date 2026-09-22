# Design

本设计把 Markdown lint 作为独立 repository-quality Check 接入 Gate，以真实 corpus 证据采用 advisory 而不阻断。

## Context

- `markdownLint` 的 Product contract 由 `docs/checks/markdown-lint.md` 与 `docs/decisions/provide-bounded-markdown-lint-check.md` 拥有，默认 finding policy 为 non-blocking。
- 当前 repository quality group 在 `scripts/project/gate/checks/repository-quality.ts` 只配置 duplicate detection、file metrics、function metrics 和 `markdownLinkValidation`；`definition.ts` 将后者放入 `materials` 与 `quality` presets。
- 本仓库存在 `docs/**/*.md` 与 `changes/**/*.md` 两类 Markdown material；changes 是当前工作交接材料，不应因 lint 接入而被静默排除。

## Goals / Non-Goals

### Goals

- 以显式 files selection、八项规则、Check ID 和 non-blocking policy 将 Markdown lint 接入 Gate，并记录 corpus、Findings、耗时和 unavailable 边界。
- 保持 lint 与 link validation 的不同责任、Record identity、结果结算和资源声明。
- 以真实 evidence 采用 advisory；未来 blocking 迁移只可由独立 Change 重审，不以 exclusion 或规则改写掩盖现有证据资源的 Finding。
- 让 canonical `--materials`、`--quality`、required 与 `--all` 的 membership 可由 Gate manifest 直接恢复；不保留 `--docs` alias。

### Non-Goals

- 不修改 `markdownLint` 的规则、backend、cache、公共 options 或默认 finding policy。
- 不在本 Change 同时实现 Markdown lint cache；`design-markdown-check-caching` 另行消费真实 workload。
- 不以 lint Findings 重算 Gate aggregate，也不替代既有 Markdown link validation。

## Decisions

### Intended Change

1. 使用公开 `markdownLint` 在 `docs/**/*.md` 与 `changes/**/*.md` 上取得基线：502 source、0 rejected input、59 Finding、3 个受影响 source、约 3.57 s。43 条 `table-column-count` 和 16 条 `reference-links-images` 全部位于 investigation/resource materials；这不是改变公共规则或静默排除当前 Change 的依据。
2. 在 repository-quality owner 中新增显式 `markdown-lint` Check：files 为完整 docs/changes corpus，rules 固定为当前八项默认集（不启用 `link-fragments`），finding policy 为 `non-blocking`。它保留自身 Records/final data；Findings 不会被 Gate 重算。
3. 将它设为 required、`materials` 与 `quality` 成员，并使用 `(required AND changeFlag("repository-material")) OR materials OR quality OR all`。region 已覆盖所有 lint source 和其声明 inputs；quality/materials/all 是 force paths。Markdown link validation 保持其原有 full required/materials/quality/all membership，不使用增量条件。
4. 为 Gate selection、advisory Records/final data、empty/unavailable、规则/文件范围与 resource claim 建立 tests；同步 Project Gate 文档、package-facing adoption boundary、Decision 与 Case。
5. 只有在 lint contract 稳定且 corpus 证据足够时，才解除缓存 Change 的 workload 前置；缓存不进入本 Change。

### Resulting Impacts

- 共享 `repository-quality.ts`、`definition.ts`、Gate tests、resource claim 与项目 Gate 文档，实施时应与 flag/DSL Change 串行合入；corpus 调查与 Plan 收敛可并行。
- 需要运行 `bun run test-evidence -- check --root .`、目标 Gate/repository-quality tests、repository material validation 和完整 Gate，确认新增 Check 没有改变 link Check 的输入或语义。
- corpus 的 59 条 Finding 使 blocking 会立即把既有 evidence resource 噪声变为日常 Gate blocker；保留 advisory 可真实持续输出 evidence，且没有改变 package contract、规则或 source scope。

## Risks / Trade-offs

- 将 changes 纳入 lint 会暴露计划文本的格式问题，但排除 changes 会失去交接材料反馈；采用完整 docs/changes scope。
- blocking 能提高信号强度，也会把已知 resource Finding 变成 Gate 阻断；当前 advisory 是 evidence-backed migration policy，不隐式升级。
- 与 link validation 同时扫描 Markdown 会增加 I/O；按现有 repository scan budget 测量，不预设性能收益。

## Open Questions

- 无。未来 blocking threshold、source exclusions 或 rule changes 由独立 Change 决定。

## Implementation Observations

- 基线运行从 `f87794df` checkout 的干净工作树读取公开 `markdownLint` API；它没有写入 repository。运行在 2026-09-22 完成，耗时为单次 wall-clock observation，不是性能预算或 cache 结论。
- 实施后完整 `bun run check -- --all` 在 2026-09-22 通过 38/38 Checks。实际 Gate `markdown-lint` final data 为 504 source、0 rejected input、59 Finding，machine Records 仍为 43 条 `table-column-count` 与 16 条 `reference-links-images`；advisory owning outcome 和 Gate aggregate 都是 `passed`。
