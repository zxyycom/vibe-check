# `functionMetrics`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

`functionMetrics(options?)` 构造一个普通 Check。它使用 Lizard 测量函数 NLOC、cyclomatic complexity 与参数数量，
把超过 area limits 的结果保存为 supplemental Records，并让全局默认与 area override 共同决定 finding 是否阻断
Check。阻断只改变最终 outcome；一次 invocation 仍扫描完整 exact scope 并保留后续 findings。

```ts
import { functionMetrics } from "@zxyycom/vibe-check";

const check = functionMetrics();
```

执行这个 Check 时，project runtime 需要让默认 `lizard` command 可用，或在 `scanner.executable` 中选择项目已授权且
兼容 Lizard canonical `1.23.<patch>` version output（每段为 `0` 或无 leading zero 的十进制整数）与 CSV contract 的 executable。

## 参数与默认配置

顶层 `findingPolicy`、`codeAreas` 与 `scanner` 都可省略；显式 `codeAreas[areaId]` 只要求提供 `files` branch。
`functionMetrics()` 按下表物化完整、冻结的 resolved options，调用方无需复制默认数组：

| Resolved field | 无参默认值 |
| --- | --- |
| `codeAreas.project.files.source` | `"filesystem"` |
| `codeAreas.project.files.include` | 从同一 Check-local Lizard 1.23.0 extension registry 生成；每个官方支持 extension 对应一个大小写不敏感 glob |
| `codeAreas.project.files.exclude` | detached copy of `defaultProjectFileSelection.exclude` |
| `codeAreas.project.findingPolicy` | `"non-blocking"` |
| `codeAreas.project.limits.codeLines` | `{ maximum: 60, lowComplexityAllowance: { maximum: 180, cyclomaticComplexityBelow: 6 } }` |
| `codeAreas.project.limits.cyclomaticComplexity` | `{ maximum: 12 }` |
| `codeAreas.project.limits.parameters` | `{ maximum: 6 }` |
| `scanner` | `{ executable: "lizard" }` |

需要核对当前完整 glob array 时，读取 `functionMetrics().options.codeAreas.project.files.include`；它与 runtime eligibility
predicate 来自同一 extension registry。source/exclude 沿用公开深冻结基线，include 精准匹配 Lizard 能力。

顶层 `findingPolicy` 只为各 area 提供默认值；每个 resolved area 保存自己的有效 `findingPolicy`。所有 maximum 都是
包含等于值的上限：measurement 必须严格大于 limit 才产生 finding。complexity 小于
`cyclomaticComplexityBelow` 时，function NLOC 使用 allowance maximum；所有 limit 都必须是正安全整数，allowance
maximum 不得小于普通 code-line maximum。

constructor 按字段补默认值。`source` 只能是 `"filesystem" | "git-worktree"`，默认 `filesystem`；filesystem 不解释
`.gitignore`，git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。来源不可用时 Check 结算为
`unavailable`，不会切换到另一来源。`include` 与 `exclude` 都按 project-root-relative slash path 的 glob 匹配，exclude
优先。省略 source/exclude 时沿用公开 baseline，省略 include 时使用上述 Lizard-specific globs；显式数组完整替换对应
默认值，`include: []` 不选择路径，`exclude: []` 不排除路径。显式组合完整 `defaultProjectFileSelection` 会明确选择
`**/*`，不受支持的路径因而形成 input-rejection Records。nested limit 字段和 area `findingPolicy` 仍可分别省略并继承
各自默认值。

### 区域与阻断政策

顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，省略时为 `"non-blocking"`。显式 `codeAreas` 必须非空，
每个非空 area ID 必须声明 `files: {}`；file fields、limits 和 area `findingPolicy` 都可省略并由 constructor 补齐。

```ts
import { defaultProjectFileSelection, functionMetrics } from "@zxyycom/vibe-check";

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
    },
    tooling: {
      files: {
        ...defaultProjectFileSelection,
        include: ["scripts/**/*.ts"],
        exclude: [...defaultProjectFileSelection.exclude, "scripts/**/*.test.ts"]
      }
    }
  }
});
```

本例中 source finding 会阻断，tooling finding 只形成 evidence。Check 不会在首个 blocking finding 后停止；它仍处理
其它函数与 area，然后以完整计数结算。

