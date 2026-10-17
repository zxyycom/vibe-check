# Design

以提前拒绝和本次 traversal 的可回滚集合兑现声明处理成本边界。

## Context

`docs/development/project-definition.md#recursive-check-tree` 拥有 executable 身份、继承和 immutable 输出。原 authoring 在 children 后才创建 fields；resolution 每层复制 filter/sort collection。原 Run 由 TaskGraph 拒绝 duplicate executable ID，而 standalone validator 接受它。用户已明确接受仅该无效输入分支提前变为配置错误，正式取舍见 `docs/decisions/reject-duplicate-executable-checks-before-expansion.md`。

## Goals / Non-Goals

降低共享无效树和合法深继承成本。非目标：Analyzer、Scheduler、缓存容量、合法树上限、schema、输出和 timeout；不扩展 container ID 唯一性约束。

## Decisions

### Intended Change

已实施 active-object Set 检测循环、executable ID Set 检测重复，在 children 前检查。重复 executable 的公开 Run 分支为 `configuration / invalid-project-definition`，path 仍 `definition.checks`、reason `invalid-value`。同对象和不同对象重复适用同一规则。

三类 scheduling collections 使用原生 Set 与作用域 undo，只有 executable 消费才排序冻结，并复用未改变的快照。exact 替换集合引用，inherit 只访问本次 remove/add 并记录实际变化；没有变化不分配恢复回调。所有退出路径用 finally 恢复父集合和快照。

### Resulting Impacts

合法输出、排序、exact/remove-then-add、兄弟隔离与 immutable snapshot 不变。非循环共享 container 保留每次 occurrence 的 warning 和 path；不把共享整体判错。无效循环不依赖栈耗尽。公开 API 和内部 owner 同步失败分类及范围；新增声明行为测试归入既有 Definition Case，操作量检查随对应行为维护。

## Risks / Trade-offs

引入 undo 逻辑和每次 edit 的局部记录以换取深树成本下降，直接覆盖 sibling/exact/remove-add 重叠。所有 executable 都输出完整 effective arrays 的成本不能去掉；递归深度和 path bytes 本轮不声称解决。container-only 共享图可能必须产生多次 warnings，其输出义务不被优化静默丢掉。未以计时宣称完整 Run 加速。

## Open Questions

无。重复 executable 的错误类别提前已确认；其余边界保持原分类。

## Implementation Observations

### 操作量证据

`tmp/optimization-implementation-20261015/definition/operation-counts.ts` 将基线原源码与实现对照；
辅助副本只改 import 定位，共用合法值 parser，不构成旧版本完整 Run benchmark。

| 输入 | 基线 → 实施后 | 信号 |
| --- | --- | --- |
| C04 共享声明深度 3 / 5 / 7 / 9 | 15/63/255/1023 → 5/7/9/11 | ownKeys 次数 |
| C06 单 executable 深度 16 / 32 / 64 / 128 | 120/496/2016/8128 → 0 | filter visits |
| 同一 C06 输入 | 136/528/2080/8256 → 16/32/64/128 | sorted elements |

公开 Run 测试另以深度 3/8/16 断言配置错误和 callback 零调用；继承单测覆盖深度 256、exact、重叠编辑、
兄弟恢复与冻结结果。操作量只证明这些处理路径，不证明 wall-time、heap 或任意深树的完整 Run 成本。

### 测试组织与验收

继承 fixture 和有恢复保障的排序计数观测位于相邻 `project-definition.scheduling-inheritance.test-support.ts`；
断言、test names 和 entity keys 保留在原测试。既有文件规模门槛发现原测试 335 codeLines，提取后 SCC 为
测试 276、support 74，未改 runtime、阈值或 Case 目的。两目标文件 13/13 tests、局部 lint/format 与完整
Test Evidence 通过；扩大目标批次 54/54（21 files）通过。Decision
`261015-reject-duplicate-executable-checks-before-expansion` 已按完整方向核对并标记 aligned。

### 既有实施验收（2026-10-15）

文档整理前的实施快照已通过 Product/scripts typecheck、lint、validate、format、diff check 和完整 Test Evidence
（732 entities / 181 Cases），并经非实施代理复核。候选 `0.0.0-local.bf3c39c46928` 的 required Gate 为
37 passed / 6 not-applicable，complete Gate 为 43/43 passed，包含包产物与外部 consumer 验收。
原始日志与集成边界见 `tmp/optimization-implementation-20261015/integration.md`；这些结果只证明当时输入，
后续改动须重新选择相应验证。本 Plan 保留，提交、发布与结项删除分别依当前任务授权。

## Historical evidence handoff

2026-10-17 补存：[本切面历史验收材料](../reduce-project-file-matching-work/evidence/historical-operation-evidence.json)承接仍需复核的样本、方法、身份与边界。
本页其余 `tmp/`、旧 `.log/` 路径仅标注形成时现场，不再承诺保留、读取或执行；历史 source digest 不等于
可重建当时全部未提交源码。源码镜像、fixture、生成 IO、完整 profile 与一次性工具退出，未重新采样或运行 Gate。
这些材料只解释本 Change 的形成时验收，不是永久 benchmark 或可重跑 SDK。
完整公开 API 普查、80-group同输入比较与不利样本由[独立调查报告](../../docs/investigations/survey-product-api-performance-and-tradeoffs.md)长期承接；原
`tmp/optimization-implementation-20261015/performance/` 及其间接指向的旧 performance 目录均不再是复核前提。
