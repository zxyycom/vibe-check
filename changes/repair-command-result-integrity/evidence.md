# Command result integrity evidence

本文件是本轮实施的临时交接证据，由主代理在最终验收后归入后继 Investigation；不改写旧版调查，不替代稳定行为 owner。

## Implementation

- Product-private `ProcessResult.isComplete` 在原始 Execa 结果仍保有全部标记时计算；仅 numeric exit 且无 cancellation、timeout、max-buffer 或 signal 才为 true。
- `processCause` 及现有 exclusive `isCanceled` / `timedOut` / `isMaxBuffer` 不变。非零退出仍优先默认 failed；完整非零退出仍可由 caller-owned `afterCommand` 解释为 passed。
- command completion guard 使用独立完整性事实；不完整结果不调用 completion，因此不发布其派生 data 或 Records。
- `outputByteLimit` 名称兼容保留，公开 guide 与 input/resolved-options JSDoc 如实说明各流独立的近似文本 buffer 限额，非严格 UTF-8 字节保证。
- 未增加 encoding-buffer 捕获、watcher、kill wrapper、进程树回收器、公开 API 或额外输出处理层；进程超限回收由 Execa 10.2.0 承担。
- Execa 10 的同步 `SyncOptions` 区分 text/binary 分支；Product 私有同步 options 明确提取 text 分支，让 encoding 与 stdio transform 类型相关，保留当前消费者的 `utf8` / `pipe` 路径及文本 `utf16le`，不通过 assertion 或放宽类型掩盖迁移。

## Evidence design

- 原始归一化单元矩阵覆盖 `exitCode=0/23` 与 max-buffer、timeout、cancel、signal、cancel+timeout+max-buffer；非零优先的既有 cause flags 保持缺省，但 `isComplete=false`。startup failure 也不完整。
- 源码 Run 覆盖 stdout/stderr 超限后计划 exit 0/23，断言 completion 调用 0 次、snapshot Records 为空，无 callback 派生成功 data；正常完整 exit 13 则由 callback 解释为 passed。
- 源码取消回归等待 child 的 ready 文件后 abort；child 的 SIGTERM handler 尝试超限写入并 exit 23，仍保持 Core `execution-cancelled`、completion 0 次及空 Records。
- runner 回收矩阵为 stdout/stderr × burst 后保持存活 / continuous 输出，并补 POSIX 忽略 SIGTERM。child 写自己的 PID；结果返回时 `kill(pid, 0)` 必须得到 ESRCH。SIGTERM handler 写 ack 文件，强杀样例另要求最终 signal 为 SIGKILL。
- runner 的单项测试预算为 12 秒，命令 timeout 为 20 秒。独立 9 秒 watchdog 只用于失败清理；它先置 `deadlineExpired=true`，成功路径必须断言该值为 false，因此测试清理不能冒充 Product 回收。finally 清理只作用于本测试创建的 child/PID 文件和临时目录。
- installed Node fixture 沿原 JSON evidence schema 加直接失败断言；同样覆盖超限回收、planned exit 0/23、completion 0 次、空 Records、owned PID 退出、POSIX SIGTERM ack，以及完整非零解释与多字节近似计量。

## Validation before dependency installation

此阶段实际安装仍为 Execa 9.6.1，不能用来宣称新版回收成功：

- `mise exec -- bun test src/package-checks/host-environment/process/result.test.ts src/package-checks/command-check`：12 tests / 5 files 通过；后续增强取消 ready/overflow 竞争后，terminal 文件 5/5 通过。
- `mise exec -- bun run test-evidence -- check --root .`：763 current entities / 188 Cases / 16 topics 通过。该命令注册完整集合，不执行测试正文。
- `mise exec -- bun run lint -- product`、`mise exec -- bun run lint -- scripts`、`mise exec -- bun run format check`、`mise exec -- bun run validate -- materials`、`bun run docs:api` 通过。
- `mise exec -- bun run typecheck -- product`：安装串行调整中因 `@typescript/native/package.json` 尚不存在失败；待统一依赖 owner 安装完成后复跑，不作为源码缺陷结论。

## Execa 10.2.0 validation

### Bun source regression

实际安装 `execa=10.2.0`，Linux x64，mise Bun `1.3.14`、Node `24.18.0`。`mise exec -- bun test src/package-checks/host-environment/process src/package-checks/command-check` 15/15、6 files 通过，总耗时 14.54 秒；其中真实回收矩阵包含默认强杀等待，6.50 秒通过。测试只消费源码，**不等同 installed Node consumer**。

