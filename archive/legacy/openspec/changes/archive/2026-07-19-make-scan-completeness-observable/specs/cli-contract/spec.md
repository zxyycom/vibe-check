## MODIFIED Requirements

### Requirement: Exit code mapping

CLI SHALL 让 current completeness 与 core outcome 使用以下 exit mapping：

1. `complete` 且 core 为 `passed` 或 `warning`：exit `0`。
2. `empty` 且 core 为 `warning`：exit `0`。
3. `failed` 或其它 runtime/output failure：exit `2`。
4. 现有顶层 mapping 识别的 `ENOENT` 或 config-related error：exit `3`。

CLI MUST NOT 在本 change 引入 blocking-gate exit `1` 或独立 output-failure exit `4`。

#### Scenario: Complete passed and warning outcomes remain successful

- **WHEN** current completeness 为 `complete`，且 scan core 返回 `passed` 或 `warning`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Empty warning exits successfully

- **WHEN** current completeness 为 `empty`，且 scan core 返回 `warning`
- **THEN** CLI 以退出码 `0` 退出
- **AND** completion 不声称质量通过

#### Scenario: Failed measurement uses exit two

- **WHEN** current completeness 为 `failed`，或 core 因其它 runtime/output fatal issue 返回 `failed`
- **THEN** CLI 以退出码 `2` 退出
- **AND** stdout 不包含可信的绿色 completion

#### Scenario: Existing top-level error mapping remains stable

- **WHEN** ordinary top-level error 不匹配特殊 mapping
- **THEN** CLI 以退出码 `2` 退出
- **AND** 匹配现有 `ENOENT` 或 config-related mapping 时以退出码 `3` 退出
