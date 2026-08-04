本临时且未审计的 delta spec 目标是用不可用合成假秘密证明safe fingerprint、blocking coverage、状态与全surface脱敏。

## ADDED Requirements

### Requirement: Secret fixtures prove coverage, redaction and failure semantics

Repository SHALL使用明确标记、不可用于真实系统的synthetic secret fixtures，覆盖section absent/disabled/no-input、`maximumFileBytes` 1/1048576/67108864与越界拒绝、文本extension、<=limit bounded full read、oversized prefix在8192边界前后的NUL/definitive invalid UTF-8/trailing incomplete UTF-8/no反证、oversized zero detector reads、generated/vendor exclusion、absent-base override rejection、unreadable input、line/rotation-stable与new-occurrence fingerprints、safe allowlist、current/baseline/channels/gate及dependency failures。Tests MUST证明prefix不被用来声称suffix是text、fingerprint input从未包含fake-secret bytes，并对stdout、stderr、report、machine streams、raw/tmp/cache/logs做fake-secret/prefix/suffix absence check；不得访问developer credentials。

#### Scenario: Full synthetic matrix contains no leaked fake secret

- **WHEN** success、accepted、gate-failed、dependency-failed 与 invalid-result scenarios 完成
- **THEN** expected finding identity、channels、completeness 与 process outcomes 通过 owner validators
- **AND** 全部持久/可见 byte surfaces 均不含 fixture 的假秘密、prefix 或 suffix

#### Scenario: Coverage and catalogs use generic machine v2

- **WHEN** fixtures同时产生scanned、non-text-excluded、size-unscanned disposition与coverage finding
- **THEN** generic observations使用normalized path、exact file subject并按path Unicode/固定metric order呈现；coverage evidence按`actualBytes`后`maximumFileBytes`投影，oversized未接受finding阻断适用gate
- **AND** security evidence为空，catalog注册更新expected semanticRegistryFingerprint/examples/validator fixtures，但immutable machine v2 schema bytes不变

#### Scenario: Bounded prefix never proves an unread suffix

- **WHEN** oversized fixtures分别在prefix内含NUL、含definitive invalid UTF-8、以incomplete UTF-8结尾或只在8192 bytes之后出现non-text marker
- **THEN**前两者必须归non-text，后两者必须保守归size-unscanned；每个classifier read不超过8192 bytes且detector zero reads
- **AND**tests不期待prefix证明未读suffix为text，并验证size-unscanned finding的typed bytes evidence

#### Scenario: Test discovery never reads host secrets

- **WHEN** secret test suite 在任意 developer 或 CI environment 运行
- **THEN** suite 只扫描 isolated fixture copy 与 injected dependency doubles
- **AND** home、ambient credential files、environment values 与真实 repository secret 不成为 test inputs
