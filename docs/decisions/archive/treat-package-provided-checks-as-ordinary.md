---
title: 将随包提供的 Check 保持为普通 Check
status: archived
alignment: aligned
createdAt: 2026-08-26T02:26:57Z
purpose: 让 package-provided Check 只通过普通 Check contract 构建，并让每项 scanner、options 与领域模型由唯一 producing Check 拥有。
background: 目录拆分后仍有 Definition ID registry、集中 scanner adapters 和跨 metric 容器，使随包 Check 获得 core 特权。
decision: Core 只理解普通 Check grammar 和 opaque options；随包 Check 自己拥有 validation、execution、adapter、model 与文档。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 Product core、随包提供的 Check 与项目自定义 Check 使用同一个 authoring/execution contract，不因 Check 的来源形成第二条运行路径。
- 让源码目录能从 producing owner 恢复 scanner、options、measurement、analysis、Records 与 tests，避免集中容器隐藏实际变化原因。
- 保留真正跨 Check 的底层不变量，同时拒绝仅因“多个消费者”就建立 shared domain owner。

## 背景

- Vibe Check 的产品基础是 ordinary Check、递归 Definition、Run、scheduler 与 Core facts；package-provided Checks 是在这套基础上构造并从根入口导出的普通 values。
- 第一轮目录整理移除了 `checks/builtins`，但 Definition 仍按 package Check ID 解释 options，scanner 仍按 tool category 集中，metric measurement/analysis 仍横跨多个 producing Checks。
- jscpd、scc 与 Lizard 的 command、parser、failure 和 measurement shape 彼此不同，且分别只有 duplicate、file 与 function Check 消费；集中 adapter interface 没有独立变化原因。
- project-root 文件 collection 与 exact-path membership 不解释某个 Check 的 finding，因此可以形成独立机制；code-area policy、tool parser 与 measurement model 则仍属于使用它的 Check。

## 决策

- 采用：Definition validation 只关闭 ordinary recursive Check grammar、scheduling、effects 与 canonical opaque JSON options；它不得导入 package-provided Check、识别其 ID，或按其 option shape 分支。
- 采用：每项 package-provided Check 在普通 execution entry 验证自己的完整 options，并以普通 four-state result 结算；invalid options 是 owning Check 的 `unavailable` / `invalid-options`，不是 core configuration taxonomy。
- 采用：每项 package-provided Check 的 execution、option type/validation、finding/measurement model、Record conversion、tool adapter 与 tests 位于该 Check 的 owner 内。jscpd 属于 duplicate detection，scc 属于 file metrics，Lizard 属于 function metrics。
- 采用：随包提供只是分发与文档身份，不授权 private Core hook、hidden context field、registry、backend map、subpath API 或不同于 custom Check 的 settlement contract。
- 采用：底层 process、CSV、error、project-file collection 与 exact-path membership 只有在不含某个 Check 的领域判断、拥有独立不变量和多个真实 consumers 时才可独立共享；共享 mechanism 不拥有调用方 policy。
- 采用：每项随包 Check 在 package 内有独立、可直接阅读的 consumer guide，说明完整初始 options、参数、工作原理、效果、four-state 边界与安全约束；declarations 的 LSP 信息不替代这些指南。
- 采用：首次稳定发布前直接移除旧 package-specific Definition 字段、集中 adapter 容器和兼容 alias，不保留两套 authoring contract。
- 不采用：Definition-owned package Check validator registry、集中 scanner adapter protocol、跨 Check metric model/analysis、以 `builtins` 表达 core privilege，或仅为了减少重复把 owner-local command/parser/failure 合并。
