# `fileMetrics`

本页完整说明 package consumer 如何构造、配置和读取 `fileMetrics`。package 总入口见
[README 的随包 Check 概览](../../README.md#随包提供的-check)；普通 Check 的 preflight、Run 与结果读取机制见
[深入 API 机制](../api-mechanics.md)。

## 用途

`fileMetrics(options?)` 返回一个普通 `file-metrics` Check。该 Check 使用 SCC 测量各区域所选文件的代码行数，
将超过区域策略的文件发布为 supplemental Records，并分别报告 finding 总数与 blocking finding 数量。

无参调用使用完整默认策略：

```ts
import { fileMetrics } from "vibe-check";

const check = fileMetrics();
```

执行这个 Check 时，project runtime 需要让默认 `scc` command 可用，或在 `scanner.executable` 中选择项目已授权且
兼容 SCC 3.7.0 version output 与 CSV contract 的 executable。

## 参数与默认配置

顶层 `codeAreas`、`findingPolicy` 与 `scanner` 都可省略。每个 `codeAreas[areaId]` 同时拥有文件选择和代码行
策略，因此不同区域可以选择不同文件并使用不同上限。无参调用物化以下完整、冻结的 Check options：

```ts
{
  codeAreas: {
    project: {
      files: defaultProjectFileSelection,
      findingPolicy: "non-blocking",
      codeLines: {
        maximum: 360,
        lowDecisionTokenAllowance: {
          maximumCodeLines: 600,
          maximumDecisionTokens: 12
        }
      }
    }
  },
  scanner: { executable: "scc" }
}
```

这里的 `defaultProjectFileSelection` 是从 package root 公开的深冻结完整基线；constructor 会把同值 files branch 物化到
自己的 resolved options，调用方无需复制该对象；完整默认 glob 可直接从该 public value 读取。

### 字段规则

- 省略整个 `codeAreas` 时，constructor 建立默认 `project` 区域。显式 `codeAreas` 必须至少包含一个
  非空 area ID。
- 每个显式区域必须提供 `files`。`source` 只能是 `"filesystem" | "git-worktree"`，默认 `filesystem`；filesystem
  不解释 `.gitignore`，git-worktree 使用已跟踪文件和未被 Git 标准忽略规则排除的未跟踪文件。来源不可用时 Check
  结算为 `unavailable`，不会切换到另一来源。
- `include` 与 `exclude` 都按 project-root-relative slash path 的 glob 匹配，exclude 优先。省略时使用公开的
  `defaultProjectFileSelection`；显式数组是完整替换值，`include: []` 不选择路径，`exclude: []` 不排除路径。
- 顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `non-blocking`；area 可覆盖，省略时继承顶层值。
- 省略 `codeLines` 时使用完整默认代码行策略；`maximum` 与 allowance 内的字段也可分别省略。
- `maximum` 与 `maximumCodeLines` 必须是正安全整数，`maximumDecisionTokens` 必须是非负安全整数；
  allowance 的 `maximumCodeLines` 必须严格大于同一区域的普通 `maximum`。
- `scanner.executable` 必须是非空字符串。省略 `scanner` 或 `scanner.executable` 时直接执行 `scc`。
- 未知字段、空区域 map、缺失 `files` 或非法字段值会让 constructor 同步抛出 `TypeError`。

### 为不同文件配置策略

```ts
import { defaultProjectFileSelection, fileMetrics } from "vibe-check";

const sourceAndTests = fileMetrics({
  codeAreas: {
    source: {
      files: { include: ["src/**/*.ts"] },
      codeLines: { maximum: 300 }
    },
    tests: {
      files: {
        ...defaultProjectFileSelection,
        exclude: [...defaultProjectFileSelection.exclude, "**/fixtures/**"],
        include: ["test/**/*.ts", "src/**/*.test.ts"]
      },
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

本例只覆盖各区域显式给出的字段；省略的文件字段、finding policy 和代码行字段继续使用 package 默认值。`tests` area
通过公开的深冻结 `defaultProjectFileSelection` 保留 common exclusions，再追加项目的 fixture 规则。

### 单个区域的有效上限

SCC CSV 的 `Complexity` 字段是 file-metrics 使用的 decision-token measurement。Check 按下表为每个文件、
每个匹配区域计算一次有效代码行上限：

| SCC decision-token measurement             | 区域的有效代码行上限                         |
| ------------------------------------------ | -------------------------------------------- |
| 非 `null` 且不大于 `maximumDecisionTokens` | `lowDecisionTokenAllowance.maximumCodeLines` |
| `null` 或大于 `maximumDecisionTokens`      | `codeLines.maximum`                          |

只有实际 `codeLines` **严格大于**有效上限时，该区域策略才判定文件超限。

## 工作原理

1. Check 先按文件 `source` 分组；每种不同来源只枚举一次候选文件，再为每个 area 应用自己的 `include` / `exclude`，
   并保存 path 到全部实际 area IDs 的 membership。
2. Check 对全部路径稳定排序、去重，只把这个 exact-path union 交给 SCC 一次。
3. 每条 SCC measurement 必须声明属于该 union 的 source path；任一越界 measurement 会拒绝整批结果。
4. 对属于多个区域的文件，Check 分别计算各区域的有效代码行上限，并使用其中最小的严格上限：

   ```text
   file limit = min(effective maximum of every matching area)
   ```

5. 一个超限路径最多发布一条 Record，因此区域重叠不会重复扫描、重复记录或重复计数。Record 保留稳定排序的
   全部匹配 area IDs；任一 matching area 的 effective finding policy 为 blocking 时，该 Record blocking。

## 定制 SCC executable

只有项目明确授权另一个可执行文件时才配置 `scanner.executable`：

```ts
const customFileMetrics = fileMetrics({
  scanner: { executable: "/absolute/path/to/scc" }
});
```

custom executable 必须直接接受 SCC CLI 参数。public scanner policy 只选择 executable；owning adapter 固定执行以下协议：

- availability probe：`--version`
- measurement：`--by-file --format csv <approved exact paths...>`
- process timeout：由 adapter 固定，不属于项目策略

需要 prefix arguments 的通用 runtime（例如 `node path/to/tool.js`）不是受支持的直接 command；项目应提供一个已授权的
专用 wrapper executable。当前 adapter 只接受 SCC `3.7.0` 的 version output 与对应 CSV header contract。

### 安装兼容 SCC

项目可以用自己的工具管理方式提供 `scc`。本仓库验证的项目拥有安装方式是在 `mise.toml` 固定 Go 与 SCC：

```toml
[tools]
go = "1.25"
"go:github.com/boyter/scc/v3" = { version = "v3.7.0", depends = ["go"] }
```

运行 `mise install` 后，用 `scc --version` 确认当前 project runtime 能解析到该命令。若项目使用其它安装方式，只要
`scanner.executable` 指向已授权、直接接受上述协议并产生 SCC 3.7.0-compatible output 的 executable 即可。

## 效果与结果

每个可信 finding 都形成 Record，不因 policy 或先前 finding 而省略。正常 final data 恰为
`{ findingCount, blockingFindingCount }`；前者等于 Records 数量，后者等于其中 `blocking: true` 的数量。
`blockingFindingCount > 0` 时 outcome 为 `failed`，否则为 `passed`，所以 passed outcome 可以携带 non-blocking Records。

每个超限路径发布一条 supplemental Record。Record ID 是 path，data shape 为：

```ts
{
  blocking: boolean;
  codeAreas: string[]; // 稳定排序的全部匹配 area IDs
  codeLines: number;
  limit: number;       // 全部匹配区域中的最严格有效上限
  metric: "code-lines";
  path: string;
}
```

`failed` 的 `blocking-findings` message 与携带 non-blocking Records 的 `passed` 的 `non-blocking-findings` message 都会引导
调用方检查本 Check 的 Records。由本 Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；零 finding
的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseFileMetricsData(value)` 验证 final data。两者返回
`FileMetricsFinalData`，Record 与不可用原因可分别用 `FileMetricsRecordData` 和
`FileMetricsUnavailableReasonCode` 标注；authoring / resolved options types 是 `FileMetricsOptions` 与
`ResolvedFileMetricsOptions`。parser 只适用于 `passed` / `failed` data，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

| 阶段或条件                                                       | Check 结果                                      |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| 全部区域的 exact-path union 为空                                 | `not-applicable / no-eligible-input`            |
| resolved options 不符合完整 closed shape                         | `unavailable / invalid-options`                 |
| 所配置的 filesystem 或 git-worktree 来源无法形成候选集合         | `unavailable / source-unavailable`              |
| SCC command 缺失、version probe 失败或版本不匹配                 | `unavailable / external-dependency-unavailable` |
| SCC measurement process 执行失败                                 | `unavailable / external-execution-failed`       |
| CSV、measurement scope 或 Record conversion 不能形成可信完整结果 | `unavailable / external-result-invalid`         |

合法的 SCC CSV header 后没有 measurement rows 是可信空 measurement，不等同于 command、执行或解析失败。

## I/O 与安全边界

execution 只启动本机已授权的 SCC executable，输入仅包含各区域批准的 exact paths 去重并集。该 Check 不发起网络请求，
也不把 raw SCC stdout/stderr 直接发布为稳定 Check 或 Record data。

## 最小用法

```ts
import { defineConfig, fileMetrics, run } from "vibe-check";

const result = await run(defineConfig({ checks: [fileMetrics()] }));
```

## 适用边界

该 Check 只评估文件级代码行策略。函数级 NLOC、cyclomatic complexity 与 parameter count 由
[`functionMetrics`](function-metrics.md) 评估；`fileMetrics` 不格式化、拆分或修改源文件。
