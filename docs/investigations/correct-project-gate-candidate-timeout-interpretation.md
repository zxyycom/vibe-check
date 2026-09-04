---
title: "修正 Project Gate candidate 超时与并发优化边界"
formedAt: "2026-09-04T02:16:34+00:00"
question: "20 秒 candidate case timeout 应如何解释，后续优化是否应改变 Gate 全局并发或改为慢 Check 的局部并发约束？"
tags:
  - "package-candidate"
  - "performance"
  - "project-gate"
  - "test-reliability"
relations:
  - type: "修正"
    target: "diagnose-project-gate-candidate-timeout-under-contention.md"
---

## 形成时背景

直接前序报告把正式 full Gate 中 candidate 主 case 在 20,948.19 ms 越过 20,000 ms timeout
解释为“资源竞争导致的假失败”，并建议先把 correctness watchdog 与 performance budget 分离、考虑放宽
timeout，以及用 root parallel 2/3/4 做全局容量实验。该解释遗漏了项目 owner 对这条硬限制的验收意图，
也与已有活动且已对齐 Decision
`configure-project-gate-admission-priority-by-repeated-comparative-evidence.md` 的现行边界不一致。

2026-09-04，用户明确修正三点：硬 timeout 的作用正是发现性能突然下降，越界是 Gate 应报告的问题而非
假失败；candidate 冷构建路径确实应优化；优化不调整全局并发限制，但可以考虑针对慢 Check 的局部并发限制。
本轮没有新增性能样本，前序报告记录的 full、scheduler 与 isolated 测量数值仍然有效；本报告只修正这些
数值所支持的结论、优先级与实施边界。

## 调查目的

本轮重新回答：

1. 20 秒 candidate case timeout 在 Project Gate 中是 hang watchdog，还是有意阻断性能下降的预算；
2. isolated case 明显更快是否足以把 full Gate 超时判定为错误结果；
3. 在 root `maxParallel: 3` 不变的前提下，应优先优化实际工作，还是调整调度；
4. 慢 Check 的局部 `maxParallel` 是否仍是可评估候选，以及它需要什么证据。

本轮不修改 timeout、Gate Definition、candidate lifecycle 实现、测试或 Decision，不把“可以考虑局部并发限制”
扩写成已经确认的具体配置。

## 调查范围与依据

### 用户确认的验收意图

- 20 秒硬限制是性能门禁；其目的就是在 candidate 路径突然变慢时让 Gate 失败。
- 当前优化目标是 candidate cold build 路径，而不是让超时结果通过。
- root/global concurrency 不在本次优化候选中；只允许评估慢 Check 生效期间的局部并发约束。

这三项是本轮解释 Gate 结果和筛选候选方案的直接 owner 输入。它们改变前序报告对相同测量的判断，但不改变
已经观测到的时间事实。

### 已有活动 Decision

`configure-project-gate-admission-priority-by-repeated-comparative-evidence.md` 当前为
`active + aligned`，已经规定：

- root scheduler 默认保持 `maxParallel: 3`；容量修改必须基于同 membership、capacity、runtime/toolchain
  与 warmed candidate 条件下的交错重复测量；
- candidate lifecycle 与 external consumer provider 继续共享 package lifecycle mutex；
- 不采用扩大 timeout、失败重试或根据一次 duration 调整 admission priority；
- Gate 配置变化只有在相同 exact candidate 和完整对照证据下才可保留。

因此用户本轮确认恢复并强化了现有边界，不需要为相同方向建立新的 Decision。candidate cold path 的具体优化尚未
选定，也不构成可独立回放的长期实现判断。

### 前序测量的重新解释

- 正式 full Gate 的 candidate lifecycle 在相同 fingerprint 的四个 passed 样本中为 13.9–22.5 秒，另有一次
  主 case 在 20.948 秒触发 20 秒 timeout。
- isolated candidate suite 为 9.694 秒，主 case 为 7.342 秒；这证明 full workload 下有显著额外成本或竞争，
  但不能证明超时结论错误。相反，在硬预算语义下，它说明同一合法路径对环境和并发负载敏感，且当前最差观测
  已越过验收线。
