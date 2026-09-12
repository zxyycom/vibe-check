---
title: "简单准入算法对照：未获得可采用的性能优化"
id: "260908-compare-simple-admission-algorithms"
formedAt: "2026-09-08T12:43:33Z"
question: "本轮简单准入算法比较是否获得可采用的性能优化，未成功的依据是什么，对当前方案和后续优化空间能作出哪些有限判断？"
tags:
  - "admission-scheduling"
  - "algorithm-evaluation"
  - "virtual-admission"
relations:
  - type: "补充"
    target: "260908-explain-learned-heuristic-rejection"
    summary: "扩展为不同简单算法对照"
---

## 形成时背景

前轮 `260908-explain-learned-heuristic-rejection` 只比较了两个接近 learned helper 的局部变体，并使用全为 1 的冷启动预测。候选覆盖过窄，既不能说明常见简单算法的表现，也不能支持“当前方案稳定领先”的解释。因此，本轮在同一公开 API 上扩展到不同原则的贪婪策略和穷举加剪枝，并加入非均匀预测、预测失配与 ID 置换场景。

本轮目标是寻找可采用的性能优化，而不是只完成更多实验。实际未获得满足采用条件的候选，Product 保留原方案。本文围绕这一未成功结果保存方案、数据、解释和未知；调查材料可供后续复核，但不计作已经取得的产品性能提升。

本轮属于用户授权的 repository-private 虚拟实验。保留旧 13 个冷启动输入和 204→300 的历史反例；未修改 `src/**`、Product 准入策略、Gate 或既有冻结协议，也未测得真实 Gate 加速率。本文记录同一轮实验认识，不建立新的长期算法方向。

## 调查目的

本轮围绕三个问题展开：

1. 在相同图、预测输入和 sampled-work commitment 下，四个新候选能否做到逐场景不退化、存在合格改善，并满足决策成本要求？
2. 未通过时，失败来自完工时间、决策成本、信息模型还是证据不足？局部收益是否仍存在？
3. 这些结果能否支持“当前方案已最优”或“简单算法已到头”？后续投入有哪些尚未验证的前提？

四个新候选为全局 SPT、LPT、含 `dependsOn` 与 `observes` 的静态关键路径（CP）贪婪，以及每次决策最多 4096 node 的 branch-and-bound（BnB）。参考组实际调用 public `createLearnedCriticalPathStrategy`。本轮保留逐场景 makespan、已投影的 secondary virtual metrics、搜索状态和批次成本；执行成功、局部改善与可采用优化是不同结果。

## 调查范围与依据

### 阅读顺序与术语

判断本轮是否成功，先读下节的核心结论与方案表；核对数字时，按 `scenarioId`、`prediction.regimeId`、`policyId` 和 replicate 定位随附 `evidence.json` 的 `records[].results[]`，或用 `summary.json` 查看逐场景总览；复现时再读成本边界和安全重放入口。`run-manifest.json` 记录 artifact 身份、协议偏差及运行来源，不能替代正文对结论强度的说明。

本文的 makespan 是整图完工时间；replicate 是同一协议下的一次重复运行，不自动代表独立随机样本；scenario/regime 是场景与预测条件的组合。BnB 的 incumbent 是目前已找到的最好可行排程，complete/truncated 分别表示当次模型搜索完成/预算截断，不是整次真实执行的最优性标记。

结果表中的短名 `scope`、`resource`、`permutation-a/b` 分别对应 `constrained-scope-choice`、`weighted-resource-choice`、`regression-id-permutation-a/b`；`cold`、`nonuniform`、`mismatch` 分别对应 `cold-all-1`、`synthetic-nonuniform`、`synthetic-mismatch`。

### 输入、方法与身份

