# Tasks

先完成上下文 Change 并复核新基线，再按模型切片、数值验证、产品替换和完整验收推进；勾选仅表示已有实际证据。

## Readiness

- [x] 0.1 审计目标、责任与现状：以结构普查、Scheduler/公开指南及当前 transition/frontier/integrals/timing 源码确认 B 的输入，区分重复传播、成员索引与独立有序视图。
- [x] 0.2 收敛语义与实验边界：design 已明确保持/允许变化表、固定 trace 数值参考、确定的 availability 检查点、性能分轨和候选失败出口；内部选型不再作为用户待决问题。
- [x] 0.3 独立审查三个 artifacts：仅凭计划可恢复 Outcome、owner、完整上下文先行顺序、第一步实施动作及验证判据；清除冲突、过程残留与无证据的完成声明。
- [x] 0.4 上下文 Change 已完整实现、迁移、验收并进入当前 `main` 稳定提交；核对实际字段、固定需求时点、按需生产开关与本 Plan 距离，再记录本项源码 baseline。

前置源码交付为 `de9cf844534b1b799b9c7e0dd75f7ff0dfba7c14`，完整 Gate 43/43 通过；四组生产边界与精确视图已独立复核。
本 Plan 已按该交付复核；任务 1.1 另冻结结项清理后的实际测量 revision、workload 与命令。

## Implementation

- [x] 1.1 读取当前 Scheduler/公开/统计 owner 与测试策略，冻结 action/effect corpus、需求矩阵、规模输入和测量命令；取得 before 操作量、分配、内存与计时证据，作为后续同条件对照。
- [x] 1.2 按 design 的实验门禁完成 B 最小切片和数值候选：贯穿 select/settle/scope 的统一 delta，比较 A 控制组；先冻结独立的直接非负累计误差基准，再逐结果/局部段证明候选或回退不劣于基准，覆盖巨大 prefix/微小区间及 availability；拒绝无法证明的候选，记录 backing、聚合分组和等待表示的采用理由。
- [x] 1.3 将采用模型接入 Core seed/transition：唯一更新源事实，统一 typed membership/counter/occupancy/lifecycle delta，收敛重复 counts/lookups；保持 reducer effects、资源原子性与 immutable successor。
- [x] 1.4 让 ready/static frontier 直接消费 membership/head/layer delta；移除重复 affected-slot/group diff，保留两类 tie order、三层选择、非 head 移除和 revision；共享动态 gate 避免全量 retag。
- [x] 1.5 接通 state/query/public projection 与 shell 消费：只读必要成员，选择经验证的排序/物化方式，保留 hard guards、取消/forced/completion 顺序、旧 snapshot/fork 与完整 evidence。
- [x] 1.6 在已交付需求开关内实现增量分类/count、惰性等待及 interval totals；确定 online/terminal 检查点，保证 finite/non-negative available、首次失败原因、读取顺序无关、旧 prefix 稳定及无需求零额外维护。
- [x] 1.7 同步 Scheduler、受影响调度/推演指南、Human output 与测试/Case；迁移本项内部消费者，移除替换路径和失效注释，保留可复核实验结论与复现入口；为已确认的初始 viability 与取消/forced Bug 分别沉淀回归和调查证据。

## Verification

- [x] 2.1 用独立 oracle 对照 seed、pre-admission、select、settle、forced、cancel、scope、资源与多来源 blockers 的 action/rejection/effect trace；覆盖排序、失败优先级、fork/snapshot 和 terminal delivery。
- [x] 2.2 用固定采样和精确参考验证分类/单位/积分/delay/peak/tail；逐结果/局部段核对候选及回退的误差保证不劣于冻结基准，拒绝依赖放宽自有界的结果；覆盖差值、乘法、最终转换、长序列舍入、局部消减、溢出/下溢、零区间、非法 clock、检查点 availability 和读取顺序，核对证明适用条件。
- [x] 2.3 验证 static/no observer、custom 最小/完整、diagnostics、online/terminal 和 mixed demand：无需求不新增索引维护；完整输出、learned consumption、Invocation/output 状态及取消/drain 保持正确。
- [x] 2.4 在同条件 Node/Bun 独占串行窗口复测各规模/形状，报告操作量、fanout、排序、分配、retained/peak memory、局部与公开 Run 时长及噪声；说明采用收益、局部代价和未改善边界。
- [x] 2.5 运行受影响最窄测试、Product typecheck/lint/dependency、`bun run validate`、`bun run test-evidence -- check --root .` 与本 Change 检查；输入稳定后运行 `bun run check -- --all`。
- [x] 2.6 非实施代理基于实际 diff 反查全部成功标准、公开/内部 owner 与数值证据，确认迁移完整且无临时运行时路径；有明确提交授权时再按项目流程提交，结项删除另依授权。

