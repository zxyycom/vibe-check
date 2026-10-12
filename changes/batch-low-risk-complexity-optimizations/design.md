# Design

在现有 owner 拥有的不可变输入生命周期内建立局部索引，保持可观察行为，以同条件测量判断采用成本。

## Context

实施基线为 `b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853`；候选编号来自[复杂度调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)。
当前实施和验证交接见[acceptance](acceptance.md)，测量身份、原始材料及复现见[证据阅读入口](evidence/reading-guide.md)。

Run 的 graph validation、依赖读取和路径冻结由[Project Run](../../docs/development/project-run.md)及
[Scheduler](../../docs/development/scheduler.md)拥有；learned helper 使用[普通 prepared lifecycle](../../docs/development/package-tools.md#learned-critical-path-helper-owner)。
本页只记录本批设计，稳定规则仍由上述 owner 定义。

## Goals / Non-Goals

目标是减少局部 membership、lookup 与累计分配成本，保留可归因的 owner diff、行为证明及 small/scaled 比较。
范围限定为下表；R05 ownership 重构、跨阶段 graph 复用、调度队列/frontier/measurement 增量化、策略与评分调整、缓存政策和文件系统安全/深度预算另行判断。
索引使用调用或 prepared closure 生命周期，不引入依赖、全局缓存、跨 Run 状态或新公开契约。

## Decisions

### Intended Change

| 切面 | 已采用的调整 | 保持不变的边界 |
| --- | --- | --- |
| Core / Run | C01/C03 seen Set；R08 flags/direct relation/artifact lookup 索引；R04 当前 prepare 的 scope/task 分组。 | identifier 首次出现与 blocker 重复拒绝；直接授权/provider identity 与实时 dependency facts；四次 prepare、validation 和首错顺序。 |
| Checks | K04 code-area membership；K07 滚动 argv 长度和当前 batch；K14 比较原始坐标、最终投影 range。 | 首位置 policy 值和严格阈值；UTF-16 精确预算与 oversized 优先拒绝；路径/坐标/规则顺序、稳定 ordinal 和空值 fallback。 |
| Learned helper | T01/T02 prepared closure 的 graph/prediction/score 索引，单次 prediction 的 history 索引、单次 recording 的 prediction 索引。 | first-match、评分/tie/fallback/history schema；每次决定重读活动状态与 capacity，每次 recording 重新合并可变 history。 |
| C05（未采用） | 正式源码保持原状；once-per-call Set 候选仅用于隔离测量。 | 2/5-key schema 的 3.898/9.203 倍退化不足以被 512-key 的 0.302 倍收益抵消；后续以真实消费者和预算独立评估。 |

### Resulting Impacts

1. 索引的准备和内存成本与重复消费收益分开判断；测量 small/scaled、准备加消费和保护路径，收益结论限定到实际 workload。
2. 私有接线调整以相邻测试证明 DTO、callback capability、权限、顺序和错误语义；修改测试时按[测试策略](../../docs/testing/strategy.md)及 Case owner 闭合。
3. 独立审查从实际 diff 反查公开承诺、内部职责、JSDoc 和包边界；既有审查确认本批无需改变这些稳定 owner，依据见[验收交接](acceptance.md#验证与-owner-影响)。
4. 原始测量、失败尝试和审查记录保留形成时字节与独立 SHA；当前阅读说明承接解释修正，临时辅助物按[交接边界](acceptance.md#下一动作与交接边界)处理。

## Risks / Trade-offs

- 本批接受 C01/8 约 +1.26 µs、reader 构造加 8 次读取约 +1.02 µs 的局部成本，换取放大输入收益并保持简单实现；没有硬延迟预算，也未测内存收益。
- R04 小输入和无 scope 对照方向不稳定；共享主机、JIT/GC 等噪声仍在，局部比率不证明 Run 端到端或所有规模无回退。
- first-match、duplicate-reject、稳定排序和首错各有独立语义；索引只改变消费成本，不替换这些规则。
- 正式计时采用项目固定 runtime、静默窗口、独立进程 warmup 和交错比较；失败与探索样本独立保留，不混入最终统计。

## Open Questions

无阻断设计问题。本轮规范复核仅删除 flags 的纯转发层并整理辅助代码，行为边界不变；新旧证据身份、复核和验证见[验收交接](acceptance.md#本轮规范复核)，提交进度由[任务](tasks.md)记录。
