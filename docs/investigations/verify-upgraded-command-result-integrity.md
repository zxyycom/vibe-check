---
title: "验证 Execa 10.2 的超限回收与命令结果完整性修复"
id: "261021-verify-upgraded-command-result-integrity"
formedAt: "2026-10-21T07:37:37Z"
question: "升级并修复原始完整性投影后，超限能否独立回收且不发布完成回调的派生成功结果？"
tags:
  - "command-check"
  - "execa"
  - "output-limit"
  - "process-boundaries"
relations:
  - type: "复查"
    target: "261020-verify-command-output-limit-lifecycle"
    summary: "在新版执行器与完整性修复下复查旧版超限缺口"
---

## 形成时背景

前轮 [Execa 9.6.1 调查](./verify-command-output-limit-lifecycle.md)确认：超限可能等到执行超时，
且归一化的非零退出优先级会丢掉超限标记，使截断输出进入 `afterCommand`。
用户本轮批准升级 Execa 10.2.0、同时修复完整性，并明确保留现有近似输出限额，不增加精确字节捕获层。
旧版条件与修复后条件需要分别复核，因此本报告作为新版本、新实现下的复查，不改写旧观察。

## 调查目的

验证运行中超限能否独立触发终止；验证不完整结果不能发布完成回调的派生成功 data/Records，
同时保留完整非零退出的解释能力和既有默认终态优先级。区分源码证据、实际安装包验收和跨平台边界。

## 调查范围与依据

- 基线为 `main` 的 `a36600da4aa2e4d3f4dcebb87722e56d1200ee9d` 加本轮未提交改动，不是该提交的干净快照。
- Linux x64，Execa 10.2.0，mise Bun 1.3.14、Node 24.18.0。源码目标测试为
  `mise exec -- bun test src/package-checks/host-environment/process src/package-checks/command-check`，15/15 通过。
- 实施代理于 `2026-10-21T07:33:11.590Z` 用 Node 导入当前 `src/index.ts`，通过公开
  `commandCheck → defineConfig → run` 记录 PID、walltime、回调次数和 snapshot；每条命令 timeout 20000 ms、limit 32，输出 4096 ASCII 字符。
- 同轮于 `2026-10-21T07:32:28.163Z` 重跑未修改的[前轮 probe](./_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs)，
  旧版原始 observations 文件保持原样。新行为的稳定证明由 process/command tests 和 installed command fixture 承接。
- 实现入口为 [result.ts](../../src/package-checks/host-environment/process/result.ts)、
  [execution.ts](../../src/package-checks/command-check/execution.ts)；
  [runner 回归](../../src/package-checks/host-environment/process/runner.test.ts)用测试自有 PID 验证真实退出。

## 调查结果与边界

### 完整性与默认原因分离

私有 `ProcessResult.isComplete` 在原始 Execa 标记仍齐全时计算：仅有数值退出码且无取消、timeout、
max-buffer 或 signal 才完整。`afterCommand` 使用这一独立事实；默认原因仍按非零退出优先，
现有 exclusive flags 不变。完整 exit 13 仍能由回调解释为 passed；不完整结果不调用回调，
因此不能发布其派生成功数据或 Records。默认非零失败仍可带 `{exitCode}`。

raw-result 单元矩阵覆盖 exit 0/23 与各失败标记及组合。真实新版往往在计划 exit 23 前已终止 child，
不能仅靠新版真实样例声称已覆盖 `exitCode=23 + isMaxBuffer=true`；该信息丢失路径由原始结果矩阵独立证明。

### 超限不再依赖执行超时

Node 24 源码观察如下。八项均返回 `unavailable / command-output-limit-exceeded`，
callback/Records 均为 0，无派生成功 data，API 返回后对应 PID 均不存在。
独立 9000 ms 清理 watchdog 未触发，20000 ms 执行超时未到期。

| 流 | child 行为 | walltime ms |
| --- | --- | --- |
| stdout | burst 后存活 / continuous | 65.03 / 54.03 |
| stdout | burst 后计划 exit 0 / 23 | 38.69 / 76.25 |
| stderr | burst 后存活 / continuous | 34.16 / 48.40 |
| stderr | burst 后计划 exit 0 / 23 | 33.34 / 41.16 |

忽略 SIGTERM 的私有 runner 样例记录到软终止 ack，约 5027.89 ms 后以 SIGKILL 退出，
`isMaxBuffer=true`、`isComplete=false`，返回后 PID 不存在；该观察未使用外部 kill/watchdog。
Product 沿用 Execa 默认约 5 秒强杀升级。

旧 probe 在新版下约 32.66–134.18 ms 回收，250 ms 后续写入标记未出现。这只证明该固定样例，
不是超限瞬间副作用熔断的普遍保证；检测和终止之前已经发生的工作不会回滚。

### 输出限额保持近似文本计量

32 个“中”在 limit 64 下仍 passed，实际为 96 UTF-8 bytes。此行为按用户取舍保留；
公开参数名保持 `outputByteLimit` 兼容，[指南](../guides/command-check.md#输出)和 JSDoc 改为如实说明各流独立的近似文本 buffer 限额。
这项已确认取舍与前轮建议的严格 UTF-8 字节预算不同，实施继续使用现有文本捕获层。

### 声明兼容与实际安装补证

Execa 10.2.0 的内部 combined-output 泛型在 `exactOptionalPropertyTypes` 下不满足 `CommonOptions`，
阻断源码检查和真实 emit。工作区用[版本精确的 pnpm 声明补丁](../../patches/execa@10.2.0.patch)
归一缺省 buffer 并检查内部泛型约束，不改 runtime/公开 Options，也未启用 `skipLibCheck`。
首次 CommonOptions 交集方案虽能编译，却被输出类型矩阵发现会拓宽缺省 encoding/stdio，已撤销；
最终补丁保留精确推断，通过实际 TS6 6.0.3 与 TS7 7.0.2 的正负矩阵。
补丁不是官方修复，上游升级后须以同一矩阵判断能否移除。

同轮最终稳定源码经 `bun run check -- --all` 重验为 43/43 passed，退出 0，elapsed 61.3 秒；
最终候选 `0.0.0-local.2b1720941546` 的 SHA-256 为
`4e5e0aa1f430d7b8bd1aed5efc5e510ff8f5d5cc879e90a920803e0906243d6a`，
artifact 与 installed types/documentation/Node runtime acceptance 均通过。隔离 Node runtime 包含真实回收与强杀 fixture，
不继承 repository 声明补丁；公开声明验收确认未泄漏 Execa 或 workspace-only markdown-it 的类型依赖。
此为安装候选证明，不是已发布事实。

### 验证边界与继续条件

本报告覆盖 Linux 单 child 的 Bun/Node 源码行为和前述最终 installed 候选，不证明发布状态。
Windows/macOS、任意后代持管道进程树、所有取消/timeout 时序组合及极端系统负载
不由这些样例证明。单次 walltime 是观察值，不是产品时限 SLA；升级 Execa、改变同步捕获模式或终态归一化时需重新验收这些边界。
