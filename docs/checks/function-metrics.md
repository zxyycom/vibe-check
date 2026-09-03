# `functionMetrics`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

`functionMetrics` 是 ordinary Check，评估每个函数的 NLOC、cyclomatic complexity（CCN）与 parameter count。
它在 Product 内使用内置 TypeScript analyzer；不调用 Lizard、不会解析 `PATH`、不接受 executable，也不发起网络请求。
reader registry 固定支持 27 个 readers 和 55 个大小写不敏感 suffix，行为以已检入的 Lizard 1.24.0 翻译基线校准；这项 provenance 不构成
运行时依赖。source-aligned port 的唯一目录外生产入口是 Check-private `analyzer/port-facade.ts`，仅由
`analyzer-adapter.ts` 消费；adapter、Worker 与 port 都不是 public API 或 package subpath。
当前 oracle、malformed、reader mapping、identity 和 deviation evidence 位于
`src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/`，而
`licenses/lizard-1.24.0-provenance.json` 是唯一 source/range、hash、SPDX 与 translated-target mapping。
identity test 从 root mapping fail-closed 地验证 44 个 translated source/range、39 个 translated targets、81 个 classes 与 796 个
symbol/host-seam mappings；evidence 不参与 Product runtime 或 package payload。上游更新只可通过显式
`bun run maintenance:lizard-upstream` advisory 查询，不进入默认 Project Gate；采用新 revision 或改变 translated
source boundary 时，必须先更新根 provenance，再同步 current evidence 与 source-alignment review，不能把 archive、
临时 clone 或网络请求作为运行时输入。

## 参数与默认配置

`FunctionMetricsOptions` 只接受 `codeAreas`、`findingPolicy` 与 `findingWaivers`。`scanner`、`executable`、
command 或环境变量不是公开 API；传入未知字段会让 constructor 同步抛出 `TypeError`。

无参调用建立冻结的 `project` area：其 `files` 继承 `defaultProjectFileSelection` 的 source/exclude，include 由
55 个内置 reader suffix 生成；finding policy 为 `non-blocking`，无 waiver。每个 area 可声明自己的 `files`、
`limits` 与 finding policy；显式数组完整替换默认 include/exclude。

| 默认函数指标策略 | 值 |
| --- | --- |
| 普通 NLOC maximum | `60` |
| 低复杂度 NLOC allowance | CCN `< 6` 时 `180` |
| CCN maximum | `12` |
| parameter maximum | `6` |

每次 analysis 还受独立的输入资源上限约束：单个 source file 最大 `8 MiB`，本次 invocation 的 accepted
source aggregate 最大 `64 MiB`。这两个上限不改变上述 metric limits；超限结算为
`unavailable / resource-limit-exceeded`，不会发布 partial analysis。

### 区域与 finding policy

每个非空 area ID 必须声明 `files`，其余字段可继承默认值。一个路径可匹配多个 area；Check 对同一函数 metric
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
        parameters: { maximum: 5 }
      }
    }
  }
});
```

### 精确豁免一个函数指标

`findingWaivers` 只匹配 normal metric findings，不匹配 input rejection。identity 是
`functionName`、`metric`、`path` 与 `startLine`：path 是 normalized project-root-relative slash path，
`startLine` 是正安全整数。匹配零条为 `unused`，匹配一条为 `applied`，同一 identity 匹配多条为
`overmatched`；后两种 authoring audit 都不会静默删除原始 finding。

```ts
const metrics = functionMetrics({
  findingWaivers: [
    {
      functionName: "legacyParser",
      metric: "cyclomatic-complexity",
      path: "src/legacy/parser.ts",
      startLine: 24
    }
  ]
});
```

## 工作原理

Check 先用 `codeAreas[id].files` 形成 selected paths，再用同一内置 reader registry 分为 accepted 与 rejected。
后缀比较大小写不敏感；Markdown、JSON、YAML、extensionless 或其它不支持路径不会进入 analyzer，每个 rejected
selected path 发布一条 non-blocking `input-rejected / unsupported-file-type` Record。selected union 为空时是
`not-applicable / no-eligible-input`；全部 rejected 则以完整 rejection evidence 正常结算，而不是不可用。

accepted paths 被一次性交给内置 analyzer，且只能是这次 invocation 的 exact input。analyzer 不重新发现项目文件，
不执行外部 command；任何无法形成完整可信 analysis 的情况都不会发布 trusted prefix 或 partial final data。

## 效果与结果

可信 analysis 后，Check 为超过 NLOC、CCN 或 parameter limit 的函数形成 finding；每个 Record 保留函数名、
metric、value、effective limit、path、start line 和全部 matching area IDs。finding policy 决定 metric finding
是否使 Check `failed`；non-blocking finding 仍保留 final data、Records 与安全摘要。input rejection 始终 non-blocking。

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
它不执行 child process、不读取 scanner command 或 ambient environment override、不发起网络 request，也不会修改 source files。
source collection 和 content read 失败、resource limit 或无法形成完整可信 analysis 都以本页列出的 `unavailable` reason
结算，而不是静默跳过或发布 partial data。

## 最小用法

```ts
import { defineConfig, functionMetrics, run } from "@zxyycom/vibe-check";

const result = await run(defineConfig({ checks: [functionMetrics()] }));
```

## 适用边界

该 Check 只评估函数级 NLOC、CCN 与 parameter policy。文件级 code-line policy 由
[`fileMetrics`](file-metrics.md)评估，重复片段由
[`duplicateDetection`](duplicate-detection.md)报告；`functionMetrics` 不格式化、拆分或修改 source files。
