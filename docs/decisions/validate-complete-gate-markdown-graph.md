---
title: 以完整引用图验收 Gate 文档并关闭总量预算
id: 261017-validate-complete-gate-markdown-graph
status: active
alignment: aligned
createdAt: 2026-10-17T09:42:28Z
purpose: 让仓库完整文档验收随引用增长继续执行而不缩小范围。
background: 固定目标总量预算已成为完整文档增长的限制，图式复用降低重复引用成本。
decision: Gate 保留显式解析缓存、完整范围与阻断策略，关闭两项总量预算。
tags:
  - configuration
  - markdown-link-validation
  - performance
  - project-gate
  - workflow-policy
relations:
  - type: 修订
    target: 261014-enable-gate-markdown-parse-cache
    summary: 保留完整文档与解析缓存并关闭总量预算
---

## 目的

- 让 Project Gate 在完整文档范围内持续验收增长的本地引用，同时复用解析事实。

## 背景

- 前序为 Gate 显式启用 caller-owned parse cache，保留有限 work limits。引用增长使固定总量预算成为完整验收的阻碍；缩小 corpus 会隐藏真实链接问题。
- Product 图观察将重复节点工作与逻辑引用计数分离，并提供显式关闭总量预算。关闭不是进程资源隔离，仍需字节边界与协作取消。

### 形成时采用证据

- 2026-10-17 对冻结的真实文档 corpus（361 源、2,343 occurrences、1,939 计费引用）完成关闭/空/hit 三态各五对 Node 独立进程对照；耗时中位数分别为 3,648.8 → 3,023.6 ms、3,373.5 → 3,042.7 ms、1,116.7 → 835.8 ms。每轮目标/源 lstat 为 9,081 → 5,961，正文 open 为 402 → 364；未缩小 corpus 或改变 logical counts。这只描述冻结输入，不把固定文件数变成 Gate selection 规则。
- 最终同 candidate 完整 Gate 43/43 通过，包含隔离 external-consumer types/docs/runtime。既有 mean/p95 性能 warning 仍如实保留，不修改阈值或 warning-only policy；RSS 可能增加，采用依据是完整、安全验收与规模收益，不是保证每次 Gate 都更快或更省内存。

## 决策

下文 warning-only 验收及保留既有性能政策描述本轮形成时边界；后续[版本化性能策略决策](version-gate-performance-policy.md)已承接性能阻断，现行预算从[Gate owner](../tooling/project-gate.md#性能预算与-check-耗时分布)读取。
本记录保留完整 corpus、显式解析缓存与关闭两项总量预算的方向，不以原 warning 表述限定后续性能政策。

- 采用: Project Gate 保留原 files selection、完整 corpus 与 blocking finding policy，显式将 maxOccurrences 和 maxTargetReads 设为 false；不提高 Product 默认值，不改变单文件 Markdown bytes 限制。
- 采用: Gate 继续仅显式启用现有 parse-facts cache，目录为 .cache/vibe-check/markdown-link-parse-facts/；公共默认关闭，冷启动与命中分别验收。
- 采用: 每 invocation 读取当前源 bytes，校验 exact-content identity，按本次引用图完成目标授权与独立链接/anchor 判断；同节点的首次观察固定，source facts 可复用，不以缓存重放 settlement。
- 采用: 目录由本地维护者管理和删除，沿用默认 16 MiB 非阻断容量提醒；source-derived 链接、标题及位置可能落盘，不提供机密性或防篡改保证。不自动清理、不远端共享、不缓存成功结果，不引入依赖。
- 采用: 完整功能、安全和节点操作量是硬门禁，同输入独立 Node 进程的配对耗时/RSS 为取舍证据；保留 Gate 既有性能预算和 warning policy，不增加未经测量阈值。
