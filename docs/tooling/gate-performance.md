# Gate 性能预算与 Check 耗时分布

本文拥有 Gate 性能 contributor 的策略、统计和失败证据；入口与结果处理见 [Project Gate](project-gate.md#gate-result-post-processing-and-exits)。

## 预算与适用范围

默认 performance contributor 对 fast / changed / all 使用三项**阻断预算**：总反馈时间、Check 平均执行时间和
Check P95 执行时间。它们表达先验架构要求，不是从历史样本学习的性能基线；多数 Check 应保持轻量，
少数重项可以存在，预算需为进程启动、I/O 和并发竞争留余量。任一项严格超标都追加 `error`，
把初步 passed 的 Gate 降为 failed / exit 1；等于预算视为达标。Product Checks 全部通过与最终 Gate
通过是不同事实。Gate 只执行同次 preparation/load/Run，不自动重试超标运行。

版本控制内的 `runtime/performance-policy.ts` 是预算唯一来源，所有机器使用相同策略：

| 档位 | `maxElapsedMs` | `maxMeanCheckMs` | `maxP95CheckMs` |
| --- | ---: | ---: | ---: |
| fast | 30000 | 2000 | 5000 |
| changed | 30000 | 2000 | 5000 |
| all | 90000 | 2000 | 5000 |

三个字段均为正 safe integer 毫秒数。标准调用在 candidate preparation 前校验完整三档策略，缺失、非法或读取 seam 抛错均返回 failed / exit 1，不按省略猜默认值。`maxElapsedMs` 包含启动至初步结果的 candidate preparation、adapter/setup 与 Product Run，不包含 contributor 自身耗时。

策略不接受本机缓存文件、环境或命令参数覆盖；runtime 只进入诊断，不参与预算选择。`run.ts` 的同步 loader 仅为 adapter 测试 seam，不是配置入口。预算变更按普通源码审查和验证，不按运行结果自动调整。focused preset 与 fast 加 scope 都属于局部 workload，不评估这些标准预算；help 在策略预检、candidate 与日志之前退出。

各档分别报告自己的选择和预算结果。fast 选择更少的工作不是 all 的性能优化证明；不能以快检达标消除完整验收的性能失败。

## Check 耗时统计

Check 分布直接读取同次 `RunResult.checkDurations`：

- 只计 `durationMs !== null` 的实际 execution，真实零耗时仍计入；未执行项不按零稀释。
  这不是排队、Check preparation、整次 Gate 时间或 CPU 用量，不能把工作移到这些阶段来宣称单项优化。
- 均值为执行耗时之和除以执行数量 `N`；P95 使用升序第 `ceil(0.95 × N)` 项（nearest-rank），不插值。
  它描述本次完整集合，不要求历史样本；`N < 20` 时 P95 等于最大值。空集合显示 `mean=n/a`、`p95=n/a`，
  不评估 Check 预算，总耗时仍评估。
- 每次有效评估都输出 `N`、累计执行耗时、均值与 P95 的预算对照，以及最慢的最多三项；同耗时按 Check ID 排序。
  累计值不是墙钟，帮助区分数量增长与单项变重；均值和 P95 分别判断，任一超标即生成分布 error 并阻断。
- 不通过拆分、合并或跳过 Check 改善指标；Check 粒度仍服从行为 owner 和独立验收责任。
  总耗时、分布、准备阶段共同解释结果，不能仅凭分布达标认定 Gate 足够快。

## 失败证据与安全边界

每次有效评估生成两条独立消息：一条包含总耗时及三个连续阶段，另一条包含 Check 分布。
两条消息分别按总耗时预算和 Check 分布预算决定 info/error；info 留在 Gate transcript，error 同时在终端可见。
任一超标时另在 `gate.log` 留存 `project-gate-performance-failure-context` JSON 消息，包含：

- 本次 profile/runtime、三个实际预算、分阶段原始 timing，以及未舍入的均值/P95（空集合为 null）。
- candidate version、artifact SHA-256、candidate inputFingerprint、实际 preparationAction/reason 与 Definition declarativeFingerprint。
- 同次已验证的全部 `checkDurations`：非 null 为实际执行项，null 为未执行项；不把它们反推为变更选择理由。
- 同一 invocation 的目录及 Gate/progress/machine、命令型 Check transcript 路径约定；具体可用证据由各输出 owner 决定。

终端保留超标对照、最慢三项（分布超标时）及日志目录，完整现场仅在 Gate transcript，安全边界见
[Gate diagnostics](gate-diagnostics.md#gate-terminal-and-transcript)。指纹分别标识包输入和 Definition 声明，
不是整个工作区的 source snapshot，也不证明机器负载或性能根因；现场采集不新增 Git/重跑进程或全仓哈希。
性能消息不改变 Product facts、aggregate 或 machine publication。
无效 timing、不完整或重复的 Check duration facts、不可表示的累计值仍阻断初步 passed，不输出伪统计；
初步结果非 passed 时不评估性能，也不提升已有结果。observer 不解析 Product diagnostic log、不读历史调整预算。
