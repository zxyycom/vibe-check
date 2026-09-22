# Design

本设计把 Markdown lint 作为独立 repository-quality Check 接入 Gate，先以真实 corpus 观察，再由项目 owner 决定是否阻断。

## Context

- `markdownLint` 的 Product contract 由 `docs/checks/markdown-lint.md` 与 `docs/decisions/provide-bounded-markdown-lint-check.md` 拥有，默认 finding policy 为 non-blocking。
- 当前 repository quality group 在 `scripts/project/gate/checks/repository-quality.ts` 只配置 duplicate detection、file metrics、function metrics 和 `markdownLinkValidation`；`definition.ts` 将后者放入 `materials` 与 `quality` presets。
- 本仓库存在 `docs/**/*.md` 与 `changes/**/*.md` 两类 Markdown material；changes 是当前工作交接材料，不应因 lint 接入而被静默排除。

## Goals / Non-Goals

### Goals

- 以显式 files selection、规则集和 Check ID 将 Markdown lint 接入 Gate，先记录 clean corpus、Findings、耗时和 unavailable 边界。
- 保持 lint 与 link validation 的不同责任、Record identity、结果结算和资源声明。
- 用独立迁移门槛决定 advisory 或 blocking policy，并为每个 exclusion 保留稳定理由和验证。
- 让 canonical `--materials`、`--quality`、required 与 `--all` 的 membership 可由 Gate manifest 直接恢复；不保留 `--docs` alias。

### Non-Goals

- 不修改 `markdownLint` 的规则、backend、cache、公共 options 或默认 finding policy。
- 不在本 Change 同时实现 Markdown lint cache；`design-markdown-check-caching` 另行消费真实 workload。
- 不以 lint Findings 重算 Gate aggregate，也不替代既有 Markdown link validation。

## Decisions

### Intended Change

1. 先运行当前文档 corpus 的 Markdown lint，按规则和路径分类 findings、false positives、required exclusions 与资源成本。
2. 在 repository-quality owner 中新增一个显式 `markdownLint` Check，初始沿用 package 默认 non-blocking 或由独立项目 policy 明确设为 blocking；最终选择以 corpus 和迁移门槛为准。
3. 为 Gate selection、records/final data、empty/unavailable、规则升级和文件范围建立 tests；同步 Project Gate 文档、Change coordination 和 package-facing “当前 Gate 是否选择”说明。
4. 只有在 lint contract 稳定且 corpus 证据足够时，才解除缓存 Change 的 workload 前置；缓存不进入本 Change。

### Resulting Impacts

- 共享 `repository-quality.ts`、`definition.ts`、Gate tests、resource claim 与项目 Gate 文档，实施时应与 flag/DSL Change 串行合入；corpus 调查与 Plan 收敛可并行。
- 需要运行 `bun run test-evidence -- check --root .`、目标 Gate/repository-quality tests、repository material validation 和完整 Gate，确认新增 Check 没有改变 link Check 的输入或语义。
- 若初始 Findings 显示规则与本仓材料冲突，优先缩小明确范围或记录 not-adopt，不修改 Product contract 迁就仓库。

## Risks / Trade-offs

- 将 changes 纳入 lint 会暴露计划文本的格式问题，但排除 changes 会失去交接材料反馈；默认保留两者，除非 corpus 证明 owner 不一致。
- blocking 能提高信号强度，也可能把规则噪声变成 Gate 阻断；先以 evidence 决定，不隐式升级。
- 与 link validation 同时扫描 Markdown 会增加 I/O；按现有 repository scan budget 测量，不预设性能收益。

## Open Questions

- 首轮应启用的默认规则是否需要显式排除某些机器生成/历史材料，待 corpus 结果确认。
- required 日常 Gate 是否直接包含该 Check，还是先只进入 `materials`/`quality` focused 与 `--all`，由迁移风险和运行时间证据决定。
