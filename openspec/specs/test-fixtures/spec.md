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

### Requirement: Canonical current-product artifact examples

Repository SHALL 在唯一 current root `docs/examples/artifacts/<outcome>/` 提供 deterministic、
完整的 current-v1 artifact sets。每个 outcome directory MUST 包含 `metrics.json`、
`warnings.ndjson`、`warnings-all.ndjson` 与 README；zero-warning streams MUST 是 zero-byte
files。README MUST 记录 fixed input、gate request、expected process outcome/exit，以及该 set
为何是 contract-valid。五个 outcome labels MUST 使用以下语义：

| Outcome | Completeness | Warning/Gate state | Producing outcome / exit |
| --- | --- | --- | --- |
| `complete-passed` | `complete` | all channels empty；gate `disabled` | `success` / `0` |
| `complete-warning` | `complete` | `all` non-empty；gate `disabled` | `success` / `0` |
| `legitimate-empty` | `empty` | all channels empty；gate `disabled` | `success` / `0` |
| `gate-failed` | `complete` | selected channel 含 unaccepted warning；gate evaluated `failed` | `gate-failed` / `1` |
| `scan-incomplete` | `failed` | fixed diagnostic；requested gate `not-evaluated: scan-incomplete` | `failed` / `2` |

Examples MUST 从 fixed core fixture values 经过 production mapper/serializer 生成；timestamp、
repository root、commit values、paths、config version 与 tool metadata MUST 在 serialization 前
注入固定值。Repeated generation MUST byte-stable。每组 files MUST 通过 canonical schemas、
byte grammar 与全部 public set invariants。Process exit 是 README scenario metadata，MUST NOT
从 files alone 推断。Retired Rust report examples MUST 保持不同 path 与 historical label，
不得注册为 current artifact examples。

#### Scenario: Representative current outcomes validate

- **WHEN** docs validation 遍历 canonical current artifact root
- **THEN** 五组 metrics/warning bytes 通过 schemas、framing、stream equality、channel、completeness 与 gate invariants
- **AND** scan-incomplete set 被识别为 contract-valid domain failure，而不是 output-contract failure

#### Scenario: Example generation is reproducible

- **WHEN** generator 对同一 fixed core fixture values 重复运行
- **THEN** JSON/NDJSON bytes 与 README scenario data 不变且 repository diff 为空
- **AND** artifacts 仍由 production mapper/serializer 产生

### Requirement: Focused contract and drift proof

Repository SHALL 通过 product-owned DTO/schema/mapper/serializer/validator tests、independent
docs validation 与 focused mutations 证明 current machine contract。Canonical valid sets MUST
在 runtime 与 docs boundaries 被接受。以下 predicates MUST 具有直接 failure proof：instance
identity；representative required/type/enum/nullability/closed-shape constraints；invalid UTF-8 与
BOM；metrics root object；warning missing/extra final LF、blank record、malformed/non-object
record；changed/all stream equality；warning channel subsequences；exact capability membership 与
completeness reduction；每个 evaluated-gate channel/count/blocking/order/status invariant，包括
empty `acceptedReason`。Key order、metrics JSON whitespace、record 内 non-LF whitespace 与
CRLF acceptance MUST 有直接 success proof。

Mutation cases MUST 调用 owning production 或 docs validator，并断言整体 verdict 与 logical
artifact plus applicable JSON Pointer/line/index/set relationship；不得按 mutation label 选择
test-only acceptance algorithm。Published schema generation drift 与 canonical example
generation drift MUST 使 required validation 失败。当前 semantic Cases MUST 通过 `Owner`、
`Entities` 与 `Proves` 关联实际 test entities 和适用 fixtures；不得为每个 schema field 或
keyword 复制模板 Case。通用 field constraints MAY 由 strict schema compile、derived DTO
types、representative mutations 与 canonical examples 共同证明。

#### Scenario: Runtime and docs boundaries accept canonical sets

- **WHEN** product validator 与 independent docs validator 检查 canonical current examples
- **THEN** 两者对 schemas、grammar 与 public set invariants 得出 accepted verdict
- **AND** docs validator 不 import product validator 来制造相同结果

#### Scenario: Focused mutation changes the owning verdict

- **WHEN** test 从 valid set 派生 representative identity、schema、grammar 或 set mutation
- **THEN** owning validator 返回 contract failure 与 actionable location
- **AND** valid prefix、schema-valid sibling file 或 mutation label 不会掩盖 failure

#### Scenario: Generated material drift fails required validation

- **WHEN** checked-in schema 或 canonical example bytes 与 product-owned generation result 不同
- **THEN** required validation 报告具体 path 并失败
- **AND** 其它 consumer/unit tests 的通过不能掩盖 drift

### Requirement: Required producer-to-consumer acceptance

Required workspace validation SHALL 调度一个 targeted acceptance child：正式 Product CLI 生成
current machine output，实际 `quality:annotate` 再读取 produced warning stream。Acceptance MUST
覆盖 conforming non-empty 与 zero-byte streams 并证明 annotation exit `0`；MUST 从 produced
valid stream 派生 representative decoding、framing 或 schema-invalid input，并证明同一个
warning-stream validator 产生 infrastructure failure、zero annotation commands 与 exit `2`。
Workspace verifier SHALL 只调度该 child、传播 exit/output 并按 child result 分类，不得直接
parse machine artifacts。Dogfood wrappers SHALL 保持 Product CLI pass-through。

#### Scenario: Formal producer output feeds the actual annotation CLI

- **WHEN** targeted acceptance 通过正式入口生成 non-empty 或 zero-byte current warning stream
- **THEN** producer artifact-set validation 与 consumer warning-stream validation 均成功
- **AND** actual annotation CLI 在完整 validation 后退出 `0`

#### Scenario: Invalid annotation input fails before rendering

- **WHEN** acceptance 使 produced warning input 的 decoding、framing 或 schema predicate 不成立
- **THEN** annotation stderr 使用 owning validator diagnostic，stdout 不含 annotation commands，process 退出 `2`
- **AND** quality warning non-blocking semantics 不把 infrastructure failure 改写为成功

#### Scenario: Required verifier remains an orchestrator

- **WHEN** required profile 执行 producer-to-consumer acceptance
- **THEN** verifier 根据 child result 报告 pass/fail 并保留 actionable output
- **AND** verifier 不维护 schema registry、artifact parser 或 warning mapper
