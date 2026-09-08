---
title: "Learned 准入启发式未采用的对照解释"
id: "260908-explain-learned-heuristic-rejection"
formedAt: "2026-09-08T11:55:30Z"
question: "c1 的 v1 对照与 c2 的 v2 对照为何未产生可采用的优化，反例机理和可外推边界分别是什么？"
tags:
  - "admission-scheduling"
  - "algorithm-evaluation"
  - "learned-heuristic"
  - "virtual-admission"
relations:
  - type: "补充"
    target: "260908-calibrate-gate-duration-variation"
    summary: "以其校准输入完成方案对照"
---

## 形成时背景

本报告在 2026-09-08 已结束的 learned admission heuristic 对照之后形成，用于保存“为什么不采用”的可复核理由，而不是把测试结果仅留在一次对话或 ignored raw cache 中。相关对照、协议、13 个场景输入、逐场景指标和代表性 trace 已随提交 `fd8923c8` 保存在 `scripts/project/admission-workbench/`；原始全量输出位于 ignored cache，**不是**复现或本报告结论的前提。

被比较的不是完整真实 Gate 的加速率。基线与候选是两个公开 package artifact。双方共享 v2 图的依赖、资源 capacity/claim、mutex 与其他硬合法性约束；c1/c2 是**选择启发式**，不是新增合法性约束。c1 在全局存在 `canAdmit: true` 时过滤该次选择的候选；c2 再在 score/priority 平局时以 public resource-claim backlog 排序。候选复用相同的 scope-layer 分类，但过滤可能使 tightening 或 continuation 层变空并进入后续层/等待，所以不能称 layer 行为完全不变。当前 Product 已恢复基线，未因本轮对照改变行为。

本报告补充 `260908-calibrate-gate-duration-variation`：前序报告提供虚拟负载/波动的校准边界；本报告只记录在该类冻结虚拟输入上如何判断这两个候选，不把它替换成当前性能规范或实施授权。

## 调查目的

1. 保存 c1、c2 的实际对照结论及 no adoption 的门禁理由，防止把一个改善场景或通过成本 guard 误读为整体采用依据。
2. 解释新增筛选或排序为何没有自动让候选普遍领先：区分实际 trace 支持的局部机理、合理推断与尚未证明的命题。
3. 明确以后若重新优化，需要先补哪些最小 ablation；本报告不提出、实现或授权新的策略。

## 调查范围与依据

### 实际读取的材料

- v2 结论 owner：[双 artifact 对照证据](../../scripts/project/admission-workbench/learned-heuristic-dual-artifact.evidence.json)；它保留两个 artifact identity、13 场景、每场景 5 个 fixed replicate、host-cost 原始样本，以及**该回归反例的代表性**逐事件 trace；不是所有 13 场景的完整逐事件 trace。
- 规则 owner：[冻结对照协议](../../scripts/project/admission-workbench/learned-heuristic-evaluation.protocol.json)。主指标为 makespan；每一场景、每个 replicate 均要求候选不高于基线，容忍度为零，且不得以跨场景平均替代。secondary 指标只在主指标通过后评估。
- 输入与实现：`learned-heuristic-weighted-shared-dependency-regression.json`、`learned-heuristic-evaluation-input.ts`、`learned-heuristic-comparison.ts`、当前 `src/learned-critical-path/strategy.ts`、`src/learned-critical-path/selection-layers.ts`，以及 critical-path score owner `src/project-run/task-scheduler/critical-path-ranking.ts`。
- 两个保留的 public package artifact 实际存在，版本分别为 `0.0.0-local.ec1320793b5f` 与 `0.0.0-local.67408df9c41c`。逐文件差异显示它们的 source 差异仅在 `src/learned-critical-path/strategy.ts`（以及对应构建产物/manifest）。随附 `candidate-c2.patch` 是从这两个真实 source 文件直接提取的完整 unified diff；它保存 baseline→c2 的组合差异（包含 c1），不声称独立 c1 source 被恢复，也不是重采样、采用或应用该 patch 的授权。
- 形成时复核 HEAD 为 `b82ae4ce27a5e80a3b386c0abff9af09ecacd8ca`。随附最小索引固定 source commit、SHA-256、artifact source digest、关键数字与历史非门禁材料名；不复制 10 MB 级 raw output。

### 实际尝试的方案与计数

