# Manual CR: tools 分区随包文档与公开声明

## 结论与状态

审查者：独立非实施代理 `review_tools_full`。本报告仅记录审查；被审文档和源码均由主代理修改。

**当前结论：tools 分区独立语义审查与追加的表达组织复审均通过，绑定候选 `0.0.0-local.eda819f36295`。**
首轮以 `0.0.0-local.9e89c50685bb` 全量阅读及实际包演练，在 `0.0.0-local.3c1b2bcfd236` 关闭两项发现；
随后按 ai-ready-docs 再次完整阅读 5 篇页面和 29 个声明，并在当前候选全文复核本轮变化的 4 项材料。
追加发现已关闭，无影响本分区正确使用的遗留发现。该结论不代表正式 0.0.5 包或发布验收通过。

下文先保存首轮记录；当前包身份、第二遍覆盖与表达组织发现的闭合见文末追加的 Manual CR。

## 初审包身份

- 版本：`0.0.0-local.9e89c50685bb`。
- 来源 HEAD：`7c9c69e609a5d095e2c459923b321cb4925f0713`，包含本轮文档未提交修订。
- tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.9e89c50685bb.tgz`。
- 实际 SHA-256：`a4a9533ffc8e3a643d5bc11fef9baa95030386db4c82d02c8c4d21f4a46f37b4`。
- 实际读取/执行位置：`scripts/project/node_modules/@zxyycom/vibe-check`。
- 本轮开始时分支为 `main`，暂存区无改动；保留并行工作，不 add、commit、发布或重建包。

## 首轮收口包身份（表达组织复审基线）

- 版本：`0.0.0-local.3c1b2bcfd236`；来源 HEAD 仍为 `7c9c69e609a5d095e2c459923b321cb4925f0713`。
- tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.3c1b2bcfd236.tgz`。
- 独立复算 SHA-256：`f67a014c7bb0292812150a8b153c67514c5e4ad5d1fcd0b9fd6839e6bda4575e`。
- 实际安装目录不变；其 manifest 与 tarball manifest 均确认上述最终版本。
- 原 tarball 被主代理通过 local candidate rebuild 替换；初审逐项哈希和阅读/演练记录仍保留，未恢复旧产物。

## 完整阅读覆盖

以 [review-inventory.json](review-inventory.json) 的 `group: tools` 为逐项清单。
实际 SHA-256 复算全部一致：5 篇页面共 635 行，29 个声明文件共 1513 行。
全部逐项完整阅读，包括代码示例；较长的 scheduler-policy 声明分连续两段读取，不以搜索或抽样代替阅读。

### 页面：5 / 5

1. `docs/guides/cache-results.md`
2. `docs/guides/data-boundaries.md`
3. `docs/guides/learned-scheduling.md`
4. `docs/guides/scheduling.md`
5. `docs/guides/simulating-admission.md`

### 声明：29 / 29