同一路径匹配多个 area 时，area authoring order 不参与结算：

1. Record 的 `codeAreas` 保存该路径匹配的全部 area IDs，并按文本稳定排序。
2. 每项 metric 分别计算所有 matching areas 的适用 maximum，并以其中最小值作为 effective limit。
3. 任一 matching area 的 effective `findingPolicy` 为 `"blocking"` 时，该路径上的 finding 就是 blocking；这一判断不取决于
   哪个 area 提供了最小 limit。

## 定制 Lizard executable

public scanner policy 只选择直接接受 Lizard arguments 的 executable：

```ts
const metrics = functionMetrics({
  scanner: { executable: "/opt/tools/lizard" }
});
```

owning adapter 固定执行 `--version` probe，并以 approved exact paths 和 `--csv` 扫描。probe 的 trim 后完整 output 必须为 canonical `1.23.<patch>`：三个段各为 `0` 或不以 `0` 开头的十进制整数；`1.23.0` 与 `1.23.1` 可用，`1.23.00`、`lizard 1.23.0` 与其它 series 不可用。显式 executable 表示项目授权执行该命令；需要 wrapper 时由项目提供直接接受这套协议的 executable wrapper。若项目要求精确 `1.23.0`，wrapper 在其 `--version` path 拒绝其它 patch，并将 scan 调用原样交给 Lizard。不兼容命令会 fail closed 为 unavailable，而不会产生成功空结果。

### 安装兼容 Lizard

项目可以用自己的工具管理方式提供 `lizard`。本仓库验证的项目拥有安装方式是在 `mise.toml` 固定 uv 与 Lizard：

```toml
[tools]
uv = "0.11.28"
"pipx:lizard" = { version = "1.23.0", depends = ["uv"] }
```

运行 `mise install` 后，用 `lizard --version` 确认当前 project runtime 能解析到该命令。若项目使用其它安装方式，只要
`scanner.executable` 指向已授权、直接接受上述协议并产生 canonical `1.23.<patch>` output 的 executable 即可。

## 工作原理

1. constructor 关闭 input shape，补齐 files、limits、finding policy 与 scanner defaults，再冻结 resolved options。
2. execution 按文件来源分组，每种不同来源只枚举一次候选文件，再按各 area 的 `include` / `exclude` 形成完整 selected
   paths，并以 Lizard extension registry 分成 accepted/rejected。每个 rejected path 只产生一条 Record，并保留全部 matching
   area IDs；accepted paths 形成稳定去重的 exact-input 并集。
3. accepted 并集非空时，Lizard adapter 对它执行一次 measurement；parser output 必须完整，且所有 source paths 必须属于
   本次 exact set，否则整批结果结算为 unavailable，不发布 partial Records。
4. 可信 measurements 恢复全部 matching areas，按上一节的 overlap 规则计算 effective limit 与 blocking，再完整形成 Records
   和 final counts，不因首个 finding 短路。

## 效果与结果

每个超过 effective limit 的 metric 产生一个 metric Record，data 包含：

```ts
{
  blocking: boolean,
  codeAreas: readonly string[],
  functionName: string,
  limit: number,
  metric: "cyclomatic-complexity" | "function-code-density" | "parameter-count",
  path: string,
  startLine: number,
  value: number
}
```

Record metric 与 measurement 的对应关系如下：

| `metric` | `value` 的含义 | effective limit 来源 |
| --- | --- | --- |
| `cyclomatic-complexity` | Lizard CCN | matching areas 的 `cyclomaticComplexity.maximum` 最小值 |
| `function-code-density` | function NLOC；该 ID 不表示比例 | matching areas 按各自 allowance 条件计算后的 code-line maximum 最小值 |
| `parameter-count` | function parameter count | matching areas 的 `parameters.maximum` 最小值 |

每个 rejected selected path 另产生一条 ID 为 `/input-rejected/<path>` 的 Record：

```ts
{
  blocking: false,
  codeAreas: readonly string[],
  kind: "input-rejected",
  path: string,
  reason: "unsupported-file-type"
}
```

`codeAreas` 是该 path 被选中的全部 area IDs，经去重和稳定排序。即使 area policy 为 blocking，这个 Finding 也固定
non-blocking；它不包含函数或伪造 measurement。