- 冻结协议是 `simple-admission-algorithm-comparison-v1`，现行 SHA-256 为 `c485a80781b2544168354ff840be25f676c03676841fb7407e106ccbda6d38c9`。初始测量描述 SHA-256 `d4266b71862f7e708646e0a869eb7fbf54c87217d261bf73857795189d8f68f7` 只澄清计时 callback 文字，未改变候选、输入或门槛。
- 输入包括 13 个 legacy cold-all-1 fixture（seed 7、各 5 replicate），以及 `packing-33222`、`packing-5432`、`unlock-long-tail`、resource choice、constrained scope 和两个 regression-ID permutation。总计 34 个 scenario/regime × 5 policies × 5 replicates = **850 次 simulation run**（170 个 policy records）；全部成功且每个 scenario/replicate 的 sampled-work commitment 相同。
- cold 用 empty history 的 public helper；另两种 regime 均以 `prepare(...).complete(...)` 在独占临时目录写入合成 history。每 task 的合成 terminal duration 是 declared nominal profile；mismatch 是按 canonical task ID 的固定循环置换。它不是 simulation 的 true remaining work、未来 outcome 或实测训练。baseline 读取该 history，候选读取同一输入冻结出的 map；任一 baseline `selection-proposed` 的 estimate/source/sampleCount 不符即 fail closed。
- SPT/LPT/CP 均对**全局** `canAdmit` candidates 排序：分别按短、长、含 dependsOn/observes 的静态 critical-path score，随后 priority、ID。它们不继承 public helper 的 soft tightening/continuation layer；依赖、scope、mutex、capacity 仍由 public immutable `AdmissionState` 与 simulator 保证。
- BnB 只 fork public `AdmissionState.select/settle`，分支为 legal select 与（有 running work 时的）wait。预测模型假设 all-satisfied、无 contention slowdown，并在每个真实 boundary 把 running remaining 保守重估为完整冻结 prediction；忽略关系、资源和 scope 的下界仅是乐观下界。`complete` 仅表示该假设模型、该 state 和 select-plus-wait action space 的最优。
- **冻结协议偏差（保留协议与其 hash，不作修订）：** 协议写的是“legal CP-greedy incumbent fallback”，但实际 `solveBnb` 每次都先以 `greedyCompletion` 的 prediction-descending **LPT** 完成一个 incumbent；CP 的 `fallbackAction` 仅在该 incumbent 的 `firstAction` 为 null 时才用。截断时返回当前 legal incumbent 的 first action，可能已经被搜索改善，并不必然是 CP fallback。本轮因此只测得 **LPT-seeded BnB**，未验证 CP-seeded BnB；若需比较后者，应另开实验而非篡改本轮算法或冻结协议。
- 紧凑材料与 `run-manifest.json` 均持久记录实际 public candidate：`@zxyycom/vibe-check` `0.0.0-local.47404e90e692`，entry SHA-256 `sha256:dab388d17ab9ea57a34bd32921267a9d2162fa1954c91bafbd4d9d42b52522e4`。两份 retained raw 都含此同一 identity，且其逐 record 的 makespan、slotTimeMs、resourceUnitTimeMs 和 commitment 投影一致。
- 调度规则的实现依据是 [baseline strategy](../../src/package-tools/learned-critical-path/strategy.ts)、[scope 选择分层](../../src/package-tools/learned-critical-path/selection-layers.ts) 与随附候选源码。链接跟随源码归属移动；本轮未修改这些 Product 源码，形成时实现仍须以记录的 candidate identity 和本轮资源核对，不能把未来实现代入本轮解释。

## 调查结果与边界

### 核心结论：本轮没有产出可采用的优化

**若成功标准是可直接采用的性能提升，本轮未成功。** SPT、LPT、CP 虽各有局部改善，但均出现完工时间退化；实际 LPT-seeded BnB 在本轮场景中没有完工时间退化，却未满足决策成本要求。没有候选被采用，也没有已验证的真实 Gate 性能提升。

这一结论不等于“没有发现任何收益”：BnB 改善了 5 组、持平 29 组，只是这版实现没有以合格成本兑现收益。也不等于“简单算法已穷尽”或“当前方案接近最优”；本轮只覆盖明确列出的候选与条件。

### 各方案特点与实际结果

旧 13 个 cold 连续面中，四个新候选都与 public baseline makespan 相同；这没有改写前轮 c2 反例，也不构成新收益。下表的 improve / same / regress 是相对 baseline 的 **34 个 scenario/regime** 的 makespan 比较，而不是把总体胜率替换成逐场景门槛。

