# Design

Scheduler Core 状态与查询路径收敛以单一事实 owner 兑现结果。

## Context

Shell 镜像与 DTO 回读使状态、判断和初始化责任重复。本次落实已有 immutable admission state 与按需上下文方向，
内部职责由 [Scheduler owner](../../docs/development/scheduler.md)承接。工作在当前 `main`，保留无关 fixture 改动。

## Goals / Non-Goals

执行与公开模拟共同读取 Core 状态及判断，Shell 保留实际执行负载，各消费边缘保留排序和投影义务。
不新增 public API、默认策略、依赖或无关优化；clock、积分与 history 由 collector 维护。
Git 提交已获用户授权，由主线程在最终验收后执行；Change 结项删除仍须另行授权。

## Decisions

### Intended Change

已确认：Core blocker facts 与共享 partitions/query；移除无用 scope/mutex 镜像；含 pre-admission 的单次 seed。

### Resulting Impacts

不可变旧状态、summary priority、forced effects、hard guards 和可选 instrumentation 成本边界保持；同步内部 owner。

## Risks / Trade-offs

不能把 summary 等同 primary rejection；不强迫不同排序一致；无测量不宣称性能提升。

## Open Questions

无阻断问题；若候选索引必须扩大算法边界先报告。

## A–D 结构验收

| 缺口 | 调整与验收 | 合法保留 |
| --- | --- | --- |
| A Core → Inspection → Map/Set → 重判 blocker | summary 直接聚合 Core pending counters、mutex holders 和共用 resource claim fit；无 DTO 回读。dependency → mutex → resource 优先级独立于 primary rejection，root/scope 不遮住资源 shortage。 | 聚合与 primary rejection 的目的不同，不强迫 reason/count 一致。 |
| B Shell scope/mutex mirrors | 删除 RuntimeScope/isActive/activation Set、runningMutexes 及 add/delete/activate/terminal-close；删仅初始化使用的 snapshotSchedulerState。 | pending Tasks、runningById Task/Promise、settlements value/error 与 actual cancellation 留 Shell。 |
| C 两次 dynamic seed | compile/validation 仍先于 pre-admission callbacks；按输入顺序检查 unknown/duplicate、调用 satisfaction、记录值，再一次含 settlements seed；首次 reducer reconciliation 继续拥有 forced effects。 | callback 抛错与非法 ID 的先后顺序、blocked observer 通知不改变。 |
| D 全图扫描/重建 | Core persistent pending/running/settled slot sets 与 relation+mutex-ready membership；admit/cancel/settle 更新状态 membership，mutex delta 与 reverse relation fanout 更新 readiness。execution candidates、public catalog/inspection、ID 查询和 performance 读取这些事实。 | capacity/scope/resource 仍实时同源判断，暂时阻塞者不 prune；DTO declaration/lexical 排序、冻结与 catalog 必需 pending reason 投影。 |

memberships 不缓存 `canAdmit`。scope activation/close、running root count 和 resource occupancy 每次 query 读取 successor counters，
无需第二套 invalidation 规则。每个 transition 只更新 changed task 和 relation/mutex fanout 的 readiness；persistent structures
不修改 predecessor，fork 保持隔离。可选 measurement 直接请求 Core 分类，不构造完整 inspection/public payload。

## 成本与证据边界

结构验收分别核对 seed 一次、candidate/partition 按成员访问、无 DTO 回读及 fanout update。新增 persistent sets
增加 seed/memory/transition 成本，排序和冻结仍存在；有界测量见下文已取得的实施证据，不能推出一般提速或内存收益。
clock/integral/history 继续由 collector 拥有，执行负载继续由 Shell 拥有。

## 共享边界取舍

| 场景 | 共同依赖 | 保持局部的义务 |
| --- | --- | --- |
| 真实执行 | compiled graph、statuses、memberships、readiness/capacity、reducer/effects | Task/Promise、actual value/error、signal、hard guards 与 effects replay |
| public lookahead/standalone | 同一 Core legality 与 immutable successor | lexical order、binary settlement、opaque/frozen DTO，无真实控制 |
| diagnostic/measurement | 同一 Core blockers、capacity 与 pending membership | summary priority、DTO 呈现；collector clock、积分与 history |

