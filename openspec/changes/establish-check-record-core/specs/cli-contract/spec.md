> **核心句：**本 delta 让 CLI 从 resolved project definition/catalog 选择 named DecisionPolicy，并把 Check/Record domain evidence 与 Product integrity failure 映射为不同 process outcomes。

## MODIFIED Requirements

### Requirement: CLI owner documentation

CLI owner SHALL 继续记录正式入口、project-root normalization、既有 scan flags、configuration selection、console/artifact boundary、process mapping 和 dogfood wrapper 方向，并新增 `--gate <policy-id>`、explicit named reference inputs 与 `run.json`/`records.ndjson` 边界。Current `--baseline <revision>` SHALL 提供名为 `baseline` 的 reference；CLI 不得自动推断其它 reference。

普通 `scan --help` 在尚未加载 project definition/config 时 MUST 只说明 policy ID 来自本次 resolved catalog 及如何选择，不得承诺枚举动态 IDs。Unknown policy ID MUST 在 definition/config resolution 完成、check execution 开始前失败，并列出本次 invocation 实际 resolved policy IDs；没有 available ID 时明确说明 catalog 为空。

#### Scenario: Navigation exposes the current CLI surface

- **WHEN**reviewer 从 `docs/navigation.md` 查找 CLI behavior
- **THEN**navigation 指向记录正式入口、scan flags、resolved policy selection、reference、artifact boundary、status mapping 与 wrapper direction 的 owner

#### Scenario: Existing flags retain parser semantics

- **WHEN**调用者通过正式入口传入既有 TypeScript scan flag
- **THEN**CLI 保持 project-root rebasing 与现有 parser semantics，并只把 gate value 延后到 resolved catalog 验证
- **AND**不新增 `--with-baseline`、`--format` 或 `--version`

#### Scenario: Help documents complete configuration input

- **WHEN**调用者运行 `scan --help`
- **THEN**help 继续说明 configuration input 的选择与 project-root path 基准
- **AND**不声称 CLI 会 merge 多个 project definition/config sources

#### Scenario: Help documents explicit baseline selection

- **WHEN**调用者运行 `scan --help`
- **THEN**help 说明只有显式 `--baseline <revision>` 提供 `baseline` reference
- **AND**不声称自动发现或推断 comparison reference

#### Scenario: Static help does not enumerate dynamic policy IDs

- **WHEN**调用者在没有加载具体 project definition 的情况下运行 `scan --help`
- **THEN**help 说明 `--gate` 接收 resolved policy ID 及其来源
- **AND**不把 built-in 或上次运行的 IDs 显示为本次完整可用集合

### Requirement: Standard stream boundaries

CLI SHALL 把 banner、profile、progress、artifact paths、CheckRun/CheckResult/record summary、bounded preview 和 completion 写 stdout；把 definition/config/request errors 与 Core/output fatal details 写 stderr。Machine/human reports 由 `run.json`、`records.ndjson` 与 `report.md` 交付，不成为 stdout mode；backend native streams 不得成为 stable product output。

#### Scenario: Successful scan keeps operational console on stdout

- **WHEN**scan 正常完成并发布 artifacts
- **THEN**stdout 包含 paths、check run/result/coverage summary、bounded records 和 completion
- **AND**stdout 不直接转发 backend output 或完整 machine stream

#### Scenario: Fatal details and top-level errors use stderr

- **WHEN**definition resolution、Core integrity、output 或 unhandled top-level error 失败
- **THEN**actionable fatal detail 写入 stderr
- **AND**backend process native stream 不被直接转发为 stable product output

## REMOVED Requirements

### Requirement: Exit code mapping

**Reason**: Old mapping 把 overall completeness、not-evaluated gate 与 runtime failure 绑定在一起，不能表达 policy 可组合的 Check/Record evidence。

**Migration**: 使用新增的“Check and Record process outcome mapping”。

### Requirement: Gate policy selection

**Reason**: Fixed `all | changed | regressions` parser enum 无法接入 resolved dynamic policy catalog。

**Migration**: 使用新增的“Resolved DecisionPolicy selection”。

### Requirement: Gate prerequisite planning

**Reason**: Prerequisites 不再按 legacy policy 名称与 fixed channel 硬编码。