| 策略 | 选择规则 | 相对 baseline makespan（改善 / 持平 / 退化） | 代表性事实 | 已足以排除的原因 |
| --- | --- | ---: | --- | --- |
| public learned baseline | 预测关键路径 + scope 分层优先 + 必要时等待 | 参考 | 参考组，本身也是有领域针对性的贪婪策略 | 不是采用候选 |
| SPT global | 全局预测短任务优先，倾向尽快完成当前任务 | 2 / 23 / 9 | `permutation-b` cold 204 vs 205；`scope/nonuniform` 19 vs 17 | 已观察到完工时间退化 |
| LPT global | 全局预测长任务优先，避免长任务留到尾部 | 2 / 27 / 5 | `packing-5432/nonuniform` 7；`resource/nonuniform` 21 vs 14 | 已观察到完工时间退化 |
| CP global | 全局静态最长后续链优先，不保留 baseline 的 scope 分层 | 5 / 27 / 2 | `resource/nonuniform` 13 vs 14；`scope/nonuniform` 19 vs 17 | 已观察到完工时间退化 |
| BnB global（实际 LPT-seeded） | 从 LPT 初始可行排程出发，在 4096-node 预算内搜索和剪枝 | 5 / 29 / 0 | `resource/nonuniform` 13；`permutation-a` cold 300 | 已观察到成本失败；不是截断本身禁止采用 |

紧凑 evidence 实际投影的 secondary 只有 `slotTimeMs` 与 `resourceUnitTimeMs`（外加 makespan 和 commitment）；没有重新完整计算或认证前轮的 resource-backlog、queue-tail 等所有 secondary metrics。因此，保留的 adoption screen 仅是原先声明的比较规则，**不是已经完成的全 secondary certification**。这不改变本轮的未采用结论：SPT/LPT/CP 已各有 makespan regression，BnB 已有成本失败；但它限制了任何“其它 secondary 全通过”的说法。

局部数值仍有解释价值而不构成采用依据：nonuniform `unlock-long-tail` 中 CP/BnB 为 13 ms（baseline 13、SPT 14、LPT 15）；nonuniform resource choice 中 CP/BnB 为 13（baseline 14、SPT 17、LPT 21）。ID permutation-a cold 中 CP/BnB 为 300，baseline/SPT/LPT 为 304；但该图的 nonuniform/mismatch 里 SPT 为 304，baseline 为 204。冻结图和预测下的这些反例不能证明真实 Gate 时长会同样变化。

### 为什么多数简单替代策略没有稳定领先

以下区分代码与实验可确认的事实、对结果的解释，以及尚未闭合的因果关系。

| 观察对象 | 已确认事实 | 有限解释与未证明部分 |
| --- | --- | --- |
| baseline 并非朴素队列 | baseline 结合预测关键路径、收紧或继续受限 scope 的优先级；选中的优先候选暂不可准入时可以等待 | 新全局贪婪不只是简化计算，也改变了领域取舍。scope 场景中的退化与此差异相容，但没有单变量消融，不能把全部差异归因于某一层规则 |
| 单个任务长度与整图完工时间不同 | `unlock(1) → tail(12)` 中，先推进短入口可以解锁长尾；LPT 在非均匀预测下为 15，baseline/CP 为 13 | 短任务优先、长任务优先、最长后续链优先各照顾不同侧面；局部排序偏好不是对原方案的单调增强 |
| 资源与 scope 会改变后续可行集合 | 候选准入、资源占用和 scope 状态均由 public state 约束；CP 在 resource/nonuniform 改善，却在 scope/nonuniform 退化 | 先启动哪个任务会影响后续可并行组合，当前填满槽位不保证最终更早完成；本轮未证明任一种等待或填槽策略普遍更好 |
| 平局不能证明已经最优 | 旧 13 个场景均使用全为 1 的冷启动预测；SPT/LPT 的时长排序失去区分度，退回 priority/ID 等平局规则。单链等形状本身也限制了调度自由度 | 大量持平可能来自输入区分力或约束，而不全是 baseline 优秀。本轮未计算全部场景的最优值或下界差距，不能宣称优化空间已耗尽 |
| 搜索使用的仍是预测模型 | BnB 每次真实决策都重置运行中任务的完整预测时长，并重新建立 incumbent 和搜索；初态小图最优值不等于整次在线执行结果 | 增加搜索量不自动消除模型误差。剩余时长建模、状态复用和更强剪枝可能值得研究，但其效果、开发成本和投入回报均未测量 |

