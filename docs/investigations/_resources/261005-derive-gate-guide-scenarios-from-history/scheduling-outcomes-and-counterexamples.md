# Gate 历史素材：调度、结果责任与反例

本资源归属 `261005-derive-gate-guide-scenarios-from-history`，保存历史证据与教学候选。调查日期为 2026-10-05，核对基线为 `e1164d27177f4b4b010a0603ffe999ac6c98084d`。

## 范围与依据

先恢复[超时原调查](../../diagnose-project-gate-candidate-timeout-under-contention.md)及其[纠正](../../correct-project-gate-candidate-timeout-interpretation.md)、[时长波动](../../calibrate-gate-duration-variation.md)、[启发式拒绝](../../explain-learned-heuristic-rejection.md)和[队首等待](../../diagnose-required-gate-head-of-line-wait.md)，再用路径限定 Git log/show 核对变化。当前 contributor 调用关系先查 CodeGraph，再以源码确认。

覆盖七组事件，重点是准入约束、失败责任与证据强度；未审计全部调度候选或测试语义。下文计时来自历史记录或明确标注的假设推演，本轮未执行 Gate、测试正文、benchmark 或历史 artifact。

当前责任入口：

- [Project Gate](../../../tooling/project-gate.md)：组合、逻辑资源、quality、contributor 与 caller exit。
- [Scheduler](../../../development/scheduler.md)与[调度指南](../../../guides/scheduling.md)：合法性和准入；[learned 指南](../../../guides/learned-scheduling.md)：non-core 策略与 history。
- [Check results](../../../development/check-results.md)：terminal facts、Records、effective aggregation。
- [Gate diagnostics](../../../tooling/gate-diagnostics.md)：owner-safe projection、transcript 与呈现。

下列候选例子供后续改编，尚未创建或运行验收；当前规范由上述 owner 承接。

## R1：依据验收意图区分 watchdog 与性能预算

**问题场景。** 2026-09-04，candidate cold build/install/reuse 主 case 曾越过 20 秒，而隔离运行显著更快；full workload 的慢链串过 candidate lane、package-lifecycle mutex、external-consumer provider 和 acceptance 尾部。调查起初把它称为竞争造成的 timeout 假失败。

**历史变化。** 提交 `71decb6ccd13004fd3fd356f114492acf8be33b0` 同时保存原报告和明确指向它的纠正报告。原报告建议把 watchdog 与性能预算分离、考虑 root parallel 2/3/4；纠正报告根据用户确认撤回：20 秒正是有意的 blocking performance budget，root 固定 3，不允许扩大 timeout/重试/降级 advisory；先 profile 实际 cold work，最多将慢 Check 的局部 cap 留作候选。两篇没有新 A/B 数值，改变的是解释和授权，不是测量事实。

**证据强度。** 报告记载历史日志、full/isolated 数值及用户意图；本轮能复核其保存的认识和修正关系，未重跑当时 workload。full/isolated 差异支持竞争假设，却未排除 cache、宿主负载等变量，不能识别因果系数。旧报告“删 mutex 可回收 slot-time 并估算 wall 上界”的算术也不应当作普遍收益证明：原报告没有取得资源互相影响、可重排时间线与完整 counterfactual 实验。

**定位与复核。** 路径为 `docs/investigations/diagnose-project-gate-candidate-timeout-under-contention.md` 和 `docs/investigations/correct-project-gate-candidate-timeout-interpretation.md`；关键段落为“建议的后续顺序”“修正后的结论”。

```bash
git show 71decb6ccd13004fd3fd356f114492acf8be33b0:docs/investigations/diagnose-project-gate-candidate-timeout-under-contention.md
git show 71decb6ccd13004fd3fd356f114492acf8be33b0:docs/investigations/correct-project-gate-candidate-timeout-interpretation.md
```