1. `types/data-boundary/canonical-data.d.ts`
2. `types/data-boundary/canonical-json.d.ts`
3. `types/data-boundary/closed-values.d.ts`
4. `types/package-tools/admission-policy/define-admission-policy.d.ts`
5. `types/package-tools/cache/cache-json-by-key.d.ts`
6. `types/package-tools/learned-critical-path/strategy-contract.d.ts`
7. `types/package-tools/learned-critical-path/strategy.d.ts`
8. `types/project-definition/resource-unit-mapping.d.ts`
9. `types/project-definition/scheduler-context-callback.d.ts`
10. `types/project-definition/scheduler-policy.d.ts`
11. `types/project-run/task-scheduler/admission-core/compiled-graph.d.ts`
12. `types/project-run/task-scheduler/admission-core/constraint-groups.d.ts`
13. `types/project-run/task-scheduler/admission-core/core.d.ts`
14. `types/project-run/task-scheduler/admission-core/membership-index.d.ts`
15. `types/project-run/task-scheduler/admission-core/persistent-task-queue.d.ts`
16. `types/project-run/task-scheduler/admission-core/projection.d.ts`
17. `types/project-run/task-scheduler/admission-core/ready-frontier.d.ts`
18. `types/project-run/task-scheduler/admission-core/selection-index.d.ts`
19. `types/project-run/task-scheduler/admission-core/selection-query.d.ts`
20. `types/project-run/task-scheduler/admission-core/selection.d.ts`
21. `types/project-run/task-scheduler/admission-core/state-delta.d.ts`
22. `types/project-run/task-scheduler/admission-core/state-query.d.ts`
23. `types/project-run/task-scheduler/admission-core/static-frontier.d.ts`
24. `types/project-run/task-scheduler/admission-selection-policy.d.ts`
25. `types/project-run/task-scheduler/graph.d.ts`
26. `types/project-run/task-scheduler/measurement/diagnostics.d.ts`
27. `types/project-run/task-scheduler/scheduler-decision-inspection.d.ts`
28. `types/project-run/task-scheduler/scheduler-decision-model.d.ts`
29. `types/project-run/task-scheduler/scheduler-terminal-context.d.ts`

另完整读实际包 `types/index.d.ts` 与 manifest，核对 root 入口和公开面。
保守文件闭包包含 incidental private declarations，例如 admission-core 的持久队列、索引和 measurement diagnostics；
它们不会因随包出现而自动成为 public API，也没有作为中文主叙述的无差别整改对象。
公开返回类型所需的 supporting fields（包括未从 root 单独按名导出的 timing 类型）仍纳入中文语义审查。

## 先仅凭随包材料完成的代表任务

| 任务 | 答案位置与可恢复的结论 |
| --- | --- |
| 选择静态并发约束还是 custom policy | `scheduling.md`「选择正确的工具」「限制 named resource 并发」：mutex、root/scoped budget、named units 是 Scheduler hard guards；custom 仅提供选择偏好，不能绕过 readiness 或容量。 |
| 编写 simple / prepared strategy | `scheduling.md`「自定义准入 policy」「已准备的 custom strategy」及 `scheduler-policy.d.ts`：simple decide 同步；prepared 每个 graph-ready Run 最多 prepare 一次，可异步，返回同步 decide 和可选 terminalEffect；非法 proposal 形成 invocation failure。 |
| 请求 context 并理解 effect 调用 | `scheduling.md`「声明 callback 的 context 需求」「交付终态 measurement」：普通函数零需求，descriptor 按阶段声明顶层字段；每 callback 只取得自身字段；seal 后 Definition effects 先于 prepared effect；早期失败没有 finally 保证。 |
| 读取统计、availability 和单位 | `scheduling.md`「在线选择时读取 observation prefix」「交付终态 measurement」及 `scheduler-policy.d.ts` 的 contribution/cumulative/measurement 字段：先分 available/unavailable，峰值不能相加；Task·ms 与 slot·ms 不等于 wall time 或 CPU；prefix 不随后续 append 改变；timestamps 的中文局部缺口见 TOOLS-01。 |
| 比较独立模拟分支 | `simulating-admission.md` 全文及 AdmissionState/TransitionResult：成功 select/settle 返回 immutable successor，拒绝无 successor；保留旧 state 即可分支，不执行 Check 或预留真实资源；unsatisfied 阻止 dependsOn 下游，observes 只需终态。 |
| 使用 learned history | `learned-scheduling.md`「配置 history 与任务 identity」「退化与观察」及 strategy-contract：caller absolute directory 与完整 identity，digest 不保密，无跨进程锁；有界 knobs，invalid identity/setup 退化；observer Promise 不被 await，Run 结束不证明 sink 完成。 |
| 缓存 key、结果和并发 | `cache-results.md`「key、payload 与结果」「并发与安全边界」及 cache 声明：caller 拥有完整 semantic key；domain value 与 read/write observation 分开；并发 miss 可重复计算，atomic publication 不提供 single-flight、认证或保密。parser 两阶段失败文案见 TOOLS-02。 |
| 选择 JSON 深副本或结构浅快照 | `data-boundaries.md`「选择工具」「Canonical JSON」「闭合快照」「执行与适用边界」及对应声明：canonical 副本独立递归冻结、对象 null prototype；结构快照仅冻结外层并保留 callback/嵌套引用；不调用 getter/toJSON，Proxy trap 非沙箱。 |

