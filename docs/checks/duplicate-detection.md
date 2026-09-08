# `duplicateDetection`

## 用途

`duplicateDetection(options?)` 构造 `duplicate-detection` Check，用 jscpd 报告满足行数/token 策略的重复片段。
它发布完整 Finding Records，并分别统计总数与 blocking 数量；waiver 不缩小 scanner 输入或 cache evidence。

默认使用随 package 安装的 jscpd v5（manifest 范围 `^5.1.1`），无需另配 executable。

## 最小用法

示例保留终端进度，不写 machine files。

```ts
import { defineConfig, duplicateDetection, run } from "@zxyycom/vibe-check";

const check = duplicateDetection({ findingPolicy: "blocking" });
const result = await run(defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
}));
const outcome = result.kind === "completed"
  ? result.snapshot.checks.find(({ checkId }) => checkId === check.checkId)?.outcome
  : undefined;
if (result.kind !== "completed" || outcome?.status !== "passed") {
  console.error(`Duplicate detection did not pass: ${result.kind} / ${outcome?.status ?? "no outcome"}`);
  process.exitCode = 1;
}
```

示例显式使用 `findingPolicy: "blocking"`，让未豁免的普通 Finding 导致失败；默认 `non-blocking` 只警告，不因 Finding 退出非零。