**当前边界。** 纠正报告没有采纳局部 cap 2，也没有修改上述 timeout；本轮不追踪 candidate 内部优化全过程。R6 的 9/26 **整次 Gate 总耗时**预算后来改为 warning，是另一边界/新 owner 决定，不能倒推“9/4 的 case 越界本来就是假失败”。

**候选例子与验证重点。** 假设相同 case 在 isolated 8 秒、full 21 秒，先问“20 秒是 hang watchdog 还是验收预算”，再判断该改工作还是 policy。保留 exact workload、实际验收责任、timeout 层级、root limit 与 mutex。适用边界：凭隔离更快宣布 full 失败错误；凭一个慢 lane 改全局并发；复制历史 ms 为今天的通用上限。

## R2：root slots、mutex 与 named resources 分别表达三类限制

**问题场景。** 一个 Product Task slot 不是一个 CPU core；多个 Bun test lanes 能同时启动内部并行工作，repository scans 也有共享工作形态。仅有 root 3 和独占 mutex，无法表达“同类最多两个，但不必全部串行”。

**历史变化。** `4ee8ca30016de4377d40d6504debe21eaf25f58f` 增加 Definition 的 capacities/继承 claims、闭合校验，以及 admission core 运行开始/结束时的 claim 原子占用/释放。之后 `b30477b63b919d27ea95b0b9a9bb8ede7f9b5e15` 才在 Gate 声明两个逻辑资源：Bun runners 与 repository scans 容量均为 2，每个所属 Check claim 1；保留 root 3 与原 mutex。Gate 配置变化不等于新增 Core 算法。

**证据强度。** 前后源码直接证明配置和占用责任，不证明真实加速或 contention 系数。`260908-calibrate-gate-duration-variation` 只有每类五个本机样本，且 full execution 与 isolated payload 的口径/顺序不同；它明确不足以通过倍率选 capacity/claim。

**定位与复核。** Core `claimsFitCapacities`、`applyRunningOccupancyDelta`、`withResourceClaimDelta`；Gate `PROJECT_GATE_RUN_CONFIG.scheduler`、`withProjectGateResourceClaims`。

```bash
git show 4ee8ca30016de4377d40d6504debe21eaf25f58f -- src/project-definition/check-tree/resolution.ts src/project-run/task-scheduler/admission-core/selection-transition.ts
git show b30477b63b919d27ea95b0b9a9bb8ede7f9b5e15 -- scripts/project/gate/definition.ts docs/tooling/project-gate.md
```

**当前边界。** HEAD owner 仍保留 root 3、两个 capacity 2 的逻辑预算；当前 scans 已包含第五项 Markdown lint。现在 test-lane claims 由其 owner 对象组承接，不应复制历史 helper/成员清单。package-lifecycle 与 repository-material mutex 仍是独占约束；static priority 全为 0，owner 明示成对测量未同时改善 required/complete median。

**候选例子与验证重点。** 三 runner A/B/C 加一个不 claim runner 的 lint D：同类最多两项，第三个 root slot**可以**留给 D，但资源预算不保证 D 一定被策略选择。mutex 表示必须排他，named resources 表示可共享配额，root 表示总任务数；Core 始终原子验收全部约束。适用边界：把 unit 称为物理 CPU/内存、按高方差给所有 CPU 用户统一 claim、为了空槽删除 mutex、承诺 capacity 2 比 3 更快。

## R3：用完整图反例检验补位与资源优先策略

**问题场景。** learned strategy 的 ordinary 层先按预测 critical path 选第一项；若它 `canAdmit=false`，返回 wait。root 空槽旁存在可执行任务，看似应该直接补位。

**历史变化。** `fd8923c83a8878ab523939846f062c483a1db99b` 保存冻结双 artifact 对照协议与证据，**没有**提交候选 strategy 为生产实现。c1 先过滤不可准入项，原 12 场景各五次持平；c2 在 c1 上插入 resource-backlog 平局打破，原 Gate-shape 改善，但新增 weighted shared-dependency 反例由 204 增至 300 虚拟 ms，违反逐场景零退化协议。候选完整组合 patch 在后来的解释报告附件中保留；不能把恢复 patch 误称已合入。

