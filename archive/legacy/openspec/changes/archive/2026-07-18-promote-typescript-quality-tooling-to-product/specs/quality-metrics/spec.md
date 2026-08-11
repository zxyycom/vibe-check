## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: LOC metrics adapter input
**Reason**: 该 requirement 固定 Rust collector 的全局四语言 supported set 与 LOC-only adapter 输入，不是 pinned TypeScript scc / scanner-specific selection contract。

**Migration**: 保持 pinned TypeScript config、normalized scan scope 和 scc adapter behavior；不移植 Rust supported set。

### Requirement: Normalized LOC metrics
**Reason**: 该 requirement 固定 Rust MVP file-metric fields 与四语言 identifiers，不是 pinned TypeScript `FileMetric` model 的迁移来源。

**Migration**: 保持 pinned TypeScript product-owned models，不把 Rust field set 或 language enum 复制进新产品。

### Requirement: Metrics aggregation
**Reason**: 该 requirement 固定 Rust report totals 与 `supported_scanner_findings == files_measured` compatibility counters，和 pinned TypeScript aggregation shape 不一致。

**Migration**: 保持 pinned TypeScript overall、language、code-area 与 comparison aggregation。

### Requirement: Metrics diagnostics
**Reason**: 该 requirement 定义 Rust `partial` report、diagnostic counters、stdout suppression 与 scanner-fatal mapping，不是 pinned TypeScript failure/status contract。

**Migration**: 保持 pinned TypeScript availability skip、normalized fatal issue、artifact、console 与 `failed` behavior。

### Requirement: Warning finding model
**Reason**: 该 requirement 固定 Rust warning fields、`suppressed` 与 `blocking` policy；pinned TypeScript warnings 使用现有 channel records 和 optional `acceptedReason`。

**Migration**: 保持 pinned TypeScript `all`、`changed`、`regressions` warning channels 与 accepted-warning behavior。

### Requirement: File size warning rule
**Reason**: Rust `file.too_many_lines`、400/800 thresholds、severity 与 blocking semantics 不属于 pinned TypeScript warning rules。

**Migration**: 保持 product config 驱动的 `scc-file-code-lines` 规则；不移植 Rust threshold 或 blocking policy。

### Requirement: Gate result from blocking warnings
**Reason**: 该 requirement 定义 Rust blocking-warning gate；pinned TypeScript core 使用 `passed` / `warning` / `failed` status，warning 默认是 non-blocking development result。

**Migration**: 保持 pinned TypeScript 三态 status 与 CLI mapping；不引入 blocking gate。

### Requirement: Duplicate code warning rule
**Reason**: Rust `duplicate.code_fragment` pairwise warning shape、severity 与 blocking fields 不是 pinned TypeScript jscpd warning contract。

**Migration**: 保持 pinned TypeScript `jscpd-duplicate-code` rule、product config 和 warning-channel behavior。

### Requirement: Warning ordering remains deterministic
**Reason**: 该 requirement 固定 Rust LOC/duplicate warning inventory 与 `(file, location, rule, message)` ordering，不是 pinned TypeScript ordering contract。

**Migration**: 保持 pinned TypeScript warning generation 与 ordering；不为源码上移重新定义 sort key。

### Requirement: Duplicate warnings preserve gate policy
**Reason**: 该 requirement 将 Rust duplicate warnings 接入 Rust blocking gate 与 summary counters，TypeScript product 不保留该 gate。

**Migration**: 保持 pinned TypeScript duplicate warning channel 与三态 status behavior。

### Requirement: Duplicate scanning preserves LOC compatibility metrics
**Reason**: `supported_scanner_findings == files_measured` 是 Rust report compatibility counter，不存在于 pinned TypeScript aggregation contract。

**Migration**: 保持 pinned TypeScript duplicate metrics 与 aggregation，不增加 Rust compatibility counter。

### Requirement: Function parameter warning rule
**Reason**: Rust `function.too_many_parameters` rule id、threshold、location 和 blocking fields 不属于 pinned TypeScript Lizard warning rules。

**Migration**: 保持 pinned TypeScript `lizard-parameter-count` 及其它 configured Lizard rules；不移植 Rust rule shape。

### Requirement: Function warnings preserve gate and LOC compatibility metrics
**Reason**: 该 requirement 将 Rust function warnings 绑定到 Rust gate、summary 与 LOC compatibility counters，不是 pinned TypeScript metrics/status contract。

**Migration**: 保持 pinned TypeScript Lizard metrics、warning channels、aggregation 与三态 status。

### Requirement: Warning ordering includes structural findings
**Reason**: 该 requirement 固定 Rust 三类 warning inventory、统一 sort key 与 human/JSON projection，和 pinned TypeScript warning/output boundaries 不一致。

**Migration**: 保持 pinned TypeScript warning ordering 与 artifact projection；不移植 Rust renderer 或 sort contract。
