# Design

以 Core-owned constraint groups 与按需投影减少重复枚举，保持同源判断、策略层级和不可变分支。

## Context

本轮起点已具有 immutable Core、pure reducer、canonical effects 与阶段需求声明。
行为以 [Scheduler](../../docs/development/scheduler.md)、调度和推演 owner 为准；起点成本证据在 ignored
`tmp/optimization-cost-investigation-20261014.0FTggZ/README.md`，是形成时观察而非性能预算。

## Goals / Non-Goals

降低共享 mutex occupancy 更新与 static frontier consumption 的重复工作。
公开 context、输出、资源限制和策略保持不变；Shell payload 与 collector timing 继续由原 owner 负责。

## Decisions

### Intended Change

采用 relation-ready membership、动态 mutex-holder/legacy 查询及 Core constraint groups。
分组按相同 mutex 集合、canonical resource claims、tighter-than-root scope ID/activation 建立；
non-tighter scope 可合组，实际 scope activation/close effects 仍按被选 Task 产生。
frontier 由同一 seed/transition 维护，以两类 persistent priority 顺序适配 scope 生命周期：

- ordinary：priority 后按声明顺序；
- tightening / continuation：跨组按 cap、priority、scope ID、lexical Task ID 选择，再决定 select/wait，不作 ordinary backfill。

完整 candidates、eligibleCount 和 diagnostics 按需求从 captured Core 投影，保留捕获时边界。
scope activation 编译先为每 scope 建 activation ID Set，再按 Task 的 scope-slot lookup 查 membership，
保留所属 scope 核对与既有图验证/失败时点。

### Resulting Impacts

- predicate、summary、measurement、public rejection 和 custom hard guard 共享 Core facts；duplicate occurrences 的 accounting/payload 与 legacy mutex 行为保留。
- relation-ready 非空不等于存在 mutex-ready candidate；wait/blocked/complete 分支按同源判断产生。
- transition 维护 live heads 并清理失效 head；各单调分支中 tombstone 摊销弹出，query 只读当前 live head。
- seed、forced effects、cancel、old state 与 fork 分别验证；完整 custom/public/diagnostic 消费义务保持不变。

## Risks / Trade-offs

等价组遗漏维度或 tie order 切换错误会改变策略；lazy projection 必须捕获 immutable Core 而非 mutable Shell。
frontier 增加 seed、状态维护与内存成本。G=N 仍可能二次枚举，完整明细、active roots、Shell payload 和 collector 各有独立成本。
采用证据不能外推为普适 O(N log N)、内存改善或真实 Gate 加速。测量独占，预算、timeout、waiver、冻结与测试义务保持不变。

## Open Questions

无阻断公开契约问题。后续若候选需要改变契约或显著扩大 owner，先报告该边界并重新确认范围。
本轮语义保持重构和文档整理已完成组合复验，来源及边界见下节。

## Implementation Observations

前轮实施采用上述方案，Shell pending/promise-race 路径保持原样。本轮将 ready/forced frontier 的不可变 backing 归一为
Scheduler-private Task queue；两者的 priority 映射、membership、prune 和 lifecycle 仍由原 owner 分别维护，复验见 tasks。

### 来源与采用依据

基线为 `3072afa1ff0fdc6509894499d9745cb6ad592eb1`。以下为前轮证据，原始样本、复现命令与源身份保存在 ignored
`tmp/scheduler-frontier-optimization-20261014/README.md`：before 为实际写入前样本；after 由全部 40 个 runtime 模块的
`source-after.sha256` 标识，manifest digest 为 `dd6c83c7c020ee0ad46815c3c9970e680fde5e67c4e8c9e2df5ca063de25e4a9`。
私有 replay 的 37 个原模块、改写 imports 和 foreign-owner 来源另有 manifest，不以未变的 HEAD 代替 dirty source 身份。

