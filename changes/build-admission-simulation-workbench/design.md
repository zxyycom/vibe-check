# Design

工作台是 `scripts/project/admission-workbench/**` 中的 repository-private、exact-candidate public consumer：公开 `AdmissionGraph` 独占准入合法性，工作台独占合成时间、竞争、策略 adapter、度量和证据，且虚拟主循环不运行真实 Check。

## Context

- `src/index.ts` 是唯一 Product public entry；[Workspace tooling](../../docs/tooling/workspace.md)规定 `scripts/project/**` 是唯一 private candidate consumer，必须从 `scripts/project/package.json` 的 exact installed candidate 消费该 entry，不能 import `src/**`。本 Change 不改这个边界。
- [模拟调度分支指南](../../docs/guides/simulating-admission.md)规定 `createAdmissionGraph(input)` 形成 immutable state，只有 `select(taskId)` 与二元 `settle(taskId, "satisfied" | "unsatisfied")` 产生合法 successor；它不启动 Check、不保留真实资源，也没有公开取消 transition。
- [Scheduler](../../docs/development/scheduler.md)拥有真实 task/promise、取消、资源生命周期与 measurement；虚拟循环不得复制它。真实 shared-closure adapter 只证明少量 lifecycle 接线，不能变成虚拟时长或竞争数据。
- [时长调查](../../docs/investigations/calibrate-gate-duration-variation.md)提供四类固定 profile 的 proxy median 和各五个 `sample / median` 倍率。它明确未识别 Gate resource competition coefficient，且全量 core duration 不可再叠加为“无竞争基线”。
- [资源配置 Change](../configure-project-gate-named-resources/proposal.md)将来可能形成 Gate mapping；基础平台先使用合成图。mapping 形成后才增加一个带 mapping identity 的最终 Gate-shape scenario；静态分析足够，不要求实测竞争证明。

## Goals / Non-Goals

目标是让开发者用少数冻结、可复放的图在相同外生任务时长下比较策略。主排序指标是 makespan；仅当 makespan 不更差时，比较 slot·time 与每个 named resource 的 unit·time，资源之间不相加。平台必须有确定终止、可定位错误和人可手算的最小 oracle。

不新增 Product API、CLI、Scheduler reducer、资源 authoring、用户关键任务概念或全局最优/深搜索算法；虚拟主循环不运行真实 Check、不用 `unsatisfied` 模拟取消、不承诺真实 Gate 加速，也不要求运行真实 Gate 来证明 mapping 或竞争。静态 mapping 场景不阻塞基础平台；算法的正式比较和最终交接须同时取得平台与稳定资源 mapping 输入。

## Decisions

### Intended Change

1. **Owner、开发入口与输入。** 实施时新增 `scripts/project/admission-workbench/`：`command.ts` 解析 CLI 并发出 JSON，`scenario.ts` 验证版本化 fixture/输入，`simulate.ts` 运行纯虚拟循环，`policy.ts` 适配候选策略，`evidence.ts` 固定输出。根 `package.json` 拟新增 `"admission:simulate": "bun scripts/project/admission-workbench/command.ts"`；该事实仅在实施后成立。命令输入为一个 scenario JSON 路径、`--policy <id>`、`--seed <non-negative integer>`、`--replicates <positive integer>`，以及可选 `--out <explicit path>`；默认成功 evidence 写 stdout，不隐式写仓库文件。`--out` 只以新文件独占创建，已有文件、符号链接或不可安全创建的父路径一律报错，不覆盖。
2. **最小 scenario 合同。** `scenarioVersion`、稳定 `scenarioId` 与 `graph`（公开 `AdmissionGraphInput` 的 canonical DTO）必填；另有 taskId→固定 `profileId`、profile 定义、policy registry ID、可选 deterministic outcome map 和 resource contention preset；未列 outcome 默认 `satisfied`。profile 是身份固定的 `{ nominalWorkMs, multiplierSamples, resourceClaims }`：任务的 claims 必须与 graph claims 完全一致。四个初始 profile 的下表是便于阅读的**展示舍入值**（单位 ms），不是完整 Gate Check 标定；实现必须从调查 resources 的 summary 读取未舍入 median 与倍率向量，并将所取精确向量固化进版本化平台 fixture：

   | profileId | nominalWorkMs | multiplierSamples |
   | --- | ---: | --- |
   | `typecheck-product-like` | 356.199 | 1.000, 1.080, 1.058, 0.960, 0.976 |
   | `typecheck-scripts-like` | 357.398 | 0.992, 1.108, 1.000, 1.174, 0.990 |
   | `lint-product-like` | 1158.922 | 0.986, 0.955, 1.412, 1.150, 1.000 |
   | `lint-scripts-like` | 830.416 | 0.964, 0.882, 1.339, 1.000, 1.130 |

   任何非有限/非正 work、空 multiplier、未知 task/profile/policy、重复 ID、graph construction failure 或不一致 claims 都是拒绝输入而非静默修复。
