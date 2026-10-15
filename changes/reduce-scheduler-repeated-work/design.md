# Design

以最小局部数据结构调整减少重复计算，不引入第二套调度状态。

## Context

稳定事实由 docs/development/scheduler.md、docs/guides/scheduling.md、docs/guides/simulating-admission.md 拥有；HEAD b2926b14880da7546f39aba7c0e07424f65f3977，用户授权实施无新增产品取舍候选。

## Goals / Non-Goals

保持 Scheduler 精确行为、immutable forks 和错误优先级，减少 graph validation 与 Shell pending 的重复工作。
Analyzer、schema、cache 容量、timeout 和旧 learned 语义实验在本 Change 范围之外。

## Decisions

### Intended Change

采用 R04 的单 scope reachability 与 direct overlap Set，以及 Shell declaration-order pending Map。
R05 仅复用未变 active roots，R09 仅合并分类计数遍历；R06 completion race 保持。各项精确边界和理由见下文。

### Resulting Impacts

相邻测试保持当前 Case 身份并证明可观察结果，内部 Scheduler owner 承接成本边界。
辅助证据位于 `tmp/optimization-implementation-20261015/scheduler/`；组合验收使用同一 candidate。

## Risks / Trade-offs

集合与索引增加 invocation-local 内存，换取重复查询成本下降；保持原错误次序、stable comparator 首项及旧 state/fork 不变。复杂候选若无法以局部维护成本保证精确行为则不采用。

## Open Questions

无。采用边界和保留成本已按以下证据收敛。

## Implementation Observations

### 采用范围与保留成本

- R04：direct overlap 用 observation Set；multi-task scope 各做一次 terminal reachability，仍按声明顺序报告
  membership 首错；singleton scope 跳过遍历，各 scope 独立校验。
- Shell pending：declaration-order Map 按 ID 移除 payload，保留 pre-admission 输入、callback 错误优先级、
  forced effects 和 cancellation 顺序；Core 仍独占 membership。
- R05 部分采用：未变 active-root 数组复用，inactive terminal closure 不复制数组。真实 activation/active closure
  仍维护有序 roots，动态 blocked-prefix 在 occupancy 变化后重判。更激进索引需跨 mutex/resource/root/scope 的
  invalidation 状态，当前缺少代表收益证据，保留现有模型。
- R06 不采用 FIFO completion queue：running Map 顺序 B,A，A 先完成但下次 wait 前 B 也已 resolved 时，
  `Promise.race([B,A])` 取 B，FIFO 取 A。probe 已断言此反例；保留 race 及其 Σrunning 订阅输入成本。
- R09 部分采用：peak/interval 三类计数合为一次遍历，移除 filter 数组。逐 boundary pending classification 和逐 Task
  delay 累加仍在；保留原 interval 浮点加法次序、overflow 与 unavailable timing。lazy prefix 相减不能保证这些结果
  等价，新增 category interval state 也超出最小局部方案。

### 宽关系兼容性修正

独立审查发现 `pending.push(...relations)` 将合法宽关系列表变成函数参数，在 Node 24 触发参数数量上限，
而基线逐 member 早命中可接受同输入。改为按原顺序逐项 push，完整保留重复 occurrences，不新增规模限制。
同一 static-validation entity 以三 Task / 131072 条重复 dependsOn 验证该边界；Node 24.18.0 probe 修复前为
基线接受/候选 RangeError，修复后两者均接受。脚本与前后 JSON 在原临时目录 `wide-relations-node-*`。

### 操作量与测试

基线模块只改隔离 import 定位，同 Bun 1.4.2 执行，不计 timing：

| 输入 N | 基线 → 实施后 | 信号 |
| --- | --- | --- |
| sparse scope 16 / 128 | 137→33 / 8257→257 | taskById.get |
| disjoint depends/observes 各 16 / 128 | 288→48 / 16640→384 | observes indexed reads |
| reverse removals 16 / 128 | 152→16 / 8384→128 | array indexed visits / Map.get |
| peak category counts 16 / 128 | 48→16 / 384→128 | pending kind reads |
| interval counts+delay 16 / 128 | 64→32 / 512→256 | pending kind reads |

完整脚本/结果在 `tmp/optimization-implementation-20261015/scheduler/{operation-probe.ts,operation-results.json,overlap-results.jsonl}`。
操作量不是 wall-clock、retained heap 或整体 Scheduler 上界；Map 的 O(N) entries 替代原数组的 O(N) payload slots。
窄功能测试 69/69 通过，现有实体覆盖 scope lookup、active-root 复用、fractional measurement 与 pre-admission
取消顺序。Case Proves 在保持身份、实体和覆盖范围的前提下合并，quality-runtime 的 SCC 为 500 codeLines，
未改阈值或 waiver。

下述计时保存前轮实施后的采样观察，不是本轮表达整理后源码的逐字节复测。

公开性能对照出现 chain1024 变慢：Node median 299.997→404.548ms，Bun 682.645→816.860ms。
完整有利/不利组及采样条件见 `tmp/optimization-implementation-20261015/performance/`；未 profile 归因，
不据操作量下降推断全部调度形状加速。

### 既有实施验收（2026-10-15）

文档整理前的实施快照已通过 Product/scripts typecheck、lint、validate、format、diff check 和完整 Test Evidence
（732 entities / 181 Cases），并经非实施代理复核。候选 `0.0.0-local.bf3c39c46928` 的 required Gate 为
37 passed / 6 not-applicable，complete Gate 为 43/43 passed，包含包产物与外部 consumer 验收。
原始日志与集成边界见 `tmp/optimization-implementation-20261015/integration.md`；这些结果只证明当时输入，
后续改动须重新选择相应验证。本 Plan 保留，提交、发布与结项删除分别依当前任务授权。
