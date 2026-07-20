# Quality Metrics

本文是 Vibe Check 基础质量指标、scan completeness、warning channels、baseline
comparison、quality gate 和质量状态的 owner 文档。它维护 Product Core / Scanner 在
normalized scan scope 后如何表达 measurement 是否完整、生成 metrics、聚合 report
data、产生 warnings，并计算 core-owned `GateResult` 与 `passed` / `warning` / `failed`
质量状态。

Output 只投影本文定义的 report data 与 `GateResult`；CLI 只负责参数、scan planning、
入口和最终进程状态映射。本文不拥有 project-root 解析、scan scope 路径规则、artifact
序列化格式或 scanner dependency 选择。

## 实施状态

当前 owner 是 `src/product/**` 下的 TypeScript/Bun quality core。默认 thresholds、code
areas、scanner commands、artifact paths 和 profiles 由 `src/product/config.ts` 唯一拥有；
`src/product/quality-core/**` 提供 quick / full、optional baseline comparison、scc、
Python/Lizard、jscpd、warning channels、gate policy descriptor / evaluator、cache 和
artifacts。已退役的 Rust metrics / warning contract 不属于当前产品行为或测试来源。

## Pipeline boundary

当前 TypeScript product pipeline 顺序：

```text
collect + classify normalized scan scope
  -> build input fingerprints and changed-file scope
  -> determine capability eligibility
  -> resolve and run only requested capabilities with eligible input
  -> normalize scanner results and final capability results
  -> aggregate metrics
  -> reduce current scan completeness
  -> optionally scan/compare baseline
  -> generate all / changed / regression warning channels and accepted reasons when complete
  -> evaluate one core-owned GateResult
  -> write report artifacts
  -> validate metrics and output
  -> calculate quality status and process outcome
```

Scanner inputs 只能来自 normalized scan scope。Adapter 不重新发现 project root，不重新应用
include / exclude，也不把第三方输出结构交给 aggregation、warning 或 Output。

## Vibe Check-owned models

Product Core 使用仓库自有模型隔离 scanner protocol。现有模型包括：

- `FileMetric`：path、language、code area、changed 标记、lines、可用的 code/comment/blank
  lines，以及 Vibe Check-owned decision-token metric。
- `FunctionMetric`：file、code area、stable function name、start/end line、Lizard NLOC、
  parameter count、cyclomatic complexity 和 changed 标记。
- `DuplicateCodeFragment`：stable id、token/line count、归一化 locations、涉及的 code
  areas 和 changed-scope 标记。
- `CapabilityResult`：stable capability ID、`skipped` / `no-input` / `succeeded` /
  `failed` final status，以及 failed result 的 normalized diagnostic。
- `ScanCompleteness`：由本次 current capability results 归约得到的 `complete` / `empty` /
  `failed` overall。
- `GatePolicy`：由单一 product-owned descriptor 派生的 `all` / `changed` /
  `regressions` closed policy。
- `GateResult`：一次 scan 的 `disabled` / `passed` / `failed` / `not-evaluated`
  discriminated result。
- `FatalIssue`：metrics validation 或其它无法归属 current capability 的顶层失败，包含
  tool、phase 和可行动 error。

这些类型属于 product core contract。scc CSV record、Lizard CSV row、jscpd reporter
object、process result、临时 config 和 component-private data 不得越过 adapter boundary。

## scc file metrics boundary

现有 TypeScript product config 解析 scc command。Adapter 运行 by-file measurement，把
scc output 归一化为 `FileMetric`，并保留 file code lines、comment/blank lines、language
和 decision-token input。

scc 的 CSV header、language taxonomy、native error 和 process protocol 只属于 adapter。
没有 eligible file input 时返回 `no-input`，不解析或启动 scc；有 eligible input 时，
availability failure 返回 `failed` / `unavailable`，未知 header、不可解析 output 或执行
失败返回对应 normalized failure，不能被当成 zero metrics。

scc command、args、file-line thresholds、decision-token allowance、aggregate 公式和 raw
artifact 都属于当前 product contract；修改时必须同步对应 owner 与测试。

## Python/Lizard function metrics boundary

Structural scanning 使用 product config 解析的 Python/Lizard component。当前产品
通过 Python command 与 `-m lizard` 调用 Lizard，并解析 CSV；process 和 parser behavior
由现有 adapter tests 验证。