**证据强度。** 冻结 protocol/evidence、代表性 trace 与真实 artifact 提取 patch 支持“该组合候选在该反例失败”；原成本 guard 通过不能覆盖 makespan 退化。没有 filter/backlog/backfill 的单变量 ablation，不能归因“全部补位都坏”或“基线理论最优”。五个确定性 replicate 不等于五个独立随机压力试验。

**定位与复核。** `scripts/project/admission-workbench/learned-heuristic-evaluation.protocol.json`、`learned-heuristic-dual-artifact.evidence.json`、`learned-heuristic-weighted-shared-dependency-regression.json`；当前 `src/package-tools/learned-critical-path/strategy.ts` 的 `learnedDecision`/`selectLearnedCandidate`。

```bash
git show fd8923c83a8878ab523939846f062c483a1db99b:scripts/project/admission-workbench/learned-heuristic-evaluation.protocol.json
git show fd8923c83a8878ab523939846f062c483a1db99b:scripts/project/admission-workbench/learned-heuristic-dual-artifact.evidence.json
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:docs/investigations/_resources/260908-explain-learned-heuristic-rejection/candidate-c2.patch
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:src/package-tools/learned-critical-path/strategy.ts
```

**后续修正/未采用。** `260926-diagnose-required-gate-head-of-line-wait` 从真实空槽观察初步推荐 admissible-first，又同轮修正为未证明整体收益。当前 strategy 仍对全部 ordinary candidates 排序，首选不可准入则 wait。其 static fallback ordinary 层已有 admissible filtering，二者不能混称同一算法。报告还保留 active 决策对旧 learned Plan 的 effective-opportunity 重基线限制；本轮不推进该 Plan。

**教学建议：两种相反小例子。** 有利：runner capacity 2 已满，而不竞争的 D 可用剩余 root slot。反例（报告已有的固定假设推演）：root 2，X/Y 各 1；A 占 Y 还剩 1 秒，B 需 X+Y 用 10 秒且下游 D 用 10 秒，C 需 X 用 9 秒。等待 B 的全图 21 秒，先填 C 则占 X 推迟 B，全图 29 秒。后者是给定时长下合法时间线推演，不是实测或当前 Gate 预测。

**验证重点与适用边界。** 共享硬约束、固定图/history/外生输入、取消/drain/scope 层与 outcome 不变；比较 makespan 和关键尾部，而非仅看 utilization。不能把 slot·s 当 wall 秒，把 synthetic gate-shape 当完整 Gate，或从一次获益选择万能贪心规则；调度控制路径仅几十 ms 的旧观察也不支持先优化排序微成本。

## R4：报告失败事实需要 observes，消费成功材料需要 dependsOn

**问题场景。** 若 downstream 既要在 upstream 失败后给出领域判断，又被成功 prerequisite 门禁阻止，两种义务在一个 dependency 名称里冲突；反过来，需要有效材料的 consumer 不应在 provider 失败后仍执行。

**历史变化。** `88160edd43ee2ead7e6267f62f8067e82b633ea6` 将 `dependsOn` 收窄为全 passed prerequisite，新增任意终态的 `observes`。historical mixed-outcomes 的 `releasePolicy`、`releaseWorkflow` 从 dependsOn 改 observes；`settleBlockedDependent` 在作者工作前结算 `unavailable / dependency-not-passed`，保存 direct IDs、null duration。Gate registry 当时同时验证两类关系存在性与 profile/tag selection closure。

**证据强度。** 代码差异直接证明关系区分和 blocked fact；此例改变关系责任，并未通过取消依赖增加并发。

**定位与复核。** historical `src/project-run/check-execution/execution-finalization.ts` 的 `settleBlockedDependent`、`dependencies.ts` 的 `readDirectRelation`；示例 `releasePolicy`；Gate `validateProjectGateEntryRelations`。

