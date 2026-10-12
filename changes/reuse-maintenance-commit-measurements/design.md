# Design

在一次 maintenanceReminders execute 内按需复用成功的 Git 历史测量，保留失败恢复与取消边界。

## Context

用户已授权优先复杂度优化；本 Change 拥有独立 Check-local Outcome，第一批 Run 优化只作为测量基线，不与其收益混算。来源见[调查](../../docs/investigations/audit-checks-core-algorithmic-complexity.md)，当前稳定语义由 proposal 所列 owner 拥有。

## Goals / Non-Goals

重复基线的多个提醒得到完全相同的有序 assessments/messages，但成功历史测量仅按需完成一次；失败条目不污染后续恢复。

不引入新 API、limits、waiver、外部依赖或跨调用缓存，不扩大到其它复杂度候选。

## Decisions

### Intended Change

history index 保留首次出现，等价于旧 indexOf。成功 full base ID resolution 可复用；prefix[0]=0，按目标 baseIndex 懒扩，每步仍 diff-tree commit^ commit，只有解析与累积 safeInteger 校验都成功才提交 prefix。失败步下一 entry 真正重试；已成功短 prefix 可用，不预取无关旧 commits，不换成净范围 diff。

写入范围：src/package-checks/maintenance-reminders/measurement.ts、maintenance-reminders.ts、最小相邻 integration tests，必要 owner 说明及既有 Case 的 Entities。

### Resulting Impacts

每个 entry、cache hit 和 prefix 扩展处保留 signal 检查；base/numstat failure、malformed、overflow、cancel 不缓存为后续结果。维持 first-parent 逐 commit diff、advisory/enforcing、作者原 base spelling 与排序，不新增公开缓存配置。

只增补既有 WB-MAINTENANCE-REMINDER-ASSESSMENT-001 的必要直接实体，不新增 Case/Topic；验证成功复用、跨 execute 重新测、失败/overflow 后恢复、长基线失败不污染短基线及 cache-hit cancellation。

测量协议：真实独占 /tmp Git fixture，root+4 successors/R=1 与 root+32 successors/R=8 同 root base，每 commit append 一行；public maintenanceReminders/run、outputs disabled。setup 在 timer 外，同一 fixture/current Git/隔离 config；trace2 计数在独立非 timing invocation，结果完整核对。
全部使用锁定 Bun 1.3.14，3 warmups/9 samples，记录完整样本、median/MAD/range、源码与 fixture 身份；timing 只作 observation，不新增 CI SLA。单 run 10 秒、整轮 5 分钟有界停止；pilot 调整在正式 before 前冻结。

## Risks / Trade-offs

缓存失败会压制后续恢复，跳过 subprocess 也可能丢 signal 观察；两者必须直接测试。额外内存 O(history length)，不跨 execute 保留。正常成功 calls 降为 2+B+max(ki)，B 为不同已解析基线数；失败重试不套该公式。

## Open Questions

无设计或验收阻断问题。已完成的操作计数、完整路径 timing 与噪声边界见下节；后续扩展负载或优化范围须重新取证。

## Implementation Observations

最终同窗 K=32/R=8 median 517.893→68.981 ms（约 86.68%），真实 Git 进程 266→35；
小 R=1 的进程数仍为 7，时间不能保证改善。失败/重试/overflow/cancel 由测试另证。

首轮 Gate 的 prefix 测量圈复杂度超限后，将单 commit 查询、解析与安全累计交给 `measuredCommitPrefix`，
prefix 扩展只提交成功值，失败与取消语义不变。新增 async continuation 后重新计时，最终结论采用补测值。
非实施复核与第二轮 43/43 Gate 通过。完整过程与旧样本见
[实施调查](../../docs/investigations/verify-priority-complexity-optimizations.md)。