“稳定领先”的要求也强于“平均更快”：本轮保留逐场景无退化要求，一处明确退化便足以排除该候选，不能用其它场景的收益抵消。该要求解释了为何局部改进仍未采用，但不应被改写成“算法没有优化能力”。34 组输入和重复运行证明的是这些条件下的结果与可重复性，不代表真实工作负载分布或所有简单算法。

### BnB 的小图、截断和 rolling 边界

pruned/unpruned 对照仅验证**同一个 `solveBnb` 枚举器**在三个 initial-state 小图上的 pruning，不是对一般 action space 的独立验证：

- `packing-33222`：work 12、两机 lower bound 6；`3+3` 与 `2+2+2` 可分配到两机并达到 6。SPT/LPT 的实际 virtual makespan 都为 7；该模型的 exhaustive/pruned optimum 都是 6。
- `packing-5432`：work 14、lower bound 7；`5+2` 与 `4+3` 可达到 7。SPT 为 8、LPT 为 7；exhaustive/pruned optimum 均为 7。
- `unlock-long-tail`：`unlock(1) → tail(12)` 的链 lower bound 为 13，且可达到 13；exhaustive/pruned optimum 均为 13。

12-task self-check 的 unpruned search 在 4096 node 截断；0 budget 时仍返回 public-legality 接受的 legal action。真实比较的 BnB 有 1,340 次 decision，其中 1,060 complete、280 truncated。线上 BnB 会在每个真实 boundary 把 running prediction remaining 重设为 full estimate，所以即使 `packing-33222` initial-state reference 是 6，实际 virtual run 中 BnB 也为 7；这说明 rolling information model 的边界，不是“整次 run 已全局穷举仍不如 baseline”。截断结果不能作 optimality claim，但也不单独构成不采用理由。

### 成本证据与 retained-run 命名

成本重放四组预先命名的 public baseline contexts，每组最多 6 个，实际为 21 contexts；2 warmup、9 samples、每 sample 一次 corpus，循环 policy 顺序。`performance.now()` 只包 direct synchronous `decide` loop，public handle 不传 observe callback；prepare、history materialization、corpus capture 和 disposal 均在计时外。

这里的 p95 是**一次重放全部 21 contexts 的批次耗时**，不是单次 `decide` 延迟。9 个 sample 的 p95 实际是最大样本；这些数字不能支撑“统计显著更快”的主张。

本轮与前序 c1/c2 报告使用的成本语料、循环次数和样本数不同，不能横向比较两份报告的 p95 来计算算法加速比；本轮成本比值只使用同一次运行中的 baseline 与候选。

| policy | 历史 superseded（raw 未保留）p95 ms | retained predicted-makespan validation p95 ms | retained public-artifact/output validation p95 ms |
| --- | ---: | ---: | ---: |
| public baseline | 1.637170 | 0.382551 | 0.461838 |
| SPT | 0.112590 | 0.139569 | 0.161901 |
| LPT | 0.110906 | 0.106709 | 0.074518 |
| CP | 0.229877 | 0.273859 | 0.228574 |
| BnB | 1686.441 | 1740.673366 | 1712.867861 |

共有三次成功完整执行。最早一次在 raw-cache 保存加入前固定覆盖 `evidence.json`，现在只能诚实保存 console p95，不能安全重建完整 raw。随后两次才是 retained raw：`/tmp/vibe-check-simple-admission-comparison-full-evidence.json`（SHA-256 `19d12198890a4fc7d3eb5188f03b6dcd21657f25ba0c756dea061559958d1e95`）是 predicted-makespan validation；`/tmp/vibe-check-simple-admission-comparison-rerun-full-evidence.json`（SHA-256 `986e447185c9f7dcc677c36ff7897005878e6e31b7f4c2683ed948ae8b1a4e3f`）是 public-artifact/output validation。二者的 core result projection 一致，均保留各自 timing samples；没有择优或平均，也不把 raw 当作重放输入。

