# duplicate-scanning Specification

## Purpose

Define how Vibe Check scans Product-approved exact inputs for duplicate code, keeps backend format
detection private, and normalizes pairwise clone results and failures.

## Requirements

### Requirement: Duplicate scanner adapter input

Product core SHALL 从 normalized scan scope、resolved code areas 与 semantic
`checks.duplication` 构造 duplicate-scanning work。每个 code area 的 exact paths MUST 已先经过
selected include/exclude/generated rules；adapter MUST NOT 扫描 project root、重新发现文件或
接收 project-controlled backend format filter。

每个至少包含两个 exact paths 的 code area SHALL 使用
`minimumTokensByCodeArea[codeArea]`；没有对应 entry 时 SHALL 使用
`defaultMinimumTokens`。Adapter SHALL 对 approved exact paths 省略 format override，让 current
backend 按 path extension 检测支持的 formats。不同 format 的 paths MAY 在同一 area 中参与一次
invocation；本 contract 不要求跨 format clone matching。

#### Scenario: Semantic minimum-token override drives an area task

- **WHEN** configured code area 至少包含两个 approved exact paths，且具有对应
  `minimumTokensByCodeArea` entry
- **THEN** duplicate adapter 接收这些 exact paths 与该 semantic minimum-token value
- **AND** adapter 不接收 project-defined format、command、args 或 concurrency

#### Scenario: Missing area override uses the semantic default

- **WHEN** configured code area 至少包含两个 approved exact paths，但没有对应
  `minimumTokensByCodeArea` entry
- **THEN** duplicate task 使用 `defaultMinimumTokens`
- **AND** missing entry 不从 built-in config 或 backend-private settings 补值

#### Scenario: Mixed supported extensions use backend-owned detection

- **WHEN** 同一 code area 包含 Product-approved TypeScript 与 Rust exact paths
- **THEN** adapter 将全部 exact paths 交给 backend并省略 format override
- **AND** backend 按 extension 检测支持的 formats，Vibe Check 不承诺跨 format clone matching

#### Scenario: Excluded paths cannot re-enter duplicate scanning

- **WHEN** selected scope 已排除 generated、vendor、cache、target 或其它 path
- **THEN** 这些 paths 不进入 duplicate adapter input
- **AND** dependency resolver 或 adapter 不得通过自行遍历重新加入它们

#### Scenario: Insufficient area input remains no work

- **WHEN** code area 少于两个 approved exact paths
- **THEN** product core 不为该 area 启动 duplicate backend invocation
- **AND** 该 area 不产生 duplicate fragment

### Requirement: Product-owned jscpd integration boundary

Duplicate scanning SHALL 从 Product-owned `ScannerDependencySnapshot` duplication slice 接收 current jscpd
executable、args、availability protocol 与 bounded concurrency；project config MUST 只提供
`checks.duplication` semantic values。Adapter MUST 将 temporary config、process protocol、
reporter output、format detection 与 private options 限制在 adapter boundary，并向 product core
返回 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized failure。

#### Scenario: jscpd result is normalized

- **WHEN** `ScannerDependencySnapshot` 中的 resolved jscpd dependency 扫描 Product-approved exact paths
- **THEN** product core 只接收 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized
  capability failure
- **AND** product core 与 semantic config 不依赖 reporter structure 或 backend format names

#### Scenario: Reporter and detection details are not stable public config

- **WHEN** adapter 保存 temporary config、format detection 或 reporter output 以复现 behavior
- **THEN** 这些材料只属于 scanner implementation/artifact boundary
- **AND** 它们不成为 semantic project config 或 stable product output field