### Node 24 source observations

2026-10-21T07:33:11.590Z，在同一 Linux x64 / Execa 10.2.0 / Node 24.18.0 上通过 `node --input-type=module` 导入当前工作树 `src/index.ts`，按新版 regression fixture 的 PID/输出脚本逐项调用 `commandCheck → defineConfig → run`。HEAD 仍为 `a36600da4aa2e4d3f4dcebb87722e56d1200ee9d`，观察包含本轮未提交修复，不是该提交的干净快照。

每项 command timeout 均为 20000 ms、limit 32；各项输出 4096 ASCII 字符。以下八项统一结果为 `unavailable / command-output-limit-exceeded`、callback 0 次、snapshot Records 0、无派生成功 data、返回后对应 PID 不存在。独立 9000 ms cleanup watchdog **均未触发**：

| stream | child 行为 | 自有 PID | walltime ms |
| --- | --- | --- | --- |
| stdout | 单次 burst 后保持存活 | 2002364 | 65.03 |
| stdout | continuous | 2002385 | 54.03 |
| stdout | burst 后计划 exit 0 | 2002402 | 38.69 |
| stdout | burst 后计划 exit 23 | 2002418 | 76.25 |
| stderr | 单次 burst 后保持存活 | 2002434 | 34.16 |
| stderr | continuous | 2002452 | 48.40 |
| stderr | burst 后计划 exit 0 | 2002461 | 33.34 |
| stderr | burst 后计划 exit 23 | 2002468 | 41.16 |

上游 10.2.0 在 planned exit 前主动终止，所以这些真实样例不证明原始 `exitCode=23 + isMaxBuffer=true` 必然出现；该组合由独立 raw-result 单元矩阵证明不会丢失 completion 不完整事实。

另以 Node 24 源码私有 runner 运行忽略 SIGTERM 的 stdout burst child：PID `2002475`，SIGTERM handler ack 文件存在，`5027.89 ms` 后 `signal=SIGKILL`、`isMaxBuffer=true`、`isComplete=false`，返回后 PID 不存在。该观察未使用外部 kill/watchdog，20 秒执行 timeout 亦未到期。

使用未修改的历史 probe 重跑当前源码：`mise exec -- node docs/investigations/_resources/261020-verify-command-output-limit-lifecycle/reproduce.mjs`，2026-10-21T07:32:28.163Z。原先 stdout/stderr 持续存活及 planned exit 场景变为约 32.66–134.18 ms 回收，callback 0 次，250 ms 后续副作用文件均未出现，返回后 PID 均不存在；32 个“中”在 limit 64 下仍 passed（96 UTF-8 bytes），与近似文本计量说明一致。旧报告及其原始 observation 文件未改写。

### Type / installed boundaries

适配 Product 私有 text SyncOptions 后重跑 `mise exec -- bun run typecheck -- product`，已无 Product 源码诊断，仍有上游 Execa `result-all.d.ts` exact-optional 约束 TS2344 与 markdownlint 缺 markdown-it 声明。两项及 scripts 同型同步 options 由统一集成 owner 处理；未增加 `skipLibCheck`，未声明 typecheck 已通过。

installed Node 24 consumer 的新增 fixture 已就绪，由统一集成 owner 及主代理最后的 exact candidate / complete Gate 执行；本文件当前不提前声明 installed 验收通过。

最后自验：包括同步 `encoding: "utf8", stdio: "pipe"` 回归的 process/command 全部 15/15、6 files 再次通过（7.32 秒，回收矩阵 5.16 秒）；`lint product`、`lint scripts`、`format check`、`validate materials` 与本 Change check 通过。格式化将含 test options 的注册拆行时曾触发 runner/static line identity 不一致，改用具名 12 秒 budget 保持注册首行后，全树 ledger 重跑通过：765 current entities / 189 Cases / 16 topics（包含其它升级组的同期新增实体）。未修改账本 wrapper 来绕过诊断。

## Boundaries

已实际验证 Linux x64 的 Bun 源码和 Node 24 源码；installed candidate 结果仍由集成 owner 汇合。Windows/macOS 与任意后代持管道进程树不由 Linux 单 child 验收证明；POSIX SIGTERM/SIGKILL 断言在 Windows 不执行。
完整 Gate、最终非实施文档反查与历史 Investigation 由主代理汇合，不在本文件提前声明完成。
