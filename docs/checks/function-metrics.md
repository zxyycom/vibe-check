# `functionMetrics`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

`functionMetrics(options?)` 构造一个普通 Check。它使用 Lizard 测量函数 NLOC、cyclomatic complexity 与参数数量，
把超过 area limits 的结果保存为 supplemental Records，并让全局默认与 area override 共同决定 finding 是否阻断
Check。阻断只改变最终 outcome；一次 invocation 仍扫描完整 exact scope 并保留后续 findings。

## 参数与默认配置

`functionMetrics()` 会物化以下完整、冻结的 resolved options：

```ts
{
  codeAreas: {
    project: {
      files: {
        include: ["**/*"],
        excludeDirs: [
          ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
          "node_modules", "target", "vendor"
        ],
        generatedFiles: ["**/generated/**", "**/*.generated.*"]
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

顶层 `findingPolicy` 是 constructor input 的 area 默认值，不会作为第二份 policy 保留在 resolved options；每个 resolved
area 都只保存自己的 effective `findingPolicy`。所有 maximum 都是 inclusive limit：measurement 必须严格大于 limit 才产生
finding。complexity 小于 `cyclomaticComplexityBelow` 时，function NLOC 使用 allowance maximum；所有 limit 都必须是
正安全整数，allowance maximum 不得小于普通 code-line maximum。

### 区域与阻断政策

顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，省略时为 `"blocking"`。显式 `codeAreas` 必须非空，
每个非空 area ID 必须声明 `files: {}`；files lists、limits 和 area `findingPolicy` 都可省略并由 constructor 补齐。

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
        generatedFiles: ["scripts/**/*.test.ts"]
      }
    }
  }
});
```

本例中 source finding 会阻断，tooling finding 只形成 evidence。Check 不会在首个 blocking finding 后停止；它仍处理
其它函数与 area，然后以完整计数结算。

## 定制 Lizard executable

public scanner policy 只选择直接接受 Lizard arguments 的 executable：

```ts
const metrics = functionMetrics({
  scanner: { executable: "/opt/tools/lizard" }
});
```

adapter 固定执行 `--version` probe，并以 approved exact paths 和 `--csv` 扫描。version arguments、scan args、output
format、timeout 和 worker tuning 都不是 public input。显式 executable 表示项目授权执行该命令；不兼容命令会 fail
closed 为 unavailable，而不会产生成功空结果。需要 wrapper 时由项目提供直接 executable wrapper，不通过参数透传改变协议。

## 工作原理

constructor 先关闭输入 shape、补齐 files/limits/finding policy/scanner defaults 并冻结 resolved options。execution 分别按
每个 area files 收集路径，选出受支持的 exact inputs，再把稳定去重并集交给 Lizard 一次测量。parser output 必须完整且
所有 source paths 都属于这次 exact set；否则整批结果 unavailable。可信 measurements 随后恢复全部 matching areas，
应用最严格 limits 与 effective blocking policy，并在不中断后续处理的情况下形成 Records 和 final counts。

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

正常 final data 是 `{ findingCount, blockingFindingCount }`。`blockingFindingCount > 0` 时 outcome 为 `failed`；只有
non-blocking findings 时 outcome 为 `passed`，Records 仍完整保留。按
[README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄 `RunResult.kind`，再按
`function-metrics` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

所有 area 的受支持 exact input 并集为空时结算为 `not-applicable` / `no-eligible-input`。constructor 同步拒绝 unknown、
malformed 或 incomplete input；Run preflight 继续验证 constructor 之后被普通 object composition 替换的完整 options，失败时
结算为 `unavailable` / `invalid-options`。通用语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。Lizard availability、调用、解析、
measurement scope 或 cancellation 无法形成可信完整结果时同样结算为 `unavailable`。

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
