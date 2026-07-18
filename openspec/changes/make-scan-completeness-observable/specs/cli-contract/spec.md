本 delta 起草 incomplete measurement 的 CLI status mapping；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## MODIFIED Requirements

### Requirement: Exit code mapping
CLI SHALL 仅在 overall completeness 为 `complete` 或 `empty` 且 core 返回 `passed` 或 `warning` 时退出 `0`；planned capability 的 `unavailable` / `failed` 使 core 返回 `failed`，CLI MUST 退出 `2`。普通未处理顶层 error 继续退出 `2`；现有顶层 mapping 识别 `ENOENT` 或 config-related error 时继续退出 `3`。CLI MUST NOT 引入 blocking-gate exit `1` 或 output-failure exit `4`。

#### Scenario: Complete passed and warning outcomes remain successful
- **WHEN** completeness 为 `complete` 或 `empty`，且 scan core 返回 `passed` 或 `warning`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Incomplete or failed measurement uses exit two
- **WHEN** planned capability unavailable / failed，或 core 因其它 runtime fatal issue 返回 `failed`
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Ordinary top-level error uses exit two
- **WHEN** 发生不匹配现有特殊 mapping 的未处理顶层 error
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Existing missing-file or config error mapping uses exit three
- **WHEN** 未处理顶层 error 匹配 pinned consumer 的 `ENOENT` 或 config-related error mapping
- **THEN** CLI 以退出码 `3` 退出