选择 shared Core facts 加稳定 edge projections：全局统一 DTO 会混入实际控制/值并错误强迫 primary reason 与 summary
分类一致；继续各自维护状态/判断会保留漂移与回读成本。不同排序/汇总及 execution payload 保持局部是实质义务，不是未完成统一。

## 查询职责拆分

首次完整 Gate 指出 `selection-query.ts` 326 code-lines 超过 300。按真实责任将 status/member/scope lifecycle
完整事实查询族移入 `state-query.ts`；selection/readiness/capacity 与 rejection payload 仍只有原判断 owner，所有消费者
直接绑定对应模块。没有豁免、放宽阈值、压缩代码或第二套规则。拆分后 SCC 测得 selection-query 250、state-query 79 code-lines；
三份重构源文件（含 Markdown session）使用 Gate 原 function limits 的公开 Check 通过，零 Finding。目标 86 tests、typecheck、
lint、format、Case 完整性通过。

## 已取得的实施证据

独立 reviewer 核对 A–D 结构及行为，对照 264 图、24,651 views、11,704 effect poststates；该对照在最终
纯模块拆分之前，最终 delta 另证明 29 个函数 body token 等价、6 个消费者仅 import 调整，并重跑 Scheduler
56 tests 与 Case 完整性通过。私有 legacy snapshot 的 external mutex summary 不再丢失事实是有意纠正，
public 与真实 Run 行为不变；不是强迫 summary 与 primary rejection 一致。

有界计时采用 2 warm/5 samples，中位数 baseline → candidate（ms）：P4 的 N32/128/512/1024 分别为
5.95 → 6.81、24.71 → 21.70、207.49 → 209.58、827.66 → 809.71；N1024/P64 为 869.24 → 819.43。
方向混合且含噪声，不作一般提速结论，未测内存。计时基于最终纯模块拆分之前，拆分之后仅补等价验收；
独立证据位于 `tmp/scheduler-core-review-20261013.OAa2BJ/artifact-note.md`，是本轮临时材料，不作为稳定 owner。

2026-10-13 09:25 的完整 `mise exec -- bun run check -- --all` 通过 43/43，candidate `0.0.0-local.2c3398cc0fc8`，
耗时 41.2s；既有 mean/P95 性能预算 warning 为 2.422s / 5.926s，没有放宽门槛或新增豁免；
组合 Case 检查为 720 entities / 181 Cases。该证据早于本轮代码和文档优化；最终快照验收见下文。

本轮文档优化将稳定 owner 组织为 Core 查询、Shell 准入与边缘投影，迁移细节保留在本计划。
代码规范整改将 canonical settled effects 收紧为 blocked 必带 dependencyIds 的判别联合，移除消费者的空数组兜底；
mutex counter/fanout 更新显式命名，seed/transition 使用具名输入，封闭 query 分支穷尽表达。它们保持既有生产者事实与行为。

## 本轮优化后的验收

本轮 92 项定向 tests 通过；非实施 reviewer 从完整实际 diff、35 份 TypeScript 全文及规范/owner 反查，
未发现实质问题。Core facts/selection、独立 summary 分类、Shell/collector 责任以及公开 cache 和 Plan 证据/授权阅读任务通过；
reviewer 在项目 Bun 1.3.14 下另跑 6 文件 13 tests，通过 Case 720 entities / 181 Cases 和 diff check。

最终完整 Gate 43/43，candidate `0.0.0-local.4756d2286a7c`，耗时 43.6s；日志位于
`.log/project-gate/2026-10-13T09-48-10.539Z-2486744-231fba4e-47af-4df6-a21a-76e529b46f46`。
既有 mean/P95 预算 warning 为 2.508s / 6.699s，未改阈值或 waiver。首轮材料测试遇到默认 5s 超时，
单独 3/3 复验及无并发完整重跑通过。reviewer 另遇 Bun 1.4.2 对象原型断言失败，项目 Bun 1.3.14 复验通过。

本 Change 的 Git 提交已获用户授权，本记录时尚未提交，由主线程执行；Plan 保留，不执行结项删除。


## Historical evidence handoff

2026-10-17 生命周期核对：本页已独立保存该轮输入条件、关键计数/样本、混合方向与未验证边界；
所述 `tmp/` 或旧 `.log/` 路径只保留历史来源意义，不是当前运行依赖、永久保留义务或仍可执行的复核入口。
一次性源码镜像、profile、草稿与工程日志不继续保存；本次未新增采样或产品验收。