3. **Seed、candidate 与信息边界。** 对每个 `(scenarioVersion, scenarioId, taskId, replicate, seed)` 用 UTF-8、NUL 分隔 tuple 的 FNV-1a 32-bit hash 作 `mulberry32` seed，取 `floor(random × multiplierSamples.length)` 的一个 profile multiplier；抽样 work 为 `nominalWorkMs × multiplier`。policy 无权接收该 work、remaining work、PRNG 状态、future event 或其它策略结果。adapter 只能构造正式 `AdmissionPolicyContext`：公开 graph/current `AdmissionState`、由 state 导出的 candidates/capacity/scopes/running/settled、以及公开 measurement 的已发生 action-observation prefix；完整 trace 仅写入 evidence sink，绝不传给 policy，也不附加 scenario metadata。candidate 集合从 public catalog 的 selectable task 形成 `canAdmit: true`，仅将因 root/scope/resource capacity 而不可选的 pending task 形成 `canAdmit: false`；因 dependsOn、observes 或 mutex 不可选的 task 不进入集合。该投影只消费公开 catalog/reason，不复制 reducer。比较多个 policy 时使用相同 task/replicate 抽样表。
4. **事件边界与推进。** 初始虚拟时间为 `0`。每个 boundary 先检查终态；initial state 已 complete（空图）时直接成功退出、不调用 policy。再按公开 catalog 投影 candidate 集合：集合为空而有 running work 时直接 advance，不调用 policy、trace 记录无 policy proposal，且不增加 accepted-wait；集合为空、无 running work、但未 complete 时才报 `no-progress`。仅集合非空时才调用 policy，并对每个 accepted `state.select` 的 successor 继续调用，直至 proposal `wait`；这允许同一虚拟时刻填满多个可用 slot。拒绝 proposal 立即以错误结束，不替换为平台选择。policy `wait` 时无 running task，报 `no-progress`。当需 advance 时，按当前 running set 重算全部 rate；取最小 `remainingWork / rate` 推进时间，所有同一最小时间完成的 task 按 canonical taskId 顺序以 scenario outcome 调用 public `settle`；同刻全部 settlement/释放完成后才进入下一 decision boundary。每个成功 select、advance、settle 及 public-state 随之发生的 forced effect 后都形成 trace event，但 event cap 只计核心 select/advance/settle，固定为 `4 × max(1, taskCount)`。以 `64 × Number.EPSILON × max(1, |a|, |b|)` 判断同刻/零差；只将该阈值内的残余 work 钳为零。若 rate 非有限/不正、核心步骤不前进、public settlement 被拒绝或 cap 触发，错误结束并保留 trace prefix。
5. **可实现的合成竞争模型。** 未声明 resource 的 task rate 为 `1`。对 task `i` 的每个 claimed resource `r`，令 `C_r` 为 graph capacity、`U_r` 为当前 running total units、`u_ir` 为 i 的 claim；其 slowdown 是 `1 + α_r × max(0, (U_r - u_ir) / C_r)`，task rate 是所有 claimed resource slowdown 的倒数中的最小值（无 claims 为 1）。每次 running set 增减均重算，work 不改变身份。`α=0/0.25/1` 分别为 zero/weak/strong **合成敏感性假设**，不是测得系数；长尾场景的 `5.5×` multiplier 也是合成压力幅度（仅受调查异常量级启发，不赋予发生概率）。
6. **度量、trace 与失败协议。** 成功 result 必含 `schemaVersion`、scenario/profile/policy identity、exact installed candidate identity、prepared policy 的固定 prediction/history input identity、seed/replicate、完整假设、`makespanMs`、`slotTimeMs`、按 resourceId 输出的 `unitTimeMs`、sampled work 的 commitment/hash 与完整 ordered trace。slot·time 对每个 advance 加 `runningTaskCount × delta`；每个 resource 的 unit·time 加 `inUseUnits × delta`。错误 result 必含稳定 `error.code`（`invalid-input`、`graph-rejected`、`policy-rejected`、`no-progress`、`non-positive-rate`、`non-advancing-event`、`event-limit`）、message、scenario/policy/seed/replicate identity、boundary index、virtual time 和 ordered trace prefix；未知或未通过 schema 的输入仍拒绝，但无法可靠解析的 scenario/profile/policy identity 显式为 `null`，不伪造 identity；CLI 非零退出。`--out` 仅在完整 JSON serialization 成功后写指定路径；stdout/stderr 与文件内容的来源/成功状态必须清楚区分。
7. **场景、策略与真实证据的最小集合。** fixture 至少覆盖：空/单 task；长链；宽图与并列完成；队首受阻后合法回填；根和 scoped capacity；多 resource、weighted claim 与 mutex；无资源竞争的固定 profile 波动/预测失准；长短混合及关键依赖；`unsatisfied` 导致 dependsOn 阻止而 observes 仅等待；以及 policy illegal/wait/no-progress。adapter 接受场景注册的正式 `AdmissionPolicy`：对 `kind: "custom", strategy.kind: "simple"` 在每个 boundary 调用其 `decide(context)`；对 `prepared`，每个 replicate 从 fixture 明确指向的、隔离且固定的 prediction/history input 初始化，在图 ready 后恰调用一次 `prepare({ graph })`，再在每个 boundary 调用其返回 `decide(context)`，从而可接入现有 learned helper；不得读取 Gate live history。模拟器不调用 prepared `complete`，避免把虚拟二元结算写回 history；完整 lifecycle 继续由真实 shared-closure 集成证明。static baseline 也通过同一 adapter/context 边界实现。算法候选在平台可用后产生，但正式比较须等待稳定 mapping 输入，不预先锁定其规则。另建少量 parameterized shared-closure adapter 集成，独立证明真实 cancel/drain；取消不进入 public graph 或模拟二元 settlement。
   每个 learned registry policy 显式声明固定的 `identityForTask` projection 与只读 history snapshot；adapter 将 snapshot 复制到每个 policy/replicate 独占的临时目录，以其绝对 `stateDirectory` 构造 `createLearnedCriticalPathStrategy`，允许 helper 的准备写入而不改变 snapshot。evidence 记录 snapshot hash、identity-projection identity、cold-start/model options 与预期 fallback 类型；非预期 history/setup fallback 使比较无效，不当作算法成绩。
