# test-fixtures Specification

## Purpose
定义 TypeScript/Bun 产品测试资产和 support fixtures 的仓库所有权、adapter boundary、
证明目标追溯与 testing owner materials 维护规则，确保测试只观察当前产品契约。
## Requirements
### Requirement: TypeScript product test assets remain traceable

Vibe Check product unit tests 与 unit support fixtures SHALL 由 `src/product/**` 拥有，并且 SHALL 只证明当前 owner 定义的 TypeScript / Bun behavior。迁移后的 quality-core tests 与 unit support fixtures MUST 保留在 `src/product/quality-core/**`。可由正式入口扫描的 reusable external project fixtures SHALL 位于 `fixtures/projects/**`，并与 unit / scanner protocol support 保持可辨识边界。Testing owner materials MUST 使用 `test-evidence-management` 定义的受控 topic、语义 Case 和当前实体闭合；每个 Case MUST 通过 `Owner`、`Entities` 与 `Proves` 把一个或多个当前测试实体关联到可观察证明责任，且不得把 Case/entity 关系限制为一对一。Scanner protocol samples 与 controlled tools MAY 作为 acceptance support，但 MUST NOT 定义稳定 Core 或 Output contract。

#### Scenario: Product proof targets are auditable

- **WHEN** reviewer 从 testing owner materials 检查已记录的 TypeScript product proof
  target
- **THEN** Case 的 `Owner` 精确定位当前行为 owner，`Entities` 只引用 scanner
  发现的当前测试实体
- **AND** `Proves` 描述 owner 下可观察且可证伪的证明责任，完整关系通过 strict
  many-to-many closure

#### Scenario: External project fixtures remain distinct

- **WHEN** 正式入口 acceptance 需要 checked-in 可扫描项目
- **THEN** project fixture 位于 `fixtures/projects/**`
- **AND** unit support、scanner protocol material 与 external project source 保持清楚边界

#### Scenario: Scanner support stays test-owned

- **WHEN** acceptance 使用 controlled scanner command 或 protocol sample
- **THEN** assertion 证明 Vibe Check-owned config routing、normalized model 或 failure
  projection
- **AND** scanner-private output shape 不成为稳定 Core 或 Output contract

### Requirement: Configured external project fixture

Repository SHALL 在 `fixtures/projects/configured-typescript/` 提供最小、deterministic、checked-in project，包含完整 JSON `QualityConfig`、eligible TypeScript source、excluded / generated controls、可产生现有 warning 的 source 与 fixture README。Fixture-backed acceptance MUST 通过正式 Product CLI 显式传入 project root 与 `--config`，并验证 config version、effective scope、code area、warning 与 artifacts。Fixture config MAY 使用 controlled tool settings 保证测试确定性。

#### Scenario: Formal entry scans according to fixture config

- **WHEN** acceptance 从 fixture root 外启动
  `bun run product:cli -- scan <fixture-root> --config vibe-check.config.json`
- **THEN** metrics 只包含 config 批准的 files，并使用 config 声明的 code area 与 version
- **AND** warning 与 artifacts 对应 explicit config 而不是 `DEFAULT_CONFIG`

#### Scenario: Excluded fixture inputs remain excluded

- **WHEN** fixture 同时包含 eligible source 与匹配 exclude / generated rules 的 controls
- **THEN** eligible source 进入 normalized scanner inputs
- **AND** excluded / generated files 不进入 metrics、warnings 或 scanner exact inputs

#### Scenario: Acceptance remains deterministic

- **WHEN** required product validation 重复运行 configured fixture acceptance
- **THEN** controlled tools 产生稳定 Vibe Check-owned metrics、warning ordering 与 artifacts
- **AND** acceptance 不依赖网络或未固定第三方 output

### Requirement: CI quality gate acceptance matrix

Repository SHALL 提供 deterministic product-owned tests 与 fixtures，通过正式 Product CLI 和最窄 owner unit tests 证明 omitted disabled、`all`、`changed`、`regressions`、profile/comparison prerequisite、accepted warnings、complete/empty/failed completeness、output failure、cross-output projection 与 exit codes。Acceptance matrix MUST 至少包含 quick `all` 与 skipped capability、all-only warning、changed non-regression warning、regression warning、comparison `input-unchanged` / `baseline-unavailable`、accepted-only 与 accepted/unaccepted mixed warnings、complete zero-warning、legitimate empty、failed planned capability、quick/skip-baseline conflict 与 controlled output failure。Acceptance 使用的每个当前测试实体 MUST 至少被一个语义 Case 覆盖，每个 Case MUST 引用当前实体并从 `Owner` 恢复证明责任；acceptance MUST 使用 controlled warning/comparison data 或 checked-in external project，不得依赖网络、任意 console substring 或 scanner-private output shape。

#### Scenario: Omitted gate preserves existing behavior

- **WHEN** matrix 运行 omitted gate 的 warning 与 empty cases
- **THEN** metrics gate status 为 `disabled`，CLI 保持既有 exit
- **AND** report 与 console 不新增 gate-passed projection

#### Scenario: Policy matrix proves channel selection and exits

- **WHEN** required validation 运行 all-only、changed non-regression 与 regression warning cases
- **THEN** `all`、`changed` 与 `regressions` 只按对应 descriptor channel 产生 blocking set
- **AND** evaluated passed gate 退出 `0`，evaluated failed gate 退出 `1`

#### Scenario: Comparison evidence is distinguished from an empty channel

- **WHEN** matrix 运行 `input-unchanged` 与 `baseline-unavailable` comparison cases
- **THEN** `input-unchanged` 评价 empty changed/regressions channel 并通过
- **AND** `baseline-unavailable` 产生 `not-evaluated: comparison-unavailable` 并退出 `2`

#### Scenario: Impossible comparison plans fail before scanning

- **WHEN** formal-entry cases 将 changed/regressions gate 与 quick profile 或显式 skip-baseline 组合
- **THEN** CLI 以 usage exit `3` 失败
- **AND** scanner 未启动且 artifacts 未创建

#### Scenario: Accepted warnings remain visible and non-blocking

- **WHEN** matrix 运行 accepted-only 与 accepted/unaccepted mixed cases
- **THEN** accepted warning 保留在 selected channel 与 evaluated count
- **AND** 只有 unaccepted warning 进入 blocking list

#### Scenario: Empty and failed measurement cannot certify a requested gate

- **WHEN** matrix 运行 legitimate empty 与 failed capability cases
- **THEN** gate 分别为 `not-evaluated: no-eligible-input` 与 `not-evaluated: scan-incomplete`
- **AND** 两种 case 均退出 `2`，且不被断言为 gate passed 或 evaluated gate failure

#### Scenario: Output failure outranks a blocking result

- **WHEN** controlled test 在 gate 计算后产生 artifact write 或 output validation failure
- **THEN** process outcome 为 `failed` 且 CLI 退出 `2`
- **AND** acceptance 不把未通过 output validation 的 artifacts 当作 gate-failure evidence

#### Scenario: Cross-output evidence uses one result

- **WHEN** formal-entry case 产生 disabled、evaluated passed、evaluated failed 或 not-evaluated result
- **THEN** metrics、requested-gate report/console 与 CLI exit 对应同一 GateResult 和 process outcome
- **AND** warning streams 保持 normalized channel records 与顺序