这些答案均先从实际随包材料恢复；随后读取内部 owner 和源码只用于核验，不用未发布材料补齐消费者说明。

## 真实性与实际包证据

采用 CodeGraph 优先定位并读取对应实现，另读取内部 owner：

- `docs/development/package-tools.md`：cache/learned 的 ownership、失效/并发边界。
- `docs/development/scheduler.md`、`scheduler-observation.md`：hard guards、prepare/terminal lifecycle、按需 production 与精确 delivery、availability、时间区间和不可变视图。
- `src/package-tools/cache/cache-json-by-key.ts`：closed options、digest、cached parser failure 的 invalid 路径、computed parser failure 传播、atomic temporary publication。
- `src/package-tools/learned-critical-path/strategy.ts`、`duration-model/recording.ts`、`critical-path-ranking.ts`：identity/model key、descriptor needs、fallback、observer 隔离、admitted-to-settled 样本及 score 来源。
- `src/data-boundary/canonical-data.ts`：递归复制/冻结、getter 拒绝、null prototype、固定字符串 key 排序。
- `src/project-run/admission-strategy-provider/custom-strategy-preparation.ts`、`task-scheduler/measurement/diagnostics.ts`：prepared callback 固定与 failure、按需 collector、seal 后 closed timing view。

以 Node 直接导入上述已安装包 root 进行独立、定向消费者演练，所有断言通过：

1. simple strategy 将两个独立 Check 排为 `a,z`，callback 实际只收到声明的 `candidates`。
2. prepared 普通 prepare 收到空需求视图；terminal 顺序为 Definition 1 → Definition 2 → prepared。
   第一 effect throw 不阻止后续 effect，结果为 `kind: output` 且 `outputs.terminalEffects.status: failed`；prepared effect 只取得 `execution`。
3. cumulative/action-history 请求可用，保存的 prefix end-count 不被后续改变；available taskTimings 按 canonical ID `a,z`，execution admission 保持实际 `z,a`。
4. 同一 running simulation state 分别 settle 为 satisfied/unsatisfied，只有前者开放 dependent；initial 与 running 的旧 catalog/inspection/resource occupancy 保持不变。
5. canonical 深副本不随后续输入 mutation 改变；浅快照保留 nested/callback identity 且不冻结 nested；getter 未调用；`"10"` 在 canonical 文本中先于 `"2"`。
6. cache 已存 `{n:1}` 后，cached parser 拒绝该值、compute 返回 `{n:2}`，得到 `source: computed, read: invalid, write: stored`；之后 computed parser 拒绝传播同一错误，已有 entry bytes 不变。
7. learned 第二次 Run 的两项 `selection-proposed` 均为 `source: learned` 且有样本；rejected observer 不改变 completed 结果；invalid identity 产生明确 history-unavailable 并 static fallback 完成。

cache/history 演练独占临时目录 `.tmp/documentation-tools-review-UyXRO9`，已在 finally 中删除；没有留下测试文件或缓存材料。
这是特定边界实际包演练，不是全量测试、时钟故障矩阵、并发压力或性能验收。

## Findings 与处理

### TOOLS-01：公开 timing 字段中文局部语义缺失

- 位置：原包 `types/project-definition/scheduler-policy.d.ts` 中
  `SchedulerMeasurementAdmission.admittedAtMonotonicMs/settledAtMonotonicMs`、
  `SchedulerRunMeasurementTimingFacts.endedAtMonotonicMs/startedAtMonotonicMs`。
