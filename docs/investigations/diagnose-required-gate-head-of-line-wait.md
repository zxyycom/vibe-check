---
title: "诊断 required Gate 热态预算与调度队首等待"
id: "260926-diagnose-required-gate-head-of-line-wait"
formedAt: "2026-09-26T03:40:22Z"
question: "在 Markdown lint 缓存可命中的当前工作树中，required Gate 为何仍贴近或超过 20 秒，应优先调整哪一层且怎样验证？"
tags:
  - "admission-scheduling"
  - "markdown-lint"
  - "performance"
  - "project-gate"
relations:
  - type: "复查"
    target: "260924-measure-and-cache-markdown-lint-findings"
    summary: "复查34项热态预算并定位learned同层队首等待"
---

## 形成时背景

Markdown lint Finding waiver 实施后的 required Gate 已出现 Product Run 21.5 秒、再次运行 20.7 秒；两次 Check 自身均为 34 passed / 9 not applicable，最终因本机性能基线的声明指纹不匹配而失败。用户最初要求检查性能并提出方案，不急于修复；初始阶段只运行调查、保存证据。后续用户授权补诊断、细化测试选择，并要求解除指纹阻断、继续分析测试成本；第 7 节单独记录这部分后续条件与证据，不回填为初始测量结论。

前序[Markdown lint 缓存调查](./measure-and-cache-markdown-lint-findings.md)在 2026-09-24 已记录 34 项热态 required 的 18,770.9 / 19,863.3ms 总预算计量，以及候选失效时的明显超限。本轮在 Finding waiver 工作树上复查同类问题，并新增调度空档的直接证据；不能用两个时点的非配对结果宣称 waiver 引入了性能回归。

## 调查目的

1. 区分预算配置失配、候选准备、Markdown lint cache、Check 工作量与准入等待。
2. 在不清缓存、不改实现和阈值的条件下，确认热态波动、等待路径及其收益边界。
3. 给出最小责任层的候选方案、采用条件和未证明边界，不把调查结果当作修复授权或 Gate 通过。

## 调查范围与依据

### 环境、入口与样本

- 初始测量 HEAD 为 `5206ae782a425e0d575b0b1b6664bbf72fb6aa22`，工作树含未提交的 Finding waiver 实施、cache Draft 删除及用户已有 Decision 归档改动。初始测量期间没有改变这些文件。
- Linux/x64、mise-bound Bun 1.3.14；`nproc=4`，cgroup `cpu.max=400000 100000`。开始时 load average 为 0.44 / 0.32 / 0.32；未隔离宿主其它进程，也未清 OS page cache。
- `mise exec -- bun run package:status` 确认 candidate `0.0.0-local.724cf1cf0577` 为 current。三次测量均通过正式 `bun run check` 入口，使用同一 candidate、34 项有效 Check、声明指纹与当前完整 corpus；没有第二 Gate 配置入口。
- 连续三次运行用 Bun `performance.now()` 包围 child，Bash `time` 记录子进程树 CPU；stdout/stderr 与 cgroup CPU 差值保存在 `.log/gate-performance-investigation-2026-09-26T03-35-03.428Z/`。分析从每次完整 machine publication 的身份/结果与 `core.log`、`scheduler.log` 提取时长，不修改 Gate 的预算算法。原始 `.log` 为可清理现场，必要摘要保存到随附 JSON 和日志节选。
- 运行保留 candidate、findings cache 和 learned history；正式 Run 会正常更新自己的 history。本轮不是冻结 history 的配对 A/B，也不是全冷环境实验。报告与资源是在测量结束后建立，避免混入所测 Markdown corpus。

| 顺序 | Product Run 显示 | 外层命令墙钟 | Markdown lint execution | root slot 利用率 | 未占用 slot 累积 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 21.4s | 22.500s | 2.955s | 86.55% | 8.604 slot·s |
| 2 | 19.8s | 20.866s | 2.737s | 84.40% | 9.256 slot·s |
| 3 | 18.9s | 19.889s | 2.248s | 82.63% | 9.832 slot·s |

三次均 34 passed / 9 N/A，发布 Record fingerprint 相同，最终均 exit 1，原因为 `project-gate-performance-baseline-missing`。三个对应 Gate evidence root 的时间为 `03-35-04.300Z`、`03-35-26.720Z`、`03-35-47.545Z`；完整路径保存在随附 JSON。

