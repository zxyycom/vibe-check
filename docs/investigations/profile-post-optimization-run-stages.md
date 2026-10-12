---
title: "优化后公共 Run 的阶段耗时与图准备成本"
id: "261012-profile-post-optimization-run-stages"
formedAt: "2026-10-12T05:47:46Z"
question: "七组优先优化完成后，公共 Run 的重复图准备与调度循环各占多少成本，R04 与 R05 应如何继续取证？"
tags:
  - "algorithmic-complexity"
  - "performance"
  - "project-run"
relations:
  - type: "复查"
    target: "261012-audit-checks-core-algorithmic-complexity"
    summary: "在优化后基线上复查R04和R05并量化公共Run阶段成本"
---

## 形成时背景

[前序复杂度调查](./audit-checks-core-algorithmic-complexity.md)将 R04（重复图准备与 scope/task 扫描）和
R05（调度边界的全态投影与候选扫描）列为待测候选，并未证明它们是实际延迟瓶颈。
随后[七组优先优化](./verify-priority-complexity-optimizations.md)完成，用户本轮要求先结项并继续取证，
**暂不开始新的正式优化**。本报告复查优化后基线的 R04/R05，而非重做前轮 before/after 比较；
旧轮次的版本、样本和收益结论保留不变。

四个已验收 Change 经公开入口结项，提交为 `041037f61322fa1ecd279902805ec556aa2e0579`。
该提交仅删除计划材料，生产源码没有变化。本轮不新建优化 Change，不修改 Product、测试、配置或依赖。

## 调查目的

判断完整公共 Run 中，四次 graph plan/prepare、Scheduler 状态初始化与调度循环分别承担多少成本，
核对探针对 wall time 的扰动，并据此选择下一项取证，不把静态复杂度直接等同于优先级。

没有真实消费者规模、延迟预算或 SLA；本轮采用两种可解释的空 Check 图，回答框架成本的相对分布，
不建立容量承诺、CI 耗时阈值或优化收益承诺。

## 调查范围与依据

### 当前基线与公共路径

取证日期为 2026-10-12；基线 HEAD 为上述结项提交，全部 722 个 `src` 文件的排序清单 SHA-256 为
`817a47c1ecfb19f12f74d5bac7ff55743b97e7aa4153a3c3d2db56d236129f0f`。
与前轮规范审查后的源码一致，但本轮耗时只取当前样本，不沿用旧 before/after 数字。
源码副本置于仓库外临时目录；复制前后核对内容一致，只在副本的三个模块添加固定阶段计时。
版本、依赖锁、取证脚本及插桩差异由本轮 identity 与 patch 保存。
运行时为锁定 Bun 1.3.14，宿主 Linux x64/WSL2、6 个逻辑 CPU；没有 Node 性能对照。

两侧均从根 `src/index.ts` 调用 `defineConfig`/`run`，使用相同 cwd、显式 projectRoot 与依赖。
independent 与稀疏 chain 各取 N=8/32/128/512；每个 Check 常数返回 passed 和空 data，
static admission、maxParallel=1，四类输出均关闭，不配置 changes，因而不采集 Product Git 输入。
计入完整 `await run`；import、Definition 构造、collector reset、断言、digest 与文件输出在窗口外。
未覆盖真实 Check IO、并行负载、custom/learned strategy、取消失败路径及多 Task scope。

### 阶段含义与非重叠计时

| 量值 | 实际边界 |
| --- | --- |
| R04 plan | `planStaticCheckGraph` 入口至原始 frozen graph 完成；四次调用分别记录。 |
| R04 prepare | `prepareTaskGraph` 入口至原始返回 DTO 完成；内部 normalization/catalog、validation、DTO/freeze 是相邻子段，不再加到 inclusive 上。 |
| R04 合计 | 每 Run 的四次 plan 加四次 prepare；JavaScript 先求值 plan 参数，二者不嵌套。 |
| state/setup | `createSchedulerState`，包含一次 admission graph compile；不是第五次 prepare。 |
| loop inclusive | 初始 reconcile/replay 之后进入循环，至成功 `buildTaskGraphRun` 完成；含调度、await、Check callback 与 settlement，不等于纯 R05 或纯 CPU。 |
| unattributed | wall 减上述非重叠阶段；保留外层 Run 工作、graph observation/fingerprint、初始 reconcile/replay、记录开销与其它未观测区间。 |