- 问题：四处仅有英文，承载消费者必需的单调时钟、毫秒与 null 语义；指南只提 timestamps，未在中文中完整补齐。
- 影响：不符合公开 supporting field 的中文主叙述规则，用户须依赖英文恢复关键含义。
- 最小修正：只改对应 source JSDoc，分别说明准入/结算/开始测量/终态的 Scheduler 单调时钟毫秒值，前两项无事件为 null。
- 处理：主代理修改 `src/project-definition/scheduler-policy.ts` 四处；本审查者已读实际 diff，并完整重读最终包声明，四处中文含义准确且无签名变化。**已关闭。**

### TOOLS-02：缓存 parser failure 的传播范围表述过宽

- 位置：原包 `docs/guides/cache-results.md`「key、payload 与结果」最后一段。
- 问题：“compute 或 parser failure 直接传播且不写 entry”未区分 cached 与 computed parser；实现对 cached parser failure 标为 invalid 后重算。
- 影响：消费者可能把可恢复的旧缓存 payload 拒绝误判为 helper reject，或误解是否重算/更新 entry。
- 最小修正：明确 cached parser 拒绝 → invalid + 重算；compute 或 computed parser 拒绝才传播且不写 entry。
- 处理：主代理修改此段；本审查者已读实际 diff，用实际原包复现两条路径及旧 entry 不变，并完整重读最终包该指南，明确区分两阶段。**已关闭。**

其余分区材料未发现影响本轮代表任务正确使用的遗留问题。没有将纯术语混用或内部 incidental 英文注释作为整改项。

## 独立公开面 / 声明闭包审计

完成 tools 分区后，另从实际包 manifest 的唯一 `.` export 与 `types/index.d.ts` 独立检查全清单闭合。

- 使用 TypeScript AST 遍历 import/export declaration、import type、external module reference 及 reference path；
  本包相对 `.ts` 引用按实际声明文件解析，并递归遍历。
- 得到 **139 个本包声明文件、392 条本地引用边**，与 inventory 的 139 项完全相等；遗漏、额外项、未解析引用均为 0。
- 对全 139 项重新计算 SHA-256，与 inventory 一致；外部声明引用仅 `ajv`、`immutable`，不作为本包 authored JSDoc。
- TypeScript checker 从 root 取得 **227 个导出符号，其中 49 个 value**；实际导入 `index.mjs` 取得 **49 个 runtime exports**，两集合完全一致。
- manifest 无其它公开 subpath；因此没有因漏入口而遗漏 public declaration surface，也没有把物理随包的内部文件认作 subpath API。

上述结果证明清单的保守文件闭包与公开入口一致，不替代其它审查者对 core/checks 分区的逐项语义结论。

## 首轮候选差异复核

在主代理明确提供最终候选身份后，重新读取安装包并独立复算，而非假设该目录仍是原包：

- tools 34 项中，32 项 bytes 与初审完全相同；仅下列两项变化，已各自完整重读并关闭发现。
- `docs/guides/cache-results.md` 最终 SHA-256：`d3c75fb25d848ead08ef82aa8e1ba37345f52c8cb02ac11e9d3fc0d77f38b16a`。
- `types/project-definition/scheduler-policy.d.ts` 最终 SHA-256：`816156479a8515508458f62aab6a8c386a74637d7bc449e3efd1d7cb2a4bf858`。
- 从最终 tarball 只读提取并比较 tools 34 项、root 声明、manifest，共 36 项与安装文件 bytes 一致。
- 在最终包重新执行全声明 AST 闭合：仍为 139 文件、392 本地引用边，遗漏/额外/未解析均为 0；
  139 项哈希与 initial inventory 加 finalComparison 的期望一致。
- 最终 root 仍为 227 导出符号、49 value；直接导入最终 `index.mjs` 得到 49 runtime exports，集合一致。
- 独立对工作区 13 个修改的 source 文件与 HEAD 执行 TypeScript AST 去注释打印比较，全部相等；本轮源码修正不改变执行或类型语义。