**口径限制：** Product Run 显示值、外层命令墙钟和 `elapsed-to-initial-result` 不同。预算包含 candidate preparation、adapter/setup 与 Product Run，外层墙钟还含进程启动/退出。初始测量时的失配分支提前返回，未输出这三段已取得的 timing，因此不能从第二次外层 20.866 秒断言其预算计量一定超限。第一次数值已足以确认超过 20 秒；第三次整体外层墙钟低于 20 秒，但基线未匹配，不能称正式 Gate 已通过。N=3 的范围和中位数仅是本轮观察，不报告可靠 p95。

### 具体核对

- 读取 [Gate owner](../tooling/project-gate.md)、[Scheduler owner](../development/scheduler.md)、[learned helper 指南](../guides/learned-scheduling.md)、[公开调度约束](../guides/scheduling.md)及对应源码。
- 核对 `run.ts` 三段计时与 `runtime/performance-observation.ts` 的匹配分支；本机仍为 required 20,000ms / all 60,000ms，旧指纹 `197be7ad…`，当前 `4b41682d…`，未改写。
- 通过当前 installed root 的 `collectProjectFiles`、`cacheJsonByKey`，按现有源码相同的 path、内容摘要、规则、namespace 和版本审计缓存。`compute` 被设为直接抛错，防止审计创建或修复 cache；当前 findings 均为空，因此以精确 `{ findings: [] }` payload 验证即可覆盖当前 payload 形状。实际为 **509 sources、2,759,500 bytes、509 hits、0 misses**。三次 Gate 前后共 533 个 cache 文件的路径、大小、mtime 均未变化。该审计证明当前快照可命中，不冒充 Gate 内逐次 hit telemetry。
- 使用 installed root 的 `defineCheck`、`defineConfig`、`run` 与原有 learned/static 策略作一次六任务机制复现。root 3 slots、runner capacity 2；`a/b/c` claim runner，时长 80/80/75ms；`d/e/f` 无 claim，各 70ms；没有依赖、mutex 或 tighter scope。learned 使用本轮独立空 history；两个策略均为现有实现，未编写或接入优化候选。完整事件保存在随附 JSON。
- 用户追问是否会把长任务拖到末尾后，同轮补充核对关键路径与资源竞争；2026-09-26 05:46:42 UTC 使用同一 installed root 的公开 `createAdmissionGraph` 验证下述两个假设分支的全部 select/settle。时长为显式固定假设，不启动 Check、不接入候选调度器，也不是另一轮正式 Gate 测量。同时读取声明快照、基线匹配实现及七组测试的现有 owner 映射；原测量资源保持不变。
- 2026-09-26 06:29–06:33 UTC 追加 17 个已选测试分组的两轮串行 JUnit 计时、真实仓库布局校验 CPU profile 与透传调用计数。仍为同一 HEAD、Bun 1.3.14、4 核配额和热缓存；工作树已包含七组 region、诊断与预算匹配调整。原始现场位于 `.log/performance-investigation/2026-09-26-gate-budget/`，新增必要摘要单独保存在 `test-cost-breakdown.json`，不改原两份资源。串行组件测量不是正式 Gate，也不能作为优化后加速比。

## 调查结果与边界

第 1–6 节保存初始调查及 05:46 的同轮补证、假设与原建议；不表示其中的待办或基线规则今天仍适用。第 7 节记录后续授权、实施和实测，包括指纹阻断解除及测试输入闭包对原方案的修正。现行选择与预算规则以 [Gate owner](../tooling/project-gate.md) 为准。

### 1. 确认存在队首等待，但尚未证明取消等待能改善总工期

在 03:28 的正式日志中，Product 时钟约 0.250 秒时只有两个 runner 在运行，root 第三个 slot 空闲；typecheck、lint、Markdown lint 等候选的 `canAdmit=true`。策略仍返回 `wait`，直到约 3.773 秒才有下一次 admission。三次追加测量分别存在 9、9、11 个“root 未满、有可准入候选、proposal 为 wait”的决策点。该 Gate 所有 Check scope 的 maxParallel 均为 3，与 root 相同，因此不是 tighter-scope activation/continuation 必须先 drain 的场景。

