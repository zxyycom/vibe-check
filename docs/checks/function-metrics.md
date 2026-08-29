# `functionMetrics`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

`functionMetrics(options?)` 构造一个普通 Check。它使用 Lizard 测量函数 NLOC、cyclomatic complexity 与参数数量，
把超过 area limits 的结果保存为 supplemental Records，并让全局默认与 area override 共同决定 finding 是否阻断
Check。阻断只改变最终 outcome；一次 invocation 仍扫描完整 exact scope 并保留后续 findings。

```ts
import { functionMetrics } from "vibe-check";

const check = functionMetrics();
```

执行这个 Check 时，project runtime 需要让默认 `lizard` command 可用，或在 `scanner.executable` 中选择项目已授权且
兼容 Lizard 1.23 version output 与 CSV contract 的 executable。

## 参数与默认配置

顶层 `findingPolicy`、`codeAreas` 与 `scanner` 都可省略；显式 `codeAreas[areaId]` 只要求提供 `files` branch。
`functionMetrics()` 会物化以下完整、冻结的 resolved options，调用方无需复制：

```ts
{
  codeAreas: {
    project: {
      files: {
        source: "filesystem",
        include: ["**/*"],
        exclude: [
          "**/.git", "**/.git/**", "**/.vibe-check/**", "**/.cache/**",
          "**/.venv/**", "**/artifacts/**", "**/build/**", "**/dist/**",
          "**/generated/**", "**/*.generated.*", "**/node_modules/**",
          "**/target/**", "**/vendor/**"
        ]
      },
      findingPolicy: "blocking",
      limits: {
        codeLines: {
          maximum: 50,
          lowComplexityAllowance: {
            maximum: 150,
            cyclomaticComplexityBelow: 5
          }
        },
        cyclomaticComplexity: { maximum: 10 },
        parameters: { maximum: 5 }
      }
    }
  },
  scanner: { executable: "lizard" }
}
```

顶层 `findingPolicy` 只为各 area 提供默认值；每个 resolved area 保存自己的有效 `findingPolicy`。所有 maximum 都是
包含等于值的上限：measurement 必须严格大于 limit 才产生 finding。complexity 小于
`cyclomaticComplexityBelow` 时，function NLOC 使用 allowance maximum；所有 limit 都必须是正安全整数，allowance
maximum 不得小于普通 code-line maximum。

constructor 按字段补默认值。`source` 只能是 `"filesystem" | "git-worktree"`，默认 `filesystem`；filesystem 不解释
`.gitignore`，git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。来源不可用时 Check 结算为
`unavailable`，不会切换到另一来源。`include` 与 `exclude` 都按
project-root-relative slash path 的 glob 匹配，exclude 优先。省略时使用上述 package default；显式数组是完整替换值，
`include: []` 不选择路径，`exclude: []` 不排除路径。需要在默认 exclude 上增加规则时，调用方在自己的 TypeScript value
中组成完整数组。nested limit 字段和 area `findingPolicy` 仍可分别省略并继承各自默认值。

### 区域与阻断政策

顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，省略时为 `"blocking"`。显式 `codeAreas` 必须非空，
每个非空 area ID 必须声明 `files: {}`；file fields、limits 和 area `findingPolicy` 都可省略并由 constructor 补齐。