本轮实际比较的是 **3 种选择逻辑**：既有 baseline，以及两个新的候选 c1、c2。只有 c1、c2 是新尝试的算法变体；`v1`/`v2` 是对照协议、场景集合与 cost 计时边界的演进，不是另两种算法。模拟器中的 `static` 仅是平台参照 policy，不计为本轮新候选。没有第二轮新的候选、独立的 backlog-only 变体、ID 置换或 prediction-sensitivity 实验；拒绝这两个候选不表示已搜索到系统最优选择逻辑。

| 选择逻辑 | 实际规则、意图与风险 | 实际测试范围与结果 |
| --- | --- | --- |
| baseline（既有） | 先选 scope-cap 受限的 tightening 层，再选 continuation 层，否则选全部候选；受限层内先按 scope cap 升序比较，随后与普通层一样依次按 critical-path score（自身预测加最大下游分数）、admission priority、canonical task ID。若选中的首项 `canAdmit: false`，strategy 返回 `wait`。它不使用真实剩余执行时间，也不作资源预留。 | 是 c1/c2 对照基线；不作为“新尝试方案”计数。 |
| c1（第 1 个新候选） | 若当前 `context.candidates` 中有任一 `canAdmit: true`，先过滤不可准入候选，再复用相同 layer 分类和原比较器；过滤可令 tightening/continuation 层为空并落入后续层。若全都不可准入，保留原先最终 `wait` 行为。意图是避免已知暂不可准入首选；风险是过滤改变层落点/等待时机，而非仅消除无效选择。 | 只在 v1 的原 12 fixtures 对照；12 个场景各 5 次的 makespan 均与基线相同，没有可采用的虚拟收益。**未**以 c1 单独完成 v2 的 13 场景对照。 |
| c2（第 2 个新候选，建立在 c1 上） | 在 c1 后，只有 score 与 priority 平局时、且在 canonical ID 之前，插入 `sum(claim.units × all-context-candidate-resource-backlog)`；backlog 由本次 context 全部 candidates 的 resource claims 总和计算，不是实测资源耗时，也不是全图未来 work。scope 内的 cap 比较仍先于该 tie-break。意图是在平局时优先可见拥挤资源的工作；风险是该局部计数不知道真实 downstream cost，可能把关键链推后。 | 原 12 fixtures：`gate-shape-v1` 改善、其余 11 个逐 replicate 持平；v2 在同一 12 个输入上增加第 13 个 weighted shared-dependency 反例后，反例五次均 `204 → 300 ms`，因此拒绝。 |

### 有效与无效证据边界

有效 cost 计时只包围 fresh public prepared policy 的原始同步 `decide` loop；每个 artifact 15 sample，基线 context corpus 先从基线公开 policy 捕获后释放，再为双方新建同配置 prepared policy。计时外排除了 import、history materialization、prepare、virtual simulation、trace、wrapper validation 与增长的 observer 扫描。两方交替、同 context、相同 graph，cold-start 预测为 1。

`historical-non-gating` 的 v1 trajectory/context 成本和 wrapper-inclusive cost 只记录探索来历，不能支持采用判断。v2 的 `current-replay` 双 artifact 对照才是这里的结论输入。固定 5 次反例的 `multiplierSamples: [1]` 是同一确定性轨迹的重复，不是五个独立随机压力试验。

