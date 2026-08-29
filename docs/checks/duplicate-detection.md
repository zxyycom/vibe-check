# `duplicateDetection`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页是 package consumer 配置和读取 `duplicateDetection` 的主指南。`duplicateDetection(options?)` 使用带默认值的
policy 构造一个普通 `duplicate-detection` Check。该 Check 用 jscpd 比较自己批准的项目文件，把满足行数与 token
policy 的重复片段报告为 supplemental Records，并分别报告 finding 总数与 blocking finding 数量。

默认 package command 使用随 `vibe-check` 安装的 jscpd v5；项目无需选择版本、提供 executable 或复制默认 options：

```ts
import { duplicateDetection } from "vibe-check";

const check = duplicateDetection();
```

## 参数与默认配置

顶层 `cache`、`codeAreas`、`findingPolicy` 与 `scanner` 都可省略；显式 `codeAreas[areaId]` 只要求提供
`files` branch。无参调用物化成以下完整 Check options，调用方无需复制：

```ts
{
  cache: { directory: ".cache/vibe-check", enabled: true },
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
      minimumLines: 3,
      minimumTokens: 75
    }
  },
  scanner: {
    command: { kind: "package" }
  }
}
```

- 省略整个 `codeAreas` 时建立默认 `project` area。显式 map 必须至少包含一个非空 area id。
- 每个显式 area 必须提供 `files` branch。`source` 只能是 `"filesystem" | "git-worktree"`，默认 `filesystem`。
  `filesystem` 枚举普通文件且不解释 `.gitignore`；`git-worktree` 使用已跟踪文件和未被 Git 标准忽略规则排除的
  未跟踪文件。来源不可用时 Check 结算为 `unavailable`，不会切换到另一来源。
- `include` 与 `exclude` 都按 project-root-relative slash path 的 glob 匹配，exclude 优先。两者可分别省略并使用上述
  package defaults；显式数组是完整替换值，`include: []` 不选择路径，`exclude: []` 不排除路径。
- 顶层 `findingPolicy` 只能是 `"blocking" | "non-blocking"`，默认 `blocking`；area 可覆盖，省略时继承顶层值。
- `minimumLines` 与 `minimumTokens` 可省略并分别使用 `3` 和 `75`，显式值必须是正安全整数。
- `cache.directory` 省略时为 `.cache/vibe-check`，相对路径从 project root 解析；`cache.enabled` 省略时为 `true`。
- `scanner.command` 省略时为 `{ kind: "package" }`。
- 未知字段、空 area map、缺失 area `files`、非法阈值或非法 scanner policy 会由 constructor 同步抛出
  `TypeError`。

## 定制区域 policy

调用方只声明要改变的 policy，不需要读取默认 Check 或编写 nested spread。下面两个 area 各自拥有文件范围和阈值；
省略的 file fields、finding policy 与阈值由 constructor 补齐，`files: {}` 则表示全部 file fields 使用默认值：

```ts
import { duplicateDetection } from "vibe-check";

const sourceAndScriptsDuplicateDetection = duplicateDetection({
  codeAreas: {
    source: {
      files: { include: ["src/**/*.ts"] },
      minimumTokens: 20
    },
    scripts: {
      files: {
        include: ["scripts/**/*.ts"],
        exclude: ["scripts/**/*.test.ts"]
      },
      minimumLines: 10,
      minimumTokens: 100
    }
  }
});
```

每个 `codeAreas[id]` 都是该区域文件范围、有效 finding policy 与行数/token 下限的单一事实源。上例的
`scripts.exclude` 只排除测试文件；显式数组是完整值，不会自动追加 package 默认排除项。

## 定制 jscpd executable

只有项目确实授权另一个可执行文件时才设置 custom command：

