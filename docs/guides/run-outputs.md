# 配置 Run 输出与诊断

需要调整终端显示、保存机器结果或排查一次 Run 时，先按目的选择输出，再配置本次覆盖、预览或日志目标。下文先说明常用配置，再说明如何读取输出状态和处理失败；Check facts 与 Run 分支的共同模型见 [API 机制](../api-mechanics.md#runresult-分支)。

## 默认输出与本次覆盖

`defineConfig` 默认启用 progress rendering 和 machine publication（目录 `artifacts/vibe-check`），关闭 diagnostic logging（默认目录 `.log/vibe-check`）。Definition 的 `outputs` 保存可复用默认值，RunControls 的 `outputs` 逐字段覆盖本次调用；省略或 `undefined` 不覆盖，`false`、数量 `0` 与 `formatter: null` 都有明确作用。即使关闭对应输出，提供的字段仍须通过 validation。参数归属见 [Definition 与 invocation](../api-mechanics.md#参数应该放在哪里)。

## 常用配置

先按目的选择字段。表中的 `outputs.*` 均可写入 Definition 作为默认值，也可写入 RunControls 只调整本次调用；其它字段只属于本次 Run。

| 想做什么 | 设置什么 | 得到什么 |
| --- | --- | --- |
| 开关终端进度 | `outputs.progressRendering.enabled` | `true` 显示人读 lifecycle；`false` 关闭呈现，Check 仍正常执行与结算。 |
| 调整每项明细数量 | `outputs.progressRendering.recordPreviewLimit`、`messagePreviewLimit` | 每个 settled row 默认分别最多显示 5 条；`0` 隐藏该类明细并保留省略数量。 |
| 调整单条预览长度 | `outputs.progressRendering.textPreviewCodePointLimit` | 默认最多 240 个 Unicode code points；数值边界和 formatter 用法见下文。 |
| 保存机器结果 | `outputs.machinePublication.enabled`、`directory` | terminal snapshot 形成后写入 machine files；稳定消费格式见[机器输出契约](../output.md)。 |
| 开启排障日志 | `outputs.diagnosticLogging.enabled: true`，按需设置 `directory` | 为本次 Run 写入 core 与 scheduler 日志。 |
| 保存终端进度副本 | RunControls 的 `progressLogFile` | 将相同的 terminal presentation 镜像到指定文件。 |
| 在本次隔离目录中使用固定日志文件名 | RunControls 的 `diagnosticLogFileNaming: "channel"`，同时开启 diagnostic logging | 使用 `core.log`、`scheduler.log`；目录选择与冲突行为见[日志与输出目标](#日志与输出目标)。 |

## Check messages 与受管 progress

Check 在 terminal result 中返回有序的 `messages`；它们是人读补充信息，consumer 仍先按 outcome 处理 final data 和 Records。启用 progress rendering 后，每个 settled row 默认最多预览五条 Records 与五条 messages，且每条正文默认最多 240 个 Unicode code points；两个数量必须为非负 safe integer，文本预算必须为正 safe integer，Definition 或本次 Run 可独立改变它们。`0` 只隐藏该类 detail，仍显示准确 omitted count；短预算时 `… [truncated]` 只保留放得下的 marker 前缀。accepted Records 与 final data 是 Check facts，按各自的 `RunResult` / machine contract 保留，messages 则保留在 `RunResult.checkMessages` 供人读。renderer 的截断、formatter 或关闭不会改写它们。

在 callback 已等待的异步工作中通过全局 `console.*` 发出的文本，会作为该 Check 的 `console-<method>` messages 呈现。它适合短的人读诊断：不要向 console 写入 secret，也不要依赖 progress 文本保存完整事实。`process.stdout.write`、`process.stderr.write`、流式或 child-process 输出应写入 Check-owned file、transcript 或独立 logger；这些输出不具有可靠的 Check 归属，直接写入受管 terminal 也可能与 progress 交错。需要稳定补充说明时，在 terminal result 返回结构化 `messages`。

### 配置 preview 文本

需要在终端中保留长文本的前后片段时，把同步 `formatter` 写进 Definition。它接收冻结的 `{ kind, text, maxCodePoints }`：`kind` 是 `"record"` 或 `"message"`，`text` 是选中项未转义、未截断的默认正文（Record 为 local ID 加 canonical JSON，message 为正文），`maxCodePoints` 是当前文本预算。Product 仅对数量限制内的项调用一次，先 Records 后 messages；返回值仍由 Product 转义并限长。如下例把长文本折叠为头尾片段，并在本次 Run 单独缩小 Record 数量：

```ts
import {
  defineCheck,
  defineConfig,
  run,
  type ProgressPreviewFormatter
} from "@zxyycom/vibe-check";

const headAndTail: ProgressPreviewFormatter = ({ text, maxCodePoints }) => {
  const points = [...text];
  if (points.length <= maxCodePoints) return text;
  const tailLength = Math.max(1, Math.floor(maxCodePoints / 3));
  const headLength = Math.max(0, maxCodePoints - tailLength - 1);
  return `${points.slice(0, headLength).join("")}…${points.slice(-tailLength).join("")}`;
};

const detail = defineCheck({
  checkId: "detail",
  displayName: "Detail",
  execution: ({ records }) => {
    records.report({ id: "long-detail" }, { text: "a verbose diagnostic value" });
    return { status: "passed", data: {} };
  }
});

const definition = defineConfig({
  checks: [detail],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { formatter: headAndTail, textPreviewCodePointLimit: 48 }
  }
});

const result = await run(definition, {
  outputs: { progressRendering: { recordPreviewLimit: 1 } }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

文本预算只限制转义后的 preview 正文（含截断 marker），不包含缩进、label、换行、汇总或省略提示；Unicode code points 不等于终端列宽或 graphemes。

formatter 返回空字符串仍是一条呈现项；throw 或返回非字符串（包括 Promise/thenable）只使 `outputs.progressRendering` failed，不回退默认文本，也不改变 Check/Record/message facts。它是 trusted project code：可见完整默认文本，不能把预算当成 redaction/access control，Product 不 sandbox 其独立 I/O 或 detached work。`formatter: null` 可在 RunControls 明确清除 Definition formatter；省略或 `undefined` 不覆盖。Definition 的数值与 formatter 种类参与 declarative fingerprint，但函数 identity/source/closure 以及 RunControls 覆盖均不参与。

## Progress rendering

TTY 使用可更新的 running region；plain output 与 `TERM=dumb` 只追加 settled presentation。每个可见 settled row 保留 measured duration 或 `not run`；完整、canonical-ordered `RunResult.checkDurations` 仍保留所有 Check，未执行项为 `null`。`visibility: "attention"` 只隐藏既无 accepted Record 也无 author/captured message 的 passed settled row，不隐藏 running Check。

flag control barrier 结束后，因 `enabledByFlags` 未匹配而未启动的 Checks 以一个原因块分组呈现，而非逐项 settled row；dependency activation 带入的 Check 不在该组。两种显示压缩都不改变 Check facts、accounting 或结果。配置 `progressLogFile` 时，同一 rendered bytes 先写 terminal、再写 file；file setup/write/close failure 使 progress output failed，但不吞掉 terminal presentation。

## Finding message presentation

producing Check 可用 `presentCheckFindings(...)` 从完整 Finding facts 形成有限的 terminal messages。输入、omission summary、完整明细位置与随包 Check 的采用见[呈现 Check Finding](presenting-findings.md)。

## 日志与输出目标

machine publication 与 diagnostic logging 的 `directory` 都是调用方选择的非空、无 U+0000 的受信任 target：相对路径从 effective `projectRoot` 解析，绝对路径直接使用；它们不提供 containment 或 sandbox 语义。`progressLogFile` 使用相同的路径规则。

diagnostic logging 为当前 invocation 写入人工诊断。它用于关联 Run、Check、phase 与 Scheduler 行为；日志不是 parser/schema、跨 invocation discovery 或 retention contract，也不替代 Check final data、Record 或 message。

diagnostic 文件默认使用 `core-<utc-compact>-<uuid>.log` 与 `scheduler-<utc-compact>-<uuid>.log`。调用方已有隔离的 invocation 目录时，可以在 controls 同时设置 `diagnosticLogFileNaming: "channel"` 与 `outputs.diagnosticLogging: { enabled: true, directory: "<本次目录>" }`，得到 `core.log` 与 `scheduler.log`，不额外创建目录层级。Product 不保证该目录独占：每 channel 始终 exclusive-create，冲突即 failed，不覆盖、追加或退回唯一名；两个 channel 不是原子事务，一个失败时另一个仍可成功。从 channel `file` 读取实际目标；命名选项只控制文件名；日志内容保留 invocation ID、共享 sequence 与 elapsed-time correlation 信息。

启用 diagnostic logging 时，scheduler channel 可给出本次 Run 的 `scheduler.summary`：它帮助解释 admission、等待、capacity 与 tail 的当前诊断投影。time 与 capacity 指标只描述 Scheduler 行为，不表示 CPU、memory、thread 或 process 的 OS utilization；需要 machine-readable 结论时，仍读取 machine output 和 Check facts。

## 输出状态与失败处理

只有 non-configuration `RunResult` 具有有效 output configuration 与 `outputs` readback。每项 status 使用 `"disabled" | "not-run" | "succeeded" | "failed"`。`RunResult.outputs.progressRendering` 返回 `{ enabled, status }`；预览文本、effective limits 与 formatter 由配置和呈现流程使用，不包含在返回值中。

channel setup、write 或 close failure 只使对应 output failed，不改写已经形成的 Check/Record facts，也不阻断其它 output 结算。

当 primary Run 已正常完成时，output failure 使结果成为 `kind: "output"`；多个 failure 依次选择 progress rendering、machine publication、diagnostic logging、measurement hooks 的第一个作为 diagnostic。`scheduler-measurement-hooks-failed` 因而只表示 measurement hook 是按该顺序选中的 failure；cancellation 或 execution diagnostic 保持原有 primary result，hook failure 仍在 `outputs.measurementHooks.status` 可见。

### Diagnostic channel 状态

`outputs.diagnosticLogging` 的形状为 `{ enabled, status, channels }`，其中 `channels` 是 `core`、`scheduler` 的 `{ enabled, status, file }` map。禁用 channel 的 `file` 为 `null`；启用 channel 即使创建文件失败也保留预先计算的 `path.relative(projectRoot, resolvedFile)`，因此 root 外 target 可含 `..`，跨卷时平台可以返回 absolute path。任一 enabled channel failed 时 aggregate status 为 `failed`，只有全部 enabled channel succeeded 时为 `succeeded`。

### Measurement hook 状态

`scheduler.measurementHooks` 在 Definition 中配置，不能由 RunControls 注入或覆盖。终态观察交付给调用方配置的 generic Hooks 与 prepared strategy 的 public `complete`；调用顺序和 context 见[调度专题](scheduling.md#观察终态-measurement)。

`outputs.measurementHooks` 的形状为 `{ enabled, status }`：

| 条件 | `enabled` / `status` |
| --- | --- |
| normalized `scheduler.measurementHooks` 非空，或 successful prepared strategy 实际提供 `complete` | `enabled: true`。 |
| 两者都没有 | `enabled: false`，`status: "disabled"`。 |
| enabled Run 没有 sealed terminal sequence | `status: "not-run"`。 |
| sealed sequence 中所有 generic Hooks 与可选 public `complete` 都成功 | `status: "succeeded"`。 |
| 任一 generic Hook 或 `complete` throw/reject | `status: "failed"`；后续 `complete` success 不会覆盖已记录的 generic failure。 |