原候选的定向动态演练未在最终包逐一重跑；最终复核使用 unchanged bytes、注释之外 AST 相等、最终包材料闭合和实际 root 导入证据。
这与主代理后续取得的示例/类型/材料机械验收分开记录，不冒充全量运行验证。

## 首轮验证边界

- 本节首轮证据绑定 `0.0.0-local.3c1b2bcfd236`；当前结论由下方追加复审承接。正式 0.0.5 tarball 形成后仍须确认材料差异并执行正式发布验收。
- 未运行全 Gate、完整 consumer typecheck、全部材料/链接校验、正式 release verify；相关机械证据由主代理按本 Change 统一取得。
- 动态演练未注入 unavailable clock、极端数值、跨进程写竞争、恶意 Proxy 或完整取消矩阵；这些边界主要由随包契约与相应 owner/实现核验支持，本轮未声称完整回归。
- 没有新增产品测试/Case，未更改被审内容、Git index、candidate 或外部系统。没有提交或发布授权。

## Manual CR: ai-ready-docs 表达组织复审

### 范围、方法与第二遍完整覆盖

用户追加要求核对任务重心、负向描述、迁移残留、篇幅和 Markdown 组织。本审查者读取 ai-ready-docs skill
及完整 principles，以消费者实际取得的页面与声明判断用途、内容归属、局部信息恢复和必要边界；不把正向句式、
短文档或统一模板本身作为验收目标。

以 `0.0.0-local.3c1b2bcfd236` 为基线，**再次逐项完整阅读**上述「页面：5 / 5」及「声明：29 / 29」全部清单，
包括全部示例与 incidental private declarations；并非沿用首轮阅读记录或只看 diff。
本遍页面为 cache-results、data-boundaries、learned-scheduling、scheduling、simulating-admission；
声明仍精确对应 inventory 的 `group: tools` 29 项，无新增或排除。读取时复算全部 34 项哈希，与该基线一致。

本遍仅复核表达与组织，不重复首轮 API 真实性全测。被审文档/JSDoc 均由主代理修改；本审查者只维护本报告。

### 发现、最小修改与独立闭合

| 发现 | 对消费者的影响 | 最终包复核结果 |
| --- | --- | --- |
| EXPR-TOOLS-01：createAdmissionGraph 的公开 JSDoc 以 exact validation/static compile/public factory 为中心。 | 仅凭函数提示难以恢复“独立模拟假设分支”的用途和下一步。 | 已改为静态图准入模拟器、initialState 初态和 select/settle 不可变后继；保留不执行 Check、输入与抛错边界，并直链随包模拟指南。完整重读 `admission-core/core.d.ts` 后关闭。 |
| EXPR-TOOLS-02：cache identity/parser/computation 和 key 安全总述挂在 NonThenable，而非 CacheJsonByKeyOptions。 | JSDoc 提示关联错误对象；Options 缺少自身总述，辅助类型出现与自身职责无关的说明。 | 总述已移至 Options；NonThenable 仅说明同步对象及 then 约束。完整重读声明并用 TypeScript AST 确认 JSDoc 实际附着对象后关闭。 |
| EXPR-TOOLS-03：共同 timing 有效性、冻结视图和舍入规则藏在 custom/在线 prefix 小节。 | static policy 的 terminal-only 消费者缺少直接定位共同规则的路径。 | 规则成为独立 H2「测量值的有效性与读取」，显式适用于在线及终态；在线和终态各有直链，未复制定义。完整重读 scheduling 全文后关闭。 |

另两项低风险收敛已复核：data-boundaries 将独立选择工具的重复说明合并为一句正向选择原则，
深/浅副本及失败模型均保留；scheduling 去除指向未指明历史的“原有/旧版本”，仍用当前兼容性契约明确
浮点结果不承诺跨版本逐位一致，保留不能依赖末位或严格比较独立舍入分类值的限制。

### 代表性阅读任务与保留判断

