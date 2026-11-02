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
| `outputByteLimit` | 必填：正安全整数，stdout 和 stderr 各自的近似文本缓冲限额。计量与回收边界见[输出](#输出)。 |
| `output` | 可选，默认 `{ mode: "discard" }`。见[输出](#输出)。 |
| `afterCommand` | 可选：完整 numeric-exit command 的 caller-owned completion，见[调用方完成阶段](#调用方完成阶段)。 |

command 由 executable 和独立 arguments 表示，不是 shell string、pipeline 或 workflow。

## Callback 声明与输入

两个扩展点接受[共同 descriptor](callback-context.md)，普通 function、缺省/undefined needs 或 []
均为零需求。TypeScript 需要框架字段时使用 `defineContextCallback`，其 phase 与字段如下：

| helper phase | 第一业务参数 | 可声明的完整顶层字段 |
| --- | --- | --- |
| `command.environment` | prepared command options | `dependencies`、`project`、`signal` |
| `command.complete` | 冻结 `{ options, command }` | `artifactDirectory`、`dependencies`、`invocationId`、`project`、`records`、`signal` |

constructor 验证、复制并固定这两个下游声明；非法 descriptor 仍抛 `TypeError`，不同于执行时 resolver/completion failure。
command 通过普通 Check 执行，合并自身启动/取消/working-directory/transcript 的执行义务与下游需求，
向上游声明所需并集，再为两个下游各自精确投影；下游不继承其它消费者或 command 自己需要的字段。
需求不授予 dependencies 或 artifact 权限，completion parser 继续只接收 terminal data，不增加 context。

## 环境

环境是 closed policy。静态 `environment` 与 invocation-time `resolveEnvironment` 互斥；两者都省略时，child 使用 exact-empty environment。

| policy | child base environment |
| --- | --- |
| `{ mode: "exact", variables? }` | 只使用 `variables` 中的 `Record<string, string>`；省略 variables 即 exact-empty。 |
| `{ mode: "inherit", overrides? }` | execution start snapshot `process.env`；string override 覆盖 key，`null` 删除 key。 |

这张 policy 只确定 caller base environment。Product 在它之后加入固定 plain-text/no-color variables：`CARGO_TERM_COLOR=never`、`CLICOLOR=0`、`CLICOLOR_FORCE=0`、`FORCE_COLOR=0`、`NO_COLOR=1`、`PNPM_CONFIG_COLOR=false`、`PY_COLORS=0`、`TERM=dumb`、`UV_NO_COLOR=1` 与 `npm_config_color=false`。这些 keys 最后覆盖静态 policy 或 resolver 返回 policy 中的同名 value；不能通过此 API 请求 colorized child output。

`resolveEnvironment(options, context)` 在 spawn 前接收 prepared command options 作为第一业务参数；
第二参数只包含自己声明的 `project`、direct `dependencies` 或取消 `signal`。
返回（或 resolve 为）同一张 policy 表中的值，仍先作为 caller base environment，再由 Product 加入上述固定 keys。
它适合把当前 project 或已声明依赖转换为本次 command 的最小环境：

```ts
import { commandCheck, defineContextCallback } from "@zxyycom/vibe-check";

const projectCommand = commandCheck({
  checkId: "project-command",
  displayName: "Project command",
  executable: process.execPath,
  arguments: ["--eval", "process.exit(0)"],
  resolveEnvironment: defineContextCallback("command.environment", {
    contextNeeds: ["project"],
    callback(_options, { project }) {
      return { mode: "exact", variables: { PROJECT_ROOT: project.root } };
    }
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

transcript 是显式 opt-in artifact capability。除了在 Check 中设置 `output: { mode: "transcript" }`，还需在本次调用中提供目录，例如 `run(definition, { checkArtifactBaseDirectory: "artifacts/checks" })`。该 control 授予 Check 自己的 invocation-local artifact directory；相对 base 从 `projectRoot` 解析，与 machine publication 的目录和开关独立，路径与权限边界见 [RunControls](../api-mechanics.md#runcontrols-与-check-aggregation)。

没有 `artifactDirectory`，或 running/final write 失败时，Check 为 `unavailable / command-transcript-unavailable`。`process.log` 不包含 executable、arguments、environment 或 native error text。

`outputByteLimit` 分别约束 stdout 和 stderr 的内存捕获，沿用底层 `maxBuffer` 的近似文本计量；它不是两条流的合计预算，也不是严格 UTF-8 字节上限，多字节文本的实际字节数可能大于该值。
任一流超限后，底层进程执行器主动终止 child；POSIX 下不响应软终止的 child 使用默认约 5 秒的强杀升级。
这一回收机制针对直接 child，不保证回收任意后代进程树，也不会回滚终止前已经发生的副作用。

## 调用方完成阶段

`afterCommand` 把完成 callback 与可选 typed-provider parser 放在同一个对象：

```ts
import { commandCheck, defineContextCallback } from "@zxyycom/vibe-check";

const reportCommand = commandCheck({
  checkId: "report-command",
  displayName: "Report command",
  executable: process.execPath,
  arguments: ["--eval", 'process.stdout.write("report")'],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand: {
    execute: defineContextCallback("command.complete", {
      contextNeeds: ["records"],
      callback({ command }, { records }) {
        records.report({ id: "report-command" }, { stdoutLength: command.stdout.length });
        return { status: "passed", data: { report: command.stdout } };
      }
    }),
    parseData: (data) => {
      if (typeof data.report !== "string") throw new TypeError("report must be a string");
      return { report: data.report };
    }
  }
});
```

Product 只在 child 具有数值退出码，且没有取消、超时、输出超限或 signal 标记时调用 `afterCommand.execute`；完整的非零退出也可由此回调解释。若选择 transcript，final write 也必须先成功。
`callback(input, context)` 的第一参数是冻结 `{ options, command }`，其中 command 是完整 `{ exitCode, stdout, stderr }`；第二参数只含自己声明的 Check execution 字段；它可以返回普通 `CheckResult` 并按 ordinary Check contract 报告 Records。这个返回值取代完整命令的默认 exit-code mapping。

上例命令只演示成功输出。接入真实工具时，应按工具协议检查 `command.exitCode`；解析成功不等于检查通过，非零退出也不会在 callback 返回 `passed` 后自动改回 `failed`。保留失败结论并补充结构化诊断的用法见[工具结果映射](#将工具结果映射为诊断)。

存在 `parseData` 时，返回值是 typed provider Check；consumer 读取其 final data 后显式调用 parser，Product 不自动调用。签名与错误边界见[Provider 类型与解析边界](check-dependencies.md#provider-类型与解析边界)。没有 parser 时，返回值仍是 ordinary Check。

`stdout`、`stderr` 仅在 callback 的业务 input 中提供，不会因 callback 存在而自动发布。调用方决定是否把派生数据或 Records 放入自己的结果边界，并负责其中的敏感信息处理。

### 将工具结果映射为诊断

需要展示失败位置或供其它工具消费时，可在 `afterCommand` 中把工具结果映射为 Records。优先使用稳定 JSON 协议；只有文本输出时，为明确的格式写 parser。任意日志无法可靠还原诊断时，保留工具的失败结论，不编造文件、行号或错误码。

#### 运行诊断示例

以下两种转换各自独立。使用 [README 的安装与 Node 环境](../../README.md#安装)，任选一个完整片段保存为项目根目录的 `quality.ts`，在片段后追加：

```ts
import { run } from "@zxyycom/vibe-check";

const result = await run(definition, { projectRoot: process.cwd() });
process.exitCode = result.kind === "completed" && result.aggregate === "passed" ? 0 : 1;
```

在项目根目录执行 `node quality.ts`；CommonJS 项目可将文件命名为 `quality.mts`，并执行 `node quality.mts`。示例通过当前 Node 模拟工具输出，无需创建被报告的配置文件或另装校验工具。两例都应得到一条诊断 Record、`failed` Check 和非零退出；输入、命令与 parser 协议应在真实接入时一起替换。

#### 只有文本：解析明确的格式

假设现有工具约定每行输出 `config/app.json:<行号>: MISSING_NAME`，退出 `0` 表示通过，普通非零退出表示检查失败。下面固定输出一行模拟它；替换成真实命令时，parser 也要遵循真实协议。

```ts
import {
  commandCheck,
  defineConfig,
  defineContextCallback,
  type CheckResult
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function parseTextDiagnostics(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const match = /^config\/app\.json:([1-9][0-9]*): MISSING_NAME$/.exec(line);
      if (!match) throw new TypeError("Unsupported diagnostic line");
      const lineNumber = Number(match[1]);
      if (!Number.isSafeInteger(lineNumber)) throw new TypeError("Invalid line number");
      return { path: "config/app.json", line: lineNumber, code: "missing-name" };
    });
}

const afterCommand = {
  execute: defineContextCallback("command.complete", {
    contextNeeds: ["records"],
    callback: ({ command }, { records }): CheckResult<DiagnosticData> => {
      if (command.exitCode === 0) return { status: "passed", data: { exitCode: 0 } };
      let diagnostics;
      try {
        diagnostics = parseTextDiagnostics(command.stdout);
      } catch {
        return {
          status: "failed",
          data: { exitCode: command.exitCode, diagnosticsAvailable: false }
        };
      }
      diagnostics.forEach((data, index) => records.report({ id: "config-" + index }, data));
      return {
        status: "failed",
        data: { exitCode: command.exitCode, diagnosticsAvailable: true }
      };
    }
  })
};

const check = commandCheck({
  checkId: "config-text-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write("config/app.json:3: MISSING_NAME\\n"); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
```

输出被转换为 `{ path: "config/app.json", line: 3, code: "missing-name" }`。parser 只接受这里声明的格式；混入一行无法识别的日志，整组诊断就不发布，Check 仍保留 `failed`。如果工具把诊断写在 stderr，应读取对应通道，而不是将 stdout/stderr 任意拼接。

#### 已有结构：验证并映射为项目字段

另一个工具输出 `{ errors: [...] }`，使用 `filename`、`location.row` 和工具错误码 `CFG001`；项目则需要 `path`、`line` 和 `missing-name`。先验证源结构，再做字段、错误码和公开范围的转换，而不是把 JSON 原样塞进 Record。下例独立演示这种转换。

```ts
import {
  commandCheck,
  defineConfig,
  defineContextCallback,
  type CheckResult
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function projectJsonDiagnostics(text: string) {
  const value: unknown = JSON.parse(text);
  if (
    value === null ||
    typeof value !== "object" ||
    !("errors" in value) ||
    !Array.isArray(value.errors)
  )
    throw new TypeError("Expected an errors array");
  return value.errors.map((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      item.filename !== "config/app.json" ||
      item.rule !== "CFG001" ||
      item.location === null ||
      typeof item.location !== "object" ||
      typeof item.location.row !== "number" ||
      !Number.isSafeInteger(item.location.row) ||
      item.location.row < 1
    )
      throw new TypeError("Unsupported diagnostic");
    return { path: "config/app.json", line: item.location.row, code: "missing-name" };
  });
}

const afterCommand = {
  execute: defineContextCallback("command.complete", {
    contextNeeds: ["records"],
    callback: ({ command }, { records }): CheckResult<DiagnosticData> => {
      if (command.exitCode === 0) {
        return { status: "passed", data: { exitCode: 0 } };
      }
      let diagnostics;
      try {
        diagnostics = projectJsonDiagnostics(command.stdout);
      } catch {
        return {
          status: "failed",
          data: { exitCode: command.exitCode, diagnosticsAvailable: false }
        };
      }
      diagnostics.forEach((data, index) => records.report({ id: "config-" + index }, data));
      return {
        status: "failed",
        data: { exitCode: command.exitCode, diagnosticsAvailable: true }
      };
    }
  })
};

const check = commandCheck({
  checkId: "config-json-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write(JSON.stringify({errors:[{filename:"config/app.json",location:{row:3},rule:"CFG001",debug:"internal context"}]})); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
```

这个例子故意只支持一个已知文件和一种工具错误码，以清楚展示映射；实际 adapter 按协议扩充允许的范围。`debug` 等额外字段被丢弃，不会复制进 Record。Record 的领域 data 由 Check 自己定义，并不存在 Product 强制所有工具遵循的 `path/line/code` 诊断 schema。

#### 验证映射与公开边界

1. 有效工具输出得到 `{ path: "config/app.json", line: 3, code: "missing-name" }`，Check 保持 `failed`。
2. 加入第二条格式错误、未支持错误码或指向 `../outside.json` 的诊断，整组应拒绝，`diagnosticsAvailable` 为 `false`，保留非零退出所表达的失败。
3. 确认只有允许公开的字段进入 Records；本例的 `debug` 字段被丢弃，preview 限额不承担脱敏责任。

整组拒绝来自“先 map 验证全部，再 report”，不是 reporter 自带事务。两例按工具“非零退出表示检查失败”的协议映射；工具若区分发现错误与自身崩溃，应分别解释这些退出码。启动失败、超时等不进入 `afterCommand`，由 Product 结算为 `unavailable`。

两例保持默认 `discard`，原始输出不落盘；Records 进入 Run 内存结果和默认进度预览，启用 machine publication 后也会发布。需要排障 transcript 时，按[输出配置](#输出)同时设置 `output: { mode: "transcript" }` 与本次 `checkArtifactBaseDirectory`，由调用方管理敏感内容、访问权限和留存。结果读取与输出失败处理见 [Run 输出](run-outputs.md)。

## 默认终态与失败边界

未使用 `afterCommand` 时，完整 numeric exit 的 `passed` 和 `failed` 返回 `CommandCheckFinalData` 的 `{ exitCode: number }`；command-owned unavailable 分支使用 `CommandCheckUnavailableReasonCode`。

| process cause | 默认 Check terminal outcome |
| --- | --- |
| exit code `0` | `passed / { exitCode: 0 }` |
| numeric nonzero exit | `failed / { exitCode }` |
| startup failure | `unavailable / command-start-failed` |
| resolver throw 或非法 policy | `unavailable / command-environment-resolution-failed` |
| timeout | `unavailable / command-timeout` |
| stdout 或 stderr 超出文本缓冲限额 | `unavailable / command-output-limit-exceeded` |
| 非 timeout、非 cancellation signal | `unavailable / command-terminated-by-signal` |
| transcript capability 或 write failure | `unavailable / command-transcript-unavailable` |
| 无法验证 prepared options | `unavailable / invalid-options` |
| Core 观察到 caller cancellation | `unavailable / execution-cancelled` |

同时出现多个底层终态标记时，Product 以 **非零退出 → 取消 → 超时 → 输出超限 → signal → 启动失败 → 零退出** 的顺序选择默认原因。
这一优先级不改变[完成阶段的资格要求](#调用方完成阶段)：例如非零退出与超限同时出现时，默认结果仍为 `failed / { exitCode }`，但不会调用 `afterCommand`。
callback 自身的 throw 或 settlement 继续由 ordinary Check/Core lifecycle 处理。

## 安全边界与公开类型

默认 exact-empty environment 与 discard output 避免 ambient credential 和 child material 自动进入结果或日志。选择 `inherit`、`transcript` 或在 `afterCommand` 发布派生数据时，调用方负责对应 environment、artifact 和结果边界的访问控制、保留和清理。

package root 提供 `commandCheck` 和以下类型组；精确签名见安装包 declarations：

| 类型 | 用途 |
| --- | --- |
| `CommandCheckInput`、`CommandCheck`、`CommandCheckWithAfterCommand`、`TypedCommandCheck` | constructor 输入与普通/typed-provider 返回值。 |
| `ResolvedCommandCheckOptions`、`CommandCheckExecution` | constructor-resolved 业务 options 与返回 Check 的具体 execution descriptor；直接调用使用 `.execute.callback(options, context)`，由调用方提供完整执行能力。 |
| `CommandCheckEnvironment`、`CommandEnvironmentContext`、`CommandEnvironmentResolver` | environment policy、合法 context 字段与 resolver 槽位。 |
| `AfterCommand`、`AfterCommandInput`、`AfterCommandContext`、`AfterCommandExecution`、`CompletedCommand` | completion 配置、独立业务 input、合法 context 字段与完整命令结果。 |
| `CommandCheckOutput`、`CommandCheckFinalData`、`CommandCheckUnavailableReasonCode` | output policy、默认终态 data 与 command-owned reason code。 |

调用方负责提供可用的 executable、组织多步骤 workflow，并由项目入口根据 `RunResult` 设置退出码；
完整接入路径见[构建项目 Gate](building-project-gate.md#从质量目标到可判定的证据)。

## 接入项目已有命令

项目已经有 `tools/check-config.mjs`，成功退出 `0`，发现错误退出非零。

先保留脚本拥有的检查逻辑，用 `commandCheck` 接管进程生命周期。以下片段的调用步骤见[运行约定](building-project-gate.md#运行专题片段)：

```ts
import { commandCheck, defineConfig } from "@zxyycom/vibe-check";

const configCheck = commandCheck({
  checkId: "config",
  displayName: "Configuration",
  executable: process.execPath, // 复用启动 quality.ts 的运行时；本文使用 Node。
  arguments: ["tools/check-config.mjs"],
  environment: { mode: "exact" },
  timeoutMs: 30_000,
  outputByteLimit: 1024 * 1024
});

const definition = defineConfig({
  checks: [configCheck],
  outputs: { machinePublication: { enabled: false } }
});
```

脚本路径和限额由项目选择。`executable` 指定程序，`arguments` 提供独立参数；这里复用当前 Node 的绝对路径，相当于执行 `node tools/check-config.mjs`，无需 child 的 `PATH`。改用 Bun 启动入口时也会复用 Bun；必须使用 Node 的工具应显式提供 Node 绝对路径。

普通非零退出形成 `failed`；启动失败、超时等形成 `unavailable`。Product 管理进程取消、受限输出捕获和结算，调用方负责提供可用运行时。

如果已有可 import 的校验函数，且不需要进程隔离，可在自定义 Check 的 `execute` 中直接 `await` 它并映射领域结果。不要 import 会自动启动 CLI、调用 `process.exit` 或修改全局环境的入口。

函数接入仍需承担原有的超时、取消、失败与隔离义务：可取消工作继续传递 `signal`，资源在完成或取消时清理。需要解析命令输出时，使用[结构化诊断](#将工具结果映射为诊断)。

命令通过 executable 和独立 arguments 表示。默认不继承父进程环境；需要环境变量时显式提供必要值，确需继承时再选 `inherit`。使用独立脚本承接多步骤 workflow，通常比把 shell pipeline 塞进一个参数更清楚。

验证时让脚本分别退出 `0`、退出 `1`、超过 timeout，确认三种结果被区分。先保持原检查覆盖和结果含义，再决定是否拆分。

命令的完整契约见本页前文；函数接入见[自定义 Check](./extending-check-lifecycle.md)。
