本 delta 将现有 jscpd pipeline 确立为正式 duplicate component，并保留其 normalized finding、threshold、ordering 和 failure contract。

## ADDED Requirements

### Requirement: Product-owned jscpd integration boundary
Duplicate scanning SHALL 由 typed product tool config 中固定的 jscpd component 提供。Adapter MUST 将 jscpd reporter output、process protocol 与 private configuration 限制在 adapter boundary 内，并向 product core 返回 Vibe Check-owned duplicate findings、component provenance、diagnostics 或 normalized failure。

#### Scenario: jscpd result 被归一化
- **WHEN** typed tool config 解析并通过 availability check 的 jscpd 报告 clone pair
- **THEN** product core 接收 Vibe Check-owned duplicate finding
- **AND** product core 不依赖 jscpd reporter result structure

#### Scenario: Raw reporter output 只服务诊断
- **WHEN** adapter 保存 jscpd JSON report 或 raw process summary 以复现解析问题
- **THEN** raw material 保持 bounded diagnostic artifact
- **AND** 不作为 stable human/JSON output field 暴露

## MODIFIED Requirements

### Requirement: Duplicate scanner adapter input
Product core SHALL 从 Vibe Check normalized scan scope 运行 duplicate scanning。jscpd adapter MUST 只接收已收集的 supported files，MUST NOT 扫描被 scan scope rules 排除的文件，也不能扫描 product control plane 判定为 unsupported 的文件。

#### Scenario: 接收 supported files
- **WHEN** scan scope 包含 supported files `src/a.rs` 和 `src/b.rs`
- **THEN** jscpd adapter 接收这些 exact supported file paths 作为 scan input

#### Scenario: 不扫描 unsupported files
- **WHEN** scan scope 包含 supported file `src/lib.rs` 和 unsupported ordinary file `README.md`
- **THEN** jscpd adapter 接收 `src/lib.rs`
- **AND** jscpd adapter 不接收 `README.md`

#### Scenario: 遵守 excluded paths
- **WHEN** generated、vendor、cache、target 或 ignored paths 下的 project files 已被 scan scope collection 排除
- **THEN** 这些 excluded files 不进入 jscpd input

#### Scenario: 没有 supported files 时正常完成
- **WHEN** normalized scan scope 不包含 supported files
- **THEN** product core 跳过 jscpd invocation
- **AND** scan 正常完成，不产生 duplicate warning 或 duplicate diagnostic

### Requirement: Built-in duplicate scanning profile
Built-in duplicate scanning profile SHALL 使用 repo-pinned jscpd version 与 product-owned adapter，固定 minimum token count 为 `50`、minimum line span 为 `5`，并保留 normalized pair ordering、same-file/cross-file findings、zero finding 和 deterministic replay contract。Vibe Check dogfooding consumer MAY 通过 typed config 使用其现有 code-area thresholds，但通用 product default 和 result-affecting config identity MUST 明确记录。

#### Scenario: 默认 profile 使用固定 thresholds
- **WHEN** product scan 未提供 duplicate threshold override
- **THEN** jscpd invocation 使用 `50` tokens 与 `5` lines 的 product default

#### Scenario: Consumer thresholds 进入 config identity
- **WHEN** dogfooding config 为不同 code areas 指定现有 minimum token thresholds
- **THEN** jscpd tasks 使用对应 typed values
- **AND** result-affecting config identity 记录这些参数

### Requirement: Duplicate scanner diagnostics
jscpd component missing/wrong-version、spawn failure、timeout、invalid/missing report、parse failure、project-root 外 path、无效 range 或 normalization invariant failure SHALL 映射为 scanner fatal error，MUST NOT 转换成 empty duplicate result。能够可靠归因且不破坏其它可信 report data 的 file-level input problem MAY 按 owner contract 产生 partial diagnostic。

#### Scenario: jscpd report 缺失
- **WHEN** configured jscpd process 成功退出但没有产生固定 JSON report
- **THEN** adapter 返回 scanner fatal error
- **AND** duplicate count 不被表达为可信的 zero

#### Scenario: jscpd report 无 duplicate
- **WHEN** valid jscpd report 包含空 `duplicates` array
- **THEN** adapter 返回成功的 empty duplicate result
- **AND** empty result 与 protocol failure 保持可区分

## REMOVED Requirements

### Requirement: jscpd Rust engine integration boundary
**Reason**: Production duplicate scanning 固定由现有 jscpd CLI pipeline 承担，不再把 `cpd-finder` Rust API 作为长期 product boundary。

**Migration**: 将默认 component mapping、长期 owner 与 fixtures 切换到 jscpd；product core 继续消费 Vibe Check-owned duplicate finding contract。