源码因果链明确：

1. [`selectLearnedCandidate`](../../src/package-tools/learned-critical-path/strategy.ts) 的 ordinary 分支对**全部**候选按 critical-path score 排序，没有先筛选 `canAdmit`。
2. `learnedDecision` 选到不可准入的第一名后直接返回 `wait`；它没有尝试同层里排名次之但可执行的任务。
3. [static fallback 的 ordinary 分支](../../src/package-tools/learned-critical-path/static-decision.ts)已经先筛选可准入候选，因而没有相同的普通层队首等待。
4. Scheduler 正确执行合法、可 drain 的 custom `wait`；这个取舍由 learned helper 的选择策略拥有，不能据此认定 Core 正确性有错，也不应让 Core 绕过 custom policy 或突破资源限制。

最小复现中，learned 的 `d-unclaimed` 比首个 runner 晚约 **84.6ms** 启动，static 则与首个 runner 几乎同时启动。两次均正常 completed；各约 252 / 161ms 的总时间只是定时器样例结果，**不是实际 Gate 的优化收益或采用依据**。

正式日志的未占用 slot 累积为 8.6–9.8 slot·s，其中还含尾部和其它合法空闲；不能全部视为不必要等待，更不能称可省 8.6–9.8 秒墙钟。调度 control path 本身仅 26–30ms；若研究调度收益，应研究等待取舍，而不是先优化排序函数的计算速度。

**同轮修正：** 初稿把上述路径直接称为“低效”并优先推荐 ordinary admissible-first，证据不足。当前策略先看 critical-path score，再看 priority/tie-break；为了优先放行长关键路径而暂时空闲，可以是有收益的选择。“有可执行任务”并不意味着提前执行它不会延后当前被阻塞的高分任务。

一个最小反例：root 2 slots，资源 X/Y 各 1；A 已运行、占 Y、剩余 1 秒；B 需 X+Y、耗时 10 秒；C 需 X、耗时 9 秒；D 依赖 B、耗时 10 秒且无资源 claim。各 priority 为 0，无 scope、mutex 或其它关系。在准确时长估计下，B 的关键路径为 20 秒，C 为 9 秒。此时 B 不可准入，C 可准入：

| 假设选择 | 合法时间线（秒） | B 启动 | 总完成时间 |
| --- | --- | ---: | ---: |
| 暂时等待 B | A 至 1；B 1–11；C 11–20 与 D 11–21 并行 | 1 | 21 |
| 先用 C 填空槽 | C 0–9；A 在 1 完成，但 B 仍被 C 占用的 X 阻塞；B 9–19；D 19–29 | 9 | 29 |

公开 AdmissionGraph 接受了两条时间线的全部 select/settle；B 初始被 Y 阻塞，补位分支在 A 完成后仍被 X 阻塞，拒绝原因均为 `resource-capacity-insufficient`。21/29 秒是所列固定时长的推演，不是虚拟工具内建的时钟、实测性能或当前 Gate 的收益预测。它证明无条件 admissible-first 可能把关键工作和尾部拖后；前述六任务样例只证明另一类无竞争场景中提前补位可以有利，两者不能互相外推。

实际 Gate 首次空档更窄：两个 runner 占用两个 root slots，runner capacity 为 2。若补位任务不争用 runner、相关 mutex 或其它关键资源，也不激活更紧 scope，并保留 B 的优先顺序，那么在固定独立时长模型下，任一 runner 完成会同时释放 root slot 和 runner unit，单个补位不会阻止下一 runner 接续。**这只是有条件的准入推理**；当前 4 核配额下的 CPU/IO 竞争仍可能延长运行任务，且其它决策点未必满足相同条件。因此只能把受限补位保留为待评估候选，不能承诺不会延后长任务，更不能只按 slot 利用率决定采用。

### 2. 缓存已热，但整体余量与环境波动仍需处理

Markdown lint 当前完整 corpus 可命中，正式 Run 内约 2.25–2.95 秒；缓存命中后仍逐文件验证 containment、读取当前 bytes、UTF-8 decode、摘要和 cache payload。这个成本符合现有边界，不能从 Check duration 推断 backend 重跑，也不能用 mtime 跳过当前 source 校验。它不是本轮优先优化对象。