```ts
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
        include: ["scripts/**/*.ts"],
        exclude: ["scripts/**/*.test.ts"]
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

owning adapter 固定执行 `--version` probe，并以 approved exact paths 和 `--csv` 扫描。显式 executable 表示项目授权执行
该命令；需要 wrapper 时由项目提供直接接受这套协议的 executable wrapper。不兼容命令会 fail closed 为 unavailable，
而不会产生成功空结果。

### 安装兼容 Lizard

项目可以用自己的工具管理方式提供 `lizard`。本仓库验证的项目拥有安装方式是在 `mise.toml` 固定 uv 与 Lizard：

```toml
[tools]
uv = "0.11.28"
"pipx:lizard" = { version = "1.23.0", depends = ["uv"] }
```

运行 `mise install` 后，用 `lizard --version` 确认当前 project runtime 能解析到该命令。若项目使用其它安装方式，只要
`scanner.executable` 指向已授权、直接接受上述协议并产生 Lizard 1.23-compatible output 的 executable 即可。

## 工作原理

1. constructor 关闭 input shape，补齐 files、limits、finding policy 与 scanner defaults，再冻结 resolved options。
2. execution 按文件来源分组，每种不同来源只枚举一次候选文件，再按各 area 的 `include` / `exclude` 选择受支持的
   exact inputs，并形成稳定去重的路径并集。
3. Lizard adapter 对该并集执行一次 measurement；parser output 必须完整，且所有 source paths 必须属于本次 exact set，否则
   整批结果结算为 unavailable，不发布 partial Records。
4. 可信 measurements 恢复全部 matching areas，按上一节的 overlap 规则计算 effective limit 与 blocking，再完整形成 Records
   和 final counts，不因首个 finding 短路。

## 效果与结果

每个超过 effective limit 的 metric 产生一个 Record，data 包含：

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

正常 final data 是 `{ findingCount, blockingFindingCount }`。`blockingFindingCount > 0` 时 outcome 为 `failed`；只有
non-blocking findings 时 outcome 为 `passed`，Records 仍完整保留。

`failed` 的 `blocking-findings` message 与携带 non-blocking Records 的 `passed` 的 `non-blocking-findings` message 都会引导
调用方检查本 Check 的 Records。由本 Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；零 finding
的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseFunctionMetricsData(value)` 验证 final data。两者返回
`FunctionMetricsFinalData`，Record 与不可用原因可分别用 `FunctionMetricsRecordData` 和
`FunctionMetricsUnavailableReasonCode` 标注；authoring / resolved options types 是 `FunctionMetricsOptions` 与
`ResolvedFunctionMetricsOptions`。parser 只适用于 `passed` / `failed` data，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

所有 area 的受支持 exact input 并集为空时结算为 `not-applicable` / `no-eligible-input`。其它无法形成可信 final data 的边界
结算为 `unavailable`：

| `reason.code` | 触发边界 | 调用方检查项 |
| --- | --- | --- |
| `invalid-options` | constructor 之后被普通 object composition 替换的完整 options 未通过 preflight 或 execution 防御校验 | 对照本页 resolved options，补齐或删除字段 |
| `source-unavailable` | 所配置的 filesystem 或 git-worktree 来源无法形成候选快照 | 检查 project root、目录读取权限或 Git worktree 状态 |
| `external-dependency-unavailable` | Lizard executable 不存在、version probe 失败或没有可识别的 version output | 检查 `scanner.executable` 与该命令的 `--version` 行为 |
| `external-execution-failed` | Lizard scan 无法启动、被 signal 终止或返回非零状态 | 直接运行配置的 executable，检查 exact-path 与 `--csv` 调用 |
| `external-result-invalid` | CSV、measurement、exact-scope 或 function metric 完整性校验失败 | 检查 wrapper 是否返回 Lizard 1.23-compatible CSV，且没有扩大输入 |
| `cancelled` | invocation signal 在可观察的工作边界终止本 Check | 检查调用方取消原因；不要把该结果解释为 clean scan |

constructor 自身会同步拒绝 unknown、malformed 或 incomplete input，并抛出 `TypeError`；表中的 `invalid-options` 用于
constructor 返回后又被替换的 resolved options。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

execution 只把各 area files 选中的 `.ts`、`.d.ts` 与 `.rs` exact paths 交给本机 Lizard；scanner 不接收 project root
重新发现输入。该 Check 的网络 request 数为零。

## 最小用法

```ts
import { defineConfig, functionMetrics, run } from "vibe-check";
const result = await run(defineConfig({ checks: [functionMetrics()] }));
```

## 适用边界

该 Check 适用于函数 NLOC、cyclomatic complexity 与 parameter-count policy；文件级 code-line policy 由
[`fileMetrics`](file-metrics.md) 评估，重复片段由
[`duplicateDetection`](duplicate-detection.md) 报告。
