# Proposal

在真实 Scheduler 中完成有限共享关系条件候选及同条件评估；B1 和有界 B2 均不采用，Product 已恢复，保留候选与证据供复核。

## Why

固定比较基线 c45e5499 的 source settlement 按 Task occurrences 写 relation counters，并在 ready crossing 再逐 Task 写 membership/heap 和 collector entry。
共享 typed relation 与 A+Bi（公共关系 A 加每个 Task 的独有残差 Bi）都存在可减少的同义传播；历史模型只证明有限切片，不能代替生产选择、逐 effect post-state 与精确 measurement 的验收。

## Outcome

保持公开 API、选择/结算顺序、每个 canonical effect post-state、精确时间与 immutable snapshot/fork 的同时，评估高复用完整关系及单公共条件加个体残差减少逐 Task 传播的正式候选；以同条件真实 Core/collector/Run 的增长、时间、内存与维护成本决定采用或拒绝。
当前结果是拒绝 B1/B2，不把局部 source-write 收益或投入成本作为采用理由；Product、稳定 owner 与 Case 的本轮候选改动已恢复，恢复后的完整 Gate 已通过 43/43，不作为 B2 采用验收。

## Scope

### Intended Change

候选仅调整 `src/project-run/task-scheduler/**` 的关系编译、事实、发现索引及 queue collector。完整 typed multiset signatures 共享计数；对不同完整签名中的高复用单 typed source 使用一层公共因子加 exact residual，不构造通用 AND-DAG。persistent 队列支持整组 root 共享发布，质量 delta 与共享进入时钟贯穿 collector。必要测试、Scheduler Case 与稳定 owner 同步。
候选不采用后，root 已串行恢复本轮 Product、稳定 owner 与 Case；本 Change 只保留补丁、身份、原始证据和结论，不在生产留下双实现或开关。

### Resulting Impacts

候选形成时迁移了关系计数与 ready membership 的私有表示、delta 和结构测试，并要求保留两种 tie、三层 frontier、scope/resource/mutex、重复 occurrences、preseed、failure/cancel 与旧分支。编译预建队列、低复用及 full-read 成本纳入比较。候选改动现仅保存在补丁中；性能证据保存在本 Change，临时构建/测量在专属 tmp，历史报告和资源只读。不新增依赖、公开配置、永久双实现或 overlay。

## Success Criteria

- raw-graph oracle 在 action、rejection、effects 及每个 effect-state 级别一致，snapshot/fork 独立。
- scripted clock 与独立逐 Task oracle 保持 counts、peaks、delay、history、availability 与精度。
- B1 同固定图与轨迹比较基线 c45e5499；含 compile/seed、真实 Core+collector、Run、小中大、共享/A+Bi/unique/overlap/H=N、完整读取与保留状态；正式计时无 instrumentation/profile 且独占。B2 的停走范围以下项和证据入口为准，不要求或暗示其完成 B1 全矩阵。
- 采用建议明确实际收益、退化、内存和维护成本；不要求每个小图更快，不把模型收益称为 Run 收益。
- B1 完整矩阵及 B2 停走小矩阵可独立核对；B2 因净收益不足而停止，不再跑完整矩阵或声称通过采用验收。
- 局部测试、Case closure、type/lint 与恢复证明有据；最终 dependency/入口、完整 Gate 与安装验收在恢复后的实际保留 tree 串行完成，不作为 B2 采用验收。

## Affected Owners

- [Scheduler](../../docs/development/scheduler.md)：关系事实、选择、delta 与 collector。
- [调度](../../docs/guides/scheduling.md)、[模拟](../../docs/guides/simulating-admission.md)：保持公开承诺不变。
- [测试策略](../../docs/testing/strategy.md)、[Case](../../docs/testing/case-maintenance.md)：直接证据与全树闭合。
- [Change 协调](../../docs/governance/change-coordination.md)：由 root 串行维护；Git 也由 root 独占。

## Current Result

**B1/B2 均不采用，停止此方向调参。** [证据入口](evidence/README.md)区分 B1 完整矩阵、B2 小矩阵和未执行项。
此结论只拒绝本轮有限共享实现，不证明所有共享方案无效，也不改变既有长期 Decision。历史 Investigation 及资源未修改。
