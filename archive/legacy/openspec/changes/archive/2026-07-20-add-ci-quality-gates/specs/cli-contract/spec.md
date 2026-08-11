## ADDED Requirements

### Requirement: Gate policy selection

Product CLI `scan` SHALL 接受至多一个 `--gate <all|changed|regressions>`；省略 option 时 MUST 传递 disabled gate request 并保持 warning 非阻断。`GatePolicy` type、合法 values 与 help text MUST 从 product-owned policy descriptor 派生；help MUST 记录每个 policy 的 warning scope、accepted warning 的非阻断行为以及 exit `1` / `2` 语义。缺失值、重复 option 或 unknown value MUST 在 scanner 和 artifacts 启动前作为 CLI usage error 退出 `3`。Normalized request MUST 传给 product core；launch cwd、config 与 `--verification-output` MUST NOT 选择或覆盖 policy。

#### Scenario: Omitted gate disables enforcement

- **WHEN** 调用者运行 `scan` 且未传入 `--gate`
- **THEN** CLI 传递 disabled gate request
- **AND** warning 或 empty quality result 不因 gate 产生非零 exit

#### Scenario: Invalid gate fails before scanner startup

- **WHEN** 调用者传入缺失值、重复 option 或 unknown `--gate` value
- **THEN** CLI 在 stderr 报告 option、合法值与修复方式，并退出 `3`
- **AND** 不启动 scanner 或创建 scan artifacts

#### Scenario: Verification output does not select policy

- **WHEN** 调用者组合 `--verification-output` 与任一 gate policy
- **THEN** CLI 保持 normalized policy 不变
- **AND** `--verification-output` 只改变人读 warning preview

### Requirement: Gate prerequisite planning

Product CLI SHALL 根据 policy descriptor 归一化 scan plan：`all` 只评价 resolved profile 的 `warnings.all`，MUST NOT 改变 profile capability selection 或 baseline selection；`changed` / `regressions` MUST 使用 full profile 并启用 baseline comparison，省略显式 baseline option 时 MUST 使用 auto-detection，显式 `--baseline <sha>` 时 MUST 使用指定 commit。Comparison policy 与 quick profile 或显式 `--skip-baseline` 的组合 MUST 在 scanner 和 artifacts 启动前作为 usage error 退出 `3`。

#### Scenario: All gate preserves the selected profile

- **WHEN** 调用者在 quick 或 full profile 传入 `--gate all`
- **THEN** CLI 保持已有 profile capabilities 与 baseline selection
- **AND** gate 只覆盖该 resolved profile 产出的 warnings

#### Scenario: Comparison gate enables baseline in full profile

- **WHEN** 调用者在 full profile 传入 `--gate changed` 或 `--gate regressions`，且没有显式 baseline option
- **THEN** CLI 启用 baseline auto-detection
- **AND** 调用者不需要同时传入 `--with-baseline`

#### Scenario: Impossible comparison plan fails before scanner startup

- **WHEN** 调用者把 comparison gate 与 quick profile 或显式 `--skip-baseline` 组合
- **THEN** CLI 在 stderr 报告 comparison prerequisite 与可用修复方式，并退出 `3`
- **AND** 不启动 scanner 或创建 scan artifacts

## MODIFIED Requirements

### Requirement: Exit code mapping

Product core SHALL 向 CLI 返回独立 process outcome：core outcome 为 `passed` / `warning` 且 gate 为 `disabled` 或 `passed` 时返回 `success`；core outcome 非 `failed`、gate 为 evaluated `failed` 且 artifacts 写出并通过 output validation 时返回 `gate-failed`；请求的 gate 为 `not-evaluated`，或发生 completeness、runtime、artifact write、output validation failure 时返回 `failed`。CLI MUST 将 `success`、`gate-failed`、`failed` 分别映射为 exit `0`、`1`、`2`；未返回 core outcome 的普通 top-level error MUST 退出 `2`，现有 `ENOENT`、config-related 与 CLI usage mappings MUST 退出 `3`。Output failure MUST 优先于已计算的 gate status，且 CLI MUST NOT 引入 exit `4`。

#### Scenario: Disabled or passed gate uses exit zero

- **WHEN** core/output 成功，且 gate result 为 `disabled` 或 `passed`
- **THEN** CLI 以退出码 `0` 退出

#### Scenario: Blocking warnings use exit one

- **WHEN** artifacts 已写出并验证，且 evaluated gate result 为 `failed`
- **THEN** CLI 以退出码 `1` 退出
- **AND** quality status 可以继续为 `warning`

#### Scenario: Requested gate without evidence uses exit two

- **WHEN** 请求的 gate 产生 `not-evaluated`
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Runtime or output failure uses exit two

- **WHEN** 发生 completeness、runtime、artifact write 或 output validation failure
- **THEN** CLI 以退出码 `2` 退出
- **AND** failure 不被分类为 evaluated gate failure

#### Scenario: Ordinary top-level error uses exit two

- **WHEN** 未处理顶层 error 不匹配现有特殊 mapping
- **THEN** CLI 以退出码 `2` 退出

#### Scenario: Input, config and CLI usage errors use exit three

- **WHEN** 未处理顶层 error 匹配 `ENOENT`、config-related 或 CLI usage mapping
- **THEN** CLI 以退出码 `3` 退出