**Migration**: 使用新增的“Named policy prerequisite planning”。

## ADDED Requirements

### Requirement: Check and Record process outcome mapping

Product Core 与 output 成功且 gate disabled 或 passed 时，CLI SHALL exit0；evaluated gate failed 且 artifacts 验证/发布成功时 SHALL exit1；definition execution integrity、Core/policy evaluation、record identity integrity、serialization/validation/publication 或 ordinary runtime failure SHALL exit2；usage/config/reference-request error SHALL exit3。

CheckRun failed、partial coverage、failed CheckResult、warning/error record 或 empty record set 本身 MUST NOT 绕过 selected policy 决定 exit。Ungated invocation 在 final model/output 可信时 SHALL 完整发布 domain states 并 exit0；identity conflict、missing ExecutionReport 或 output failure 无法形成可信 snapshot，必须优先 exit2 且不得发布可信 gate outcome。

#### Scenario: Ungated partial run remains observational

- **WHEN**gate disabled 且一个 check failed 并保留 records，但 final model 完整可信
- **THEN**CLI 发布 artifacts、显示 failed run/coverage 并 exit0
- **AND**不声称 gate passed

#### Scenario: Policy blocks a failed run

- **WHEN**selected policy 阻断 failed CheckRun 且 artifacts 发布成功
- **THEN**CLI exit1
- **AND**同一 run 不被 CLI 固定映射为 runtime exit2

#### Scenario: Integrity failure cannot become gate evidence

- **WHEN**record identity conflict 或 ExecutionReport set mismatch 使 final model 无效
- **THEN**CLI exit2 且不发布可信 run/record artifacts
- **AND**selected policy 不能允许该 Product failure

### Requirement: Resolved DecisionPolicy selection

CLI `scan` SHALL 接受至多一个 `--gate <policy-id>`。省略 MUST 传递 disabled gate request 并保持 collection 非阻断。Missing value 或 duplicate option MUST 在 definition/check/artifact work 前 exit3；non-empty ID 的存在性 MUST 在本次 project definition/config 解析出 DecisionPolicy catalog 后、check execution 前验证。

Unknown ID diagnostic MUST 列出本次 resolved catalog IDs，而不是 CLI hardcoded enum。Selected policy MAY 声明 required checks、views、named references 和 decision expression；CLI 只把 resolved policy 交给 Product planner/evaluator，launch cwd、backend availability、wrapper 或 help generation 不得替换它。

#### Scenario: Omitted gate collects data

- **WHEN**scan 省略 `--gate`
- **THEN**Product 执行 resolved requested checks 并发布 records/runs 与 disabled result
- **AND**record level、result verdict 或 run failure 不自动产生 nonzero gate exit

#### Scenario: Unknown policy reports the current catalog

- **WHEN**project definition/config 已加载且 caller 选择不存在的 policy ID
- **THEN**CLI 报告 unknown ID 与本次 resolved available IDs 并 exit3
- **AND**不启动 check contribution 或创建 scan artifacts

### Requirement: Named policy prerequisite planning

Planner SHALL 从 selected normalized policy 解析 required checks、selection constraints 和 named references，不得按 policy 名称硬编码 profile 或 comparison channel。Required checks MUST 进入 resolved plan；required reference MUST 由 caller 提供并在 check/cache/artifact work 前解析一次为 immutable identity。

`--baseline <revision>` SHALL 提供 `baseline` reference。Selected policy 不需要 baseline 时，该 option 不得隐式改变 policy；需要而缺失、无效或与其它 explicit request 冲突时 MUST 以 actionable exit3 失败。Reference 可用但 comparison coverage partial 时，records/runs/results 进入 policy evaluation，CLI 不得固定 not-evaluated result。

#### Scenario: Policy requests checks

- **WHEN**selected policy 需要 file-metrics 和 duplicate-detection
- **THEN**planner 请求两个 resolved definitions
- **AND**其它 checks 是否运行由同一 resolved plan 决定

#### Scenario: Missing reference fails before execution

- **WHEN**selected policy 需要 `baseline` 但 caller 未提供
- **THEN**CLI 在 check execution 前报告恢复方式并 exit3
- **AND**不从 Git history、branch 或 remote 选择替代 reference