当前成功路径的四次调用分别属于
[Git 前静态验证](../../src/project-run/invocation/run.ts)、
[strategy preparation](../../src/project-run/invocation/execution.ts)、
[执行前验证](../../src/project-run/check-execution/resolved-checks.ts)和
[实际 Scheduler](../../src/project-run/task-scheduler/scheduler.ts)。
每个合法插桩 Run 必须观测到 4 plan、4 prepare、1 setup、1 loop；序号归属由当前调用点和串行路径核对。
这不声称所有失败、取消或扩展策略分支都执行四次。

### 协议与语义核对

每个 workload 四个串行进程：independent 为 B/I/I/B，chain 为 I/B/B/I；B 为原始源码，I 为插桩副本。
每进程 3 warmup Runs 后取 9 batches，N=8/32/128/512 每 batch 分别为 10/5/1/1 次 Run。
先逐 Run 求阶段和及其占自身 wall 的比例，再对 batch 内各量取平均，最后报告 batch 的 median/MAD/min/max；
单侧合计 18 batches，保留逐进程结果和所有 raw Runs。batch 并非独立宿主实验，不报告 p95、置信区间或显著性。
不剔除慢样本，不减去探针开销，也不相加各阶段 median 冒充某一次 Run。

逐 Run 核对 completed/passed、有序 Check IDs/outcomes、零 Records/messages/warnings、所有输出和 diagnostic channels 禁用，
并检查 durations 数量、身份及有限非负值；全部 completed-result 字段参与签名，只有 `checkDurations[].durationMs`
替换为已验证标记。四进程之间再比较 snapshot digest、完整结果签名与 declarativeFingerprint。
这些证据只覆盖该 workload，不替代产品行为测试。

## 调查结果与边界

### 当前 Run 主要成本在调度循环，不能仅凭四次准备决定优先级

正式采样 32 个进程及汇总均 exit 0，全部协议、源码/脚本身份及跨进程语义核对通过。
下表 wall 为每 batch 每调用平均耗时的 median；括号为 MAD，单位 ms。
R04/loop 份额来自插桩运行，B/I 差只是观测差，不代表优化收益或已隔离的探针成本。

| workload | B wall（MAD） | I wall | R04 ms | R04 份额 | loop 份额 | I/B 差 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| independent 8 | 1.764（0.338） | 1.761 | 0.237 | 13.06% | 48.87% | -0.18% |
| independent 32 | 6.471（0.418） | 6.363 | 0.735 | 11.12% | 66.25% | -1.66% |
| independent 128 | 50.241（2.354） | 50.029 | 2.859 | 5.78% | 85.53% | -0.42% |
| independent 512 | 596.771（8.812） | 591.348 | 13.785 | 2.29% | 95.33% | -0.91% |
| chain 8 | 1.742（0.299） | 1.682 | 0.248 | 14.69% | 46.65% | -3.44% |
| chain 32 | 5.917（0.461） | 6.032 | 0.789 | 13.86% | 56.46% | +1.96% |
| chain 128 | 37.822（2.294） | 37.901 | 3.283 | 8.75% | 77.90% | +0.21% |
| chain 512 | 357.655（4.767） | 355.436 | 15.078 | 4.19% | 91.07% | -0.62% |

N=512 的 R04 份额，independent 范围为 1.930–2.715%、MAD 0.148 个百分点；
chain 范围为 3.374–5.172%、MAD 0.262 个百分点。state/setup median 均约 2.55ms，
unattributed 份额 median 为 1.85%/3.88%。各列独立聚合，不能相加 median 拼成一个 Run。

