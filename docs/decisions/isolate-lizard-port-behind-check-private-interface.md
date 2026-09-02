---
title: 以私有接口隔离 Lizard source-aligned port
status: active
alignment: unaligned
createdAt: 2026-09-02T16:33:21Z
purpose: 让翻译的 Lizard port 可独立同步上游，并在唯一私有 port façade 外保持 Product Check 责任清晰。
background: 现有 analyzer 已完成 runtime hard cut，却仍有 Worker 与文件选择直接读取 port internals，混合了翻译和 Product 责任。
decision: Lizard port 仅由 Product adapter 经私有 port façade 调用，并以忠实翻译 profile 维护。
tags:
  - dependency-policy
  - product-contract
  - workflow-policy
relations: []
---

## 目的

让 Lizard 的 source-aligned TypeScript port 可以独立审阅、验证和在独立 Change 中同步上游，同时保持 functionMetrics 的 Product policy、资源安全与 Check 输出责任不进入翻译目录。

## 背景

翻译代码需要保留上游的状态机、命名、processor 顺序和 extension lifecycle；按普通 Product 模块的复杂度、重复或抽象偏好重构，会在没有 parity evidence 时造成行为偏离。多个 Product deep-import 路径同样会将翻译 internals 暴露为事实上的集成 API，增加同步和维护耦合。archived Change 是形成时历史，不能成为持续运行 source identity、oracle 或 deviation evidence 的唯一 owner。

## 决策

- 采用: `functionMetrics/analyzer/**` 是 Check-private 的 source-aligned port，不是 package public API、通用 parser/analyzer subsystem 或 plugin framework。port 只接受已提供的 source 并产生 Lizard-domain result；它不导入 Product types，也不拥有 input admission、filesystem、resource limits、Worker、cancellation、Check settlement、Record、Finding、waiver 或 final data。
- 采用: port root 内的 **port façade** 是唯一目录外 production entry，提供必要的 suffix capability 和 `{ filename, sourceCode }` in-memory analysis。port façade 使用私有 Lizard-domain DTO，不经 package root、public declarations 或 subpath export 公开。位于 port 外的 **Product adapter** 是 façade 的唯一 production consumer，负责 `FunctionMetric` mapping、unsupported input 与 Product error interpretation。target selection 和 Worker 只依赖 Product adapter，不保留 port-facing alias 或第二条 Product 调用路径。
- 采用: port-root fidelity/unit tests 可以深导同目录 internals。port 外的 Product tests 只能经 Product adapter，不得深导 core、registry、readers、extensions 或 façade；仅验证 façade boundary 的测试属于 port root。该政策由路径归属的 fail-closed static boundary validation 证明。
- 采用: profile 仅适用于直接翻译的 production files，可排除项目命名、函数/文件长度、complexity、duplicate detection 与为统一抽象而重构的压力。它同时约束 development lint、development format，以及 Project Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 对 product source 的 selection；这些路径必须采用同一已确认的 translated-only policy。它仍必须保留 TypeScript parse/type/build、运行时、Lizard oracle/parity、processor/extension lifecycle、source identity、deviation mapping、provenance/license 及 import/public-surface boundary 验证。手写 port façade、Product adapter、Worker、Check 与所有 tests 不继承 profile，继续遵守各自适用的普通项目检查。每项额外 format/lint/Gate selection 例外必须有最小路径/rule 范围、source-alignment 理由和 upstream-sync review trigger；整目录免检无效。
- 采用: 持续运行的 source identity、oracle 与 boundary evidence 必须由 current stable owner 维护，不依赖 archive。`licenses/**` 继续拥有 shipped legal inventory；evidence 与 legal inventory 的关系必须可追溯且不双写为竞争事实。每个上游 adoption 使用独立 Change；除非 port façade 的真实契约改变，上游同步不改变 Product adapter 以外的 Check 边界。
- 不采用: 不将翻译代码内嵌进 Worker、Check 或 Product metrics model；不让任意 Product 文件访问 port internals；不创建公共 parser/plugin API；不以一般代码风格理由改写未被 parity evidence 支持的翻译结构。