```ts
import { duplicateDetection } from "vibe-check";

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

默认 package command 使用安装包声明并由 package manager 解析的兼容 jscpd v5。package 或 custom command 的实际版本都会
隔离 cache；command、config 或 report 不兼容时，Check fail closed 为 `unavailable`，不会把无法完成的扫描伪装成零
finding。

## 工作原理

Check 先按文件 `source` 分组；每种不同来源只枚举一次候选文件，再为各 `codeAreas[id].files` 应用自己的
`include` / `exclude`，最后把全部路径去重成一个批准的精确范围。一个路径可同时属于多个 area；全部 exact paths 仍
一次性交给 jscpd，因此同 area、跨 area 与重叠 area 文件都会互相比较：

1. jscpd 使用所有实际输入 area 中最低的 line 阈值和最低的 token 阈值取得完整候选。
2. 每个 raw fragment 的 location path 必须属于本次完整 exact scope；任一路径越界都会拒绝整批 measurement。
3. Check 按 location path 恢复它匹配的全部 areas。fragment 的 line count 和 token count 必须分别达到所有涉及 area
   对应阈值中的最大值，才形成 finding。

例如 `source` 使用 line `3` / token `20`，`scripts` 使用 line `10` / token `100` 时，scanner 使用 line `3` /
token `20` 取得候选；跨这两个 area 的 8-line / 120-token fragment 和 12-line / 80-token fragment 都会被过滤，只有
同时达到 line `10` 与 token `100` 的 fragment 会保留。

cache 只保存通过 exact-input 校验的 scanner fragments；无论是否命中 cache，当前 area annotation 与最终 policy filtering
都走同一路径。只有 package/custom command identity、实际 jscpd 版本、当前 commit、完整 exact-input fingerprint 和实际
影响 scanner 结果的配置均匹配时才会复用；package command identity 不含 consumer 安装目录，custom command identity 使用
项目显式提供的 executable。

## 效果与结果

每个可信 finding 都形成 Record，不因 policy 或先前 finding 而省略。若 fragment 涉及多个 areas，只要任一 effective
`findingPolicy` 为 `blocking`，该 Record 的 `blocking` 就为 `true`。正常 final data 恰为
`{ findingCount, blockingFindingCount }`；前者等于 Records 数量，后者等于其中 `blocking: true` 的数量。
`blockingFindingCount > 0` 时 outcome 为 `failed`，否则为 `passed`，所以 passed outcome 可以携带 non-blocking Records。

每个 Record data 使用以下字段：

```ts
{
  blocking: boolean,
  metric: "duplicate-tokens",
  tokenCount: number,
  lineCount: number,
  codeAreas: string[],
  locations: Array<{ path: string; startLine: number; endLine: number }>
}
```

`failed` 的 `blocking-findings` message 与携带 non-blocking Records 的 `passed` 的 `non-blocking-findings` message 都会引导
调用方检查本 Check 的 Records。由本 Check 结算的 `unavailable` 会使用对应 `reason.code` 提供 error message；零 finding
的 `passed` 与 `not-applicable` 不合成人为提示。

用返回 Check 的 `check.parseData(value)` 或 package root 的 `parseDuplicateDetectionData(value)` 验证 final data。两者返回
`DuplicateDetectionFinalData`，Record 与不可用原因可分别用 `DuplicateDetectionRecordData` 和
`DuplicateDetectionUnavailableReasonCode` 标注；authoring / resolved options types 是 `DuplicateDetectionOptions` 与
`ResolvedDuplicateDetectionOptions`。parser 只适用于 `passed` / `failed` data，shape 或计数不变量不匹配时抛出
`TypeError`。

## `not-applicable` 与 `unavailable`

- 少于两个合格 exact inputs：`not-applicable / no-eligible-input`。
- constructor 后形成的 resolved options 不符合完整 shape：`unavailable / invalid-options`。
- 所配置的 filesystem 或 git-worktree 来源无法形成候选快照：`unavailable / source-unavailable`。
- package/custom command 缺失、version probe 失败或无法形成可识别版本 provenance：
  `unavailable / external-dependency-unavailable`。
- 已启动 jscpd 但进程执行失败：`unavailable / external-execution-failed`。
- cache 写入失败：`unavailable / cache-write-failed`。
- report、fragment 或 exact-input membership 无法形成可信完整结果：`unavailable / external-result-invalid`。

通用 preflight 机制见 [options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。

## I/O 与安全边界

execution 启动一次本机 jscpd 调用；输入只包含各 `codeAreas[id].files` 批准的 exact paths 去重并集。显式配置
`scanner.command.kind: "custom"` 表示项目授权执行其中的 executable；所有传入参数由 owning adapter 生成。该 Check
不发起网络请求。

## 最小用法

```ts
import { defineConfig, duplicateDetection, run } from "vibe-check";

const result = await run(defineConfig({ checks: [duplicateDetection()] }));
```

## 适用边界

该 Check 负责报告重复片段及其数量；consumer 根据代码语义和架构目标决定是否以及如何重构。它不会自动改写源码，
也不会把 token 数量单独解释为重构优先级。