R04 内并非只有 validation：N=512 的四次 prepare 中，normalization/catalog 总和 median 为
6.046/6.083ms，validation 为 2.909/3.097ms，DTO/freeze 为 2.788/3.337ms（independent/chain）。
这些是各自分布，不据此声称 scope 检查精确占多少，或把全部 validation 归因于某一函数。
[scope validation](../../src/project-run/task-scheduler/graph-validation.ts)仍逐 scope 扫全部 tasks，
public singleton scope 下保持 Θ(V²)；四次 prepare 是重复常数因子，不另增加复杂度阶数。

两侧全部 workload 的 wall 范围重叠。邻接进程对的差异并不稳定：chain 32 两对为 -4.04%/+9.37%，
chain 128 为 +6.52%/-3.70%。因此不能宣称插桩零开销，也不能把 1–3% 的差异当成因果收益；
当前证据适合判断大尺度成本分布，不适合比较微小优化。宿主共享环境、JIT、GC 和调度噪声未被消除。

### 独立 CPU 旁证

较大规模的 loop 主导触发了一轮额外取证：未插桩 baseline、两种 N=512，各独立进程运行
3 warmup 加 9 次 Run；Bun 原生 CPU profiler 使用默认 1000µs 间隔，两个进程均 exit 0。
CPU profile 包含整个进程的 import、Definition、断言及 warmups，而非 run-only 采样；
其 wall 不进入上表，采样权重也不能换算成上表精确 wall 份额。

independent/chain 分别取得 6,947/4,376 个样本。按捕获调用栈统计的 inclusive 样本比例如下：

| 调用路径 | independent | chain |
| --- | ---: | ---: |
| `snapshotSchedulerState` | 16.74% | 26.78% |
| `schedulerInspectionForCore` | 15.75% | 26.05% |
| `decisionContext` | 9.43% | 16.18% |
| 命名投影/检查上下文路径的去重并集 | 41.92% | 69.01% |
| graph plan/prepare 的去重并集 | 2.23% | 4.18% |

投影/检查并集匹配上述前三项，另匹配 `summarizeSchedulerBlockers`、`effectiveMaxParallelFor` 的已捕获祖先，
每个样本最多计一次。子项通常包含在 context 内，不能再相加；它也不穷尽 R05 的所有候选扫描。
按 timeDeltas 加权的对应并集为 41.56%/68.26%，只是采样间隔的近似归因，不是精确 CPU 毫秒。
原生 `freeze` 的聚合 self 样本为 48.83%/43.67%，父栈横跨 snapshot、inspection 和 admission/selection；
不能把所有 freeze 都归入 R05，也不能据此建议删除不可变契约。

这是**重复全态投影及检查上下文值得优先继续调查**的旁证，与大图 loop 主导相互支持；
不是“R05 可削去 42%/69% 延迟”的证明。每形状仅一个 CPU 进程，async/JIT 内联可能使祖先不完整；
profile 不能证明 allocation 数量、峰值内存、真实 IO 负载收益或其它运行时表现。

### 探索过程、验证与下一步边界

方法准备期间的精确替换锚点、清单排序与严格类型/lint 问题在正式冻结前修正，未放宽规则。
首次正式启动因外层日志命名 `formal-window-start.txt` 命中 runner 的证据保全 guard，
在 **0 个采样进程**处 exit 1；失败日志原样保留、已知窗口元数据改名后，冻结脚本不变地重启完整协议。
这不是一次超时 wall 样本，没有删除慢样本或局部补采。取证源码副本及依赖链接仅供临时执行，不进入仓库。

非实施代理审阅实际插桩与统计代码，并从 32 个 raw 文件独立重算所有 workload 的主要分布，
与摘要逐项一致；两个正式 identity 除采集时间外完全相同。
7 个主取证 TS 加 3 个副本模块，以及独立 CPU 汇总 TS，分别通过项目严格类型、完整 implementation lint
（127 rules、零诊断）和格式检查；插桩 recipe 在另一精确副本上重建后逐文件相同。