Product core 只向 adapter 传递 normalized scan scope 中受支持的 `.ts` / `.d.ts` 和 `.rs`
exact paths。`.go`、`.py`、`.tsx`、`.js` 和 `.jsx` 不在 pinned TypeScript selector 中。
Adapter 不扫描 project root，也不接收被 scope rules 排除或 unsupported 的文件。

Adapter 向 core 返回 Vibe Check-owned `FunctionMetric` 或 normalized failure。Lizard
process protocol、CSV output 和 private fields 留在 adapter 内；为了复现行为保存的 raw
material 只属于 scanner artifact，不成为稳定 product output field。

现有 parser 归一化 function name、file path、line range、NLOC、parameter count 和
cyclomatic complexity。Lizard 保持 external component；parser、function identity、
threshold 或 warning algorithm 的变化必须作为对应 scanner / metrics contract 变更处理。

## jscpd duplicate boundary

Duplicate scanning 使用 product config 解析的 jscpd component。当前 TypeScript adapter
按 code area 规划任务，把 product core 已批准的 exact paths 写入私有临时 config，调用
repository-managed jscpd CLI，并解析 JSON reporter output。

Adapter 向 core 返回 Vibe Check-owned `DuplicateCodeFragment` records 或 normalized
failure。临时 config、CLI process protocol、reporter JSON 和 private configuration 留在
adapter 内；raw reporter output 即使为复现而保存也只能作为 scanner artifact，不能成为
stable product output field。

以下边界保持现有行为：

- quick profile 跳过 jscpd；启用 duplicate scanning 的 profile 继续按 configured code
  area、format 和 minimum-token values 运行。
- format 为 `null` 时省略 format override，并不跳过至少有两个 exact inputs 的 area；被
  scan scope 排除的 paths 不进入 task，没有足够 inputs 的 area 正常跳过。
- 有 eligible input 时，availability failure 产生 `failed` / `unavailable` result；已进入
  invocation 后的 non-zero execution、缺失 report 或 parse failure 产生对应
  `execution` / `invalid-result` failure，不伪装成 successful empty duplicate result。
- duplicate fragments 的 location、token count、code area、ordering、cache identity 和
  warning mapping 保持 pinned TypeScript source 的实现。

当前产品不采用或保留已退役 Rust duplicate integration contract。

## Aggregation

Aggregation 只消费 Vibe Check-owned metrics，并保持现有 TypeScript shape：

- overall totals：files、lines、functions，以及可用的 code lines、decision tokens、
  function lines/complexity/parameters 和 duplicate fragments。
- by-language totals：files、lines、code/comment/blank lines。
- by-code-area totals：warning policy、files、lines、functions 和可用的 scanner totals。
- current/baseline fingerprints、baseline metadata、comparison status 和 trends。

缺失的可选 scanner value 保持现有 `null` / omitted semantics，不得用猜测值补齐。排序、
fingerprint、baseline identity、cache key 和 comparison algorithm 由当前产品实现和测试
共同验证。

Failed capability 的缺失或部分数据不能被当作 measured zero，也不能生成可信质量结论。
Successful measurement 即使得到 zero files、functions、duplicates 或 findings，仍保持
`succeeded`；`no-input` 只表示 profile 请求了能力但 normalized scope 没有 eligible input。

## Scan completeness

Current measurement 使用以下稳定 capability IDs：

- `file-metrics`
- `function-metrics`
- `duplicate-detection`

每项 capability 对一次 scan 产生且只产生一个 final result：

- `skipped`：当前 profile 未请求；不解析、检查或启动 component。
- `no-input`：profile 已请求，但 normalized scope 没有 eligible input；不解析、检查或启动
  component。
- `succeeded`：全部 eligible work 正常完成并得到有效 normalized result；zero findings
  仍是成功。
- `failed`：required work 未完整完成。Diagnostic 的 `kind` 为 `unavailable`、
  `execution` 或 `invalid-result`，并携带说明原因的 `message` 和恢复动作 `action`。

Core 只按 final result status 归约 overall，不按 capability ID 增加特殊分支：