BnB 在三次批次 p95 均远超同批 baseline 1.25× 门槛（2.046463 / 0.478189 / 0.577298 ms），故成本失败已足以排除采用。这是当前实现的测量结果，不是搜索类算法经优化后的最低成本。Product 未被修改，仍保持 baseline；本轮也未完成完整 adoption certification。

### 当前安全重放入口

历史命令 `bun docs/investigations/_resources/260908-compare-simple-admission-algorithms/simple-admission-comparison.ts` 是旧版本，会覆盖受管 `evidence.json`；它只作为历史记录，**不是当前 replay 命令**。现入口必须在任何 850-run 工作开始前得到一个新的、外部输出文件，拒绝无参数、未知参数、已有目标和本报告受管资源目录内目标，并用 exclusive create 写入。

以下命令必须从仓库根目录运行，并已有 `scripts/project/node_modules/@zxyycom/vibe-check` 公开 candidate。重现本轮前须核对它与上文记录的 candidate version 和 entry SHA-256 匹配；入口不负责构建或恢复历史 artifact，身份不匹配的输出只能作为不同条件的新实验。

```bash
outdir="$(mktemp -d)"
bun docs/investigations/_resources/260908-compare-simple-admission-algorithms/simple-admission-comparison.ts \
  --output "$outdir/evidence.json"
```

该命令会产生新的 raw replay output，不会覆盖本报告的紧凑 evidence 或 retained cache；失败会以 `simple-admission-comparison:` 的清晰 stderr 诊断和 exit code 2 退出。本轮最终优化只验证了输出保护，未再次运行完整 replay 或重测上述成本。

### 本轮收束与重新调查条件

本轮实际交付是可复核的方案、反例、成本记录和未采用依据，**不是可采用的性能优化**。Product 保留当前方案；本文不把调查产出等同于产品优化成功，也不把未采用升级为永久停止优化的决定。

尚不能得出的结论包括：当前方案最优或接近最优、简单算法已经到头、搜索方案必然不划算、投入更多实现成本必然得到更好结果。已有证据只支持：本轮所试的简单替代策略没有满足采用条件，继续推进需要更具体的假设与验证，收益未知。

若未来重新投入，宜先提出一个可证伪的问题，而不是默认扩充候选或扩大搜索预算。例如核对典型场景距下界还有多少空间，或单独验证剩余时长模型、状态复用、剪枝是否能以合格成本保留已有收益。这些只是尚未实施的调查方向，不创建新任务、不授权修改 Product，也不意味着必须采用更复杂算法。

新的实验应保留本轮材料，声明输入、候选差异与成本预算，并区分预测模型结果和实际执行结果。若进入采用阶段，还需补齐未完成的 secondary 验证与真实运行证据；不得向候选泄露 simulation true duration，也不得通过事后改写本轮协议消除偏差。

## 随附资源

- [候选算法与 BnB 实现](./_resources/260908-compare-simple-admission-algorithms/comparison-algorithms.ts)
- [固定场景构造](./_resources/260908-compare-simple-admission-algorithms/comparison-fixtures.ts)
- [当前安全 replay 输出边界](./_resources/260908-compare-simple-admission-algorithms/comparison-output.ts)
- [每 replicate 的紧凑证据与 replay 元数据](./_resources/260908-compare-simple-admission-algorithms/evidence.json)
- [初版协议摘要](./_resources/260908-compare-simple-admission-algorithms/protocol-v1.sha256)
- [现行协议摘要](./_resources/260908-compare-simple-admission-algorithms/protocol.sha256)
- [三次运行、candidate identity 与 retained raw 清单](./_resources/260908-compare-simple-admission-algorithms/run-manifest.json)
- [冻结比较协议](./_resources/260908-compare-simple-admission-algorithms/simple-admission-comparison.protocol.json)
- [可执行比较入口](./_resources/260908-compare-simple-admission-algorithms/simple-admission-comparison.ts)
- [紧凑结果摘要](./_resources/260908-compare-simple-admission-algorithms/summary.json)
- [代表性反例 trace](./_resources/260908-compare-simple-admission-algorithms/trace-excerpts.json)
