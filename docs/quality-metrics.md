# Quality Metrics

本文拥有通用 Check、supplemental Record 与 explicit Check aggregation 的事实语义。每项随包 Check 的领域 options、
outcome、final data、Record、message 与不可用原因由对应[随包 Check 指南](navigation.md#随包-check-指南)拥有。Definition authoring、typed
direct dependency readback 见 [Configuration](configuration.md)；machine DTO/bytes 见 [Output](output.md)；repository Gate
adapter 见 [脚本工具](script-tooling.md#project-gate)。本文不拥有 scanner commands、machine serialization、argv parsing、
generic scheduler 或 human presentation grammar。

## Check and Record facts

`src/project-definition/**` validates and flattens recursive Check tree；`src/check-settlement/**` 为每个 executable Check 保存一个 terminal
fact：

| `outcome.status` | 含义                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `passed`         | Check 完成自己的质量结论，并带 canonical final `data`。             |
| `failed`         | Check 完成自己的质量结论，并带 canonical final `data`。             |
| `not-applicable` | Check 有意没有 work；reason code 可省略，且不伪造 final data。      |
| `unavailable`    | Product 无法给出正常结论；必须有 `reason.code`，且没有 final data。 |

四种 outcome 都是 direct `observes` 的 terminal ordering facts；observer 在所有 direct observation 已结算后才可 admission。
direct `dependsOn` 是更强的 passed prerequisite：任一 provider 为 `failed`、`not-applicable` 或 `unavailable` 时，Product 在 dependent
preflight/execution 前将其结算为 `unavailable / dependency-not-passed`，带 direct non-passed `checkIds` 和 null duration。需要 upstream
data 的 callback 使用 Configuration 的 `dependencies.get` contract；`passed`/`failed` 有 canonical final data，`not-applicable`/`unavailable`
没有。Product 不伪造 provider final data，也不把 observer 的 terminal outcome 变成 prerequisite。

callback 通过 Check-owned reporter 报告零个或多个 supplemental facts：

```ts
records.report({ id: "sample:health" }, { latencyMs: 820, statusCode: 503 });
```

`id` 仅在 owning Check 内非空且唯一；Check-facts identity 是 `{ checkId, id }`，不同 Check 可复用同一 local ID。
final data 与 Record data 共用 descriptor-based canonical JSON boundary：root 必须是 non-array object，Product
拒绝 unsupported descriptors/prototypes、cycles、sparse arrays 与 non-finite numbers，不调用 getter 或 `toJSON`。
Check-facts snapshot 的 data 是 detached、null-prototype、deep-frozen facts；其 JavaScript own-key enumeration 不构成
canonical text or fingerprint order。

Record 的存在、数量和 data 不决定 Check status。invalid final data、invalid/duplicate Record、callback throw 或
Product protocol failure 只使 owning Check unavailable；已接受的 Records 保留，无关 Check 继续。callback settlement
后 reporter closed，late write 会抛错，不能修改 frozen facts。terminal messages 不属于 Check outcome 或 Record/Check-facts
facts。

`src/project-run/**` 的 completed/output results 提供 canonical Check/Record readback；final-snapshot result 另提供已经
接受的 terminal-message readback。自定义 Check 的 business parser、field schema 与 sensitive-content policy 属于
consumer/provider，不由 Product registry、catalog、extractor 或 presentation fallback 提供。package-provided Check 是
provider 自己拥有该责任的具体实例：八项都附带并从 package root 导出自己的 final-data parser，但仍不形成 generic
registry 或 machine artifact reader。

## Package-provided ordinary Checks and exact inputs

本节只拥有随包 Check 共同服从的 Check/Record 事实边界；具体字段、默认值、Finding identity、状态映射、message、
不可用原因和安全限制由各 Check 指南拥有。Definition、Run、Check facts、aggregation 与 machine publication 不识别这些
Check ID 或 options shape。

共同事实如下：

1. 每项随包能力仍是 ordinary Check，使用本页定义的四状态结果与 Check-local Records；adapter、parser、cache、I/O 或
   exact-input failure 只结算 owning Check，不建立第二套 quality model。
2. `failed`、`unavailable` 与带 non-blocking Finding 的 `passed` 由 owning Check 附带可操作 message；零问题
   `passed` 与 `not-applicable` 不合成人为提示。message 不改变 final data、Records 或 status。
3. `duplicate-detection`、`file-metrics` 与 `function-metrics` 的正常 final data 都使用
   `{ findingCount, blockingFindingCount }`；每条可信 Finding 保留为带显式 blocking 状态的 Check-local Record，任一
   effective blocking Finding 使 owning Check failed。各 Check 的 area overlap、threshold、waiver 与 Record 字段仍由其
   指南分别定义。
4. package Check 的 Finding 摘要是 Check-owned presentation，不是通用 Record 投影。Producing Check 决定安全字段、显示
   上限和完整明细入口；通用 `presentCheckFindings(...)` 只执行调用方给出的 presentation hooks，见
   [Finding presentation](api-mechanics.md#finding-presentation)。
5. 读取文件的 Check 从自己的 options 形成 selected/exact input；文件分类与完整性见
   [Project files and Check exact inputs](scan-scope.md)，外部工具边界见
   [Check-owned scanner dependencies](scanner-dependencies.md)。

按能力读取完整事实契约时，从[随包 Check 指南](navigation.md#随包-check-指南)选择唯一 owner，不从本节推断
Check-specific 字段或状态。

## Explicit aggregation and repository Gate mapping

multi-Check aggregation 是一次 invocation 的 derived result，不是 Check-facts status、evidence container 或隐式 quality policy。
调用方通过 `RunControls.checkAggregation` 显式选择 `checks: "all"`、Check-ID list 或 `checks: "effective"`，再选择
`all | any` mode，以及 unavailable、not-applicable 和 empty-set handling；selection 在 work 前验证。`"effective"` 只读取同一次 private
flag-and-`dependsOn` selection，包含 dependency-activated prerequisite；它不是默认值、public Check-ID list 或第二套 resolver。
未配置时 `RunResultFacts.aggregate` 为 `null`。

aggregation 只读取 selected settled Check statuses 并返回 `passed | failed | not-applicable | unavailable`。它不复制或解释
final data、Records、messages、definition warnings、output statuses 或 progress presentation；这些原始 facts 不因 aggregate
存在而隐藏或改写。

repository Gate 负责在自己的 Project Definition/Run adapter 中绑定 flags 和显式 `checks: "effective"` aggregation，并从最终
`RunResult.aggregate` 映射 process result。Product 因而从同一次私有选择获得已选 `dependsOn` prerequisite 与 aggregate membership；Gate
只保留 `observes` 的本地 selection-closure 校验。Gate 不得遍历 snapshot Checks、Findings 或 Records 重建 aggregate，也不得改写
Product Check outcomes。当前 required/preset/all selection、`afterGate` hook、transcript 与 exit mapping 只见
[脚本工具的 Project Gate](script-tooling.md#project-gate)。

## Verification

current evidence 覆盖 recursive Definition validation、direct callback four-state outcomes、canonical final/Record data、
Check-facts ownership/terminal closure、prerequisites/cancellation、explicit aggregation、Check-owned scanner exact inputs/cache 和
Gate exit mapping。machine schema/example/publication evidence 见 [Output](output.md)；Case catalog 与验证入口见
[Testing](testing.md)。
