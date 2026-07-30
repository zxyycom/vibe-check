## MODIFIED Requirements

### Requirement: Configuration JSON matches complete QualityConfig

Explicit 或 discovered configuration MUST 继续是完整提供当前 `QualityConfig` 的 UTF-8 JSON
object。Top-level `lizard` field SHALL 继续拥有 Lizard-compatible function-metric thresholds。
`tools` object SHALL 只要求本 change 后仍存在的 runtime external components（`scc` 与
`jscpd`），并 MUST 拒绝 retired `tools.lizard` field。Parser MUST 继续拒绝 missing、
unknown、invalid fields，且 MUST NOT 增加 envelope、重命名字段、补 defaults 或 partial
merge。

#### Scenario: Current complete config omits a Lizard command

- **WHEN** config 完整提供 thresholds、scope、report、cache/artifact、`tools.scc` 与
  `tools.jscpd`
- **THEN** strict parser 在没有 Python/Lizard command/args 时接受它
- **AND** current/baseline function metrics 使用 internal module

#### Scenario: Retired tools.lizard is rejected

- **WHEN** config 仍包含 `tools.lizard`
- **THEN** strict parser 报告 unknown retired field
- **AND** scan 不保留 compatibility process path

#### Scenario: Lizard-compatible thresholds remain stable

- **WHEN** config 提供当前 top-level `lizard` threshold object
- **THEN** warning generation 使用这些 values 与既有 rule/source semantics
- **AND** backend replacement 不重命名 threshold fields 或公开 warning sources
