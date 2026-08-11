本 delta 把测试证明追溯从聚合账本与源码 marker 改为受控 topic 下的一原生入口一 case。

## MODIFIED Requirements

### Requirement: TypeScript product test assets remain traceable

Vibe Check product unit tests 与 unit support fixtures SHALL 由 `src/product/**` 拥有，并且 SHALL 只证明当前 owner 定义的 TypeScript / Bun behavior。迁移后的 quality-core tests 与 unit support fixtures MUST 保留在 `src/product/quality-core/**`。可由正式入口扫描的 reusable external project fixtures SHALL 位于 `fixtures/projects/**`，并与 unit / scanner protocol support 保持可辨识边界。Testing owner materials MUST 使用受控 topic 下的一入口一 case 目录，将每个已记录的最小原生测试入口映射到实际 test path、稳定测试名称、契约背景和可观察证明结果。Scanner protocol samples 与 controlled tools MAY 作为 acceptance support，但 MUST NOT 定义稳定 Core 或 Output contract。

#### Scenario: Product proof targets are auditable

- **WHEN** reviewer 从 testing owner materials 检查已记录的 TypeScript product proof
  target
- **THEN** case 的 `Entry` 精确定位实际 test path 与单个 runner 原生测试名称
- **AND** case 的 `Contract` 与 `Proves` 能从对应 owner 和测试断言恢复

#### Scenario: External project fixtures remain distinct

- **WHEN** 正式入口 acceptance 需要 checked-in 可扫描项目
- **THEN** project fixture 位于 `fixtures/projects/**`
- **AND** unit support、scanner protocol material 与 external project source 保持清楚边界

#### Scenario: Scanner support stays test-owned

- **WHEN** acceptance 使用 controlled scanner command 或 protocol sample
- **THEN** assertion 证明 Vibe Check-owned config routing、normalized model 或 failure
  projection
- **AND** scanner-private output shape 不成为稳定 Core 或 Output contract

### Requirement: CI quality gate acceptance matrix

Repository SHALL 提供 deterministic product-owned tests 与 fixtures，通过正式 Product CLI 和最窄 owner unit tests 证明 omitted disabled、`all`、`changed`、`regressions`、profile/comparison prerequisite、accepted warnings、complete/empty/failed completeness、output failure、cross-output projection 与 exit codes。Acceptance matrix MUST 至少包含 quick `all` 与 skipped capability、all-only warning、changed non-regression warning、regression warning、comparison `input-unchanged` / `baseline-unavailable`、accepted-only 与 accepted/unaccepted mixed warnings、complete zero-warning、legitimate empty、failed planned capability、quick/skip-baseline conflict 与 controlled output failure。每个已登记的最小原生测试入口 MUST 由唯一 case 文件把 proof target 映射到实际 test path、稳定测试名称和适用 fixture；acceptance MUST 使用 controlled warning/comparison data 或 checked-in external project，不得依赖网络、任意 console substring 或 scanner-private output shape。

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
