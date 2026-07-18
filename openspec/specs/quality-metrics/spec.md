# quality-metrics Specification

## Purpose
Define how Vibe Check turns collected supported files into basic quality metrics, warning findings, diagnostics, and gate results before output projection.
## Requirements
### Requirement: Quality metrics owner documentation
Quality metrics behavior SHALL have a long-term owner document under `docs/` that records pinned TypeScript product models, scc file metrics、Python/Lizard function metrics 与 jscpd duplicate boundaries、aggregation、`all` / `changed` / `regressions` warning channels、baseline comparison、quick/full profiles、`acceptedReason` behavior 和 `passed` / `warning` / `failed` status。该 owner MUST 明确不存在 Rust blocking-gate contract，并由 `docs/navigation.md` 引用；详细 TypeScript shape、threshold 和 algorithm SHALL 继续由 pinned source 与 product config 证明，而不是在本 migration delta 中重新设计。

#### Scenario: Navigation points to pinned TypeScript quality owner
- **WHEN** reviewer 使用 `docs/navigation.md` 查找 metrics、warning、baseline 或 status rules
- **THEN** 导航文档指向记录 pinned TypeScript models、scanner boundaries、warning channels、profiles、accepted reason 和三态 status 的 owner 文档
- **AND** owner 文档不要求 Rust blocking gate

#### Scenario: Source lift preserves existing quality behavior
- **WHEN** reviewer 验证迁移后的 metrics、warnings、baseline、profiles 或 status
- **THEN** owner 文档将 pinned TypeScript source、product config、tests 和迁移前后 parity 作为详细行为依据
- **AND** 不把本 delta 当作新的 field、threshold 或 algorithm 定义
