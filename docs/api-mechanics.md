# 深入理解 Vibe Check API 机制

本文说明 package 的通用 invocation lifecycle：自定义 Check 如何经过 Definition validation、options preflight、execution 与 settlement，以及一次 Run 如何形成 dependency data、aggregation、outputs 和可判别结果。首次集成先阅读[package README](../README.md)；随包 Check 的 options、业务效果和安全边界由各自指南说明；单个 public 字段与函数签名以 installed declarations 为准。

## 一次 Run 的生命周期

以下顺序描述责任与数据流；箭头表示当前阶段成功形成下一阶段的输入：

    ordinary Check values
      │ defineConfig: fill Definition defaults
      ▼
    Project Definition
      │ run: validate Definition + RunControls, then normalize the Check tree
      ▼
    declarative snapshot + fingerprint + complete static graph validation
      │ sequential all-Check preflight barrier
      ▼
    prepared Checks / blocked unavailable outcomes
      │ build the ready task graph; apply dependency, mutex and parallel scheduling
      ▼
    author execution + terminal settlement
      ▼
    snapshot + messages + durations
      │ optional aggregation + enabled output completion
      ▼
    RunResult

Run 在 preflight 前验证包含全部可执行 Check 的静态 task graph；完整 barrier 结束后，blocked Check 先结算为
`unavailable`，其余 prepared Checks 再形成 ready task graph。Run snapshot 保存 Check facts；progress rendering 呈现
execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files。所有 author execution 都在完整
preflight barrier 之后开始，optional aggregate 也在 terminal facts 结算后计算。

## Definition 与 invocation 的责任

- `defineCheck(value)` 保留 literal `checkId`、options 和 typed-provider parser 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight 与 execution callbacks 保持为执行行为。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

## options preflight 与 execution

可执行 Check 可以提供 `preflight(options, signal)`，在 author execution 前准备本次 invocation 使用的 options。authored 与 prepared options 同形时可以直接使用 authored options；两种 shape 不同时，TypeScript 要求提供 preflight。

preflight 返回以下三种 closed result 之一：

| 结果 | execution 输入与 Check outcome |
| --- | --- |
| `{ status: "success", preparedOptions, messages? }` | 使用 `preparedOptions` 进入 execution。 |
| `{ status: "failure", action: "block", reason, messages? }` | owning Check 以 `unavailable` 结算。 |
| `{ status: "failure", action: "continue", reason, fallback, messages? }` | 使用 `fallback` 进入 execution。 |

Run 按 Definition 顺序执行所有 Check 的 preflight，完整 barrier 结束后才启动 Check scheduler。preflight throw、malformed result 或 noncanonical prepared value 把 owning Check 结算为 `unavailable`。prepared options 与 fallback 都会成为 detached、deep-frozen 的 invocation-local value；preflight messages 与后续 terminal outcome 共同呈现 preparation 结果。

Package root 的 `defaultProjectFileSelection` 只是 file-selecting constructor 共用的可组合、深冻结 baseline；spread 该
value 不会建立跨 Check global config。部分 constructor 原样物化它，具有更窄文件类型能力的 constructor 从相同
source/exclude 派生精准默认 include；显式 `include` / `exclude` 数组始终由 owning Check 视为完整替换。每项实际默认与
selected-but-rejected 行为由对应 Check 指南说明。

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` / `unavailable` 以 reason 表示本次调用的数据边界。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records。

`messages?` 是 owning Check 可选的有序人读说明；consumer 必须先按 outcome 处理事实，不能用 message presence 推断状态。final data、Records 和 messages 分别承载主要事实、补充事实和人读说明。随包 Check 的额外 message 保证由各自指南说明。

### Check 输出与受管 progress

Check execution 与 Product progress 在调用方的同一个 runtime 中运行。默认 progress 在可用 TTY 上维护临时 running
region，并在同一个 terminal 上移动光标。Product 在每个 Check 的 awaited preflight/execution async context 中临时路由
全局 `console.*`：当前 Check 的调用先进入独立内存数组，settlement 后再与该 Check 的 row 连续呈现，并以
`console-<method>` code 保留在 `RunResult.checkMessages`。并发 Check 的数组互不混合；Check context 外的 host console
继续走原方法。

- `console.log` / `info` / `debug` 等普通输出映射为 `info`，`warn` 映射为 `warning`，`error` / `trace` / failed
  `assert` 映射为 `error`。Product 使用非彩色 Console formatting，并在最终 renderer 中转义 terminal controls。
- preflight console 排在 preflight author messages 前；execution console 排在 terminal author messages 前。callback
  随后 throw、取消或返回 malformed result 时，已经捕获的 console 文本仍保留，非法 author message attachment
  仍按原规则整体拒绝。
- 捕获只覆盖通过当前全局 `console` 发起、且属于 callback 已等待 async work 的调用。预先保存的 method reference、
  callback 自行替换全局 console、未等待的 floating work，以及 `process.stdout.write` / `process.stderr.write` 不在
  可靠归属边界内。
- 高容量、流式或 child-process 输出必须写入 Check-owned file、transcript 或独立 logger；不要让它继承受管 terminal
  stream。console capture 不进入 final data、Records、Check facts 或 machine output，也不替代可持久诊断材料。

`diagnosticLogging` 默认关闭；调用方显式启用后，`check.finished` diagnostic 会像其它 settled messages 一样包含 captured
console 内容。因此 console 不应写入 secret；只需要内存 readback 时保持 diagnostic logging disabled。

需要稳定补充说明时仍优先在 terminal result 返回结构化 `messages`；console capture 是对常见 author logging 的安全
兼容边界，不是新的 live observer 或 Check logger API。在 `run(...)` 返回后由调用方打印汇总不受 running region 约束。

## Finding presentation

`presentCheckFindings(...)` 是 package root 的通用 presentation helper。它不规定 Finding shape 或完整明细位置；producing
Check 必须提供稳定排序的 `findings`、非负安全整数 `limit`、单条 `message` hook，以及超限时的
`omittedMessage` hook：

```ts
import { presentCheckFindings } from "@zxyycom/vibe-check";

