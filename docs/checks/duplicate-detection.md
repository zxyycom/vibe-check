# `duplicateDetection`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页是 package consumer 配置和读取 `duplicateDetection` 的主指南。`duplicateDetection(options?)` 使用带默认值的
policy 构造一个普通 `duplicate-detection` Check。该 Check 用 jscpd 比较自己批准的项目文件，把满足行数与 token
policy 的重复片段报告为 supplemental Records，并分别报告 finding 总数与 blocking finding 数量。
可选 waiver 在完整 duplicate Finding 集合形成后按排序 location ranges 对账，不会缩小 jscpd 输入或 cache evidence。

默认 package command 使用随 `@zxyycom/vibe-check` 安装的 jscpd v5。发布 manifest 的当前兼容范围是
`^5.1.1`（下界为 5.1.1、上界不含 v6）；repository lockfile 则固定本 Change 验证过的 5.1.1。项目无需选择版本、提供 executable 或复制默认 options：

```ts
import { duplicateDetection } from "@zxyycom/vibe-check";

const check = duplicateDetection();
```

## 参数与默认配置

顶层 `cache`、`codeAreas`、`findingPolicy`、`findingWaivers` 与 `scanner` 都可省略；显式 `codeAreas[areaId]` 只要求提供
`files` branch。无参调用物化成以下完整 Check options，调用方无需复制：

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

这里的 `defaultProjectFileSelection` 是从 package root 公开的深冻结完整基线；constructor 会把同值 files branch 物化到
自己的 resolved options，调用方无需复制该对象；完整默认 glob 可直接从该 public value 读取。

- 省略整个 `codeAreas` 时建立默认 `project` area。显式 map 必须至少包含一个非空 area id。
- 每个显式 area 必须提供 `files` branch。`source` 只能是 `"filesystem" | "git-worktree"`，默认 `filesystem`。
  `filesystem` 枚举普通文件且不解释 `.gitignore`；`git-worktree` 使用已跟踪文件和未被 Git 标准忽略规则排除的
  未跟踪文件。来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
- `include` 与 `exclude` 都按 project-root-relative slash path 的 glob 匹配，exclude 优先。两者可分别省略并使用公开的
  `defaultProjectFileSelection`；显式数组是完整替换值，`include: []` 不选择路径，`exclude: []` 不排除路径。
- 顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `non-blocking`；area 可覆盖，省略时继承顶层值。
- `findingWaivers` 省略时为 `[]`。每项必须是 closed `{ identity, reason }`，reason 非空且 identity 唯一。identity 恰为
  `{ metric: "duplicate-tokens", locations }`；`locations` 至少两项，必须逐项复制 Finding Record 中的完整
  `{ path, startLine, endLine }`。数组先按 path 文本升序，再按 `startLine`、`endLine` 数值升序严格排序。path 是 normalized
  project-root-relative slash path，line 是正安全整数且
  `endLine >= startLine`；缺失、重复或乱序 location 都会被拒绝。
- `minimumLines` 与 `minimumTokens` 可省略并分别使用 `4` 和 `100`，显式值必须是正安全整数。
- `cache.directory` 省略时为 `.cache/vibe-check`，相对路径从 project root 解析；`cache.enabled` 省略时为 `true`。
- `scanner.command` 省略时为 `{ kind: "package" }`。
- 未知字段、空 area map、缺失 area `files`、非法阈值或非法 scanner policy 会由 constructor 同步抛出
  `TypeError`。

## 定制区域 policy

调用方只声明要改变的 policy，不需要读取默认 Check。下面两个 area 各自拥有文件范围和阈值；省略的 file fields、
finding policy 与阈值由 constructor 补齐。只有追加默认数组时才组合公开的 files 基线：

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

每个 `codeAreas[id]` 都是该区域文件范围、有效 finding policy 与行数/token 下限的单一事实源。上例的
`scripts.exclude` 显式保留 common defaults 并追加测试文件；若只写 `["scripts/**/*.test.ts"]`，它会完整替换默认排除数组。
Area 同时是比较边界：上例中只属于 `source` 的文件不会与只属于 `scripts` 的文件形成 Finding。若项目需要跨这两个目录
比较，应另声明一个同时选中两类路径的 area，而不是依赖它们恰好进入同一次 scanner 调用。

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

匹配零条时是 `unused`；一条时是 `applied`；多条时是 `overmatched`，且不豁免任何片段。range 变化会让旧 waiver
stale 并进入 audit，而不会误匹配同一文件组合中的另一个 fragment。

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

`executable` 必须是已授权、可执行且**直接接受 jscpd CLI 参数**的 command。public scanner policy 只选择 command；
owning adapter 负责 version probe、exact-path config、JSON report 与 jscpd 的自动 worker policy。实际版本用于区分 cache
provenance，不要求 custom command 等于 package 当前安装的版本。

需要靠前置参数才能转发到 jscpd 的通用 runtime（例如 `node path/to/jscpd.js`）不是受支持的 custom command；应直接
提供 jscpd executable 或一个已授权的专用 wrapper executable。

默认 package command 使用安装包声明并由 package manager 解析的兼容 jscpd v5。repository、candidate 与
external-consumer 的发布验收会验证 resolved manifest、contained bin 和实际 engine version 一致；这是发布证据，
不把 package command 的每次 availability probe 变成 exact-5.1.1 runtime gate。package 或 custom command 的实际版本
都会隔离 cache；command、config 或 report 不兼容时，Check fail closed 为 `unavailable`，不会把无法完成的扫描伪装成零
finding。

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

例如互斥的 `source` 与 `scripts` area 分别选中一个 location 时，两者没有共同 area，该 fragment 会被过滤。若另有
`application` area 同时选中这两个 location，并使用 line `10` / token `100`，则只有同时达到这两个下限的 fragment 会以
`codeAreas: ["application"]` 形成 Finding。

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

`failed` 的 `blocking-findings` message 与携带 non-blocking Records 的 `passed` 的 `non-blocking-findings` message 后，会按
仍 actionable 的稳定 Finding 顺序直接展示最多十条安全摘要；每条只包含 token/line counts 和最多两个项目相对 location，更多 location
只显示剩余数量。Finding 超过十条时再用 `findings-omitted` 说明未显示数量，完整集合仍从本 Check 的 Records 读取。由本
Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；零 finding 的 `passed` 与 `not-applicable` 不合成
人为提示。Applied waiver 另附 `finding-waived` info；unused/overmatched authoring 附 warning，并从 audit Record 保留完整
identity 与 reason。

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

execution 启动一次本机 jscpd 调用；输入只包含各 `codeAreas[id].files` 批准的 exact paths 去重并集。union 只优化 scanner
执行，不扩大任何 area 的比较边界；共同 area 过滤仍在可信 raw result 上执行。显式配置
`scanner.command.kind: "custom"` 表示项目授权执行其中的 executable；所有传入参数由 owning adapter 生成。该 Check
不发起网络请求。

## 最小用法

```ts
import { defineConfig, duplicateDetection, run } from "@zxyycom/vibe-check";

const result = await run(defineConfig({ checks: [duplicateDetection()] }));
```

## 适用边界

该 Check 负责报告重复片段及其数量；consumer 根据代码语义和架构目标决定是否以及如何重构。它不会自动改写源码，
也不会把 token 数量单独解释为重构优先级。
