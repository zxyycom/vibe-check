# 执行外部命令的 Check

`commandCheck(...)` 将一个单一、无 shell 的外部 command 接入 ordinary Check lifecycle。Product 负责进程启动、协作取消、超时、受限输出捕获和默认终态；调用方可在 spawn 前解析本次 environment，并在完整命令结果上完成领域结算。

默认模式适合 exit status 已足够表达检查结果的工具。需要将完整 command 的 stdout/stderr 转为领域 data、Records 或 typed provider 时，使用 `afterCommand`；工具协议、参数语义、解析规则和保存的业务数据始终由调用方拥有。

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

`commandCheck<Id>(input)` 返回 ordinary Check，且 `checkId` 保留调用方的 literal type。`checkId`、`displayName`、`executable`、`timeoutMs` 与 `outputByteLimit` 必填；constructor 对 closed input policy 做 runtime validation，非法 input 抛出 `TypeError`。preparation 再次无法验证 options 时，该 Check 结算为 `unavailable / invalid-options`。

它还接受 ordinary authoring 的 `enabledByFlags`、`checks`、`dependsOn`、`observes`、`maxParallel`、`admissionPriority`、`mutex`、`resourceClaims` 与 `omitQuietPassedRow`。选择、依赖和调度语义由[自定义 Check](extending-check-lifecycle.md)与[调度 Check](scheduling.md)拥有。