下一步建议是先确定真实消费者的规模与预算，再对 R05 的重复 snapshot、inspection 和 decision context
物化提出局部方案；宽图候选扫描单独按调用栈与消费者需求判断。仍须保留 custom callback 的 frozen captured
boundary、声明顺序、硬准入条件、取消与 settlement facts，不能用“少 freeze”代替责任划分。
R04 保留为次级候选：当前大图份额较小，小图相对较高但绝对量仅亚毫秒；复用也不得跨越 Git、取消与 strategy
preparation 的既有顺序。**本轮只测量并记录，没有实施上述建议。**

资源按阅读用途保留：先读 `summary.json` 与 `cpu/summary.json` 核对分布/调用栈，需要重算时再读
32 份 `raw/formal-*.json` 与两个原生 `.cpuprofile`；所有正式 warmup 和采样 Run 原样保留。
协议、源码插桩 patch、实际脚本、前后 identity 与校验记录解释当时做法；首轮零样本失败也独立留存。
CPU 叶节点上下文中曾输出未计算的 inclusive 字段，审阅后已从离线派生结果移除；主数字逐项不变，未重新采样。

归档省略重复摘要 stdout、32 份空 stderr、早期方法 smoke、重复 722 项清单和可重建的源码/依赖副本；
空输出、退出依据及准备期 smoke 的版本边界由执行记录和 validation 摘要承接。
85 份保留材料与临时原件逐字节相同，另生成相对路径 `artifact-sha256.txt` 供核对。
脚本是绑定当时工作区与临时路径的历史取证，不是新增公共工具或默认 Gate；协议中的临时准备物不要求随报告重复保存。

归位后核对全部资源哈希，并清理本轮唯一临时执行目录。交付校验实际通过 `bun run validate`
（287 JSON、5 schemas、526 Markdown 链接）、Case 完整性（704 entities、176 Cases、15 topics）、
Investigation 全量检查（70 份）及 `change-plan -- check-all changes`（14/14）。
Change 校验曾误用单项 `check changes`，零写入失败后改用集合入口通过。
Git 空白检查仅对原样 `instrumented.patch` 的空行上下文标记、两份原生 lint JSON 输出的尾空白告警；
保留这三份取证原字节，其余暂存 diff 无空白问题。它们不是 TypeScript 规则豁免。
本轮不改产品、测试或常规开发脚本，未重跑产品测试与完整 Gate；前轮 43/43 Gate 不冒充本轮执行结果。

## 随附资源