8. **手算 oracle。** 固定 fixture `two-shared-claims`: capacity `cpu=2`，A/B 无依赖、各 `nominalWorkMs=100`、claim `cpu:1`、strong `α=1`、同时 admission。两项各 slowdown `1+(2-1)/2=1.5`、rate `2/3`，故二者在 `150 ms` 同时 settle，makespan `150`、slot·time `300`、cpu unit·time `300`。在同图 serial policy 下，A 后 B，各 `100 ms`，makespan `200`、slot·time `200`、cpu unit·time `200`。第二 fixture为无资源长链 `100 → 50`（maxParallel=1），期望 makespan/slot·time `150`、无 resource metric。这些数字是测试 oracle，不是 Gate 性能预测。

### Resulting Impacts

- **公共 consumer 与 Gate 隔离：** runner 只能 import installed public package；`scripts/project/gate/run.ts` 继续是唯一 Gate root。测试须证明无 source/private Scheduler import，也不因运行 `admission:simulate` 创建 Gate transcript、candidate Gate run 或真实 Check execution。
- **输入与 evidence 演进：** fixture/result 采用显式 schema version 和稳定 IDs；改变 profile、竞争参数、policy-visible metadata、trace vocabulary 或 metric 定义时递增相应 version，并使受影响的 baseline/candidate 结果以新版本 fixture 重跑；不承担旧 fixture 的兼容或迁移义务。JSON 仅为 repository-private contract，不发布 package schema。
- **真实集成边界：** shared-closure tests 单独报告真实 command/lifecycle outcome；模拟 result 单独报告 virtual milliseconds。最终 Gate-shape scenario 必须记录静态 mapping version/identity；少量 `bun run check -- --all` 正式 Gate 验证记录 candidate/mapping identity、正式时间口径和模拟偏差观察，但不新增 selector、不作为竞争证明，也不将观测写回模型系数。
- **测试与材料：** 修改/新增 native tests 或 Case 前后执行 test-evidence check；目标测试覆盖输入拒绝、seed determinism、policy information hiding、legality rejection、rate recomputation、tie ordering、二元结算、指标守恒、no-progress/error trace、两个手算 oracle与 shared-closure lifecycle。维护说明只描述开发用途、复现命令、输入/输出、假设与非保证，不暗示用户可用 CLI。
- **下游交接：** 平台稳定后向算法 Change 提供 fixture IDs、policy adapter interface、evidence schema/version 和 baseline results；资源 mapping 可随后追加最终场景，不改变已有合成场景；算法的正式比较与最终交接在平台和稳定 mapping 均可用后进行。

## Risks / Trade-offs

合成模型的透明度不等于真实性；更复杂的资源/随机模型会伪造精确性并扩大偷看面，故首版只保留固定 profile、三档合成 α 和有界事件循环。公开 graph 能保证 legality，却不描述真实执行、取消或性能；混合真实 shared-closure adapter 与虚拟 evidence 会掩盖这一点，故两类输出必须隔离。固定 scenario 可能遗漏真实工作负载，因而只支持“规则有依据且无明显模拟退化”的算法判断，不能推出实际加速。

## Open Questions

无待用户决策。实施前仅需由实施者按上述 owner 确认当前 workspace 的命令接线、fixture/test 文件名和 JSON formatting helper；这些是局部工程细节，不改变模型、目录、范围或验收。Gate mapping 是否可用只影响最终 Gate-shape scenario 的静态输入，不阻塞基础平台。