随附 patch 与 Git 中的基线能够恢复被撤回的 c2 单个源码文件，不保证自动重建同一 identity 的完整历史 package。实际重放仍须准备两个公开 artifact，并重新记录其身份；命令与边界见[工作区对照说明](../tooling/workspace.md#learned-admission-heuristic-对照记录)。

## 调查结果与边界

### 已确认结果：不采用 c1/c2

| 对象 | 已确认事实 | 采用含义 |
| --- | --- | --- |
| c1 | 仅按 public `canAdmit` 过滤 scored choice；v1 原 12 场景各 5 次的 makespan 全部持平。 | 未进入 v2 的采用结论。 |
| c2（在原 12 fixtures） | `gate-shape-v1` 的 makespan 在五个 fixed replicate 均为 `1000 → 900 ms`；其余 11 个原有场景逐 replicate 持平。 | 单一改善不是采用依据。 |
| c2（v2 新增第 13 场景） | `learned-heuristic-weighted-shared-dependency-regression` 在五个 fixed replicate 均为 `204 → 300 ms`，即增加约 47.06%。 | 逐场景、零退化主门禁失败；保留基线。 |
| 完整 v2 汇总 | 13 场景中 11 个逐 replicate makespan 完全持平，1 个改善（Gate shape），1 个退化（weighted shared dependency）。 | 这不是“基线稳定领先”：结果是不对称的持平、改善和退化。平均值不能掩盖反例。 |
| host decision cost | 基线 p95 `24.545004 ms`，候选 p95 `24.355285 ms`，1.25× budget `30.681255 ms`，15 对 15 sample；guard 通过。 | 仅证明该测量边界内 cost guard 通过；不证明统计显著更快，更不能覆盖主指标退化。 |

所以 no adoption 的理由不是“任何新约束都使基线更快”，而是预先固定的逐场景零退化规则已被一个有效反例触发。即使 c2 复用公开 critical-path/layer 分类并在选择逻辑中加入 `canAdmit` filter 与 resource-backlog tie-break，也不能由“筛选或排序更多”推出局部贪心选择对 makespan 全局有利；它们不是新增硬合法性约束。

### 反例的可复核时间线与解释强度

当前 strategy 对每个任务以预测时长加 downstream 最大分数建立 critical-path score；score 相同后按 admission priority，再按 canonical task ID 排序。该反例冷启动预测均为 `1`，`a-root`、`b-root` 的 critical-path score 均为 `2`、priority 均为 `0`。初始可选集合的 resource backlog 是 `shared=7`、`queue=10`；由候选源码的 `units × backlog` 求和，`a-root` 的 backlog score 为 `2×7=14`，`b-root` 为 `2×10+1×7=27`。所以 c2 在 score/priority 平局后选 `b-root`；基线仅按 canonical ID 使 `a-root` 先行。这是从冻结 fixture 和源码作出的确定性推导，不是新实验；也不能称基线知道真实长路径或理论最优，且 c2 的 backlog 并不知道真实 downstream cost。

| 时间 | 基线 trace | c2 trace | 已能说明什么 |
| --- | --- | --- | --- |
| `0–100` | `a-root` 运行 | `b-root` 运行；`c-fill` 仅 `0–1` | c2 的 backlog score（`b-root=27 > a-root=14`）先选 `b-root`，使 `a-root` 不能同时取得其所需 shared=2。 |
| `100–200` | `b-root` 与 `a-tail` 并行 | `a-root` 运行；`b-tail` 仅 `100–101` | 基线先展开 a 链；c2 将 a 链整体后移。 |
| `200–204` | 其余短队列完成 | 短队列完成，同时 `a-tail` 才开始并继续 | c2 的关键尾部成为 a 链。 |
| `204–300` | 已完成 | `a-tail` 继续运行至 300 | 两条 trace 的 makespan 差为 96 ms。 |

**直接证据支持的解释：** 初始 resource-backlog 平局打破选择 `b-root` 而非 `a-root`；由于 shared capacity/claim，`a-root` 直到 `b-root` 在 100 ms 结束后才可启动，从而使 a-tail 的完成落到 300 ms。这足以解释该具体反例为何违反零退化门禁。

**未证明：** `c-fill` 在 0–1 ms 虽被候选准入，但它没有 resource claim，且 `b-root` 对 shared 的占用已经足以阻止 `a-root`；没有单变量 ablation，不能把 backfill、严格 wait 或 `canAdmit` filter 宣称为已证实根因或收益来源。也未证明所有 backfill 有害、所有 resource-backlog tie-break 有害、基线对任何 ID 置换都领先，或候选在真实 Gate 上更慢。`gate-shape-v1` 是合成的 21-task claimed-only shape，不是完整 36-Check Gate；虚拟 ms 不得与 Gate wall time 比较。

### 可行动的后续边界（未实施）

若未来重新调查，不应仅加入更多筛选或排序规则、也不应直接扩大搜索。首先需要：

1. **ID 置换**：保持图、预测、claims 不变，置换 `a-root`/`b-root` canonical ID，检验当前基线的 tie-break 偶然性。
2. **预测敏感性**：在保留图/资源的情况下改变 cold-start 或已知 prediction，检验 score 平局是否是反例必要条件。
3. **单变量 ablation**：分别移除 `canAdmit` filter、resource-backlog tie-break 与 c-fill/backfill 的可用性，才可归因每项对反例及 Gate shape 的影响。

这些是重新调查的最小必要实验，不是采用、新建策略、修改 Product、测试、Gate 或当前 owner 文档的授权。

## 随附资源

- [真实 artifact 的 baseline→c2 source diff](./_resources/260908-explain-learned-heuristic-rejection/candidate-c2.patch)
- [证据索引与来源摘要](./_resources/260908-explain-learned-heuristic-rejection/evidence-map.json)
