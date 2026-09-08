# `functionMetrics`

## 用途

`functionMetrics` 是普通 Check，评估每个函数的 NLOC、cyclomatic complexity（CCN）、最大 nesting depth 与 parameter count。
它使用随包 TypeScript analyzer 分析所选的受支持源文件。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, functionMetrics, run } from "@zxyycom/vibe-check";

const check = functionMetrics({ findingPolicy: "blocking" });
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

示例显式使用 `findingPolicy: "blocking"`，让未豁免的普通 Finding 导致失败；默认 `non-blocking` 只警告，不因 Finding 退出非零。

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。若需接受 `not-applicable` 或聚合多个 Check，
显式配置并读取 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)；`run(...)` 返回本身不表示通过。

## 参数与默认配置

`FunctionMetricsOptions` 接受 `codeAreas`、`findingPolicy` 与 `findingWaivers`；未知字段使 constructor 同步抛出 `TypeError`。

无参调用建立冻结的 `project` area：`files` 使用 `defaultProjectFileSelection` 的 source/exclude，include 由内置 analyzer
支持的大小写不敏感 suffix 生成；finding policy 为 `non-blocking`，无 waiver。

| `limits` 字段 | 默认值 |
| --- | --- |
| `codeLines.maximum` | `60` |
| `codeLines.lowComplexityAllowance` | `{ cyclomaticComplexityBelow: 6, maximum: 180 }`，CCN 严格低于阈值时使用 |
| `cyclomaticComplexity.maximum` | `12` |
| `nestingDepth.maximum` | `7` |
| `parameters.maximum` | `6` |

嵌套字段可分别省略；所有 limit 值必须是正安全整数，allowance maximum 不得小于普通 NLOC maximum。
指标严格超过有效上限才形成 Finding。nesting depth 计算控制结构、ternary `?`、每个 condition 的首个 `&&` 或 `||`；
后续 logical operator 和 `else if` 不额外增深，因此不是纯大括号深度。

每次 analysis 还受独立的输入资源上限约束：单个 source file 最大 `8 MiB`，本次 invocation 的 accepted
source aggregate 最大 `64 MiB`。这两个上限不改变上述 metric limits；超限结算为
`unavailable / resource-limit-exceeded`，不会发布 partial analysis。

### 区域与 finding policy

显式 area map 非空，每个非空 ID 必须声明 `files`；其 grammar、source failure 与数组替换见
[共享的 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)。area policy 省略时继承顶层值。
路径按 source/include/exclude 收集后稳定去重，不重复分析或发布同一 metric Finding；重叠区域取最严格有效 limit，
任一 matching area 为 `blocking` 时 Finding 就是 blocking。

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

Check 用内置 reader registry 将 selected paths 分为 accepted/rejected；suffix 大小写不敏感。
Markdown、JSON、YAML、无扩展名等不支持路径不进入 analyzer，每项先发布 non-blocking input-rejected Record。
accepted paths 经有界读取后整批分析，只使用本次 exact inputs，不重新发现文件；取消会停止分析。
空 selection、全 rejected 与分析失败的区别见[不可用原因](#not-applicable-与-unavailable)。

## 效果与结果

正常 final data 恰为 `{ findingCount, blockingFindingCount }`：前者包括全部 metric Finding 与 input rejection，
不含 waiver audit；后者只计仍 actionable 的 blocking Finding。后者大于零为 `failed`，否则为 `passed`。

metric Record 保留 `blocking`、`functionName`、`metric`、`value`、`limit`、`path`、`startLine` 与全部 matching `codeAreas`。
metric 是 `function-code-density`、`cyclomatic-complexity`、`nesting-depth` 或 `parameter-count`。
只有 CCN Record 另带完整 source-order `complexityContributors: Array<{ token, line }>`，说明各 reader condition token 的贡献；
它不独立形成 Finding、limit 或 waiver identity。CCN detail message 最多展示八项，余数仍在 Record 中。

input-rejected Record 的 ID 为 `/input-rejected/<path>`，data 包含 `blocking: false`、`kind: "input-rejected"`、
`path`、全部 `codeAreas` 与 `reason: "unsupported-file-type"`。metric details 后展示 rejection details，并附 `input-rejected` 数量 warning；
终端呈现和 progress 预览边界见[呈现 Check Finding](../guides/presenting-findings.md)。

Applied waiver 为原 Record 加 `waiver.reason`、将 `blocking` 设为 `false`，并附 `finding-waived` info。
Unused/overmatched authoring 不应用 waiver，另发 `kind: "finding-waiver-audit"` Record，包含 identity、reason、matchCount、status，
ID 为 `/finding-waiver-audit/sha256:<canonical-identity-digest>`，并附 warning。

用返回 Check 的 `check.parseData(value)` 或 `parseFunctionMetricsData(value)` 验证 passed/failed 的 final data，返回
`FunctionMetricsFinalData`；字段或计数不变量不匹配时抛出 `TypeError`。
公开类型包括 `FunctionMetricsOptions`、`ResolvedFunctionMetricsOptions`、`FunctionMetricsFindingIdentity`、
`FunctionMetricsFindingMetric`、`FunctionMetricsFindingWaiver`、`FunctionMetricsRecordData` 与
`FunctionMetricsUnavailableReasonCode`。

## `not-applicable` 与 `unavailable`

selected union 为空时为 `not-applicable / no-eligible-input`；非空但全 rejected 时为带 Records、warning 与 final data 的 `passed`。
两种情况下 configured waiver 均产生 unused audit。以下条件在完整 metric Finding 集合形成前结算为 `unavailable`：

| reason code | 含义与恢复操作 |
| --- | --- |
| `invalid-options` | 完整 resolved options 被普通 object composition 破坏；重新通过 `functionMetrics(options)` 构造 Check。 |
| `source-unavailable` | 无法形成 filesystem/git-worktree 候选快照或安全读取 source；检查 project root、权限和 selected files。 |
| `cancelled` | invocation signal 在可观察工作边界取消；检查调用方取消原因，必要时重试。 |
| `resource-limit-exceeded` | 单文件超过 `8 MiB` 或 accepted aggregate 超过 `64 MiB`；缩小 selection 或减小 source input。 |
| `analysis-failed` | 内置 analyzer 无法形成完整可信结果；检查选中的 source 并在修正后重试。 |

`unavailable` 带对应 `reason.code` 的 error message，无 final data，不伪造 waiver audit；已发布的 input-rejected Records 与 warning 保留。

## I/O 与安全边界

Check 只读取其 `codeAreas[id].files` 选出的 project-local exact inputs，并将 accepted paths 交给内置 analyzer。
分析在本地完成，不执行外部 command、不发起网络请求，也不修改 source files。

## 适用边界

文件级 code-line policy 由 [`fileMetrics`](file-metrics.md) 评估，重复片段由 [`duplicateDetection`](duplicate-detection.md) 报告。
