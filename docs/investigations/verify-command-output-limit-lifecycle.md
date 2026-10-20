---
title: "核实 commandCheck 输出超限的回收与完成回调边界"
id: "261020-verify-command-output-limit-lifecycle"
formedAt: "2026-10-20T10:15:37Z"
question: "外部反馈的延迟回收、失败阻断与 afterCommand 隔离是否在当前源码及支持运行时成立？"
tags:
  - "command-check"
  - "execa"
  - "output-limit"
  - "process-boundaries"
relations: []
---

## 形成时背景

外部项目反馈：命令输出超限后，子进程仍可能运行到执行超时；建议由 vibe-check 处理回收，并认为超限结果会跳过
`afterCommand`、保持失败阻断。其 Gate 配置为每命令 120 秒、stdout/stderr 各 4 MiB、最多并发 4，合成复现约 3.045 秒。
这些配置与计时来自反馈，待本轮用当前源码核实行为与适用边界。

## 调查目的

核实输出超限的终止时机、结果完整性与字节预算，定位负责修复的模块。交付为本轮调查及复现证据；产品修复由后续任务承接。

## 调查范围与依据

- **基线**：调查开始时干净 `main`，提交 `8494f2271262da801ac56d4fe36de44199ecb37c`。
- **环境与时点**：Linux x64，mise Node `24.18.0`、Execa `9.6.1`；保留的完整一轮于 `2026-10-20T10:16:30.925Z` 结束。
- **执行入口**：[src/index.ts](../../src/index.ts) 的 `commandCheck` → `defineConfig` → `run`，直接运行源码。
  五个进程场景、一个直接调用 Execa 的对照和一个多字节输出场景均关闭 Run 输出；临时目录保存 PID 与延后写入标记，返回后检测存活并清理。
- **实现依据**：[execution.ts](../../src/package-checks/command-check/execution.ts)、[runner.ts](../../src/package-checks/host-environment/process/runner.ts)、
  [result.ts](../../src/package-checks/host-environment/process/result.ts)，以及本地 Execa 的 `lib/io/max-buffer.js`、
  `lib/resolve/wait-subprocess.js`、`lib/terminate/timeout.js` 和 `lib/terminate/kill.js`。

[复现脚本](./_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs)解释实验做法，
[原始观察](./_resources/261020-verify-command-output-limit-lifecycle/observations.json)保存版本、输入与返回值。需要重跑时，从工作区根执行以下命令；标准输出是新一轮观察，原始资源保持原样：

```sh
mise exec -- node docs/investigations/_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs
```

调查时运行 `mise exec -- bun test src/package-checks/command-check src/package-checks/host-environment/process`，6 文件、12 项既有测试通过；
`bun run test-evidence -- check --root .` 通过，759 个实体映射到 188 个 Case、16 个 topic。
其中 `API-COMMAND-CHECK-TERMINAL-001` 的超限样例自然退出，`API-COMMAND-CHECK-AFTER-COMMAND-001` 的不完整结果样例直接覆盖超时；
二者均未覆盖“超限后非零退出”的组合。进程归一化测试则显式要求非零退出时丢弃其余原因标记。

## 调查结果与边界

**确认三个缺口：超限后等待进程退出、截断结果可进入完成回调，以及字节预算实际按字符计量。**

### 终止依赖原执行超时或子进程自行退出

子进程一次同步输出 4096 个 ASCII 字节，`outputByteLimit=32`；持续运行的场景用定时器保持进程存活：

| 超限流 | 执行超时 | 子进程自行退出 | 总耗时 |
| --- | --- | --- | --- |
| stdout | 1000 ms | 持续运行 | 1026.4 ms |
| stdout | 3000 ms | 持续运行 | 3012.8 ms |
| stderr | 3000 ms | 持续运行 | 3012.4 ms |
| stdout | 3000 ms | 600 ms 后 exit 0 | 631.3 ms |

四个场景均返回 `unavailable / command-output-limit-exceeded`，回调调用次数为 0，且 API 返回后子进程均已退出。
它们都成功执行了输出后延迟 250 ms 的文件写入，证明输出限额并未熔断后续副作用。执行 Promise 持续等待也意味着调度容量继续被占用；
并发队列损失是据此作出的推断，本轮直接测量的是单命令行为。