const messages = presentCheckFindings({
  findings,
  limit: 20,
  message: (finding) => ({
    code: "finding-detail",
    level: finding.blocking ? "error" : "warning",
    message: `${finding.path}:${finding.line} ${finding.summary}`
  }),
  omittedMessage: ({ omittedCount, omittedFindings, presentedCount, totalCount }) => ({
    code: "findings-omitted",
    level: omittedFindings.some((finding) => finding.blocking) ? "error" : "warning",
    message: `${omittedCount} more of ${totalCount} findings; inspect reports/my-check.json after the first ${presentedCount}.`
  })
});
```

helper 只调用前 `limit` 项的 `message` hook；超限时再调用一次 `omittedMessage`。超限 context 同时给出完整计数和
原 `omittedFindings` references，因此 Check 可以决定省略项等级，并明确告诉 consumer 去 Records、artifact、transcript
或其它实际位置深入查看。返回值只是已冻结 `CheckMessage[]`；Check 仍需把它附加到自己的 terminal result，并自行保存
完整 Finding facts。四项随包质量 Check 使用该通用机制但各自选择 `limit: 10` 和安全字段。

## Finding waiver reconciliation

`reconcileFindingWaivers({ findings, identify, waivers })` 是 package root 提供的独立 helper，供 custom Check 或其它
finding producer 在**完整** finding 候选集合形成后对账。`identify(finding)` 对输入顺序中的每个原 finding 接收完整
finding；调用方自行选择稳定的语义 identity，例如 path、function name 和 metric 的组合。`identify` 的结果与
`waiver.identity` 都必须可安全 materialize 为 canonical JSON，helper 按 canonical JSON 的结构而非对象引用匹配。

每项 waiver 的 identity 必须唯一且 reason 为非空 string。重复 canonical identity、无法 canonicalize 的 finding 或
waiver identity、无效 reason，或 malformed / hostile waiver authoring 都抛出 `TypeError`。每个 configured waiver 都在完整
集合上获得 audit：`0` 次匹配是 `unused`，`1` 次是 `applied`，`>1` 次是 `overmatched`；过宽 waiver 不会豁免任一 finding。

输出 `findings` 保持输入顺序，并在每项结果中保留同一个原 finding reference。applied waiver 附带的 evidence 是 detached、
deep-frozen 的 canonical materialization，因此调用方之后修改 authored identity 或 reason 不会改变结果。helper 只返回
finding disposition 和 waiver audit；它不发布 Record、message 或 terminal outcome。采用它的 Check 自己决定如何发布证据及
如何结算 actionable finding。

## 递归组合与继承

带 `execution` 的节点形成自己的 outcome；没有 `execution` 的节点只组织子 Check 和 scheduling scope。普通对象字段表示显式 replacement；`inherit({ add, remove })` 只用于在父 `dependsOn` 或 `mutex` collection 上增删。解析后，每个可执行节点拥有自己的 effective options、dependencies、mutexes、visibility 与 parallel budget。

## 类型化依赖数据

producer 同时声明 `execution` 与 `parseData`，从而拥有 final-data contract。consumer 先声明 direct `dependsOn`，再用非泛型 `dependencies.get(checkId)` 读取 canonical data、收窄 `ok`，最后调用 producer 的 parser。

### 完整运行示例

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    const data = changedFiles.parseData(read.data);
    return { status: read.status, data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

dependency reader 为已声明且具有 `passed` / `failed` final data 的 direct dependency 返回 `ok: true`，并保留 upstream status；其它读取返回包含原因的 `ok: false`。producer parser 负责 shape、invariant 和 compatibility validation，consumer 显式调用它恢复 provider data。七个随包 Check 都提供 `parseData` 和同实现的 package-root parser；名称与类型见各自指南。

## RunControls 与 Check aggregation

`RunControls` 只作用于一次 `run(definition, controls)`：

- `projectRoot` 决定项目相对路径的解析根。
- `flags` 成为 callback 可读的 normalized project context。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `outputs` 覆盖本次 diagnostic logging、machine publication 或 progress rendering。
- `checkAggregation` 选择 `checks`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

Check-specific invocation facts 由 owning Check 的 options 或 producing Check 的 final data 承载。多个 Checks 共享同一事实时，producer 负责 acquisition policy 与 data shape，下游通过 direct `dependsOn` 读取；上面的 typed dependency 示例聚焦这条 data handoff。

## outputs 与 RunResult 边界

Definition outputs 提供 diagnostic logging、machine publication 与 progress rendering 三项独立 defaults，RunControls 可以只覆盖当前调用需要的部分。configuration 成功后的职责如下：

- 只有 diagnostic logging 或 machine publication 至少一项启用时，Run 才在创建 invocation 阶段捕获一次 immutable wall-clock `startedAtUtc`；两项都禁用时不读取或序列化 wall clock。
- 启用的 diagnostic logging 在 preflight 前以该 instant 命名 UTC-compact log path，并按事实形成顺序记录 Product core 已知的 invocation、planning、scheduler、handoff 与 output 时间线。每个事件以序号、单调 elapsed、可筛选的 `[]` 标签和 event name 开始；普通事实使用 `key=value`，超出当前主行容量的事实进入有界 continuation line。标签只突出 Run、Check、phase、Scheduler decision 和 outcome 等高频阅读轴；Scheduler decision 的顶层 `kind` / `taskId` 与 Record observation 的顶层 `result` 已由标签完整表达时，不在 facts 中重复。
- 启用的 machine publication 将同一个 instant 投影为 `run.json` 的 `invocation.timestamp`，所以 timestamp 不是 publication 完成时间；两项同时启用时，日志文件名与 machine timestamp 必须共享该一次捕获。
- progress rendering 呈现人读 lifecycle。三项 output 都由 Run 调度，并分别返回 status。

这些 diagnostic 行不建立可解析 schema。Run 结束前最后一条可写 diagnostic event 是 `run.terminal-before-log-close`：它只证明 terminal fact 已写入、logger close 尚未确认，随后才尝试关闭日志。

只有 non-configuration `RunResult` 具有有效 output configuration 与 `outputs` readback。此时
`outputs.diagnosticLogging` 的形状为 `{ enabled, status, file }`，其中 `status` 是
`"disabled" | "not-run" | "succeeded" | "failed"`；禁用时 `file` 为 `null`，启用时即使文件创建失败也保留预先计算的、
project-root-relative `run-<UTC 紧凑时间>-<UUID>.log` 目标。无效 Definition、controls 或 aggregation selection 直接返回
configuration diagnostic，不创建诊断日志。

diagnostic logging 只服务当前人工诊断：它没有 parser、schema/version、跨版本格式兼容、`latest`、retention 或跨 invocation
discovery contract，也不替代 Check final data、Record、terminal message 或 Check/process adapter 自有的 transcript。logging
failure 只把该 output 标为 failed，不改写已形成的 Check/Record facts，也不阻断 progress rendering 或 machine publication 的
闭合。多个 output 都失败时，`RunResult.outputs` 保留每项 status；唯一 `output` diagnostic 依次选择 progress rendering、
machine publication、diagnostic logging。diagnostic logging 不进入 machine v4；其 machine-field 排除见
[机器输出契约](output.md)。Check final-data parser 只处理已经取得的单个 data object，不替代该契约。

progress rendering 在 TTY 中维护 running region，在 plain output 与 `TERM=dumb` 中只追加 settled rows。`visibility: "attention"` 只隐藏无 author/captured messages 的 passed settled row，不改变 outcome、Records 或 machine output；accepted author message 与 captured console code 都保留在 `RunResult.checkMessages`，终端只呈现 level 与正文。renderer failure 进入对应 output status，不改写已形成的 Check facts。

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支 | 可用 facts 与处理方式 |
| --- | --- |
| `completed` | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。 |
| `output` | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。 |
| `cancelled` / `phase: "execution"` | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。 |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。 |
| `configuration` | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。 |
| `planning` | task-graph diagnostic 与 invocation metadata。 |
| `execution` | Product execution-settlement diagnostic 与 invocation metadata。 |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 diagnostic logging、publication 或 rendering failure diagnostic。