```bash
git show 88160edd43ee2ead7e6267f62f8067e82b633ea6 -- docs/examples/artifacts/mixed-outcomes/definition.ts src/project-run/check-execution/execution-finalization.ts src/project-run/check-execution/dependencies.ts scripts/project/gate/runtime/entries.ts
```

**当前边界。** 当前 Product 承接 propagated `dependsOn` selection，Gate 只额外验证 `observes` preset/required closure；不能照搬 9/1 的两类都做本地 selection closure。当前 Check authoring 为 prepare/execute，historical preflight/execution 例子不能原样复制。

**候选例子与验证重点。** Provider P failed：只消费有效 P 材料的 C 使用 dependsOn，不执行；审计“为什么 P 失败”的 O 使用 observes，等 P 终态后读 direct relation facts。observes 不自动传播选择，不是无条件读取整个 graph，也不保证 unavailable 有 final data；等待 settled 与 all-passed 是不同门槛。不能为消除 blocked 状态将所有关系改 observes。

## R5：分别确定 Finding policy、Check outcome 与 aggregate

**问题场景。** 希望 ordinary Finding advisory，但 scanner/process/source 不可用仍须阻断。把整个质量 Check 排除 aggregate，会把这两者一起排除。

**历史变化。**

1. `f59861e26597f7c0169ec96e00e2392fe2c1e1fc` 引入 `contributesToAggregate`，四项 quality Check observation-only。
2. `4b2997d2f401f9c1ab78a0ee8562b220638ba1f5` 移除该元数据，全部 eligible status 参加 aggregate；四项的 Finding advisory 改由各 Check `findingPolicy: "non-blocking"` 实现。执行不可用不再因整项排除而失去阻断。
3. `c428530a01cb200d7e2459a624121bcace97dbdd` 将 Gate 四项 policy 显式设为 blocking，package default advisory 保持；正常 Finding 通过 owning Check failed 进入原聚合链。
4. `454a00edc5f276ab4eea9f5f3f63d1ef7f105892` 移除 Gate 参数式 aggregation wiring，Product 默认对同次 effective selected Checks 非空/all-passed 严格折叠，另允许 caller-local 同步四态函数。

**证据强度。** manifest、policy 与 Product `strictAggregate` 的 diff 直接支撑责任演进；不单靠提交标题或 Decision 声明。

**定位与复核。** 历史 `ProjectGateEntry.contributesToAggregate`、`createRepositoryQualityChecks`，后来 `PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS`；Product `aggregateEffectiveChecks`/`strictAggregate`。

```bash
git show f59861e26597f7c0169ec96e00e2392fe2c1e1fc -- scripts/project/gate/entries.ts scripts/project/gate/project-run.ts
git show 4b2997d2f401f9c1ab78a0ee8562b220638ba1f5 -- scripts/project/gate/entries.ts scripts/project/gate/definition.ts scripts/project/gate/repository-quality-checks.ts
git show c428530a01cb200d7e2459a624121bcace97dbdd -- scripts/project/gate/checks/repository-quality.ts
git show 454a00edc5f276ab4eea9f5f3f63d1ef7f105892 -- src/project-run/aggregation.ts scripts/project/gate/runtime/bound-run.ts scripts/project/gate/definition.ts
```

**当前边界。** HEAD 仍用 Product strict default；四项 Gate blocking，而新第五项 Markdown lint **显式 non-blocking**。即使同属 quality preset，也不应批量改同一 policy。当前 package consumer 省略四项 findingPolicy 时继续 advisory；Gate 不从 Findings、message、Record 重建 outcome/aggregate。

**候选例子与验证重点。** 一个 non-blocking scanner：正常 Finding 可令 Check passed 并保留 Record；scanner crashed 则 unavailable → strict aggregate failed。另一个仓库明确要求阻断时设置 owning Check blocking，而不是新增 Gate Finding reducer。custom aggregation 只能在完整 effective facts 上决定 invocation-derived status，不能复制/改写 facts，throw/非法返回使 run Promise reject。适用边界：历史 contributesToAggregate、旧 enum policy grammar，或把“有 Record”当 failed、“无 Record”当 passed。