1. 任一 result 为 `failed`，overall 为 `failed`。
2. 没有 failure 且至少一项 result 为 `succeeded`，overall 为 `complete`。
3. Results 只包含 `skipped` / `no-input` 时，overall 为 `empty`。

`skipped` 不降低 completeness；`succeeded` 与 `no-input` / `skipped` 混合仍为
`complete`。稳定 contract 不承诺 capability 展示顺序、diagnostic 精确措辞、额外
diagnostic metadata 或 serialized schema version。

## Warning rules and channels

现有 TypeScript core 从 current metrics、changed scope、optional baseline、absolute floor
和 changed delta 生成三个 channels：

- `all`：当前 scan 的全部 warning records。
- `changed`：按现有 scope / comparison policy 选出的 changed warnings。
- `regressions`：超过 configured delta floor 的 changed warnings。

规则集合保持 pinned source 与 product config 不变：

| Rule | Source |
| --- | --- |
| `scc-file-code-lines` | file code lines 与 decision-token-aware floor |
| `lizard-cyclomatic-complexity` | function cyclomatic complexity |
| `lizard-function-code-density` | Lizard NLOC 与 complexity-aware floor |
| `lizard-parameter-count` | function parameter count |
| `jscpd-duplicate-code` | normalized duplicate fragment |

Code-area warning policy 继续控制 strict、moderate、relaxed、watchlist-only 和
exclude-warnings 行为。Accepted warning configuration 只给匹配 warning 增加
`acceptedReason`；不删除 `all` / `changed` / `regressions` records。未匹配的 accepted
configuration 是否产生 warning 继续由现有 validation option 决定。

改变 rule id、message、metric、threshold、policy、排序、accepted reason 或 channel
selection 时，必须作为 Quality Metrics contract 变更处理。

## Gate policy and evaluation

Product core 使用一个 policy descriptor 同时拥有合法 policy、help text、selected warning
channel 和 comparison prerequisite：

| Policy | Evaluated channel | Prerequisite |
| --- | --- | --- |
| `all` | resolved profile 的 `warnings.all` | 不要求 comparison，不改变 profile 或 baseline plan |
| `changed` | `warnings.changed` | full profile 与有效 comparison evidence |
| `regressions` | `warnings.regressions` | full profile 与有效 comparison evidence |

CLI 负责把 flags 归一化为 scan plan；core evaluator 只消费 normalized request、final
overall completeness、final comparison status 和 final warning channels。Evaluation 使用
固定优先级：

1. 省略 request 产生 `{ policy: null, status: "disabled" }`，其它 evidence 不改变 disabled
   state。
2. Requested gate 遇到 `failed` completeness，产生 `not-evaluated` /
   `scan-incomplete`。
3. Requested gate 遇到 `empty` completeness，产生 `not-evaluated` /
   `no-eligible-input`。
4. `changed` / `regressions` 遇到 `baseline-unavailable`，产生 `not-evaluated` /
   `comparison-unavailable`；`input-unchanged` 是有效 comparison evidence。
5. 其余 request 只评价 descriptor 指定的一个 final channel。

Gate evaluation 发生在 accepted warning reasons 已应用之后。Selected channel 中全部
records 都计入 `evaluatedWarningCount`；带非空 `acceptedReason` 的 record 保留原
identity、ordering 和 channel membership，但不进入 blocking set。其余 records 按原顺序
进入 `blockingWarnings`。Blocking set 为空产生 `passed`，非空产生 `failed`；evaluator
不得修改 warning records、profile capability results 或 `passed` / `warning` quality
status。

`QualityMetrics.gate` 始终存在，并按 status 使用以下 closed shape：

- `disabled`：只包含 `policy: null` 与 `status`。
- `passed` / `failed`：包含 closed policy、descriptor-selected `evaluatedChannel`、
  `evaluatedWarningCount`、`blockingWarningCount` 和 `blockingWarnings`。
- `not-evaluated`：只包含 closed policy、`status` 与
  `scan-incomplete` / `no-eligible-input` / `comparison-unavailable` reason code。

Runtime validation 拒绝 unknown enum、status 不拥有的 extra/missing field、负数或非整数
count、count/list mismatch、policy/channel mismatch，以及 blocking count 与
`passed` / `failed` 不一致。Output 只投影这个 validated result，不重新选择 channel、
过滤 accepted warnings 或重算 blocking records。