17 个 test lane 的 execution duration 累计分别约 36.26 / 32.13 / 29.84 秒，占全部 Check execution 累计约 64–66%；这些是并发任务时间，**不是串行墙钟**。初始测量时，`runtime/eligibility.ts` 把七个 Product Check test lane 共同映射到 `product-tests: src/**`；runtime、admission workbench、project tooling 等也保守覆盖 Product 源码。当时 required 因真实变更选择了广负载，不是常规小文档编辑的量级。能否安全缩小某一 lane 必须按输入闭包另行证明，不能据此直接删除或跳过测试；后续选择调整见第 7 节。

三次 CPU user+system 为约 70.29 / 64.70 / 61.31 秒；cgroup 分别在 225 个周期中 throttle 93 次、209 中 65 次、198 中 64 次。这支持“并发竞争/环境波动不可忽略”，但 cgroup 包含其它进程，throttled time 不是可加到墙钟的延迟，也不能单独解释每项变慢。因此不建议直接把 root 并发提高到 4、解除两个 runner 上限，或承诺填满 slot 必然等比例提速。

### 3. 这里的指纹是 Gate Definition 的声明指纹，不是 Markdown lint cache key

[`createDeclarativeFingerprint`](../../src/project-definition/declarative-snapshot.ts) 对 callback-free Definition snapshot 的稳定 JSON 计算 SHA-256。快照包含 API version、按 Check ID 排序的规范化 Check 声明（options、依赖、enablement、资源 claim 等）、可选 changes 定义、默认输出投影，以及 scheduler 的 policy 种类、maxParallel 和 resource capacities。

它不包含 `execute`/`prepare`/`handoff` 的函数体或闭包、custom policy 实现代码、learned history，也不包含本次 RunControls。它不是 Git/source 内容摘要、candidate artifact 摘要、Finding fingerprint 或 Markdown lint findings cache 的逐文件 key；指纹相等也不保证源码、实际选择负载或性能环境完全相同。required/all profile 与 Linux/x64/Bun 版本是基线的另外几项匹配条件，不属于这个 SHA-256 的组成。

初始测量时，本机保存的指纹为 `197be7ad…`，Run 为 `4b41682d…`；没有保存旧指纹对应的完整声明快照，不能只凭两个哈希断言具体是哪一字段导致失配。Check resolved options 或测试命令参数发生变化都可能改变声明；这不意味着缓存未热。

05:46 补证中的“失配时也输出候选准备”，指当时的 [`performance-observation.ts`](../../scripts/project/gate/runtime/performance-observation.ts) 在找不到匹配基线时先返回，跳过了已有 candidate preparation、setup、Product Run 与总 timing 的格式化输出。当时只建议补充失败诊断，仍按原决策拒绝指纹不匹配的基线。用户随后要求解除这项阻断，第 7 节记录新的匹配规则；保留旧拒绝行为已不再是当前要求。两个阶段均未自动改写本机指纹或预算。

### 4. 七组测试可以先细化触发范围，不必重新拆组

初始调查时，[`lanes.ts`](../../scripts/project/gate/checks/test-execution/lanes.ts) 已将测试文件按 owner 分配且检查完整、唯一归属；过宽的是当时的 [`eligibility.ts`](../../scripts/project/gate/runtime/eligibility.ts) 将七组共同绑定到 `product-tests: src/**`。初步方案保留分组、测试正文和 Case ID，只把各组触发范围改为“本 owner 源码/测试/fixture + 已确认的跨 owner 依赖 + 保守共享输入”。当时分组是：

| 现有测试组 | 当前文件数 | owner 目录（相对 `src/package-checks/`） |
| --- | ---: | --- |
| productDuplicateDetection | 5 | `duplicate-detection/` |
| productFileMetrics | 5 | `file-metrics/` |
| productFunctionMetrics | 34 | `function-metrics/` |
| productJsonChecks | 9 | `json-document/`、`json-schema-validation/`、`json-validation/` |
| productMarkdownLinks | 14 | `markdown-link-validation/`、`markdown-lint/` |
| productSecretDetection | 1 | `secret-detection/` |
| productSupportingChecks | 17 | `command-check/`、`host-environment/`、`maintenance-reminders/`、`project-files/` |