1. **仅凭 createAdmissionGraph 的函数提示开始模拟：** 能直接恢复目的、initialState → select/settle 路径、
   immutable successor、输入约束及指南入口；不必理解 compile 或内部 factory 布局。
2. **从 CacheJsonByKeyOptions 提示恢复责任：** 总述现位于正确接口，完整 semantic key、secret 禁止与
   caller-owned directory 边界仍可恢复；NonThenable 的局部提示与其同步约束一致。
3. **static terminal-only 用户解释 unavailable：** 从「交付终态 measurement」直达共同有效性规则，
   能恢复 first-fault、保留离散事实、不伪造 timing、旧 reader 不变及数值比较边界；online 路径也引用同一规则。
4. **选择 JSON 深副本或外层浅快照：** 选择表与三段示例仍足以区分输出、失败和嵌套引用；精简没有制造必经流水线。

保留的负向条款承担当前安全或协议职责，不按否定词数量删减：key/identity 不含 secret、digest 不保密、
cache 无 single-flight、learned observer 不被 await、terminalEffect 无 finally 保证、simulation 不执行真实 Check、
浅快照不等于深复制、静态 JSON 类型不构成验证凭证、Proxy trap 非沙箱、unavailable 不伪造零值、completed 不等于质量通过。
未发现退场 API 的迁移残留；类型声明的长 union/字段承载精确结构，不因篇幅长删减。未发现 Markdown 层级、
表格或代码围栏混乱到需要全局模板化重写；本次只调整确实妨碍查找的共同规则归属。

### 当前候选身份与变化材料核验

- 当前版本：`0.0.0-local.eda819f36295`；来源 HEAD：`7c9c69e609a5d095e2c459923b321cb4925f0713`。
- tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.eda819f36295.tgz`。
- 独立复算 SHA-256：`b862e48cd41a55faecd0be11d20871328551d7ef72660cc0b3d6d2f2007acb08`，与 inventory 一致。
- 实际读取目录：`scripts/project/node_modules/@zxyycom/vibe-check`；安装 manifest 确认当前版本。
- 相对表达组织复审基线，tools 34 项中仅下表 4 项变化，**均全文重读**；其余 30 项 bytes 与基线一致。
  全部哈希与 inventory 的 `expressionReview` baseline/delta 一致，无未声明变化。

| 已全文复核的变化材料 | 当前 SHA-256 |
| --- | --- |
| `docs/guides/data-boundaries.md` | `224b9db37e6ede76236ac95278a7f33a336673afffe49ac97d57d1e7d94c3cd8` |
| `docs/guides/scheduling.md` | `f466fb253d289103d77f41390269de083026b2798b32badf5ab3b4fb7f8e25b0` |
| `types/package-tools/cache/cache-json-by-key.d.ts` | `4aa0fe1018cf8ce864ad66d80b868c4ce3ed677949cc3a7709e41eef5c3204eb` |
| `types/project-run/task-scheduler/admission-core/core.d.ts` | `e4fc317b9477c5a2e6e94b7107ff9d37a3ade9fc8b542ee472de61da0b81f92b` |

独立只读检查：上述 4 项加 manifest 共 5 项 tarball/installed bytes 一致；两条共同 measurement 链接的标题锚点存在，
createAdmissionGraph 的声明指南相对路径解析到包内文件；两个受影响 source 去注释后的 TypeScript AST 打印结果与 HEAD 相等。
这些检查支持此次改动仅调整说明及位置，不替代主代理统一取得的链接、投影、示例、类型或其他机械验收。

### 本轮限制与结论

表达组织复审通过，三项发现及两项顺手收敛均已确认进入当前候选，无本分区遗留表达问题。
本轮没有重新执行动态 API 演练、全声明闭包/运行时出口审计或全 Gate；先前记录仅证明各自标明的候选和范围，
本轮结论由第二遍全量阅读、30 项未变与 4 项全文差异复核衔接。
不改产品行为或公开签名，不新增测试/Case，不提交或发布；正式 0.0.5 产物仍按发布流程验证。