Execa 9.6.1 的 `handleMaxBuffer` 销毁输出流并抛错，`waitForSubprocessResult` 随后保留错误、等待 `exitPromise`。
子进程持续运行时，原执行超时到期才调用 `subprocess.kill()`；该期限从命令启动起计算。
先前设置的 `terminationReason='other'` 被保留，因此最终仍报告超限，即使超时参与了回收，`timedOut` 仍为 false。

上述计时适用于默认响应 SIGTERM 的子进程。Execa 还配置默认 5 秒强杀延迟；忽略软终止或后代持有管道时的回收时限需要另行验证。

### 非零退出使截断结果进入完成回调

另一场景在输出 4096 字节后延迟 200 ms 执行 `exit 23`，配置 1000 ms 超时、32 字节限额：
约 228.4 ms 后，`afterCommand` 收到 `{exitCode:23, stdoutLength:32}`，返回的 `passed / {accepted:true}` 被保留在最终快照中。
直接调用 Execa 的对照仍具有 `exitCode=23, isMaxBuffer=true, stdout.length=32`，缺口位于后续归一化链路：

1. `processCause` 优先选择非零退出，`toProcessResult` 仅按选中的原因投影标记，丢失 `isMaxBuffer`。
2. `isCompleteCommandResult` 看到数值退出码、空 signal 和缺失的失败标记，将截断结果认作完整结果。
3. 调用方完成回调因而获得截断输出，并可据此返回成功。

[公开契约](../guides/command-check.md#调用方完成阶段)允许回调解释完整的非零退出结果，同时要求超限结果由 Product 结算。
修复应分别保留“默认终态原因”与“捕获是否完整”的事实，保证只有完整结果进入回调。
本轮使用刻意返回成功的回调证明该路径可达；未配置回调时，此非零退出场景仍默认失败。
本仓库 [Gate 完成处理](../../scripts/project/gate/checks/command-result.ts)按 `exitCode===0` 放行，该反例仍会被阻断。
机器文件发布未在本轮实验范围内，已确认的是最终快照中的成功数据。

### 字符上限与字节契约不一致

`outputByteLimit` 直接传给 Execa `maxBuffer`，其默认 UTF-8 字符串捕获按字符计量。
实测输出 32 个“中”（96 UTF-8 字节）、配置 `outputByteLimit=64`，结果仍为 passed；ASCII 回收实验不受此计量区别影响。

### 修复责任与验收建议

修复入口是 vibe-check：host process adapter 承接 Execa 的进程回收，结果归一化与 command completion 负责完整性隔离，
`outputByteLimit` 的实现负责兑现字节预算。消费端 Gate 负责配置与阻断策略，完成回调用于解释完整结果；进程回收应由运行层完成。

建议后续验收覆盖：

1. **回收**：运行中 stdout/stderr 超限独立触发有界终止与资源释放，并明确软终止、强杀、取消/超时竞争及平台与后代进程的支持边界。
2. **完整性**：超限与零/非零退出、signal、timeout、cancel 的组合保留捕获事实；截断结果跳过完成回调，保持失败阻断。
3. **计量**：用 ASCII 与多字节 UTF-8 验证实际字节上限。同步最窄回归测试、Case 及公开/内部行为说明。

### 适用范围与待核实项

本轮是固定版本下的 Linux 源码验证，各场景计时为单次观察。已发布包、Windows/macOS、120 秒长测、并发排队、后代管道和忽略 SIGTERM 的场景仍待验证；
依赖其他版本的修复状态也需另查。Product、Gate 与测试源码保持调查基线。

`commandCheck` 要求显式设置 timeout 和 limit。本仓库 [Gate entry factory](../../scripts/project/gate/checks/entry-factories.ts)
配置默认 120000 ms、限额数值 `64 * 1024 * 1024`，部分命令另设超时。反馈中的 4 MiB / 并发 4 属于外部项目配置；
核实该项目的失败阻断或回滚选择，还需要其安装版本、完成回调及正式验收日志。

## 随附资源

- [observations.json](./_resources/261020-verify-command-output-limit-lifecycle/observations.json)
- [reproduce.mjs](./_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs)
