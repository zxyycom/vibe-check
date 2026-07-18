本 delta 起草 quality gate 的入口级 acceptance matrix；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Quality gate acceptance matrix

Repository SHALL 提供 deterministic product-owned tests 与 fixtures，通过正式 Product CLI 证明 omitted/`never`、`all`、`changed`、`regressions` policies、accepted warnings、empty channels、incomplete measurement、output projection 与 exit codes。每个 case MUST 将 proof target 映射到实际 test path、fixture path 与唯一 `@case` marker。Acceptance MUST 使用 controlled warning data 或 checked-in external project，不得依赖网络、任意 console substring 或 scanner-private output shape。

#### Scenario: Policy matrix proves channel selection and exits

- **WHEN** required validation 运行含 all-only、changed 与 regression warning 的 gate matrix
- **THEN** 每个显式 policy 只按对应 channel 产生 blocking set
- **AND** passed gate 退出 `0`，failed gate 退出 `1`

#### Scenario: Accepted and default behavior remain covered

- **WHEN** matrix 运行 omitted/`never` 与包含 accepted warning 的 cases
- **THEN** omitted/`never` warning scan 保持 non-blocking
- **AND** accepted warning 在 artifacts 可见但不使 selected gate failure

#### Scenario: Runtime failure outranks gate evaluation

- **WHEN** controlled fixture 产生 unavailable 或 failed planned capability
- **THEN** gate 为 `not-evaluated` 且 CLI 退出 `2`
- **AND** acceptance 不把该 case 断言为 gate exit `1`
