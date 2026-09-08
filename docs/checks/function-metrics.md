# `functionMetrics`

## 用途

`functionMetrics` 是普通 Check，评估每个函数的 NLOC、cyclomatic complexity（CCN）、最大 nesting depth 与 parameter count。
它使用随包 TypeScript analyzer 分析所选的受支持源文件。

## 最小用法

示例保留终端进度，关闭 machine publication，不写入 machine files。

```ts
import { defineConfig, functionMetrics, run } from "@zxyycom/vibe-check";

const check = functionMetrics();
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`Function metrics did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

本例采用严格的单项 CI policy：`RunResult.kind` 不是 `completed`，或该 Check 不是 `passed`，都映射为非零退出码。若项目接受
`not-applicable`、需要只聚合某些 Check，或需要其它 `unavailable` 语义，调用方应显式配置并读取
[`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)，而不是只等待 `run(...)` 返回。

## 参数与默认配置

`FunctionMetricsOptions` 接受 `codeAreas`、`findingPolicy` 与 `findingWaivers`；未知字段使 constructor 同步抛出 `TypeError`。

无参调用建立冻结的 `project` area：其 `files` 继承 `defaultProjectFileSelection` 的 source/exclude，include 由
内置 analyzer 支持的大小写不敏感 source-file suffix 生成；finding policy 为 `non-blocking`，无 waiver。每个 area 可声明自己的 `files`、
`limits` 与 finding policy；显式数组完整替换默认 include/exclude。

| 默认函数指标策略 | 值 |
| --- | --- |
| 普通 NLOC maximum | `60` |
| 低复杂度 NLOC allowance | CCN `< 6` 时 `180` |
| CCN maximum | `12` |
| 最大 nesting depth | `7` |
| parameter maximum | `6` |

每次 analysis 还受独立的输入资源上限约束：单个 source file 最大 `8 MiB`，本次 invocation 的 accepted
source aggregate 最大 `64 MiB`。这两个上限不改变上述 metric limits；超限结算为
`unavailable / resource-limit-exceeded`，不会发布 partial analysis。

### 区域与 finding policy

每个非空 area ID 必须声明 `files`，其共同 selector grammar、source failure 与数组替换见
[共享的 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)，其余字段可继承默认值。一个路径可匹配多个 area；Check 对同一函数 metric
采用所有 matching areas 中最严格的有效 limit，任一 matching area 为 `blocking` 时该 finding 就是 blocking。
所有 selected path 先按每个 area 的 source/include/exclude 收集，再稳定去重；area 重叠不会重复分析或重复发布同一
metric finding。

```ts
import { functionMetrics } from "@zxyycom/vibe-check";

const metrics = functionMetrics({
  findingPolicy: "non-blocking",
  codeAreas: {
    source: {
      files: { include: ["src/**/*.ts"] },
      findingPolicy: "blocking",
      limits: {
        cyclomaticComplexity: { maximum: 10 },
        nestingDepth: { maximum: 6 },
        parameters: { maximum: 5 }
      }
    }
  }
});
```

### 精确豁免一个函数指标

`findingWaivers` 只匹配 normal metric findings，不匹配 input rejection。共同 authoring、matching 与 audit 见
[对账 Finding waiver](../guides/finding-waivers.md)；本 Check 的 identity 是 `functionName`、`metric`、`path` 与
`startLine`，其中 path 是 normalized project-root-relative slash path，`startLine` 是正安全整数。恰好匹配的 waiver
保留原 finding Record、附上 reason 并不再 blocking；本 Check 仍为未匹配或过宽 authoring 发布 audit，且不应用 waiver。

```ts
const metrics = functionMetrics({
  findingWaivers: [
    {
      identity: {
        functionName: "legacyParser",
        metric: "cyclomatic-complexity",
        path: "src/legacy/parser.ts",
        startLine: 24
      },
      reason: "在重构窗口结束前保留该函数。"
    }
  ]
});
```

## 工作原理

Check 先用 `codeAreas[id].files` 形成 selected paths，再用同一内置 reader registry 分为 accepted 与 rejected。
后缀比较大小写不敏感；Markdown、JSON、YAML、extensionless 或其它不支持路径不会进入 analyzer，每个 rejected
selected path 发布一条 non-blocking `input-rejected / unsupported-file-type` Record。selected union 为空时是
`not-applicable / no-eligible-input`；全部 rejected 则以完整 rejection evidence 正常结算，而不是不可用。

accepted paths 经有界读取后，以完整 source batch 交给内置 analyzer；分析只使用本次 exact inputs，不重新发现文件。取消会停止分析；无法形成完整可信结果时结算为 `analysis-failed`，不发布 partial final data。

## 效果与结果

可信 analysis 后，Check 为超过 NLOC、CCN、最大 nesting depth 或 parameter limit 的函数形成 finding；每个 Record 保留函数名、
metric、value、effective limit、path、start line 和全部 matching area IDs。CCN Record 另外保留完整、source-order 的
`complexityContributors`（每项是 `{ token, line }`）；它解释哪些固定 reader condition token 在哪一行贡献了该 CCN，
但不会自行形成 Finding、limit 或 waiver identity。其它 metric Record 不带该字段。CCN detail message 最多显示前八项
contributor，余数仍在同一 Finding Record 中。finding policy 决定 metric finding 是否使 Check `failed`；non-blocking finding
仍保留 final data 和 Records。metric finding 与 input rejection 的 detail fields、terminal Finding 呈现和 Run progress
预览边界见 [呈现 Check Finding](../guides/presenting-findings.md)；input rejection 始终 non-blocking。

最大 nesting depth 是独立的 `nesting-depth` Finding metric，其每个 area 的 `limits.nestingDepth.maximum` 必须是正安全整数；
路径匹配多个 area 时取最严格 maximum，并沿用既有 blocking 与 waiver 规则。它计算控制结构 nesting，也把 ternary `?`、条件中的第一个 `&&` 或 `||` 纳入深度；同一 condition 后续 logical operator 不再额外增加深度，`else if` 不增加一层。
该定义适用于内置 reader registry 支持的输入，不是“纯大括号深度”的替代名称。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseFunctionMetricsData(value)` 验证 final data。
公开类型包括 `FunctionMetricsOptions`、`ResolvedFunctionMetricsOptions`、`FunctionMetricsFindingIdentity`、
`FunctionMetricsFindingMetric`、`FunctionMetricsFindingWaiver`、`FunctionMetricsRecordData` 与
`FunctionMetricsUnavailableReasonCode`。

## `not-applicable` 与 `unavailable`

`not-applicable / no-eligible-input` 只表示所有 area 的 selected path 去重并集为空。下面的条件在完整 metric
finding 集合形成前结算为 `unavailable`：

| reason code | 含义与恢复操作 |
| --- | --- |
| `invalid-options` | 完整 resolved options 被普通 object composition 破坏；重新通过 `functionMetrics(options)` 构造 Check。 |
| `source-unavailable` | filesystem 或 git-worktree 无法形成候选快照；检查 project root、权限和 selected file source。 |
| `cancelled` | invocation signal 在可观察工作边界取消；检查调用方取消原因，必要时重试。 |
| `resource-limit-exceeded` | 单文件超过 `8 MiB` 或 accepted aggregate 超过 `64 MiB`；缩小 selection 或减小 source input。 |
| `analysis-failed` | 内置 analyzer 无法形成完整可信结果；检查选中的 source 并在修正后重试。 |

`unavailable` 不表示 clean scan，也不会伪造 applied/unused/overmatched waiver audit。

## I/O 与安全边界

Check 只读取其 `codeAreas[id].files` 选出的 project-local exact inputs，并将 accepted paths 交给内置 analyzer。
分析在本地完成，不执行外部 command、不发起网络请求，也不修改 source files。
source collection 和 content read 失败、resource limit 或无法形成完整可信 analysis 都以本页列出的 `unavailable` reason
结算，而不是静默跳过或发布 partial data。

## 适用边界

该 Check 只评估函数级 NLOC、CCN、最大 nesting depth 与 parameter policy。文件级 code-line policy 由
[`fileMetrics`](file-metrics.md)评估，重复片段由
[`duplicateDetection`](duplicate-detection.md)报告；`functionMetrics` 不格式化、拆分或修改 source files。
