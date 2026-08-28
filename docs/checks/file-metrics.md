# `fileMetrics`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页是 package consumer 配置和读取 `fileMetrics` 的主指南。`fileMetrics(options?)` 使用带默认值的
area policy 构造一个普通 `file-metrics` Check。该 Check 用 scc 测量每个 area 选择的文件，把超过
code-line policy 的文件报告为 supplemental Records，并用 `findingCount` 表示最终数量。

默认调用不需要复制完整 options：

```ts
import { fileMetrics } from "vibe-check";

const check = fileMetrics();
```

## 参数与默认配置

constructor 只接受可省略的 `codeAreas` 与 `scanner` branches。无参调用物化成以下完整 Check options：

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
      codeLines: {
        maximum: 300,
        lowDecisionTokenAllowance: {
          maximumCodeLines: 500,
          maximumDecisionTokens: 10
        }
      }
    }
  },
  scanner: { executable: "scc" }
}
```

- 省略整个 `codeAreas` 时建立默认 `project` area。显式 map 必须至少包含一个非空 area ID。
- 每个显式 area 必须提供 `files` branch；其中 `include`、`excludeDirs` 与 `generatedFiles` 可分别省略并
  使用 package defaults。
- `codeLines` 省略时使用完整默认 policy；其中局部字段也可省略。`maximum` 与
  `maximumCodeLines` 必须是正安全整数，`maximumDecisionTokens` 必须是非负安全整数，allowance 的
  `maximumCodeLines` 必须严格大于普通 `maximum`。
- 只有文件 code lines 严格超过当前有效 maximum 时才产生 finding。decision-token 数不超过
  allowance maximum 的文件使用较高 `maximumCodeLines`，其它文件使用普通 `maximum`。
- 未知字段、空 area map、缺失 area `files`、非法 threshold 或非法 scanner policy 会让 constructor
  同步抛出 `TypeError`，不会延迟到 scanner 启动后才发现。

### 为不同文件配置 policy

每个 area ID 共同拥有文件范围和 code-line policy；顶层没有另一份 files 或全局 threshold：

```ts
import { fileMetrics } from "vibe-check";

const sourceAndTests = fileMetrics({
  codeAreas: {
    source: {
      files: { include: ["src/**/*.ts"] },
      codeLines: { maximum: 300 }
    },
    tests: {
      files: { include: ["test/**/*.ts", "src/**/*.test.ts"] },
      codeLines: {
        maximum: 600,
        lowDecisionTokenAllowance: {
          maximumCodeLines: 800,
          maximumDecisionTokens: 20
        }
      }
    }
  }
});
```

省略的 file lists 与 code-line fields 继续使用 package defaults。一个路径可以被多个 area 选择；Check 保存本次
collection 得到的真实 membership，不使用声明顺序或隐式 `unknown` area。

## 工作原理

### 重叠 area 与一次扫描

Check 分别收集每个 `codeAreas[id].files`，把全部路径的稳定去重并集一次性交给 scc。每个 measurement
必须属于这个 exact set，否则整批结果不可用。

同一路径被多个 area 选择时，Check 为每个 area 计算该文件的有效 maximum，再使用其中最严格的最小值。
超限路径最多产生一条 Record；Record ID 是 path，data 保存稳定排序的全部 `codeAreas`、`codeLines`、实际
`limit`、`metric: "code-lines"` 与 `path`。因此重叠不会重复计数，也不会让较宽 policy 掩盖较严格 policy。

## 定制 SCC executable

只有项目明确授权另一个可执行文件时才设置：

```ts
const customFileMetrics = fileMetrics({
  scanner: { executable: "/absolute/path/to/scc" }
});
```

`executable` 必须是非空、已授权并直接接受 SCC CLI 参数的 command。public input 不提供 scan args、version
args、output format、exclude 或 tuning passthrough；adapter 固定执行 `--version` probe，并以
`--by-file --format csv <approved exact paths...>` 取得完整 CSV。需要 prefix arguments 的通用 runtime 应由项目包装成
专用 executable。

当前 adapter 验证 scc `3.7.0` 的 version 与 CSV header contract。缺失 command、版本不匹配、非零退出、缺失或
malformed CSV、越界 measurement 都 fail closed 为 `unavailable`，不会伪装成成功空结果。

## Constructor 与普通 Check 的边界

constructor 返回的仍是普通 Check object，可直接进入 `defineConfig({ checks: [...] })`。constructor 冻结完整
resolved options；owning preflight 与 execution 继续验证该完整 shape，以拒绝 constructor 之后通过普通对象组合形成的
缺失、未知或非法 replacement。constructor input 错误是同步 `TypeError`；非法 resolved replacement 在 Run preflight
结算为 `unavailable / invalid-options`。

## 效果与结果

`findingCount === 0` 时 outcome 为 `passed`；`findingCount > 0` 时 outcome 为 `failed`。final data 是
`{ findingCount }`；每个超限路径由一条 supplemental Record 表示。

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `file-metrics` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

全部 area 的 exact-path union 为空时结算为 `not-applicable / no-eligible-input`。SCC availability、执行、解析、
measurement scope 或 cancellation 无法形成可信完整结果时结算为 `unavailable`。通用 preflight 语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

execution 只启动本机已授权 SCC executable，输入是所有 area 批准的 exact paths 去重并集；该 Check 不发起网络请求。

## 最小用法

```ts
import { defineConfig, fileMetrics, run } from "vibe-check";

const result = await run(defineConfig({ checks: [fileMetrics()] }));
```

## 适用边界

该 Check 适用于文件级 code-line policy；函数级 code lines、cyclomatic complexity 与 parameter count 由
[`functionMetrics`](function-metrics.md) 评估。
