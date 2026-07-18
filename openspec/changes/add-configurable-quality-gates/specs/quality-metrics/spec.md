本 delta 起草 normalized warning channels 上的 opt-in gate evaluation；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## ADDED Requirements

### Requirement: Configurable quality gate evaluation

Quality core SHALL 在 overall completeness 为 `complete` 或 `empty` 后，从封闭 policy `never`、`all`、`changed` 或 `regressions` 与同名 normalized warning channel 计算一次 product-owned gate result。Gate result MUST 记录 policy、evaluated channel、`passed` / `failed` / `not-evaluated` status、evaluated warning count、blocking warning count 与 blocking warnings。具有非空 `acceptedReason` 的 warning MUST 保留在原 channel 和 evaluated count 中，但 MUST NOT 进入 blocking set。Gate evaluation MUST NOT 修改 warning channel membership 或 `passed` / `warning` / `failed` quality status。

#### Scenario: Never policy preserves non-blocking behavior

- **WHEN** complete scan 使用 `never` policy 且包含任意 normalized warnings
- **THEN** gate result 为 `passed`、evaluated channel 为空且 blocking warning count 为 `0`
- **AND** warnings 与 quality status 保持不变

#### Scenario: Selected warning channel controls blocking set

- **WHEN** complete scan 使用 `all`、`changed` 或 `regressions` policy
- **THEN** gate 只从对应 normalized channel 选择 blocking warnings
- **AND** 非空 blocking set 产生 `failed`，空 blocking set 产生 `passed`

#### Scenario: Accepted warnings remain visible but non-blocking

- **WHEN** selected channel 包含具有非空 `acceptedReason` 的 warning
- **THEN** warning 仍计入 evaluated warning count 并保留在原 channel
- **AND** 该 warning 不计入 blocking warning count 或 blocking warnings

#### Scenario: Incomplete measurement does not run the gate

- **WHEN** overall completeness 为 `failed`
- **THEN** gate status 为 `not-evaluated` 并记录 normalized reason
- **AND** runtime/completeness failure 不被分类为 gate failure