## R6：afterGate 能力收窄与性能预算三次修正，保留单向失败边界

**问题场景。** 项目希望追加性能判定；但任意结果转换、自动学习基线、声明指纹漂移及超时阻断是不同问题。

**历史变化。**

- `df863168a665faad18f4e32a593b48c3bc258e68` 新增受信任 afterGate，可返回完整 final result，异常/非法值 fail closed unavailable；`1b11ccda3bd6fa0c9ff75e11f46057ca23483a79` 把唯一配置集中进 definition 并经 candidate-bound module 提供。
- `502dd799ca404061549103305c44d4d569afc7b8` 将其收窄为 message-only `resultContributor`：保留 Product-derived 初步 status。
- `f63720aa69a2debd9a5ccd3b3a963e99c50af35f` 为手动本机硬预算引入 `{ blocks, messages }`，adapter 只允许 passed → failed；profile/runtime/**声明指纹**匹配，无匹配、无效 timing/facts、超时都阻断。
- `39b59cb3e5cdb7fdf0f607c83cac8e3fac2d40a5` 去除指纹匹配条件，保留 profile/runtime 唯一预算、缺失/无效/超时阻断，失配诊断也输出已有 phase timing。
- `ddc60c31477104e1be0eba30489746f941bd7f3d` 改为总 elapsed、Check mean/P95 超预算只 warning；缺失配置/无效测量仍阻断。observer 返回 blocks false 不等于移除 contributor downgrade 能力。

**证据强度。** 实际 contract/parser/adapter 和 observer diff 能复核采用/撤回状态。9/26 旧报告所记“三次 Checks passed 而 exit 1，因 baseline fingerprint mismatch”解释了当时失配症状；本轮没有取得当前本机配置/新运行，不能宣称预算现已通过。声明指纹不含 callback body/history/runtime controls；相同哈希从来不等于相同性能 workload。

**定位与复核。** `applyAfterGate` → `applyResultContribution`、`ProjectGateResultContributor`、`parseProjectGateResultContribution`、`evaluateProjectGatePerformance`/`summarizeCheckDurations`。

```bash
git show df863168a665faad18f4e32a593b48c3bc258e68 -- scripts/project/gate/result.ts scripts/project/gate/run.ts
git show 1b11ccda3bd6fa0c9ff75e11f46057ca23483a79 -- scripts/project/gate/definition.ts scripts/project/gate/run.ts
git show 502dd799ca404061549103305c44d4d569afc7b8 -- scripts/project/gate/run.ts scripts/project/gate/runtime/result-contributor.ts
git show f63720aa69a2debd9a5ccd3b3a963e99c50af35f -- scripts/project/gate/run.ts scripts/project/gate/runtime/result-contributor.ts scripts/project/gate/runtime/performance-observation.ts
git show 39b59cb3e5cdb7fdf0f607c83cac8e3fac2d40a5 -- scripts/project/gate/runtime/performance-observation.ts scripts/project/gate/runtime/performance-baseline.ts
git show ddc60c31477104e1be0eba30489746f941bd7f3d -- scripts/project/gate/runtime/performance-observation.ts
```

**候选例子与验证重点。** 初步 passed + 有效超预算 → warning、保留 passed；初步 failed + contributor `{ blocks:false }` → 仍 failed；贡献非法/throw → unavailable。caller 仅把唯一 final state 映射 0/1/2，transcript 关闭失败也不可假报成功。contributor 不是 package API、plugin/sandbox 或 beforeGate，不能变 Check facts 或提升失败。

**来源摘要待校正。** 基线 [callbacks 指南](../../../guides/callbacks.md)第 82–86 行仍描述旧 message-only 阶段；Gate owner 与下面三份实现已一致采用 `{ blocks, messages }` 及 passed→failed 分支，对应 `f63720aa…` 引入的契约。本轮未修改该页。复核命令：

```bash
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:docs/guides/callbacks.md
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:scripts/project/gate/runtime/result-contributor.ts
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:scripts/project/gate/runtime/result.ts
git show e1164d27177f4b4b010a0603ffe999ac6c98084d:scripts/project/gate/run.ts
```

分布小例子应包含 null、零与少量已执行项：null 未执行不计 N，零真实执行计入；nearest-rank P95 描述**同一次 Check 集合**，不是多次 Gate 的可靠 p95；累计 execution 不等于 wall。不得拆/合/跳过 Check 或把工作移到 prepare 以刷 mean/P95，不自动调预算；今天仍需按当前 owner 配置，不能抄过去的硬阈值/指纹门禁。

## R7：以安全投影提供结构化诊断

**问题场景。** Native check 只有 count/summary，定位困难；process transcript 有全部 child text，但不能直接进入公开 Record/终端。

**历史变化。** `6afa910a90436bcfc123a3c892938c874794df35` 将 native summary Record 改为 producing owner 批准的逐项 safe diagnostics，先验证完整结果再 publish；初版 Gate 自己预览前十项。`47add411501b7560ce868eb79eec1e22ac449709` 把 Record preview 放到 Product progress，删除 native 重复预览，只保留 focused command message。`acade16433fe8e0e13a3b94bbbdd4817be41356b` 为明确选择的 oxlint JSON/oxfmt path-list 提供 owner-specific projection，先 materialize/验证完整候选集合，拒绝后原子 generic fallback，仍保留 nonzero failed。

**证据强度。** safe native protocol、`safeProcessFailureRecords` 的全量验证和 process 结算顺序 diff 支持安全与原子性。可观察性收益是可恢复详细失败事实，不是已测得的性能收益。

**定位与复核。** native `createNativeOperationCheck`/`failedResult`；process `safeProcessFailureRecords`、`settledProcessCheckResult`；owner projector 只返回安全字段，不转交任意 message/snippet/raw error。

```bash
git show 6afa910a90436bcfc123a3c892938c874794df35 -- scripts/project/gate/checks/process/native-operation.ts scripts/project/gate/checks/process/native-operation-protocol.ts
git show 47add411501b7560ce868eb79eec1e22ac449709 -- scripts/project/gate/checks/process/native-operation.ts
git show acade16433fe8e0e13a3b94bbbdd4817be41356b -- scripts/project/gate/checks/process/failure-projection.ts scripts/project/gate/checks/process/process-execution.ts
```

**当前边界。** HEAD native 不创建单进程 transcript，Record preview 由 Product 有界显示五条、每条最多 240 code points；原十条及 native presentation 字段不能照抄。单命令生命周期现由 Product commandCheck 拥有（迁移提交 `a41e4b96418b92735f2f704009cd55aaba64d114`），Gate 只保留领域 completion/projection；ast-grep 双步骤是显式例外，不适合泛化为单命令。

**候选例子与验证重点。** 两条 oxlint JSON diagnostics，其中第二条 scope escape：整组结构化投影拒绝，只保留 generic failure/transcript 引用，不先发布第一条；safe native result 同类输入则 unavailable，不能套用 process 的 failed fallback。真实原始 stdout/stderr 留 private transcript，Record 只含 owner 白名单；preview/omitted count 不改变完整 facts、status、aggregate，caller 不解析日志来重建 exit。适用边界：为少写 projector 而发布原始工具 message，为多显示而在 Gate 再做一套 preview，或把所有 process 工具猜成 oxlint 同协议。

## 选例与复核

R2/R4/R5/R7 适合作为边界选择的小型对照；R1/R3/R6 适合作为解释纠正、候选拒绝和 caller policy 的进阶材料。

本轮核对了上述 SHA、历史 `SHA:path` 的存在性和目标 diff；这证明版本定位与节选相符，不证明历史命令今天仍可复现。资源仅供阅读，集合与材料验证统一记录在主报告。
