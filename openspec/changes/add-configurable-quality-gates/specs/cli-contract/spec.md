本 delta 起草显式 gate selection 与可区分的 CLI exit mapping；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Gate policy selection

Product CLI `scan` SHALL 接受 `--gate <never|all|changed|regressions>`，省略时 MUST 使用 `never`。Help MUST 记录每个 policy 对应的 warning channel、accepted warning 的非阻断行为、默认值与 exit `1` 语义。无效 policy MUST 在启动 scanner 前作为 input/config error 退出 `3`。`--verification-output` MUST 只改变人读 warning preview，不得选择或覆盖 gate policy。

#### Scenario: Omitted gate preserves current behavior

- **WHEN** 调用者运行 `scan` 且未传入 `--gate`
- **THEN** CLI 使用 `never`
- **AND** complete warning result 不因 warning 本身产生 exit `1`

#### Scenario: Explicit gate selects one policy

- **WHEN** 调用者传入 `--gate all`、`--gate changed` 或 `--gate regressions`
- **THEN** CLI 将对应封闭 policy 交给 product core
- **AND** launch cwd、profile 与 `--verification-output` 不改变该 policy

#### Scenario: Invalid gate fails before scanner startup

- **WHEN** 调用者传入不属于封闭集合的 `--gate` 值
- **THEN** CLI 在 stderr 报告 actionable input error 并退出 `3`
- **AND** 不启动 scanner 或写出伪造的 scan artifacts

## MODIFIED Requirements

### Requirement: Exit code mapping
CLI SHALL 仅在 overall completeness 为 `complete` 或 `empty`、没有 runtime/output validation failure 且 gate result 为 `passed` 时退出 `0`。Successful measurement 的 gate result 为 `failed` 时 CLI MUST 退出 `1`；planned capability 的 `unavailable` / `failed`、其它 runtime fatal issue、output validation failure 或普通未处理顶层 error MUST 退出 `2`；现有顶层 mapping 识别 `ENOENT`、invalid gate 或 config-related error 时 MUST 退出 `3`。CLI MUST NOT 引入 output-failure exit `4`。Failure class precedence MUST 为 input/config `3`、runtime/completeness `2`、gate `1`、success `0`。

#### Scenario: Successful measurement and passed gate use exit zero
- **WHEN** completeness 为 `complete` 或 `empty`，且 selected gate result 为 `passed`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Blocking warnings use exit one
- **WHEN** completeness 成功、artifacts 写出并验证，且 selected gate result 为 `failed`
- **THEN** CLI 以退出码 `1` 退出
- **AND** quality status 可以继续为 `warning`

#### Scenario: Incomplete or failed measurement uses exit two
- **WHEN** planned capability unavailable / failed，或发生其它 runtime fatal issue或 output validation failure
- **THEN** gate 为 `not-evaluated`
- **AND** CLI 以退出码 `2` 退出

#### Scenario: Ordinary top-level error uses exit two
- **WHEN** 发生不匹配现有特殊 mapping 的未处理顶层 error
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Input and config errors use exit three
- **WHEN** 未处理顶层 error 匹配 pinned consumer 的 `ENOENT`、invalid gate 或 config-related error mapping
- **THEN** CLI 以退出码 `3` 退出