- [artifact-sha256.txt](./_resources/261012-profile-post-optimization-run-stages/artifact-sha256.txt)
- [capture-identity.ts](./_resources/261012-profile-post-optimization-run-stages/capture-identity.ts)
- [cpu/chain-512.cpuprofile](./_resources/261012-profile-post-optimization-run-stages/cpu/chain-512.cpuprofile)
- [cpu/chain-512.stdout.json](./_resources/261012-profile-post-optimization-run-stages/cpu/chain-512.stdout.json)
- [cpu/format-result.txt](./_resources/261012-profile-post-optimization-run-stages/cpu/format-result.txt)
- [cpu/independent-512.cpuprofile](./_resources/261012-profile-post-optimization-run-stages/cpu/independent-512.cpuprofile)
- [cpu/independent-512.stdout.json](./_resources/261012-profile-post-optimization-run-stages/cpu/independent-512.stdout.json)
- [cpu/lint-result.json](./_resources/261012-profile-post-optimization-run-stages/cpu/lint-result.json)
- [cpu/lint.json](./_resources/261012-profile-post-optimization-run-stages/cpu/lint.json)
- [cpu/offline-review-correction.json](./_resources/261012-profile-post-optimization-run-stages/cpu/offline-review-correction.json)
- [cpu/protocol.md](./_resources/261012-profile-post-optimization-run-stages/cpu/protocol.md)
- [cpu/summarize-cpu.ts](./_resources/261012-profile-post-optimization-run-stages/cpu/summarize-cpu.ts)
- [cpu/summary.json](./_resources/261012-profile-post-optimization-run-stages/cpu/summary.json)
- [cpu/tsconfig.json](./_resources/261012-profile-post-optimization-run-stages/cpu/tsconfig.json)
- [cpu/types.txt](./_resources/261012-profile-post-optimization-run-stages/cpu/types.txt)
- [cpu/validation.json](./_resources/261012-profile-post-optimization-run-stages/cpu/validation.json)
- [cpu/window-end.txt](./_resources/261012-profile-post-optimization-run-stages/cpu/window-end.txt)
- [cpu/window-start.txt](./_resources/261012-profile-post-optimization-run-stages/cpu/window-start.txt)
- [execution-transcript.json](./_resources/261012-profile-post-optimization-run-stages/execution-transcript.json)
- [frozen-script-sha256.txt](./_resources/261012-profile-post-optimization-run-stages/frozen-script-sha256.txt)
- [identity-attempt-one-after.json](./_resources/261012-profile-post-optimization-run-stages/identity-attempt-one-after.json)
- [identity-attempt-one-before.json](./_resources/261012-profile-post-optimization-run-stages/identity-attempt-one-before.json)
- [identity-cpu-after.json](./_resources/261012-profile-post-optimization-run-stages/identity-cpu-after.json)
- [identity-cpu-before.json](./_resources/261012-profile-post-optimization-run-stages/identity-cpu-before.json)
- [identity-formal-after.json](./_resources/261012-profile-post-optimization-run-stages/identity-formal-after.json)
- [identity-formal-before.json](./_resources/261012-profile-post-optimization-run-stages/identity-formal-before.json)
- [instrument-copy.ts](./_resources/261012-profile-post-optimization-run-stages/instrument-copy.ts)
- [instrumented.patch](./_resources/261012-profile-post-optimization-run-stages/instrumented.patch)
- [lint.json](./_resources/261012-profile-post-optimization-run-stages/lint.json)
- [profiling-observer.ts](./_resources/261012-profile-post-optimization-run-stages/profiling-observer.ts)
- [protocol.md](./_resources/261012-profile-post-optimization-run-stages/protocol.md)
- [public-run-profile.ts](./_resources/261012-profile-post-optimization-run-stages/public-run-profile.ts)
- [raw/attempt-1-runner.exit-code.txt](./_resources/261012-profile-post-optimization-run-stages/raw/attempt-1-runner.exit-code.txt)
- [raw/attempt-1-runner.stderr.txt](./_resources/261012-profile-post-optimization-run-stages/raw/attempt-1-runner.stderr.txt)
- [raw/attempt-1-runner.stdout.txt](./_resources/261012-profile-post-optimization-run-stages/raw/attempt-1-runner.stdout.txt)
- [raw/attempt-1-window-end.txt](./_resources/261012-profile-post-optimization-run-stages/raw/attempt-1-window-end.txt)
- [raw/attempt-1-window-start.txt](./_resources/261012-profile-post-optimization-run-stages/raw/attempt-1-window-start.txt)
- [raw/formal-00-independent-8-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-00-independent-8-baseline.json)
- [raw/formal-01-independent-8-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-01-independent-8-instrumented.json)
- [raw/formal-02-independent-8-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-02-independent-8-instrumented.json)
- [raw/formal-03-independent-8-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-03-independent-8-baseline.json)
- [raw/formal-04-independent-32-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-04-independent-32-baseline.json)
- [raw/formal-05-independent-32-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-05-independent-32-instrumented.json)
- [raw/formal-06-independent-32-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-06-independent-32-instrumented.json)
- [raw/formal-07-independent-32-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-07-independent-32-baseline.json)
- [raw/formal-08-independent-128-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-08-independent-128-baseline.json)
- [raw/formal-09-independent-128-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-09-independent-128-instrumented.json)
- [raw/formal-10-independent-128-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-10-independent-128-instrumented.json)
- [raw/formal-11-independent-128-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-11-independent-128-baseline.json)
- [raw/formal-12-independent-512-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-12-independent-512-baseline.json)
- [raw/formal-13-independent-512-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-13-independent-512-instrumented.json)
- [raw/formal-14-independent-512-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-14-independent-512-instrumented.json)
- [raw/formal-15-independent-512-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-15-independent-512-baseline.json)
- [raw/formal-16-chain-8-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-16-chain-8-instrumented.json)
- [raw/formal-17-chain-8-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-17-chain-8-baseline.json)
- [raw/formal-18-chain-8-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-18-chain-8-baseline.json)
- [raw/formal-19-chain-8-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-19-chain-8-instrumented.json)
- [raw/formal-20-chain-32-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-20-chain-32-instrumented.json)
- [raw/formal-21-chain-32-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-21-chain-32-baseline.json)
- [raw/formal-22-chain-32-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-22-chain-32-baseline.json)
- [raw/formal-23-chain-32-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-23-chain-32-instrumented.json)
- [raw/formal-24-chain-128-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-24-chain-128-instrumented.json)
- [raw/formal-25-chain-128-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-25-chain-128-baseline.json)
- [raw/formal-26-chain-128-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-26-chain-128-baseline.json)
- [raw/formal-27-chain-128-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-27-chain-128-instrumented.json)
- [raw/formal-28-chain-512-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-28-chain-512-instrumented.json)
- [raw/formal-29-chain-512-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-29-chain-512-baseline.json)
- [raw/formal-30-chain-512-baseline.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-30-chain-512-baseline.json)
- [raw/formal-31-chain-512-instrumented.json](./_resources/261012-profile-post-optimization-run-stages/raw/formal-31-chain-512-instrumented.json)
- [raw/formal-process-order.txt](./_resources/261012-profile-post-optimization-run-stages/raw/formal-process-order.txt)
- [raw/runner.exit-code.txt](./_resources/261012-profile-post-optimization-run-stages/raw/runner.exit-code.txt)
- [raw/runner.stdout.txt](./_resources/261012-profile-post-optimization-run-stages/raw/runner.stdout.txt)
- [raw/window-end.txt](./_resources/261012-profile-post-optimization-run-stages/raw/window-end.txt)
- [raw/window-start.txt](./_resources/261012-profile-post-optimization-run-stages/raw/window-start.txt)
- [run-formal.sh](./_resources/261012-profile-post-optimization-run-stages/run-formal.sh)
- [source-identity.ts](./_resources/261012-profile-post-optimization-run-stages/source-identity.ts)
- [summarize-profile.ts](./_resources/261012-profile-post-optimization-run-stages/summarize-profile.ts)
- [summary.json](./_resources/261012-profile-post-optimization-run-stages/summary.json)
- [tsconfig.json](./_resources/261012-profile-post-optimization-run-stages/tsconfig.json)
- [validation-config.ts](./_resources/261012-profile-post-optimization-run-stages/validation-config.ts)
- [validation/config-generation.json](./_resources/261012-profile-post-optimization-run-stages/validation/config-generation.json)
- [validation/format.txt](./_resources/261012-profile-post-optimization-run-stages/validation/format.txt)
- [validation/lint.json](./_resources/261012-profile-post-optimization-run-stages/validation/lint.json)
- [validation/recipe-reproduction.txt](./_resources/261012-profile-post-optimization-run-stages/validation/recipe-reproduction.txt)
- [validation/result.json](./_resources/261012-profile-post-optimization-run-stages/validation/result.json)
- [validation/types.txt](./_resources/261012-profile-post-optimization-run-stages/validation/types.txt)
