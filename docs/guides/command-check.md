# 执行外部命令的 Check

`commandCheck(...)` 将一个单一、无 shell 的外部 command 接入 ordinary Check lifecycle。它负责进程启动、协作取消、超时、受限输出捕获与终态分类；调用方负责 command 的工具协议、参数语义及对 exit status 的解释需求。

适合 exit status 已足够表达检查结果的工具。需要解析结构化输出、生成工具专属 Records 或实现业务级重试时，使用 [`defineCheck`](extending-check-lifecycle.md) 并由该 Check 拥有这些语义。

## 最小用法

下例以当前 Node executable 构造一个通过的 Check。`process.execPath` 是绝对 executable path，不依赖 shell 或 `PATH`；省略的 environment 使用 exact-empty，output 使用 discard。

```ts
import { commandCheck, defineConfig, run } from "@zxyycom/vibe-check";

const nodeProbe = commandCheck({
  checkId: "node-probe",
  displayName: "Node probe",
  executable: process.execPath,
  arguments: ["--eval", "process.exit(0)"],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024
});

const definition = defineConfig({
  checks: [nodeProbe],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === nodeProbe.checkId
)?.outcome;
if (outcome?.status !== "passed" || outcome.data.exitCode !== 0) {
  throw new Error("Node probe did not produce the expected passed outcome");
}
```

## 输入与 ordinary Check 组合

`commandCheck<Id>(input)` 返回 ordinary Check。`checkId` 与 `displayName` 必填且非空；`checkId` 保留调用方的 literal type。它还接受 ordinary authoring 的 `enabledByFlags`、`checks`、`dependsOn`、`observes`、`maxParallel`、`admissionPriority`、`mutex`、`resourceClaims` 与 `omitQuietPassedRow`，其选择、依赖和调度语义由[自定义 Check](extending-check-lifecycle.md)与[调度 Check](scheduling.md)拥有。

命令字段如下：

| 字段 | 要求与默认值 |
| --- | --- |
| `executable` | 必填：一个非空、不含 NUL 的 executable；可为绝对 path 或由平台在最终 environment 中解析的名称。 |
| `arguments` | 可选，默认 `[]`：dense readonly string array；元素可为空，但不得含 NUL。每个元素作为独立 argv 传递。 |
| `workingDirectory` | 可选，默认 project root：非空、不含 NUL；relative path 从 project root 解析，absolute path 保持原 target。 |
| `environment` | 可选，默认 `{ mode: "exact" }`。见[环境](#环境)。 |
| `timeoutMs` | 必填：正安全整数，限定一次 command execution。 |
| `outputByteLimit` | 必填：正安全整数，stdout 和 stderr 各自的 byte ceiling。 |
| `output` | 可选，默认 `{ mode: "discard" }`。见[输出](#输出)。 |

constructor 对 closed input policy 做 runtime validation，非法 input 抛出 `TypeError`；在 execution 前再次无法验证 prepared options 时，该 Check 结算为 `unavailable / invalid-options`。不要把 command 写成 shell string、pipeline 或 workflow；传递一个 executable 和独立 arguments。

## 环境

环境是显式 closed policy，而不是从定义时读取 ambient process state。它先确定调用方的 base environment：

| policy | caller base environment |
| --- | --- |
| `{ mode: "exact", variables? }` | 只使用 `variables` 中的 `Record<string, string>`；省略 variables 即 exact-empty。 |
| `{ mode: "inherit", overrides? }` | 在 execution start snapshot `process.env`；string override 覆盖 key，`null` 删除 key。 |

在该 base 之后，Product 总会加入 plain-text/no-color variables：`CARGO_TERM_COLOR=never`、`CLICOLOR=0`、`CLICOLOR_FORCE=0`、`FORCE_COLOR=0`、`NO_COLOR=1`、`PNPM_CONFIG_COLOR=false`、`PY_COLORS=0`、`TERM=dumb`、`UV_NO_COLOR=1` 与 `npm_config_color=false`。这些固定 keys **最后覆盖** exact `variables`、inherit snapshot 与 `overrides` 中的同名 caller value；调用方不能用此 API 请求 colorized child output。

environment names、values与 policy object 都拒绝 unknown fields、accessor/prototype tricks、`undefined`、非 string 值及 NUL。caller-resolved environment 不进入 Check facts、messages 或 diagnostics；固定 plain-text variables 同样不会发布为 Check data。

## 输出

`output` 只选择 child material 的处理边界，不改变 terminal mapping：

| policy | 行为 |
| --- | --- |
| `{ mode: "discard" }` | 默认。Product 只在受 `outputByteLimit` 约束的 invocation memory 中捕获 stdout/stderr，分类完成后释放。 |
| `{ mode: "transcript" }` | 将 running state 与 final status metadata、raw stdout、raw stderr 原子写入此 Check 的 artifact directory 中固定的 `process.log`。 |

transcript 是显式 opt-in artifact capability。没有 `artifactDirectory`，或 running/final write 失败时，Check 为 `unavailable / command-transcript-unavailable`。`process.log` 不包含 executable、arguments、environment 或 native error text；default discard 也不将 child output 发布到 RunResult、Records、messages、progress、diagnostic 或 machine publication。

## 终态与 final data

`passed` 和 `failed` 都返回 `CommandCheckFinalData` 的 `{ exitCode: number }`。command-owned `unavailable` 分支返回稳定的 `CommandCheckUnavailableReasonCode`，不解释 child output；caller cancellation 是 Core-owned outcome：

| process cause | Check terminal outcome |
| --- | --- |
| exit code `0` | `passed / { exitCode: 0 }` |
| numeric nonzero exit | `failed / { exitCode }` |
| startup failure | `unavailable / command-start-failed` |
| timeout | `unavailable / command-timeout` |
| stdout 或 stderr 达到 byte limit | `unavailable / command-output-limit-exceeded` |
| 非 timeout、非 cancellation signal | `unavailable / command-terminated-by-signal` |
| transcript capability 或 write failure | `unavailable / command-transcript-unavailable` |
| 无法验证 prepared options | `unavailable / invalid-options` |
| Core 观察到 caller cancellation | `unavailable / execution-cancelled` |

底层 process result 同时带有多个终态标记时，Product 以 **nonzero exit → cancellation → timeout → max-buffer → signal → startup failure → zero exit** 的顺序选择 cause。只有 numeric **nonzero** exit 优先保留为 exit fact；`max-buffer` 即使同时带有 `status: 0` 仍先结算为 output-limit。取消由 ordinary Check/Core lifecycle 结算。`CommandCheckOutput`、`CommandCheckEnvironment`、`CommandCheckFinalData`、`CommandCheckUnavailableReasonCode` 与 `CommandCheck` 均从 package root 提供；精确签名见安装包 declarations。

## 安全边界

默认 exact-empty environment 与 discard output 避免 ambient credential 和 child material 自动进入结果或日志。只有在调用方明确选择 inherit 或 transcript，ambient variables 或 raw child output 才会进入调用方选定的 execution/artifact boundary；调用方负责该 boundary 的访问控制、保留和清理。

`commandCheck` 不提供 shell、pipeline、workflow、parser、typed provider、Records projection 或 process-exit adapter。它不保证 platform-resolved command 存在；tool discovery 与业务语义仍由调用方负责。