## Baseline and profiles

Quick profile 继续跳过 baseline comparison 和 jscpd。Full profile 运行全部 configured
scanners。普通 scan 的 baseline comparison 继续由显式 baseline option 选择；
`changed` / `regressions` gate 的 auto-detection 由 CLI scan plan 启用。Baseline
unavailable、input unchanged 和 compared 状态，以及 current/baseline cache identity，
都保持 current product behavior。

显式 changed-files input 与自动 changed scope 只影响 existing changed/regression context，
不改变 full metrics inventory。

`ScanCompleteness` 只归约 current measurement 的 final capability results。Baseline
failure、comparison 与 cache 由 profile 和 baseline contract 决定，不参与 completeness
归约。Baseline owner 读取 failed current capability 的 diagnostic kind：
`execution` / `invalid-result` 跳过 baseline，`unavailable` 不单独阻止 baseline 流程。

## Status and failure

Current overall completeness 先于质量评价决定 core outcome：

- `complete`：normalized quality warnings 为空时返回 `passed`，非空时返回 `warning`。
- `empty`：固定返回 `warning`，不生成虚构 quality finding；human output 明确没有
  eligible measurement input、质量未评价。省略 gate 时保持非阻断；requested gate 为
  `not-evaluated`。
- `failed`：返回 `failed`；其它 succeeded capability 的 metrics 或 warnings 只能用于诊断，
  不能形成可信的 `passed` / `warning` 质量结论。

Current scanner failure 只由 failed `CapabilityResult` 表达。Metrics validation 或其它
无法归属 current capability 的顶层失败继续使用 `FatalIssue`，同样返回 `failed`。
Gate result 不替代 quality status：evaluated failed gate 可以与 quality `warning` 同时存在。
Artifacts 写出并通过 output validation 后，disabled/passed gate 对应 `success` process
outcome，evaluated failed gate 对应 `gate-failed`；not-evaluated、completeness、runtime 或
output failure 对应 `failed`。Exit mapping 由 CLI owner 定义。

Verification output 对带 accepted reason 的 warnings 使用既有 preview 过滤语义，但不选择
policy、不改变 gate evaluation，也不能把 `empty` 变成 `passed`。未处理顶层 error 不产生
core outcome，由 CLI 保持既有 error mapping。

无发现、没有 eligible input、profile skip、component unavailable、execution failure 和
invalid normalized result 必须保持不同的 observable context。

## Verification

当前产品证明资产来自 `src/product/**` 下的 TypeScript tests 与 fixtures，不使用已删除的
Rust tests / fixtures 补建 coverage。现有证明资产包括：

- scanner parser 与 wrapper tests：scc CSV、Lizard CSV、jscpd version/report，以及
  unavailable / execution / report / parse failures。
- scan completeness model tests：stable capability IDs 和不含 capability-specific 分支的
  shared reducer。
- current measurement tests：successful zero result、unavailable、execution 和
  invalid-result failure projection，以及 eligibility 后的 component resolution。
- jscpd area task tests：per-area planning、稳定 task/file ordering、current failure
  collection 和 baseline throw behavior。
- cache、fingerprint、Git pathspec 与 explicit changed-files tests。
- warning generator tests：file、function、duplicate、accepted warning 与 channel semantics。
- gate model/evaluator tests：descriptor-derived policy、discriminated validation、
  prerequisite priority、channel selection、accepted warning 与 blocking ordering。
- process/output tests：GateResult、artifact validation priority、console/report projection 和
  warning-stream preservation。
- Markdown report tests：ranking、changed-file summary、accepted reason、scanner metrics 和
  requested-gate section。
- 正式入口 tests：complete、legitimate empty 与 required component unavailable 在
  metrics、report、console、core outcome 和 CLI exit 上使用同一 completeness source；
  gate acceptance matrix 复用 controlled external project 证明 omitted、evaluated 与
  not-evaluated process outcomes。

日常交付按改动面运行 product import boundary、typecheck、lint、tests 和 dogfood
verification。初次产品化已用同一隔离 Git project 对照迁移前 consumer 与当前产品入口的
quick、full、baseline 和显式 changed-files outputs；该 parity 是一次性迁移证据，不是每次
质量变更的固定 gate。
