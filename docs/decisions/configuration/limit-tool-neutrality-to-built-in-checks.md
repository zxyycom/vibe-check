---
title: 将工具中立约束限定于 Product-provided Check 配置
status: archived
alignment: unaligned
createdAt: 2026-08-05T10:31:36Z
purpose: 隔离 Product-provided scanner 实现细节，同时允许项目 Check binding 自主选择执行方式。
background: 全局禁止 executable 或工具信息会阻断项目 Check binding，而 Product 提供的默认 implementation 仍需要稳定产品语义。
decision: Product-provided Check policy 保持 scanner-tool 中立；项目 binding 可自行调用函数、库或命令。
relations:
  - type: 修订
    target: configuration/keep-public-config-tool-neutral.md
---

## 目的
- 让 Product-provided Check 替换 scanner 或 dependency 时不要求项目迁移其产品政策。
- 让项目提供的 Check binding 能直接复用现有函数、库和命令，而不把这些实现细节误当成 Product-owned scanner 配置。

## 背景
- `lizard`、`scc`、`jscpd` 等具体 backend 仍是 Product-provided Check 的私有依赖，暴露其 command/args 会破坏产品语义边界。
- Project Definition 中项目提供的 Check binding 本身就是项目拥有的可执行实现；禁止它使用工具等同于取消项目 Check 能力。
- Product 默认 implementation 与项目提供代码具有不同 owner、稳定性与信任边界，但不因此成为不同 Check type 或 binding protocol。

## 决策
- 采用: Product-provided Check 的 public policy、metadata、starter 和文档只表达稳定产品语义；scanner identity、command/args、安装和平台解析继续由内部 dependency boundary 拥有。
- 采用: 项目提供的 Check binding 是同一 construction/binding handoff 中的显式可执行实现，可以自行调用 TypeScript 函数、库、Bun API 或子进程；这些选择由项目代码拥有，不由 Core 解释为 Product 默认 implementation override。
- 采用: Core 只消费任一 Check binding 通过稳定 Check/Record ports 提交的结果，不建立通用 command string、exit-code mapping 或 backend object 作为必需公共契约。
- 不采用: 用 tool-neutral 原则禁止 Project Definition 贡献 executable binding，或让任一 Check 覆盖另一个 Check 已经随其 value 进入共同 handoff 的私有 implementation。