| 字段 | 要求与默认值 |
| --- | --- |
| `executable` | 必填：非空且不含 NUL 的 executable；可为绝对 path 或由平台在最终 environment 中解析的名称。 |
| `arguments` | 可选，默认 `[]`：dense readonly string array；元素可为空但不得含 NUL，每个元素作为独立 argv 传递。 |
| `workingDirectory` | 可选，默认 project root：非空且不含 NUL；relative path 从 project root 解析，absolute path 保持原 target。 |
| `environment` | 可选，默认 `{ mode: "exact" }`。它与 `resolveEnvironment` 互斥，见[环境](#环境)。 |
| `resolveEnvironment` | 可选：在 spawn 前为本次 invocation 返回 closed environment policy，见[环境](#环境)。 |
| `timeoutMs` | 必填：正安全整数，限定一次 command execution。 |
| `outputByteLimit` | 必填：正安全整数，stdout 和 stderr 各自的 byte ceiling。 |
| `output` | 可选，默认 `{ mode: "discard" }`。见[输出](#输出)。 |
| `afterCommand` | 可选：完整 numeric-exit command 的 caller-owned completion，见[调用方完成阶段](#调用方完成阶段)。 |

command 由 executable 和独立 arguments 表示，不是 shell string、pipeline 或 workflow。

## 环境

环境是 closed policy。静态 `environment` 与 invocation-time `resolveEnvironment` 互斥；两者都省略时，child 使用 exact-empty environment。

| policy | child base environment |
| --- | --- |
| `{ mode: "exact", variables? }` | 只使用 `variables` 中的 `Record<string, string>`；省略 variables 即 exact-empty。 |
| `{ mode: "inherit", overrides? }` | execution start snapshot `process.env`；string override 覆盖 key，`null` 删除 key。 |

这张 policy 只确定 caller base environment。Product 在它之后加入固定 plain-text/no-color variables：`CARGO_TERM_COLOR=never`、`CLICOLOR=0`、`CLICOLOR_FORCE=0`、`FORCE_COLOR=0`、`NO_COLOR=1`、`PNPM_CONFIG_COLOR=false`、`PY_COLORS=0`、`TERM=dumb`、`UV_NO_COLOR=1` 与 `npm_config_color=false`。这些 keys 最后覆盖静态 policy 或 resolver 返回 policy 中的同名 value；不能通过此 API 请求 colorized child output。

`resolveEnvironment(context)` 在 spawn 前接收 `project`、direct `dependencies`、prepared command `options` 和取消 `signal`，并返回（或 resolve 为）同一张 policy 表中的值。其返回值同样先作为 caller base environment，再由 Product 加入上述固定 keys。它适合把当前 project 或已声明依赖转换为本次 command 的最小环境：

```ts
const projectCommand = commandCheck({
  checkId: "project-command",
  displayName: "Project command",
  executable: process.execPath,
  arguments: ["--eval", "process.exit(0)"],
  resolveEnvironment: ({ project }) => ({
    mode: "exact",
    variables: { PROJECT_ROOT: project.root }
  }),
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024
});
```

resolver throw 或返回非法 policy 时，不启动 child，Check 结算为 `unavailable / command-environment-resolution-failed`。environment names、values 与 policy object 拒绝 unknown fields、accessor/prototype tricks、`undefined`、非 string 值及 NUL；resolved environment 不会自动进入 Check facts、messages 或 diagnostics。

## 输出

`output` 只选择 child material 的处理边界，不改变默认 terminal mapping。

| policy | 行为 |
| --- | --- |
| `{ mode: "discard" }` | 默认。Product 在受 `outputByteLimit` 约束的 invocation memory 中捕获 stdout/stderr，并在结算后释放；它不自动发布 child material。 |
| `{ mode: "transcript" }` | Product 将 running state 与 final status metadata、raw stdout、raw stderr 原子写入此 Check artifact directory 的固定 `process.log`。 |

transcript 是显式 opt-in artifact capability。没有 `artifactDirectory`，或 running/final write 失败时，Check 为 `unavailable / command-transcript-unavailable`。`process.log` 不包含 executable、arguments、environment 或 native error text。

## 调用方完成阶段

`afterCommand` 把完成 callback 与可选 typed-provider parser 放在同一个对象：

```ts
const reportCommand = commandCheck({
  checkId: "report-command",
  displayName: "Report command",
  executable: process.execPath,
  arguments: ["--eval", 'process.stdout.write("report")'],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand: {
    execute: ({ command, records }) => {
      records.report({ id: "report-command" }, { stdoutLength: command.stdout.length });
      return { status: "passed", data: { report: command.stdout } };
    },
    parseData: (data) => {
      if (typeof data.report !== "string") throw new TypeError("report must be a string");
      return { report: data.report };
    }
  }
});
```

Product 只在 child 具有 numeric exit，且未取消、未 timeout、未达到 output limit、未被 signal 终止时调用 `afterCommand.execute`。若选择 transcript，final write 也必须先成功。callback context 是 ordinary `CheckExecutionContext` 加上 invocation-local `command: { exitCode, stdout, stderr }`；它可以返回普通 `CheckResult` 并按 ordinary Check contract 报告 Records。这个返回值取代完整命令的默认 exit-code mapping。

存在 `parseData` 时，返回值是 typed provider Check，parser 负责验证 callback 返回的 data；没有 parser 时，返回值仍是 ordinary Check。`stdout`、`stderr` 仅在 callback context 中提供，不会因 callback 存在而自动发布。调用方决定是否把派生数据或 Records 放入自己的结果边界，并负责其中的敏感信息处理。

## 默认终态与失败边界

未使用 `afterCommand` 时，完整 numeric exit 的 `passed` 和 `failed` 返回 `CommandCheckFinalData` 的 `{ exitCode: number }`；command-owned unavailable 分支使用 `CommandCheckUnavailableReasonCode`。

| process cause | 默认 Check terminal outcome |
| --- | --- |
| exit code `0` | `passed / { exitCode: 0 }` |
| numeric nonzero exit | `failed / { exitCode }` |
| startup failure | `unavailable / command-start-failed` |
| resolver throw 或非法 policy | `unavailable / command-environment-resolution-failed` |
| timeout | `unavailable / command-timeout` |
| stdout 或 stderr 达到 byte limit | `unavailable / command-output-limit-exceeded` |
| 非 timeout、非 cancellation signal | `unavailable / command-terminated-by-signal` |
| transcript capability 或 write failure | `unavailable / command-transcript-unavailable` |
| 无法验证 prepared options | `unavailable / invalid-options` |
| Core 观察到 caller cancellation | `unavailable / execution-cancelled` |

同时出现多个底层终态标记时，Product 以 **nonzero exit → cancellation → timeout → max-buffer → signal → startup failure → zero exit** 的顺序选择默认 cause。只有完整 numeric exit 才能进入 `afterCommand`；其它分支保留 Product-owned mapping。callback 自身的 throw 或 settlement 继续由 ordinary Check/Core lifecycle 处理。

## 安全边界与公开类型

默认 exact-empty environment 与 discard output 避免 ambient credential 和 child material 自动进入结果或日志。选择 `inherit`、`transcript` 或在 `afterCommand` 发布派生数据时，调用方负责对应 environment、artifact 和结果边界的访问控制、保留和清理。

package root 提供 `commandCheck` 及 `CommandCheckInput`、`CommandCheck`、`CommandCheckWithAfterCommand`、`TypedCommandCheck`、`CommandCheckEnvironment`、`CommandEnvironmentContext`、`CommandEnvironmentResolver`、`AfterCommand`、`AfterCommandContext`、`AfterCommandExecution`、`CompletedCommand`、`CommandCheckOutput`、`CommandCheckFinalData` 与 `CommandCheckUnavailableReasonCode`；精确签名见安装包 declarations。它不提供 shell、pipeline、workflow 或 process-exit adapter，也不保证平台解析的 command 存在。
