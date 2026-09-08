# `fileMetrics`

## 用途

`fileMetrics(options?)` 构造 `file-metrics` Check，用 SCC 测量文件代码行数，报告超限 Records 及总数、blocking 数量。
waiver 在完整 Finding 集合上对账，不从 SCC 输入排除路径。

运行环境须提供默认 `scc` command，或配置已授权的 `scanner.executable`；两者均须支持精确 SCC 4.0.0 version output
与 CSV contract。安装与协议见[定制 SCC executable](#定制-scc-executable)。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, fileMetrics, run } from "@zxyycom/vibe-check";

const check = fileMetrics({ findingPolicy: "blocking" });
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`File metrics did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

示例显式使用 `findingPolicy: "blocking"`，让未豁免的普通 Finding 导致失败；默认 `non-blocking` 只警告，不因 Finding 退出非零。

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。若需接受 `not-applicable` 或聚合多个 Check，
显式配置并读取 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)；`run(...)` 返回本身不表示通过。

## 参数与默认配置

顶层 options 都可省略；每个 area 独立选择文件与代码行策略。无参调用物化以下完整、冻结的 options：

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
  findingWaivers: [],
  scanner: { executable: "scc" }
}
```

`defaultProjectFileSelection` 是 package root 公开的深冻结默认选择；constructor 会物化同值 files branch，无须手工复制。

### 字段规则

- 省略整个 `codeAreas` 时，constructor 建立默认 `project` 区域。显式 `codeAreas` 必须至少包含一个
  非空 area ID。
- 每个显式区域必须提供 `files`。共同 `{ source, include, exclude }` grammar、source failure 和数组替换见
  [共享的 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)；本 Check 的 branch fields 省略时使用公开的
  `defaultProjectFileSelection`。
- 顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `non-blocking`；area 可覆盖，省略时继承顶层值。
- `findingWaivers` 省略时为 `[]`，并采用[共同 waiver authoring 与 audit](../guides/finding-waivers.md#identity-与-audit)。每项必须是
  `{ identity: { metric: "code-lines", path }, reason }`；`path` 必须已经是
  normalized project-root-relative slash path：非空、不以 `/` 开头、不含 `\\`、Windows drive prefix、空 segment、`.` 或 `..`。
  `reason` 必须非空，同一 `{ metric, path }` 不得重复。它不接受 callback 或 glob：metric 和 path 是该 Check 承诺的稳定
  identity，实际行数与上限仍会随策略变化。
- 省略 `codeLines` 时使用完整默认代码行策略；`maximum` 与 allowance 内的字段也可分别省略。
- `maximum` 与 `maximumCodeLines` 必须是正安全整数，`maximumDecisionTokens` 必须是非负安全整数；
  allowance 的 `maximumCodeLines` 必须严格大于同一区域的普通 `maximum`。
- `scanner.executable` 必须是非空字符串。省略 `scanner` 或 `scanner.executable` 时直接执行 `scc`。
- 未知字段、空区域 map、缺失 `files` 或非法字段值会让 constructor 同步抛出 `TypeError`。

### 为不同文件配置策略

```ts
import { defaultProjectFileSelection, fileMetrics } from "@zxyycom/vibe-check";

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

省略字段沿用默认值；`tests` 保留默认排除项并追加 fixture 规则。

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
- measurement：`--no-config --by-file --format csv <approved exact paths...>`
- process timeout：由 adapter 固定，不属于项目策略

需要 prefix arguments 的通用 runtime（例如 `node path/to/tool.js`）不是受支持的直接 command；项目应提供一个已授权的
专用 wrapper executable。当前 adapter 只接受 SCC `4.0.0` 的 version output 与对应 CSV header contract。
`--no-config` 隔离 `SCC_CONFIG_PATH` 与项目中的 ambient SCC config；adapter 不读取 consumer SCC 参数或 config。

### 安装兼容 SCC

项目可以用自己的工具管理方式提供 `scc`。本仓库验证的项目拥有安装方式是在 `mise.toml` 固定 Go 与 SCC：

```toml
[tools]
go = "1.26.4"
"go:github.com/boyter/scc/v4" = { version = "v4.0.0", depends = ["go"] }
```

运行 `mise install` 后，用 `scc --version` 确认当前 project runtime 能解析到该命令。若项目使用其它安装方式，只要
`scanner.executable` 指向已授权、直接接受上述协议并产生精确 SCC 4.0.0 version output 和受支持 CSV header 的 executable 即可。

## 效果与结果

每个可信 finding 都形成 Record，不因 policy 或先前 finding 而省略。正常 final data 恰为
`{ findingCount, blockingFindingCount }`；前者等于 SCC 形成的 finding 数量，后者只计没有被 applied waiver 覆盖的
`blocking: true` finding。`blockingFindingCount > 0` 时 outcome 为 `failed`，否则为 `passed`，所以 passed outcome 可以携带
non-blocking 或 waived finding Records。

每个超限路径发布一条 supplemental Record。Record ID 是 path，data shape 为：

```ts
{
  blocking: boolean;
  codeAreas: string[]; // 稳定排序的全部匹配 area IDs
  codeLines: number;
  limit: number;       // 全部匹配区域中的最严格有效上限
  metric: "code-lines";
  path: string;
  waiver?: { reason: string };
}
```

精确命中一项 finding 的 waiver 会保留原 finding Record，并写入 `waiver.reason`、将 `blocking` 设为 `false`，同时附加
`finding-waived` info message。未命中或命中多项的 waiver 不会隐藏 finding；各自产生一条 `kind: "finding-waiver-audit"`
Record，带 identity、reason、matchCount 和 `"unused" | "overmatched"` status，并附 warning。
audit Record ID 使用 `/finding-waiver-audit/<identity.path>`，该 leading-slash domain
与正常 finding 的 normalized relative path ID 不相交。

`fileMetrics` 的 detail messages 按稳定 path 顺序，包含项目相对 path、code lines、effective limit 和 areas；完整 finding 集合从
本 Check 的 Records 读取。通用的 terminal Finding 呈现与 Run progress 预览边界见
[呈现 Check Finding](../guides/presenting-findings.md)。
由本 Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；没有 finding 且没有 waiver audit 时，`passed` 与
`not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseFileMetricsData(value)` 验证 final data。两者返回
`FileMetricsFinalData`，Record 与不可用原因可分别用 `FileMetricsRecordData` 和
`FileMetricsUnavailableReasonCode` 标注；authoring / resolved options types 是 `FileMetricsOptions` 与
`ResolvedFileMetricsOptions`。parser 只适用于 `passed` / `failed` data，不匹配时抛出 `TypeError`。

## `not-applicable` 与 `unavailable`

| 阶段或条件                                                       | Check 结果                                      |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| 全部区域的 exact-path union 为空                                 | `not-applicable / no-eligible-input`；已配置 waiver 仍产生 unused audit |
| resolved options 不符合完整 closed shape                         | `unavailable / invalid-options`                 |
| 所配置的 filesystem 或 git-worktree 来源无法形成候选集合         | `unavailable / source-unavailable`              |
| SCC command 缺失、version probe 失败或版本不匹配                 | `unavailable / external-dependency-unavailable` |
| SCC measurement process 执行失败                                 | `unavailable / external-execution-failed`       |
| CSV、measurement scope 或 Record conversion 不能形成可信完整结果 | `unavailable / external-result-invalid`         |

合法的 SCC CSV header 后没有 measurement rows 是可信空 measurement，不等同于 command、执行或解析失败。

## I/O 与安全边界

execution 只启动本机已授权的 SCC executable，输入仅包含各区域批准的 exact paths 去重并集。该 Check 不发起网络请求，
也不把 raw SCC stdout/stderr 直接发布为稳定 Check 或 Record data。

## 适用边界

该 Check 只评估文件级代码行策略。函数级 NLOC、cyclomatic complexity 与 parameter count 由
[`functionMetrics`](function-metrics.md) 评估；`fileMetrics` 不格式化、拆分或修改源文件。