本例只接受 `completed` Run 中的 `passed` Check，否则退出非零。若需接受 `not-applicable` 或聚合多个 Check，
显式配置并读取 [`checkAggregation`](../api-mechanics.md#runcontrols-与-check-aggregation)；`run(...)` 返回本身不表示通过。

## 参数与默认配置

顶层 options 都可省略；显式 area 必须提供 `files`。无参调用物化以下完整 options：

```ts
{
  cache: { directory: ".cache/vibe-check", enabled: true },
  codeAreas: {
    project: {
      files: defaultProjectFileSelection,
      findingPolicy: "non-blocking",
      minimumLines: 4,
      minimumTokens: 100
    }
  },
  findingWaivers: [],
  scanner: {
    command: { kind: "package" }
  }
}
```

`defaultProjectFileSelection` 是 package root 公开的深冻结默认选择；constructor 会物化同值 files branch，无须手工复制。

- 省略整个 `codeAreas` 时建立默认 `project` area。显式 map 必须至少包含一个非空 area id。
- 每个显式 area 必须提供 `files` branch。共同 `{ source, include, exclude }` grammar、source failure 和数组替换见
  [共享的 files 选择语义](../guides/collecting-project-files.md#共享的-files-选择语义)；本 Check 的 branch fields 可分别省略并使用公开的
  `defaultProjectFileSelection`。
- 顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `non-blocking`；area 可覆盖，省略时继承顶层值。
- `findingWaivers` 省略时为 `[]`，并采用[共同 waiver authoring 与 audit](../guides/finding-waivers.md#identity-与-audit)。identity
  恰为 `{ metric: "duplicate-tokens", locations }`；`locations` 至少两项，必须逐项复制 Finding Record 中的完整
  `{ path, startLine, endLine }`。数组先按 path 文本升序，再按 `startLine`、`endLine` 数值升序严格排序。path 是 normalized
  project-root-relative slash path，line 是正安全整数且
  `endLine >= startLine`；缺失、重复或乱序 location 都会被拒绝。
- `minimumLines` 与 `minimumTokens` 可省略并分别使用 `4` 和 `100`，显式值必须是正安全整数。
- `cache.directory` 省略时为 `.cache/vibe-check`，相对路径从 project root 解析；`cache.enabled` 省略时为 `true`。
- `scanner.command` 省略时为 `{ kind: "package" }`。
- 未知字段、空 area map、缺失 area `files`、非法阈值或非法 scanner policy 会由 constructor 同步抛出
  `TypeError`。

## 定制区域 policy

下面两个 area 各自选择文件和阈值；省略字段使用默认值。追加默认排除项时才组合公开 files 基线：

```ts
import { defaultProjectFileSelection, duplicateDetection } from "@zxyycom/vibe-check";

const sourceAndScriptsDuplicateDetection = duplicateDetection({
  codeAreas: {
    source: {
      files: { include: ["src/**/*.ts"] },
      minimumTokens: 20
    },
    scripts: {
      files: {
        ...defaultProjectFileSelection,
        include: ["scripts/**/*.ts"],
        exclude: [...defaultProjectFileSelection.exclude, "scripts/**/*.test.ts"]
      },
      minimumLines: 10,
      minimumTokens: 100
    }
  }
});
```

上例保留默认排除项再追加测试文件；只写 `["scripts/**/*.test.ts"]` 会替换整个排除数组。
Area 也是比较边界：仅属于 `source` 和仅属于 `scripts` 的文件不会互相形成 Finding。
跨目录比较需另声明同时选中两类路径的 area；精确规则见[工作原理](#工作原理)。

### 精确豁免一个重复片段

Waiver identity 使用 Finding 发布的完整排序 ranges；不要只写 path pair，也不要把 token/line counts 写入 identity：

```ts
const duplicates = duplicateDetection({
  findingPolicy: "blocking",
  findingWaivers: [
    {
      identity: {
        metric: "duplicate-tokens",
        locations: [
          { path: "src/generated/a.ts", startLine: 10, endLine: 30 },
          { path: "src/generated/b.ts", startLine: 15, endLine: 35 }
        ]
      },
      reason: "两个生成目标在下一版模板迁移前必须保持镜像。"
    }
  ]
});
```

range 变化会让旧 waiver 进入[共同 audit](../guides/finding-waivers.md#identity-与-audit)，而不会误匹配同一文件组合中的另一个 fragment。

## 定制 jscpd executable

只有项目确实授权另一个可执行文件时才设置 custom command：

```ts
import { duplicateDetection } from "@zxyycom/vibe-check";

const customDuplicateDetection = duplicateDetection({
  scanner: {
    command: {
      kind: "custom",
      executable: "/absolute/path/to/jscpd"
    }
  }
});
```

`executable` 必须是项目已授权、可执行且直接接受 jscpd CLI 参数的 command。
需要前置参数的 runtime（如 `node path/to/jscpd.js`）不受支持，可改用已授权的专用 wrapper executable。
adapter 拥有 version probe、exact-path config、JSON report 与自动 worker policy；调用方只选择 command。
custom 版本无需等于 package 版本，但实际版本会隔离 cache；不兼容或失败的具体结算见[不可用原因](#not-applicable-与-unavailable)。

## 工作原理

Check 先按文件 `source` 分组；每种不同来源只枚举一次候选文件，再为各 `codeAreas[id].files` 应用自己的
`include` / `exclude`，最后把全部路径去重成一个批准的精确范围。一个路径可同时属于多个 area；全部 exact paths 仍
一次性交给 jscpd，但 raw scanner 候选只有在全部 location 至少共享一个 area 时才进入 Finding：

1. jscpd 使用所有实际输入 area 中最低的 line 阈值和最低的 token 阈值取得完整候选。
2. 每个 raw fragment 的 location path 必须属于本次完整 exact scope，且完整 location ranges 必须互不相同；路径越界或
   同一路径同一区间的自我匹配都会拒绝整批 measurement。
3. Check 恢复每个 location 所属的 area IDs，并取所有 location 集合的交集。交集为空的 fragment 不形成 Finding、Record、
   message 或 final count。
4. 交集非空时，fragment 的 `codeAreas` 恰为稳定排序的共同 area IDs；line count 和 token count 必须分别达到这些共同 area
   阈值中的最大值。
5. 完整可信 Finding candidates 形成后才执行 waiver reconciliation；source/scanner/cache failure 不伪造 audit。Applied
   Finding 保留 Record，unused/overmatched authoring 形成独立 audit Record，然后 Check 按 actionable disposition 结算。

cache 只保存通过 exact-input 校验的 scanner fragments；无论是否命中 cache，当前 area annotation 与最终 policy filtering
都走同一路径。只有 package/custom command identity、实际 jscpd 版本、当前 commit、完整 exact-input fingerprint 和实际
影响 scanner 结果的配置均匹配时才会复用；package command identity 不含 consumer 安装目录，custom command identity 使用
项目显式提供的 executable。

## 效果与结果

每个可信 finding 都形成 Record，不因 policy 或先前 finding 而省略。若 fragment 的共同 areas 多于一个，只要任一共同
area 的 effective `findingPolicy` 为 `blocking`，该 Record 的 `blocking` 就为 `true`。正常 final data 恰为
`{ findingCount, blockingFindingCount }`；前者是完整 duplicate Finding 数量，后者是仍 actionable 且 blocking 的数量。
Waiver audit Records 不进入这两个计数。
`blockingFindingCount > 0` 时 outcome 为 `failed`，否则为 `passed`，所以 passed outcome 可以携带 non-blocking Records。

每个 Record data 使用以下字段：

```ts
{
  blocking: boolean,
  metric: "duplicate-tokens",
  tokenCount: number,
  lineCount: number,
  codeAreas: string[],
  locations: Array<{ path: string; startLine: number; endLine: number }>,
  waiver?: { reason: string }
}
```

Applied Finding 增加 `waiver.reason` 并把 Record `blocking` 置为 `false`，其它事实不变。Unused/overmatched authoring 使用：

```ts
{
  kind: "finding-waiver-audit",
  identity: { metric: "duplicate-tokens", locations },
  matchCount: number,
  reason: string,
  status: "unused" | "overmatched"
}
```

每条 unused/overmatched audit 的 Record ID 是
`/finding-waiver-audit/sha256:<canonical-identity-digest>`；该保留前缀与 normal duplicate Record ID domain 不相交。

`duplicateDetection` 的 detail messages 按仍 actionable 的稳定 Finding 顺序；每条只包含 token/line counts 和最多两个
项目相对 location，更多 location 只显示剩余数量。完整集合仍从本 Check 的 Records 读取；通用的 terminal Finding 呈现与
Run progress 预览边界见 [呈现 Check Finding](../guides/presenting-findings.md)。由本 Check 结算的 `unavailable` 会使用对应
`reason.code` 提供 error message；零 finding 的 `passed` 与 `not-applicable` 不合成人为提示。Applied waiver 另附
`finding-waived` info；unused/overmatched authoring 附 warning，并从 audit Record 保留完整 identity 与 reason。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseDuplicateDetectionData(value)` 验证 final data。两者返回
`DuplicateDetectionFinalData`，Record 与不可用原因可分别用 `DuplicateDetectionRecordData` 和
`DuplicateDetectionUnavailableReasonCode` 标注；authoring / resolved options types 是 `DuplicateDetectionOptions` 与
`ResolvedDuplicateDetectionOptions`，waiver authoring 可用 `DuplicateDetectionFindingLocation`、
`DuplicateDetectionFindingIdentity` 与 `DuplicateDetectionFindingWaiver` 标注。parser 只适用于 `passed` / `failed` data，shape 或计数不变量不匹配时抛出
`TypeError`。

## `not-applicable` 与 `unavailable`

- 少于两个合格 exact inputs：完整 Finding 集合确定为空，结果为 `not-applicable / no-eligible-input`，configured waiver
  全部形成 `unused` audit。
- constructor 后形成的 resolved options 不符合完整 shape：`unavailable / invalid-options`。
- 所配置的 filesystem 或 git-worktree 来源无法形成候选快照：`unavailable / source-unavailable`。
- package/custom command 缺失、version probe 失败或无法形成可识别版本 provenance：
  `unavailable / external-dependency-unavailable`。
- 已启动 jscpd 但进程执行失败：`unavailable / external-execution-failed`。
- cache 写入失败：`unavailable / cache-write-failed`。
- report、fragment 或 exact-input membership 无法形成可信完整结果：`unavailable / external-result-invalid`。

上述 `unavailable` 都发生在完整 Finding 集合形成前，因此不发布 applied/unused/overmatched waiver audit。

通用 preflight 机制见 [options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

execution 仅把各 area 批准路径的去重并集交给本机 jscpd，不发起网络请求。
custom command 是项目明确授权的 executable，参数均由 adapter 生成；共用 scanner 不扩大 area 比较边界。

## 适用边界

该 Check 负责报告重复片段及其数量；consumer 根据代码语义和架构目标决定是否以及如何重构。它不会自动改写源码，
也不会把 token 数量单独解释为重构优先级。
