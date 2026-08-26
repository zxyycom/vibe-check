# `functionMetrics`

## 用途

使用 Lizard 测量函数 code lines、cyclomatic complexity 和参数数量，定位过于复杂或接口过大的函数。它是普通
Check value；Lizard adapter、analysis 与 measurement types 全部由 `function-metrics` 自己拥有。

## 参数与默认配置

```ts
{
  files: {
    include: ["**/*"],
    excludeDirs: [
      ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
      "node_modules", "target", "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"]
  },
  codeAreas: {
    project: {
      description: "This project",
      globs: ["**/*"],
      excludeGlobs: [],
      warningPolicy: "moderate"
    }
  },
  scanner: { executable: "lizard", args: [], availabilityArgs: ["--version"] },
  codeLines: {
    absoluteFloor: 50,
    lowComplexityAllowance: {
      codeLineFloor: 150,
      maxCyclomaticComplexityExclusive: 5
    }
  },
  cyclomaticComplexity: { absoluteFloor: 10 },
  parameterCount: { absoluteFloor: 5 }
}
```

- `files` 完整定义本 Check 的 file selection；selected candidates 中只有 `.ts`、`.d.ts` 与 `.rs` 成为 Lizard
  exact inputs。
- `codeAreas` 为每个函数 finding 选择 area policy。
- `scanner` 是 `function-metrics` 私有 Lizard command binding。
- 三个 metric branches 分别控制函数行数、圈复杂度和参数数。低于 exclusive complexity 上限的函数可使用较高
  code-line allowance；所有阈值都必须是正安全整数。

## 工作原理

Check 验证 options，收集自己的 files，选择 Lizard 支持的 exact paths，再调用 `function-metrics/lizard` adapter。
parser output 必须完整且 source path 不越界；Check-local analysis 规范化测量，随后以自己的阈值与 code areas 建立 Records。

## 效果与结果

没有 finding 时为 `passed`；有任一 metric finding 时为 `failed`。final data 是 `{ findingCount }`；每个触发指标的
函数产生对应 supplemental Record。

## `not-applicable` 与 `unavailable`

没有支持的 exact input 时为 `not-applicable` / `no-eligible-input`。非法 replacement options 的共享组合、Run
preflight 与 direct execution 边界见[组合与 options preflight](index.md#组合与-options-preflight)。合法 Check 遇到
Lizard 不可用、调用/解析失败、越界 measurement 或取消时才返回 `unavailable`。

## 外部工具与安全边界

只调用本机 Lizard，不进行网络访问；scanner 不获得 project root，也不能自行扩大输入。显式 command replacement
应只使用受信任的项目配置。

## 最小用法

```ts
import { defineConfig, functionMetrics, run } from "vibe-check";
const result = await run(defineConfig({ checks: [functionMetrics] }));
```

## 非目标

它不评估业务正确性、测试覆盖率或文件级重复代码。