实施基线：`d4dc896c01a373cf9c3e9709d744a86202373f18`；Product source manifest digest 为
`7aaca1df0426a2a6aafc1493c62f7e7affaaf6c0a7d67884067502b4c4cc8663`。
Node 24.18.0 与 Bun 1.3.14 的独占串行 before 已完成：各 120 行 Core 分阶段、54 行 source public Run/shell、
6 行 active-scope 与 12 行 queried-fork 结果；计时含 warm-up 与 7 次正式采样，Node allocation 另行采样。
实际操作量已对照 baseline 与 A 控制组；起点 Case 检查为 739 entities / 185 Cases / 16 topics。
原始材料已按精确清单复制到本 Change 的 [evidence](evidence/README.md)，保留相对路径与字节，
结项后由验收提交恢复。它们证明源码层实验，不替代已安装 package 验收。

当前实现自验证：Scheduler 与相邻 learned/lifecycle/diagnostic 测试 93/93，Product typecheck/lint、format、
`bun run test-evidence -- check --root .`（749 entities / 185 Cases / 16 topics）及 diff whitespace 均通过。
两项旧 Bug 的相同输入回归分别得到零错误 viability 与取消后单次结算；独立阶段审查已覆盖 Core、数值模型、
query Heap 和稳定文档。最终 AI-ready 文档优化及编码规范优化已实际完成，最后职责拆分的定向正确性复核也已通过：
独立 16 tests、200 图 / 4583 transitions、5000 ratios / 9992 舍入检查均通过。
冻结 Product source digest 为 `c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629`。

2026-10-16 fresh `mise exec -- bun run check -- --all` 已通过 43/43，candidate 为
`0.0.0-local.45845dd3dad8`，包含隔离消费者 types/runtime/documentation 和 package artifact 验收。
证据目录为 `.log/project-gate/2026-10-16T10-28-55.082Z-3817148-a5564807-a5ae-4b27-b3d8-821d95657d43`。
Gate wall time 为 33.6 秒；Check 时长 p95 5021.1ms 超过非阻断 warning budget 5000ms，不改变通过结果。
完整 after 已在相同冻结 runner 与独占串行窗口完成，源码起止 digest 一致；所有 504 个结果 cohort 与 24 个操作 cohort
见[完整对照](evidence/comparison-all-cohorts-v1.json)，[采用说明](evidence/adoption-evidence.md)同时报告规模收益、
Core/中小规模回退、query memo retained memory 与 eager import 成本。原数值证明和 replay 依赖由受管清单闭合。
归档后 `bun run validate`、Case 749/185/16、Investigation 83/full index、diff 检查均通过；
再次运行完整 Gate 仍为 43/43，同一 candidate，wall time 30.9 秒。
最终 Gate 证据目录为 `.log/project-gate/2026-10-16T11-14-38.616Z-3833194-bcee365f-4661-4685-8119-ceefc6d170ef`。
保真历史 handoff 的两处无语言代码围栏仅有既有 non-blocking Markdown 提示，未改规则或原资源字节以消除提示。
独立复现审计发现的 A-trace 输出未落盘缺口已补入恢复说明并刷新清单。最终独立审查已通过全部六项成功标准：
85 项资源 hash、冻结输入、baseline Git tree、最终源码 identity、504/24 cohort 与采用数字均核对；
仅使用受管材料的隔离恢复完成 replay、A trace、A/B 操作量及比较/清单生成器复验，无剩余实质阻断。
至此语义与机械验收闭合；本 Plan 将先进入验收提交，再按用户授权通过公开 finalize 入口删除，Git 动作另以实际结果为准。