这些数量是当前工作树通过现有 lane resolver 得到的文件清单，不是测试用例数或耗时权重。Markdown lint 与 links 当前真实共享 local-resolution/filesystem-probes，先保持同组；JSON 和 supporting owners 同样先沿用现有分组。非 package-check 的 `src/**` 测试仍属于单独的 productRuntime，本轮不把它直接缩窄。

共享 project-files、check authoring、final data、findings/waivers、data-boundary、Check settlement、Project Definition/Run，以及 package-tools/cache 等改动，须触发实际消费者；输入闭包未确认时保留宽选择，不能只按测试文件所在目录裁剪。根导出、Core/runtime 与工具链输入初期也保守覆盖；focused/`--all` 强制路径、Git 不可用时的保守 fallback、测试自身变化及新增/删除/重命名路径都要保留。先使用现有 owner 映射对应的显式 region，不为这次收窄引入自动依赖分析框架。

初步验收曾假设“仅改 Markdown 私有实现时，七组内只触发 Markdown；仅改 file-metrics 测试时触发自身”。这尚未覆盖全部传递输入，后续发现 function-metrics 的全源 identity 证明也必须执行，实际矩阵见第 7 节。原计划要求共享输入触发所有已确认消费者，无法确认时宽选；没有可信 Git 证据或使用强制路径时不漏执行。`AUX-PROJECT-GATE-SELECTION-001` 承接选择责任，实施需补矩阵并按 Case 规则闭合，不删原有证明。

