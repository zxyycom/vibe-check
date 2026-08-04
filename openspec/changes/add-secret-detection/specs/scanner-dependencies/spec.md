本临时且未审计的 delta spec 目标是定义不泄露raw match且不把实现名称提升为public contract的secret detector依赖边界。

## ADDED Requirements

### Requirement: Secret detector dependency remains internal and redacted

Product dependency boundary SHALL 为 `secret-detection` 提供 capability-specific readonly dependency identity、rule-bundle identity 与 bounded execution settings，但 MUST NOT 从 public config 读取 executable、command、args 或 backend name。Initial capability SHALL 使用随 Product distribution 解析的 detector/rule bundle，不提供 project-config 或 environment command override；backend replacement MUST 保持 stable Product rules、fingerprints、redaction 与 exact-input contract。

Dependency exact inputs MUST只包含runner已按完整bytes证明为valid UTF-8/no-NUL且大小不超过resolved `maximumFileBytes`的scanned text。Product-owned oversized classification prefix不是detector input；size-unscanned与non-text paths MUST在adapter调用前排除，并可用injected read counters证明detector对它们zero reads。Dependency boundary不得自行提高limit、读取suffix或把prefix success解释为完整text classification。

有 eligible input 时，dependency/rule bundle unavailable、detector execution failure 与 invalid normalized result MUST 分别归一化为 `unavailable`、`execution` 与 `invalid-result` capability failure。Raw detector matches、native stdout/stderr、source excerpts 与 sensitive temporary material MUST NOT 写入 raw artifact 或 persistent cache；diagnostic、backend identity 与 version metadata 必须先经过 secret-safe sanitizer。

#### Scenario: Missing internal dependency is incomplete rather than clean

- **WHEN** secret detection 有 eligible exact input但 detector 或 rule bundle 不可用
- **THEN** capability 返回 sanitized `unavailable` diagnostic，overall completeness failed
- **AND** 结果不包含 zero-finding success、partial finding 或 detector-native output

#### Scenario: Backend replacement is not a config migration

- **WHEN** Product 在内部替换 secret detector implementation
- **THEN** public `checks.secrets`、allowlist identity 与 Product rule/fingerprint contract 保持不变
- **AND** project config 不需要新增 backend、command 或 args 字段

#### Scenario: Oversized input never crosses the detector boundary

- **WHEN** ordinary candidate大于resolved limit且bounded prefix没有证明non-text
- **THEN** runner产生size-unscanned coverage result，detector exact-input list不含该path
- **AND** dependency执行zero reads，不能用private backend设置绕过Product limit
