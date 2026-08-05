## MODIFIED Requirements

### Requirement: CI quality gate acceptance matrix

Repository SHALL 提供 deterministic product-owned tests 与 fixtures，通过正式 Product CLI 和最窄 owner unit tests 证明 omitted disabled、`all`、`changed`、`regressions`、显式 baseline revision、profile/comparison prerequisite、accepted warnings、complete/empty/failed completeness、output failure、cross-output projection 与 exit codes。Acceptance matrix MUST 至少包含 quick `all` 与 skipped capability、all-only warning、changed non-regression warning、regression warning、显式 comparison `input-unchanged` / runtime `baseline-unavailable`、missing/invalid baseline input、revision canonicalization、accepted-only 与 accepted/unaccepted mixed warnings、complete zero-warning、legitimate empty、failed planned capability、quick/skip-baseline conflict 与 controlled output failure。Acceptance 使用的每个当前测试实体 MUST 至少被一个语义 Case 覆盖，每个 Case MUST 引用当前实体并从 `Owner` 恢复证明责任；acceptance MUST 使用 controlled warning/comparison data 或 checked-in external project，不得依赖网络、任意 console substring 或 scanner-private output shape。

#### Scenario: Omitted gate preserves existing behavior

- **WHEN** matrix 运行 omitted gate 的 warning 与 empty cases
- **THEN** metrics gate status 为 `disabled`，CLI 保持既有 exit
- **AND** report 与 console 不新增 gate-passed projection

#### Scenario: Policy matrix proves channel selection and exits

- **WHEN** required validation 运行 all-only warning case，并使用显式 baseline 运行 changed non-regression 与 regression warning cases
- **THEN** `all`、`changed` 与 `regressions` 只按对应 descriptor channel 产生 blocking set
- **AND** evaluated passed gate 退出 `0`，evaluated failed gate 退出 `1`

#### Scenario: Comparison evidence is distinguished from an empty channel

- **WHEN** matrix 运行显式 baseline 的 `input-unchanged`、runtime `baseline-unavailable` 与 missing baseline request cases
- **THEN** `input-unchanged` 评价 empty changed/regressions channel 并通过，runtime `baseline-unavailable` 产生 `not-evaluated: comparison-unavailable` 并退出 `2`
- **AND** missing baseline request 在 scan work 前作为 usage error 退出 `3`，不产生 comparison artifacts

#### Scenario: Explicit revision resolution is pinned

- **WHEN** formal-entry case 传入 branch、tag 或 abbreviated commit revision
- **THEN** produced metrics、baseline materialization 与 comparison 使用同一个 canonical full commit SHA
- **AND** invalid revision 在 scanner、cache 与 artifact work 前以 usage exit `3` 失败

#### Scenario: Impossible comparison plans fail before scanning

- **WHEN** formal-entry cases 将 changed/regressions gate 与 quick profile、显式 skip-baseline 或 omitted baseline 组合
- **THEN** CLI 以 usage exit `3` 失败
- **AND** scanner、cache 未启动且 artifacts 未创建

#### Scenario: Accepted warnings remain visible and non-blocking

- **WHEN** matrix 运行 accepted-only 与 accepted/unaccepted mixed cases
- **THEN** accepted warning 保留在 selected channel 与 evaluated count
- **AND** 只有 unaccepted warning 进入 blocking list

#### Scenario: Empty and failed measurement cannot certify a requested gate

- **WHEN** matrix 使用合法显式 baseline 运行 legitimate empty 与 failed capability cases
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
