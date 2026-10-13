# Design

以首次 restore 的现有读取形成容量提醒，保持 cache 复用与链接结算相互独立。

## Context

cache 默认关闭；启用后由调用方管理 append-only JSONL 文件。已采用方向及修订理由见
[容量提醒 Decision](../../docs/decisions/warn-on-explicit-markdown-parse-cache-capacity.md)。
工作在当前 `main`，保留无关 fixture 改动。

## Goals / Non-Goals

调用方首次实际读到超阈值文件时取得一次清理提醒。提醒不引入额外 I/O、自动容量管理、存储重构或其它 Check 配置；
Findings、Records、data、status 和错误优先级保持原链接结算。依赖及无关优化不在范围内，Change 保留至另获结项删除授权。

## Decisions

### Intended Change

已确认：Markdown enabled cache branch 增加可省略的正安全整数 `warnAboveBytes`，默认 16 MiB；disabled branch 保持封闭。
首次 restore 成功 read 且未取消时，以已读 bytes 严格 `>` 阈值判断，并保存每 invocation 至多一条冻结 warning。

### Resulting Impacts

- session 保存 message，resolver 交给 execution，通过普通 Check messages 随成功或正常 unavailable 返回输出。
- 容量判断在 UTF-8 decode 前；成功读到超阈值的无效内容可提醒，decode failure 仍禁止 publication。
- missing/read failure、未实际 parse、source 非 UTF-8 或 read 返回时已取消不提醒；本次 append 跨阈值留待下次实际读取判断。
- 用户指南拥有配置、准确文件路径及自主清理行为；内部 owner 拥有恢复/写入不变量；Case 证明提醒与链接结果分离。

## Risks / Trade-offs

默认阈值是维护提醒，不是性能安全线或容量限制。延后到下一次实际 restore 才发现 append 跨阈值，
换取无额外扫描、stat 或读取；Product 不自动删除、停用缓存或中止检查。

## Open Questions

无阻断问题。

## 实施与验收依据

首次 Gate 暴露 restore 的复杂度问题后，session 按读取 I/O、容量 message 和内容恢复拆分职责。
取消 guard 紧跟 read 返回，提醒先于 decode，失败时 publication 安全与完整 JSONL line 恢复保持；按原质量门槛验收，未放宽限制或新增豁免。

2026-10-13 09:25 的实施验收包括独立 reviewer 的 Markdown 30 tests 与失败/取消 probes，以及 complete Gate 43/43，
candidate `0.0.0-local.2c3398cc0fc8`。组合 Case 检查为 720 entities / 181 Cases；既有 mean/P95 预算 warning
为 2.422s / 5.926s。该证据早于本轮代码和文档优化；最终快照验收见下文。

本轮文档优化按用户配置路径补充短例、分离公开行为与内部消息交接，并保留当前 Decision 的完整采用方向。

## 本轮优化后的验收

本轮 92 项定向 tests 通过；非实施 reviewer 从完整实际 diff、35 份 TypeScript 全文及规范/owner 反查，
未发现实质问题。公开 cache 配置与自主删除、内部消息/decode/publication、Scheduler 责任边界及 Plan 证据/授权阅读任务通过；
reviewer 在项目 Bun 1.3.14 下另跑 6 文件 13 tests，通过 Case 720 entities / 181 Cases 和 diff check。

最终完整 Gate 43/43，candidate `0.0.0-local.4756d2286a7c`，耗时 43.6s；日志位于
`.log/project-gate/2026-10-13T09-48-10.539Z-2486744-231fba4e-47af-4df6-a21a-76e529b46f46`。
既有 mean/P95 预算 warning 为 2.508s / 6.699s，未改阈值或 waiver。首轮材料测试遇到默认 5s 超时，
单独 3/3 复验及无并发完整重跑通过。reviewer 另遇 Bun 1.4.2 对象原型断言失败，项目 Bun 1.3.14 复验通过。

本 Change 的 Git 提交已获用户授权，本记录时尚未提交，由主线程执行；Plan 保留，不执行结项删除。