正常 final data 是 `{ findingCount, blockingFindingCount }`。`findingCount` 包含 metric 与 input-rejection Records，
`blockingFindingCount` 只统计 effective blocking metric findings。后者大于零时 outcome 为 `failed`；只有 non-blocking
findings 时 outcome 为 `passed`，Records 仍完整保留。

`failed` 的 `blocking-findings` message 与携带 non-blocking metric Records 的 `passed` 的 `non-blocking-findings` message
之后，会按 metric finding、再按 input rejection 的稳定顺序直接展示最多十条安全摘要；metric 摘要包含项目相对 path、
start line、函数名、metric/value/limit 和 areas，rejection 摘要只包含项目相对 path 与 areas。有 rejected input 时仍先附
`input-rejected` 数量 warning；Finding 超过十条时再用 `findings-omitted` 说明未显示数量，完整集合仍从 Records 读取。由本
Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；若 rejection Records 已发布，它们与对应 warning
仍保留。零 finding 的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseFunctionMetricsData(value)` 验证 final data。两者返回
`FunctionMetricsFinalData`，Record 与不可用原因可分别用 `FunctionMetricsRecordData` 和
`FunctionMetricsUnavailableReasonCode` 标注；authoring / resolved options types 是 `FunctionMetricsOptions` 与
`ResolvedFunctionMetricsOptions`。parser 只适用于 `passed` / `failed` data，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

所有 area 的 selected path 去重并集为空时结算为 `not-applicable / no-eligible-input`。selected 非空但全部被 extension
registry 拒绝时，不启动 Lizard，直接以带 input-rejection Records、warning 和 final counts 的 `passed` 结算。其它无法形成
可信 final data 的边界结算为 `unavailable`：

| `reason.code` | 触发边界 | 调用方检查项 |
| --- | --- | --- |
| `invalid-options` | constructor 之后被普通 object composition 替换的完整 options 未通过 preflight 或 execution 防御校验 | 对照本页 resolved options，补齐或删除字段 |
| `source-unavailable` | 所配置的 filesystem 或 git-worktree 来源无法形成候选快照 | 检查 project root、目录读取权限或 Git worktree 状态 |
| `external-dependency-unavailable` | Lizard executable 不存在、version probe 失败或没有 canonical `1.23.<patch>` output | 检查 `scanner.executable` 与该命令的 `--version` 行为 |
| `external-execution-failed` | Lizard scan 无法启动、被 signal 终止或返回非零状态 | 直接运行配置的 executable，检查 exact-path 与 `--csv` 调用 |
| `external-result-invalid` | CSV、measurement、exact-scope 或 function metric 完整性校验失败 | 检查 wrapper 是否返回 Lizard 1.23-compatible CSV，且没有扩大输入 |
| `cancelled` | invocation signal 在可观察的工作边界终止本 Check | 检查调用方取消原因；不要把该结果解释为 clean scan |

constructor 自身会同步拒绝 unknown、malformed 或 incomplete input，并抛出 `TypeError`；表中的 `invalid-options` 用于
constructor 返回后又被替换的 resolved options。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

execution 只把各 area files 中 Lizard 1.23.0 官方 reader 支持的 extension exact paths 交给本机 Lizard；匹配大小写不敏感，
支持的 extension table 同时生成默认 globs 与 runtime predicate。未被该 table 识别的 Markdown、JSON 等 selected files
产生拒绝 Finding，但不交给 Lizard，避免其 C-like fallback 误解析非代码文本；scanner 不接收 project root 重新发现输入。
该 Check 的网络 request 数为零。Lizard 收到 accepted exact path 后是否产生函数 row 属于 backend measurement semantics，
不能由本 Check 推断为 input rejection。

## 最小用法

```ts
import { defineConfig, functionMetrics, run } from "@zxyycom/vibe-check";
const result = await run(defineConfig({ checks: [functionMetrics()] }));
```

## 适用边界

该 Check 适用于函数 NLOC、cyclomatic complexity 与 parameter-count policy；文件级 code-line policy 由
[`fileMetrics`](file-metrics.md) 评估，重复片段由
[`duplicateDetection`](duplicate-detection.md) 报告。