- 本次成功 full 的关键链仍是 candidate lifecycle、受 lifecycle mutex 约束的 external consumer preparation、
  以及 consumer acceptances；scheduler control path 仍只有 18.095 ms。因而优化实际 candidate work 比优化
  scheduler 算法更直接。
- checked-in elapsed advisory baseline 与当前 fingerprint 不匹配，只影响 full-run advisory comparison；它与
  candidate test 的 20 秒 blocking budget 是两个不同机制。前序报告把二者都归入“性能预算应与 correctness
  分离”的建议不成立。

### 局部并发能力边界

Product 已有 leaf/ancestor `maxParallel` 的 effective scoped cap：某个 Check 活跃期间，它可以把共享 Scheduler
的有效容量限制到不高于 root limit。该能力约束 Product Task slots，不保证限制 subprocess、Worker、thread 或
工具内部并发。

因此，对 candidate lifecycle 设置局部 cap 可能减少它与其它重 Check 的竞争，但也可能延长其他 Checks 的等待并
增加 full wall time。isolated 与一次 full 的差异只足以提出候选，不足以选择具体 cap；需要保持 root 3 不变，对
candidate-local 3（现状）与 2 等方案做交错重复 full 对照。

## 调查结果与边界

### 修正后的结论

1. 撤回“timeout 假失败”和“先修验收可信度”的结论。20 秒越界是按项目意图正确工作的 blocking performance
   Gate，不能通过扩大 timeout、重试或降级为 advisory 来消除。
2. 保留“candidate 冷构建路径是首要优化对象”的结论。isolated suite 中主 case 占约 79%，正式 full 中该 lane
   又位于关键链；下一步应先定位并减少它的真实工作成本，使代表性 full workload 稳定回到既有硬预算内。
3. 撤回 root parallel 2/3/4 作为候选修改的建议。全局 `maxParallel: 3` 保持不变，既不提高也不降低。
4. 将调度实验收窄为 candidate 等慢 Check 的局部 cap 对照。该方案只是可测候选，不得先写入正式 Definition；
   只有它在保持 timeout、membership、terminal outcomes、mutex 与 root capacity 不变时降低 candidate budget
   越界风险，且不恶化 full wall median/p90，才值得采用。
5. package lifecycle mutex、consumer Check 拆分和 full/required assurance 范围没有获得变更授权，继续保持。

### 建议的后续顺序

1. 在保留 20 秒 case 与 30 秒 lane 硬限制的真实 full workload 中，为 candidate cold path 增加低开销 phase
   evidence：fingerprint/documentation、tsgo emit、staging audit、pack、packed audit、first install、dependency
   probes、reuse inspection 与 forced reinstall。
2. 针对占比最高的实际 phase 做最小实现优化，保持 artifact bytes/manifest、installed dependency containment、
   reuse/reinstall decision、error behavior 和测试证明范围不变。
3. 用同一 workload 复测 before/after；至少报告 raw samples、median、p90、timeout 次数、candidate duration 与
   full elapsed，不能只用 isolated 单次结果声明收益。
4. 若实现优化仍受资源竞争显著影响，再比较 candidate leaf scoped cap 3 与 2；root `maxParallel` 固定为 3。
   同时检查其它关键 Check 等待、completion tail 与 full wall，避免只让 candidate 数值变好却拖慢整体 Gate。
5. 最终 Definition fingerprint 稳定后再刷新 elapsed advisory baseline；这不能替代 20 秒 blocking budget。

### 未知与重新调查条件

- 尚未取得 candidate 内部 phase timing，无法判断 tsgo emit、audit、pack 或 install 谁是主要可优化成本。
- 尚未运行 candidate-local cap 的重复 A/B 对照，不能断言局部 cap 2 会改善 timeout 稳定性或 full wall。
- 20 秒 case 与 30 秒 lane 是本轮确认保留的当前验收边界；若未来需要改变数值或预算适用环境，必须由新的明确
  owner 决定和同 workload 证据支持，不能从本报告推导授权。
- runtime/toolchain、candidate membership、CPU quota 或 Gate Definition 变化后，现有数值不可直接外推。
