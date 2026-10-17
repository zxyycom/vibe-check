---
title: 为显式 Markdown parse cache 增加非阻断容量提醒
id: 261013-warn-on-explicit-markdown-parse-cache-capacity
status: archived
alignment: aligned
createdAt: 2026-10-13T09:02:06Z
purpose: 让调用方发现过大的 Markdown parse cache 并自行清理，保留显式性能状态边界。
background: 单一 append-only JSONL 会增长；旧封闭配置不含提醒，而自动容量管理会扩大性能状态职责。
decision: 保留默认关闭、exact-content persistent cache 与成功 target memo，增加默认可配置的读取容量提醒。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: 260902-enable-explicit-markdown-link-parse-cache
    summary: 保留显式性能缓存边界，增加专属容量提醒
---

## 目的

- 保留显式、默认关闭的 exact-content persistent cache 与 invocation-local successful target memo，让调用方控制本地性能状态。
- 让持续增长的 cache 可被发现，容量与清理仍由调用方管理；每次 Check 继续拥有当前授权、Findings、Records、work limits 和 settlement。

## 背景

- 前序采用封闭配置 `{ enabled: true, directory }`，并把目录容量与删除交给调用方。增加 `warnAboveBytes` 和容量 message 是对该采用边界的真实修订。
- 持久材料是单一 append-only `markdown-link-parse-facts-v1.jsonl`，增长对象是文件 bytes。首次需要 parse facts 时已有整文件读取，利用已读 bytes 可以提供默认、可配置的提醒，无需新增 I/O 或容量管理机制。
- 默认 16 MiB 是保守维护提醒，不是测得的性能安全线、配额或输入上限。提醒用于帮助调用方自行决定清理时点，不承担自动清理或存储重构。
- persistent + memo 的采用依据来自可复现的 synthetic corpus；用户报告的上千文件私有 workload 不能复现。历史组合实现含现已移除的 8 路 source read-ahead，严格串行实现的临时复测未通过原 cold `<=5%` gate。因此二者均不能证明本次提醒或当前 runtime 通过性能验收；原始样本、环境和门槛见[历史性能调查](../../investigations/measure-markdown-link-serial-cache-overhead.md)。
- Markdown resolver 每次重新完成 local destination、containment、endpoint 与 anchor semantics；公开 `targetReadCount` 统计 logical endpoint occurrence，而非 physical read。source-derived raw destination、heading slug 和 ranges 可能落盘；cache 只提供性能复用，不提供机密性或防篡改保护。

## 决策

- 采用: `markdownLinkValidation` 保留 **persistent + memo**。省略 cache 或显式关闭时使用封闭 `{ enabled: false }`，不访问 cache filesystem；成功 target memo 仅在单次 invocation 内复用，不重放 whole Check settlement。
- 采用: Markdown 专属 enabled branch 为 `{ enabled: true, directory, warnAboveBytes? }`。directory 是非空、无 U+0000 的 host-absolute caller-owned path；阈值是可省略的正安全整数，默认 `16_777_216` bytes。此配置保持 Check-local，不扩展 generic cache 或其它 Check。
- 采用: 首次实际 restore 成功读取 cache 文件且 read 返回时未取消，已读 bytes 严格超过阈值才产生每 invocation 至多一次的非阻断 Check warning。它沿普通 messages 给出大小、阈值、准确可删除路径及删除后重新解析的说明。只消费已有读取；append 本次跨阈值要等下一 invocation 实际读取后才提醒。
- 采用: 容量 warning 与失败退化、链接结算分离，不增加 Finding、Record、final data 或计数，不改变 finding policy、terminal status、取消或错误优先级。已产生提醒随正常 unavailable 返回保留；missing/read-failed cache 不提醒。成功读到超阈值的无效内容可依据 bytes 提醒，invalid payload/decode failure 本身不是触发器；decode failure 仍停止 publication。
- 采用: 调用方继续信任、自主管理和删除 local performance state。Product 不自动清理、停用 cache 或中止 Check，不提供 quota、TTL/LRU、remote sharing 或 default global directory，也不提供 confidentiality、secret protection 或 tamper resistance。consumer docs 说明 source-derived material 可能落盘。
- 采用: persistent identity 绑定 exact authorized bytes 的 content digest、Link parser contract 与 payload version；payload 只保存 strict Link-private parse facts。路径、filesystem probe、target state、options、Findings、Records、messages、duration 和 outcome 留在当前 invocation；content/parser/payload change 不能命中旧 facts。
- 采用: miss、invalid/hostile payload 和 read/write failure 使用 current bytes fresh-parse，publication 保持 best-effort；除独立容量提醒外，cache 退化不改变输出或 settlement。hit 只替换 parse computation，授权、endpoint validation 和 Finding/Record formation 每次执行；提醒不增加跨进程协调或持久性保证。
- 采用: 同一 invocation 按 authorized canonical Markdown target 共享成功 read/decode/parsed-heading snapshot。每个 logical endpoint occurrence 独立消耗 `maxTargetReads` 并计入 `targetReadCount`，各 anchor 分别形成 resolution；后续 target 变化不更新本次成功 snapshot，失败不进入 memo。
- 采用: 此方向限定于 Markdown authorized performance state；Run、通用 cache manager、public Markdown model 和 machine telemetry 不承接它的容量或生命周期责任。
