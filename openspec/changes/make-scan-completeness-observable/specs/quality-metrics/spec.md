本 delta 起草 completeness 对 metrics、warning 与最终 status 的控制；当前 change 仅在 `openspec/changes/make-scan-completeness-observable/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Quality status requires complete measurement

Aggregation SHALL 保留 capability record 与缺失 measurement semantics，MUST NOT 用 zero、empty array 或 omitted field 把 `unavailable` / `failed` capability 投影为成功 measurement。只有 overall completeness 为 `complete` 或 `empty` 时，quality status 才能根据 normalized warnings 计算 `passed` 或 `warning`；completeness 为 `failed` 时 core MUST 返回 `failed`。

#### Scenario: Missing scc does not become zero files passed

- **WHEN** file-metrics capability 有 eligible input但 scc unavailable
- **THEN** metrics 记录 capability unavailable且 overall failed
- **AND** file count zero 不得导致 quality status `passed`

#### Scenario: Legitimate no-input can complete

- **WHEN** normalized scope 对所有 planned capabilities 都没有 eligible input
- **THEN** completeness 为 `empty`
- **AND** output 可以表达合法 empty result而不伪造 scanner findings

#### Scenario: Warning status follows completeness

- **WHEN** completeness 为 `complete` 且 normalized warnings 非空
- **THEN** quality status 为 `warning`
- **AND** warning 计算不改变 capability records