| 证据 | 结果与证明边界 |
| --- | --- |
| 公开同 workload，2 warmups / 3 samples | N2048 median：wide 3469.73→179.37 ms、shared mutex 8397.29→191.26 ms、chain 178.46→180.37 ms；不是 p95、普适收益或 Gate benchmark。 |
| 实际操作计数 | wide N2048 candidate visits 4,188,166→group-head visits 4,092；activation occurrence reads 2,100,224→2048 且 flags 相同。 |
| 源码推导 | shared-mutex reverse deltas 8,388,608→0；不是计数器测量。 |
| 小图与 G=N paired replay | 保留有限常数代价和 G=N 增长边界，不承诺全部形状降阶。 |
| 独立候选 oracle 与原 static policy | 2,344 boundaries 等价；reference propagation 使用当前 Core effects，因此单凭此项不能证明旧 Core forced-effects 顺序。 |
| 独立旧/新 Core 对照 | 11 transitions / 132 effects 的顺序和逐 effect-state catalog/inspection/candidates 全等，补足 forced-effects 独立性；覆盖 failure cascade、duplicate relations/mutex、observers、cancellation 与 pre-admission reconciliation，不是穷尽证明。 |

非实施代理还复核了四 shape 的 N128/512 操作对照与 replay/runtime hashes，辅助材料位于 ignored
`tmp/reviewer-scheduler-gate-20261014/`。前轮局部验证包括 58 Scheduler tests、64 个组合窄测试、Product 类型/lint、
精确路径格式和原 Gate 限额的局部函数/重复扫描；最终独立审查支持采用。

## Integration Verification

前轮冻结输入的组合验收如下；这些结果不自动覆盖之后的语义保持重构或文档改动：

| 验证 | 前轮结果 |
| --- | --- |
| required Gate | `mise exec -- bun run check`：34 passed / 9 not-applicable，零 failed/unavailable。 |
| complete Gate | `mise exec -- bun run check -- --all`：43/43 passed，含 artifact / external consumer。 |
| 公共材料与治理 | `mise exec -- bun run validate`、全树 Case 722 entities / 181 Cases / 15 topics、Change 24/24 与 `git diff --check` 通过。 |

两次 Gate 绑定 exact local candidate `0.0.0-local.cc06e1edad25`。日志分别为
`.log/project-gate/2026-10-14T03-40-28.613Z-2719014-dea7fe8a-cbb5-4aab-8b17-9050781dfe45/` 与
`.log/project-gate/2026-10-14T03-41-00.022Z-2725189-afb46c93-8e65-4f24-8a52-6ebd7be8c511/`。
required execution-summary 26.3s，含 candidate preparation 的 initial result 48.7s；complete 40.8s 复用已准备 candidate，
不是配对 Gate benchmark。Check mean/p95 warning 仍存在。

历史计时只对应上述源身份，本轮源码变化后须重新验证语义与工程门槛；即使复验通过，也不自动成为新源精确计时。
当前 metadata 保持 plan，目录保留；提交与结项删除分别依当前任务授权执行。

### 本轮规范复核

按完整编码规范复核 18 个 Scheduler TS 路径：归一 ready/forced 的冻结 queue 表示，分别保留 priority、
membership 与 lifecycle；明确 null-path length、分组构造阶段、heap sharing guard 和 captured Core。
领域私有 persistent queue 兑现 retained fork，不以临时性或附近写法形成规范例外。

本轮 41 个 runtime 模块由 ignored `tmp/scheduler-style-round2-20261014/source-final.sha256` 标识，
manifest digest 为 `3ab1da9c56e1f711b43601f2b7830347ccad9e022eb7e4f8473e758af2511298`。
同目录 README 保存 58 tests、2,344 boundaries、11 transitions / 132 effects、实际操作计数、类型/lint/格式及
原 Gate 限额下零 Finding 的新复验。未重新计时，forced 节点新增 preference number 的内存影响未测。

AI-ready 审查以当前职责和阅读任务重组 owner 与证据说明；文本能恢复分组、双序、scope/捕获边界和成本限制。
组合复验使用 exact local candidate `0.0.0-local.dfb5e87283d2`。首次 complete Gate 为 42/43：
Case 文档 501 code lines 超过原 500 限额。收敛 compiler Case 中的架构背景，保留 invalid-root-cap 的实际测试证明后，
完整 Gate 重跑 43/43 passed，零 failed/unavailable；预算和 waiver 保持原样。
最终日志为 `.log/project-gate/2026-10-14T04-10-07.237Z-2743795-8b6bbf2a-3fbd-47ef-be4b-82ab2a21b754/`。
公共材料、722 entities / 181 Cases / 15 topics 与 24 份 Change 检查通过，task 2.6 闭合。
Check mean/p95 warning 仍存在；单次 Gate elapsed 不是新的配对性能证据。
