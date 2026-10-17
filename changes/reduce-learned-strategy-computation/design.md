# Design

以最小局部数据结构调整减少重复计算，不引入第二套调度状态。

## Context

稳定事实由 docs/development/package-tools.md、docs/guides/learned-scheduling.md、docs/guides/scheduling.md 拥有；HEAD b2926b14880da7546f39aba7c0e07424f65f3977，用户授权实施无新增产品取舍候选。

## Goals / Non-Goals

保持 learned/static fallback 的 proposal、observation 与公开可调用函数形状，减少候选计算。
Analyzer、schema、cache 容量、timeout 和旧 learned 语义实验在本 Change 范围之外。

## Decisions

### Intended Change

T02 采用原 comparator 线性取首；fallback 按 prepare 复用 immutable graph 索引和 activation Sets，每次 decision
单次分类 layer。公开 factory 继续返回 function prepare/decide；其 full context 成本保留，理由见下文。

### Resulting Impacts

相邻测试保持当前 Case 身份并证明可观察结果，内部 package-tools owner 承接成本边界。
辅助证据位于 `tmp/optimization-implementation-20261015/scheduler/`；组合验收使用同一 candidate。

## Risks / Trade-offs

集合与索引增加 invocation-local 内存，换取重复查询成本下降；保持原错误次序、stable comparator 首项及旧 state/fork 不变。复杂候选若无法以局部维护成本保证精确行为则不采用。

## Open Questions

无。采用边界和保留成本已按以下证据收敛。

## Implementation Observations

### 采用范围与保留成本

- T02：每次 preparation 建 graph maps/activation Sets，decision 按原 comparator 线性取稳定最小项。
  tightening→continuation→ordinary、priority/score/ID tie、canAdmit 和 wait 保持；learned 首选不可准入时不以同层其它候选回填。
- minimum contextNeeds 未采用：`LearnedCriticalPathStrategy` 的具体返回类型及公开 scheduling 指南保证 prepare/decide
  可调用。改为 descriptor 会破坏该保证；function 属性也不是现有需求声明协议。helper 继续经普通公开接线消费
  full context，Core 的完整 context/measurement 成本仍在。
- graph/prediction 完整构建、bounded history、recording 和 observer 语义保持；retention 不扩容，旧 learned 实验不进入本 Change。

### 操作量与测试

与 Scheduler Change 共用隔离基线/probe（Bun 1.4.2），脚本为
`tmp/optimization-implementation-20261015/scheduler/operation-probe.ts`。下表只计操作量：

| 输入 N | 基线 → 实施后 | 信号 |
| --- | --- | --- |
| multi-task activation 16 / 128 | 136→16 / 8256→128 | activation indexed reads，含索引建立 |
| N 次 fallback 16 / 128 | 16→1 / 128→1 | graph task-table reads，每次枚举 N tasks |
| 同 comparator minimum 16 / 128 | 44→15 / 731→127 | comparator calls |

activation Sets 需要 O(A) preparation 内存，selection 比较为 O(C)。公开 Run 多为 singleton scope，activation 轴
通常很小，不能把合法 multi-task simulation 的收益推广到所有 Run。

Scheduler 与 learned 窄测试 69/69 通过；strategy 实体覆盖 fallback 索引复用、N−1 次比较、稳定首项、fallback
canAdmit 优先和 learned wait。相邻 `strategy.test-support.ts` 承接 graph/Task/context builders，断言和 entity keys
保留在原测试。SCC 测试/support 为 255/86 codeLines；最窄 strategy/Run 集成 7/7 通过。早先局部直调 oxlint
无法取得 Node builtin 类型，未为消警改规则；最终统一 product lint 通过。日志见原临时目录的 `*-size-refactor*`。

### 有限计时与不利结果

下述计时保存前轮实施后的采样观察，不是本轮表达整理后源码的逐字节复测。

Node independent1024 median 为 1879.500→1040.340ms，chain1024 为 299.997→404.548ms；Bun 对应
4083.290→3007.559ms 和 682.645→816.860ms。不利组保留，未 profile 归因；索引/比较次数收益不等于所有
形状耗时改善。原始样本和采样条件位于 `tmp/optimization-implementation-20261015/performance/`。

### 既有实施验收（2026-10-15）

文档整理前的实施快照已通过 Product/scripts typecheck、lint、validate、format、diff check 和完整 Test Evidence
（732 entities / 181 Cases），并经非实施代理复核。候选 `0.0.0-local.bf3c39c46928` 的 required Gate 为
37 passed / 6 not-applicable，complete Gate 为 43/43 passed，包含包产物与外部 consumer 验收。
原始日志与集成边界见 `tmp/optimization-implementation-20261015/integration.md`；这些结果只证明当时输入，
后续改动须重新选择相应验证。本 Plan 保留，提交、发布与结项删除分别依当前任务授权。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](../reduce-scheduler-repeated-work/evidence/historical-operation-evidence.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
完整公开 API 普查、80-group同输入比较与不利样本由[独立调查报告](../../docs/investigations/survey-product-api-performance-and-tradeoffs.md)长期承接；原
`tmp/optimization-implementation-20261015/performance/` 及其间接指向的旧 performance 目录均不再是复核前提。
