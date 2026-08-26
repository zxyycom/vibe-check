# `fileMetrics`

## 用途

使用 scc 计算该 Check 自己选择的文件级 code-line 指标，帮助发现过大的源文件。它是普通 Check value；scc
adapter 与 measurement model 都由 `file-metrics` 自己拥有。

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
  scanner: { executable: "scc", args: [], availabilityArgs: ["--version"] },
  codeLines: {
    absoluteFloor: 300,
    lowDecisionTokenAllowance: { codeLineFloor: 500, maxDecisionTokens: 10 }
  }
}
```

- `files` 完整定义本 Check 的 project-file selection；不同 Check 可以使用不同值。
- `codeAreas` 为每个测量文件选择 finding policy，不是 Definition/Core 的共享领域模型。
- `scanner` 是 `file-metrics` 私有 scc command binding。
- `codeLines.absoluteFloor` 是通常阈值；decision-token 数不超过 `maxDecisionTokens` 的文件可使用较高
  `codeLineFloor` allowance。所有数值都必须是正安全整数。

## 工作原理

owning Check 先验证 options，再把 `files` selected paths 作为 exact inputs 交给 `file-metrics/scc` adapter。adapter
解析 scc CSV，measurement acceptance 拒绝任何不属于 exact set 的 path；Check 随后按自己的 `codeAreas` 和阈值生成
Records。

## 效果与结果

没有 finding 时为 `passed`；有 finding 时为 `failed`。final data 是 `{ findingCount }`，每个超限文件由一条
supplemental Record 表示。

## `not-applicable` 与 `unavailable`

没有 selected file 时为 `not-applicable` / `no-eligible-input`。无效 options 为 `unavailable` /
`invalid-options`；scc 缺失、执行/解析失败、越界 measurement 或取消也为 `unavailable`。

## 外部工具与安全边界

只执行本机 scc，不发起网络请求；它只接收本 Check 批准的 exact paths。显式 command replacement 应只使用受信任的
项目配置。

## 最小用法

```ts
import { defineConfig, fileMetrics, run } from "vibe-check";
const result = await run(defineConfig({ checks: [fileMetrics] }));
```

## 非目标

它不计算函数复杂度、不格式化源文件，也不自动拆分文件。
