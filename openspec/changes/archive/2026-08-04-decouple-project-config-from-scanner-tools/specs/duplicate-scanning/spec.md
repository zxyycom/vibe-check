## MODIFIED Requirements

### Requirement: Duplicate scanner adapter input

Product core SHALL 从 normalized scan scope、resolved code areas 与
`checks.duplication` 构造 duplicate-scanning work。每个 code area 的 exact paths MUST 已先经过
selected semantic include/exclude/generated rules；adapter MUST NOT 扫描 project root、重新发现
文件或接收 project-controlled backend format filter。

每个至少包含两个 exact paths 的 code area SHALL 使用
`minimumTokensByCodeArea[codeArea]`；没有对应 entry 时 SHALL 使用
`defaultMinimumTokens`。`minimumTokensByCodeArea` 的 key MUST 引用已声明的 code area，但不要求
为每个 area 提供 entry。

jscpd adapter SHALL 对 Product-approved exact paths 省略 format override，让 pinned
backend 按 path extension 选择其支持的 formats。不同 format 的 paths MAY 在同一 area 中参与
一次 invocation；本 contract 不要求跨 format clone matching。更换 backend 或 supported-format
behavior 时必须在 adapter 内处理并同步本 capability，不得恢复 public format field。

#### Scenario: Semantic minimum-token override drives an area task

- **WHEN** code area `app` 至少包含两个 approved exact paths，且
  `minimumTokensByCodeArea.app` 有值
- **THEN** duplicate adapter 接收这些 exact paths 与该 semantic minimum-token value
- **AND** adapter 不接收 project-defined format、command、args 或 concurrency

#### Scenario: Missing area override uses the semantic default

- **WHEN** code area 至少包含两个 approved exact paths，且
  `minimumTokensByCodeArea` 没有该 area 的 entry
- **THEN** duplicate task 使用 `defaultMinimumTokens`
- **AND** missing entry 不会从 built-in config 或 backend-private settings 补值

#### Scenario: Mixed supported extensions use backend-owned detection

- **WHEN** 同一 code area 包含 Product-approved TypeScript `.ts` 与 Rust `.rs` exact paths
- **THEN** jscpd adapter 将全部 exact paths 交给 backend，并省略 format override
- **AND** pinned backend 按 extension 分别检测其支持的 formats，不要求跨 format 匹配

#### Scenario: Excluded paths cannot re-enter duplicate scanning

- **WHEN** selected scope 已排除 generated、vendor、cache 或其它 path
- **THEN** 这些 paths 不进入 duplicate adapter input
- **AND** dependency resolver 或 adapter 不得通过自行遍历重新加入它们

#### Scenario: Insufficient area input remains no work

- **WHEN** code area 少于两个 approved exact paths
- **THEN** product core 不为该 area 启动 duplicate backend invocation
- **AND** 该 area 不产生 duplicate fragment

### Requirement: Product-owned jscpd integration boundary

Duplicate scanning SHALL 从 Product-owned scanner dependency snapshot 接收 jscpd executable、
args、availability protocol 与 bounded concurrency；project config MUST 只提供
`checks.duplication` semantic values。Adapter MUST 将 temporary config、process protocol、
reporter output、format detection 与 private options 限制在 adapter boundary，并向 product core
返回 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized failure。

#### Scenario: jscpd result is normalized

- **WHEN** resolved internal jscpd dependency 扫描 Product-approved exact paths
- **THEN** product core 只接收 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized
  capability failure
- **AND** product core 与 semantic config 不依赖 reporter structure 或 backend format names

#### Scenario: Reporter and detection details are not stable public config

- **WHEN** adapter 保存 temporary config、format selection 或 reporter output 以复现 behavior
- **THEN** 这些材料只属于 scanner implementation/artifact boundary
- **AND** 它们不成为 semantic project config 或 stable product output field