**收益边界：** 当前 Finding waiver 工作树还修改了根导出等共享输入；采用上述保守策略后，当前 34 项负载仍可能大致不变。主要预期受益场景是后续单一 owner 的局部修改，不能把“七组不再共享 src/**”直接换算为本次必省若干秒。

### 5. 初始候选方案与推荐顺序

下表保存 05:46 补证后的原方案，不是当前实施清单；前两项后来已获授权并调整实施，见第 7 节。

| 顺序 / owner | 候选动作 | 边界和采用条件 |
| --- | --- | --- |
| 先补诊断 / Gate result contributor | 即使声明指纹不匹配，也输出已有的 candidate、setup、Product、总 timing。 | 只改善可观察性；失配仍 fail closed，不自动修基线、不放宽 20/60 秒预算。当前没有独立证据表明热 candidate preparation 是主要瓶颈。 |
| 优先收敛范围 / Gate selection 与 test owner | 按上述七组 owner 与共享输入设计保守 region，先证明局部变更的选择边界。 | 保留 Git fallback 与强制路径；先审查 Case 证明责任与输入闭包，不删测试。当前涉及根导出的广负载未必缩小，实际收益另测。 |
| 暂留实验 / learned helper | 比较保留等待与受限补位，不直接采用无条件 ordinary admissible-first。 | 先证明不推迟长关键路径，再评估真实 CPU/IO 竞争；保留 tightening/continuation 层顺序、Core hard guards、资源声明和 maxParallel=3，不引入搜索、预留或新调度框架。 |
| 暂缓 / Markdown lint 与 candidate lifecycle | 按后续 profile 再判断热态 discovery/probe/cache read 与失效 candidate 的 compile/pack/install 是否值得优化。 | 冷 rebuild 与本轮热 candidate 分开测量；不得削弱 source containment、UTF-8、maxFindings、waiver audit 或 exact installed candidate 边界。 |

上述原始方案遵守形成时的[本机预算决策](../decisions/archive/enforce-manual-local-project-gate-time-budget.md)、[逐项选择决策](../decisions/select-gate-check-specific-change-regions.md)与[有效调度机会决策](../decisions/select-admission-optimization-by-effective-opportunity.md)。后者仍为 active/unaligned，并要求旧 learned optimization Plan 在 change-aware 重基线前不进入 Implementation、Gate A/B 或 production wiring；本轮没有启动它，也没有切换正式 Gate 策略。若下一轮涉及该 Plan，应先恢复其限制，不把本报告当作绕过门禁的授权。

### 6. 初始验收建议与阶段边界

初始建议先收敛七组测试的保守选择范围；后续实施见第 7 节。调度等待保持现状，受限补位仍只作为后续独立候选，不把两类改动混在一次性能 A/B 中。以下保留当时提出的验收条件及未做事项。

- 调度机制验证必须同时覆盖有利和不利补位：资源阻塞的高分任务旁有不竞争的可执行任务、补位占住其后续所需资源、长依赖链与最终尾部、全部阻塞、tighter-scope drain、mutex、priority/tie-break、history 缺失/陈旧，以及取消/失败；由相应测试 owner 与 Case 维护规则承接。
- 根据既有[启发式评估方向](../decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)，先在冻结的零/窄/广/全量、冷/热、history 与竞争场景中审查候选；完成有效图重基线后再做少量正式 Gate 交错 A/B，保持相同工作树、candidate、history 起点、Check membership、输出和命名资源预算。
- 比较 `elapsed-to-initial-result` 的中位数与范围、长关键任务启动延后及最终尾部、CPU/throttle、等待与最终证据一致性；不把 slots 利用率提高当作单独成功条件。不要求只要碰巧一次低于 20 秒就采用；既有决策允许以 15 秒作为后续优化目标，但本轮没有承诺可达，也没有改变硬阈值。
- 初始调查阶段没有修复源码、改动测试、更新预算或指纹，没有清 cache、重建冷 candidate、安装依赖、修改 Decision/Change 状态或提交 Git。当时没有实施后的 before/after，也未重跑 all，正式 Gate 因指纹不匹配失败；后续授权与变化见下一节。
- 调查记录承接跨 learned helper、Scheduler 和 Gate timing/selection 的性能问题，并排除了“Markdown lint findings cache 未热”作为当前快照的解释；合法等待未被证明为正确性 Bug。同轮补证纠正初稿对等待收益的过强推断，报告保存证据及方案，不声明修复完成或扩张实施授权。

### 7. 后续补证：阻断解除与测试成本分解

**预算匹配与真实性能分别处理。** 用户进一步明确解除指纹阻断后，Gate 按 profile/runtime 唯一选择原有硬预算；合法旧指纹可保留为元数据，不必重写本机文件。新[预算决策](../decisions/apply-gate-time-budgets-without-fingerprint-gating.md)修订原判断，但保留缺失配置、无效测量和超时阻断。required 仍为 20 秒、all 仍为 60 秒；指纹变化不会放宽预算，也不跳过比较。

七组 Product tests 已分别接入保守 region；Markdown 私有改动的选择矩阵由七组降为 Markdown 与 function-metrics 两组。后者存在全 `src/**` 的 source-identity 证明，不能只因名字像独立 Check 就过滤掉。当前工作树还涉及根导出和共享输入，实际广负载仍选择七组，未宣称整体墙钟因此降低。

**不是单纯测试数量太多。** 从 06:10:26 的真实 required Gate 选出 17 个执行分组，按现有 lane resolver 的不交叠文件集合串行运行两轮，每轮 654 个实体全部通过。总串行耗时 26.64 / 25.86 秒，其中 testcase duration 之和为 20.86 / 20.22 秒；其余 5.78 / 5.65 秒包含进程启动、加载、注册、hook 和 runner 等开销，不能全部称为 import 时间，更不能与并行 Gate 墙钟相加。

| 组件 | 06:10 Gate 中 Bun runner 报告耗时 | 隔离两轮 child 外层墙钟 | 第二轮的具体成本 |
| --- | ---: | ---: | --- |
| 布局校验，1 个实体 | 4.76s | 2.37 / 2.54s | 测试正文 2.28s，调用真实仓库 validator 并覆盖非法 fixture。 |
| 材料校验，8 个实体 | 5.82s | 3.27 / 3.04s | 三个 CLI 场景合计 2.16s，其中拒绝旧参数仍用 0.40s；reporter 场景两次运行真实 examples 校验用 0.32s。 |
| Admission workbench，23 个实体 | 3.48s | 2.90 / 2.70s | 命令测试有 10 次 child Bun 启动；5 个错误变体合计 1.10s，静态/learned 成功输出 0.48s，独占输出 0.47s。 |
| Product supporting checks，37 个实体 | 2.97s | 2.33 / 2.47s | transcript 能力测试 0.59s，含真实外部命令和输出落盘；不能改成 mock 后仍宣称证明原进程边界。 |

Gate 列取 Check 的 `process.log` 中 Bun summary，不等于 Core Check duration；隔离列由外层包围整个 child 计时。两列用于定位成本与竞争现象，不是同口径优化前后对照。

布局 validator 的独立透传计数发现：一次真实仓库校验对 **878 个文件调用模块分析 1,916 次**，其中 702 个文件各两次、168 个各三次、8 个一次；真实分析函数累计约 **892.5ms / 总 1,973.3ms**。`validateImportBoundaries` 的多条规则与 `validateFunctionMetricsAnalyzerBoundary` 各自重新读取/解析；后续 package-tools 边界还构造独立 TypeScript Program。另一次三轮真实 validator CPU profile 的热点也落在 TypeScript parsing/traversal、Program 构建与文件系统；递归 inclusive 帧相互重叠，不累加其百分比。这里证明重复计算存在，不把 892.5ms 全部当作可节省时间。

优先方案与验收边界：

1. **优先复用单次布局校验的解析结果。** 由布局 owner 一次读取/分析每个文件，把静态、动态、value/type import 视图交给各规则；先不引入跨 invocation 缓存。保留 parser diagnostics、fixture 排除、非法语法与动态 import 证明。采用前对真实仓库及失败 fixture 做旧/新诊断等价验证，再用同样的布局测试与 required Gate 复测；不能仅以调用次数下降宣称墙钟收益。
2. **减少 CLI 测试的重复启动和真实仓库扫描。** 材料 CLI 的参数分派目前静态加载 layout、schema、examples 等；错误参数仍支付完整加载成本。优先延后非所选任务加载，并审查哪些输入矩阵可在同一进程以小 fixture 证明。保留真正的 exit、stdout/stderr、exact candidate、独占文件与 symlink 拒绝端到端验收；workbench 不应把这十次 process 验证机械全删。当前只是有依据的候选，未实施、未量化收益。
3. **继续按真实证明责任细化增量选择，而不是合并或删重型测试。** function-metrics 全源 identity 证明可另行审查其 owner 与独立选择单元；Test Evidence 全树注册不执行测试正文，不属于第二遍全测试执行。8 MiB 实际字节边界、进程取消、transcript 等重输入测试仍有独立证据价值。

本轮已实施前述诊断、测试选择细化与预算阻断修正；本节列出的成本优化候选尚未落地。未提高 maxParallel、runner 资源上限或时间预算，也未实施 admissible-first 补位。串行与并行差异提示 CPU/IO 竞争可能放大成本，但 N=2、未隔离宿主和 history，不能据此保证减少进程数或提升并发一定更快。

**最终 required 复验（06:39:48 / 06:40:09 UTC）。** 两次均 34 passed / 9 N/A、没有失败 Check，预算分别实测 **20,534.8 / 20,503.5ms**，最终仅因 `project-gate-performance-limit-exceeded` 退出 1，不再出现指纹匹配错误。candidate preparation 为 149.2 / 131.4ms，adapter/setup 为 401.8 / 399.9ms，Product Run 为 19,983.7 / 19,972.3ms；界面显示的 19.7 秒不是总预算口径。原本机文件 SHA-256 保持 `b7e10bf4a8b276fb7245826810aea3256f0a2e23c86e9133c1649d2bea536f11`，未抬高 20 秒阈值。中间两次复验暴露新 parser 分支复杂度超限，已拆出字段形状校验并通过最终 Check；不把中间初步失败的运行当作预算评估样本。23 项预算/adapter 回归、664 entities / 160 Cases 完整注册、scripts typecheck/lint、文档与治理校验均通过。本阶段未重跑 `--all`，也未宣称已稳定达到性能预算。

## 随附资源

- [三次正式测量、缓存审计及六任务复现事件](./_resources/260926-diagnose-required-gate-head-of-line-wait/measurements.json)
- [正式 Gate 队首等待与终态占用摘要节选](./_resources/260926-diagnose-required-gate-head-of-line-wait/scheduler-excerpt.txt)
- [后续测试分组计时、热点实体与布局解析调用证据](./_resources/260926-diagnose-required-gate-head-of-line-wait/test-cost-breakdown.json)
