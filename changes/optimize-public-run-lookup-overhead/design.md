# Design

只在稳定事实拥有者的生命周期内建立最小索引，保留所有外部行为与诊断，不引入新的调度算法。

## Context

实施基线为 `b01676764100e81603c0d64749a1b56a66682337`。调查编号 R01/R02/R03/C02 来自已提交的 [Check/Core 调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)。既有 learned、effective-opportunity 与 public performance-reference Changes 拥有不同 Outcome，不在此激活。

[不可变 admission Decision](../../docs/decisions/provide-immutable-admission-graph-state.md)允许有实测依据的 private indexes；[诊断证据 Decision](../../docs/decisions/keep-gate-run-evidence-complete-with-owner-scoped-scheduler-context.md)要求保留每轮动态 facts。本轮不改变任何公开 contract、默认算法或长期容量策略。

## Goals / Non-Goals

目标是减少公共 Run 的 identifier lookup 与 immutable graph 重算，证明同条件性能与行为保持。
不处理 R04–R10 的其它机制，不重写 admission reducer，不扩展 public API、memory/time limit，不优化 Lizard、learned 或跨调用缓存，不重置其它 Change。

## Decisions

### Intended Change

1. Session 保留 canonical `slots` 顺序与 mutable slot 对象，只新增私有 ID→slot Map 和只读 known-ID Set。先完成现有注册校验，再建索引；未知、非法、NUL ID 与注册输入后续 mutation 的行为保持。
2. Blocker summary 只索引当前 `settledTasks`，不存在仍代表未 settled；不能用所有任务目录替代。mutex/resource 索引同属本次 inspection，dependency→mutex→resource 的分类优先级不变。
3. scope lookup 复用同一个 compiled graph；active membership 只在当前 decision 构建。候选 fold 与原 comparator 的 cap、priority、scope ID、task ID 次序一致，全相等保留先遇者。
4. fingerprint 缓存在 invocation-private Scheduler state 的 lazy string slot，输入仍是同一 graph DTO 的 `JSON.stringify` 与原 hash；不使用 module-global WeakMap、不去掉 disabled logger 前的必要观察或动态 decision facts。
5. 测量走真正公共入口：independent 与 chain，N=1/8/32/64/128/256，static、maxParallel=1、常数 passed callback、全部 outputs disabled。定义/导入在计时外，完整 await run 在内，结果核对在外；每形状/规模独立进程 3 warmups 与 9 samples，小样本每批 20 runs。256 有界 pilot 通过后可增加 512，并在 before/after 同时保留。

### Resulting Impacts

- 额外 retained memory 为 session O(C) 与每 state 一个 fingerprint；boundary-local temporary indexes 不逃逸，不改变 old context 的 captured prefix 或 object identity。
- 测试加强现有实体时保留其 Case keys；必要新实体先核对义务与账本，不为历史报告创建产品义务。
- 性能代理独占 before/after 计时窗口；实现代理在 before 完成前只读，after 期间停写停重测。使用锁定 Bun 1.3.14，记录 host/runtime/source/harness 身份、全样本 median/MAD/min/max，不从 9 样本宣称 p95。
- Timing 是 observation，不新增 CI 时间阈值。验收分别检查大规模收益与小规模回退；噪声重叠先复测，不以单次更快宣布成功。
- 资源归 `261012-verify-priority-complexity-optimizations` Investigation；原历史计数保持不变，新样本另存。审查覆盖公开承诺、内部事实与实际 diff。

## Risks / Trade-offs

私有 Map 增加 O(C) 内存；短 Run 固定成本可能上升，需小样本对照。scope fold 的稳定 tie、blocker 未结算边界与 fingerprint 生命周期是主要语义风险。公共 Run 尚有其它二次成本，本轮不能宣称消除全部增长。输出关闭的合成 callback workload 隔离框架成本，不代表 scanner-heavy 项目整体提速。

## Open Questions

无设计或验收阻断问题。同条件测量与行为验证已完成；后续扩展 workload 须重新取证，保持公开 contract 原范围。

## Implementation Observations

2026-10-12 同协议 after 与交错 control 的 source/harness/runtime 身份已核对。N=512 independent / chain
交错 median 从 3681.737 / 1667.522 ms 降至 630.315 / 467.281 ms，约降低 83% / 72%；chain after 抖动较大，
范围与 MAD 保留。N=8 chain 的 +0.66% 在噪声内，小规模收益不能逐点保证。
结果 snapshot digest 与声明 fingerprint 一致；N=128 chain settlement 比较 690880→0、independent scope 比较
2812544→0、graph stringify 258→1。零值只描述被替代循环，剩余 boundary/graph 工作仍在。

基线窗口为 83.752 秒，Bun 1.3.14、源码前后哈希一致。256 pilot 通过后，两侧共同纳入 512；
主采样 512 independent / chain median 为 3555.936 / 1616.593 ms。仓库内 ignored 基线副本曾干扰 Case 检查，
迁出后逐项验证哈希，未改 Product、测试或发现规则；副本供 before 复测，取证完成后已清理。

C02 实施自验 18 项、Run 实施自验 31 项通过，全 Product typecheck/lint 通过。
独立审查确认索引生命周期、blocker precedence、scope stable tie、同字节 fingerprint 与公开行为保持。
首轮 Gate 阻断包含 graph observation 所在测试文件超出行数门限；按职责将两项实体完整移至
`task-engine.graph-observation.test.ts`，仅更新原 Case 路径映射，生产行为不变，非实施代理定向复核通过。
第二轮完整 Gate 43/43 通过，exact candidate 为 `0.0.0-local.33c633e98132`；既有 Check mean/P95 告警保留。
Gate 耗时不是本优化的性能对照。形成时原始数据、完整验证与适用边界交接
[实施调查](../../docs/investigations/verify-priority-complexity-optimizations.md)。
