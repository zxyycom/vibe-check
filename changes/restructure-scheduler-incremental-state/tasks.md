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

- [ ] 1.1 读取当前 Scheduler/公开/统计 owner 与测试策略，冻结 action/effect corpus、需求矩阵、规模输入和测量命令；取得 before 操作量、分配、内存与计时证据，作为后续同条件对照。
- [ ] 1.2 按 design 的实验门禁完成 B 最小切片和数值候选：贯穿 select/settle/scope 的统一 delta，比较 A 控制组；先冻结独立的直接非负累计误差基准，再逐结果/局部段证明候选或回退不劣于基准，覆盖巨大 prefix/微小区间及 availability；拒绝无法证明的候选，记录 backing、聚合分组和等待表示的采用理由。
- [ ] 1.3 将采用模型接入 Core seed/transition：唯一更新源事实，统一 typed membership/counter/occupancy/lifecycle delta，收敛重复 counts/lookups；保持 reducer effects、资源原子性与 immutable successor。
- [ ] 1.4 让 ready/static frontier 直接消费 membership/head/layer delta；移除重复 affected-slot/group diff，保留两类 tie order、三层选择、非 head 移除和 revision；共享动态 gate 避免全量 retag。
- [ ] 1.5 接通 state/query/public projection 与 shell 消费：只读必要成员，选择经验证的排序/物化方式，保留 hard guards、取消/forced/completion 顺序、旧 snapshot/fork 与完整 evidence。
- [ ] 1.6 在已交付需求开关内实现增量分类/count、惰性等待及 interval totals；确定 online/terminal 检查点，保证 finite/non-negative available、首次失败原因、读取顺序无关、旧 prefix 稳定及无需求零额外维护。
- [ ] 1.7 同步 Scheduler、受影响调度/推演指南、Human output 与测试/Case；迁移本项内部消费者，移除替换路径和失效注释，保留可复核实验结论与复现入口。

## Verification

- [ ] 2.1 用独立 oracle 对照 seed、pre-admission、select、settle、forced、cancel、scope、资源与多来源 blockers 的 action/rejection/effect trace；覆盖排序、失败优先级、fork/snapshot 和 terminal delivery。
- [ ] 2.2 用固定采样和精确参考验证分类/单位/积分/delay/peak/tail；逐结果/局部段核对候选及回退的误差保证不劣于冻结基准，拒绝依赖放宽自有界的结果；覆盖差值、乘法、最终转换、长序列舍入、局部消减、溢出/下溢、零区间、非法 clock、检查点 availability 和读取顺序，核对证明适用条件。
- [ ] 2.3 验证 static/no observer、custom 最小/完整、diagnostics、online/terminal 和 mixed demand：无需求不新增索引维护；完整输出、learned consumption、Invocation/output 状态及取消/drain 保持正确。
- [ ] 2.4 在同条件 Node/Bun 独占串行窗口复测各规模/形状，报告操作量、fanout、排序、分配、retained/peak memory、局部与公开 Run 时长及噪声；说明采用收益、局部代价和未改善边界。
- [ ] 2.5 运行受影响最窄测试、Product typecheck/lint/dependency、`bun run validate`、`bun run test-evidence -- check --root .` 与本 Change 检查；输入稳定后运行 `bun run check -- --all`。
- [ ] 2.6 非实施代理基于实际 diff 反查全部成功标准、公开/内部 owner 与数值证据，确认迁移完整且无临时运行时路径；有明确提交授权时再按项目流程提交，结项删除另依授权。
