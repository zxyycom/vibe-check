---
title: 将工具中立约束限定于内置检查配置
status: active
alignment: unaligned
createdAt: 2026-08-05T10:31:36Z
purpose: 隔离内置 scanner 实现细节，同时允许项目自定义 Check 自己选择执行方式。
background: 全局禁止 executable 或工具信息会阻断 TypeScript custom runner，而内置检查仍需要稳定的产品语义配置。
decision: 内置检查政策保持 scanner-tool 中立；项目自定义 runner 是明确可执行边界，可自行调用函数、库或命令。
relations:
  - type: 修订
    target: configuration/keep-public-config-tool-neutral.md
---

## 目的
- 让内置检查替换 scanner 或 dependency 时不要求项目迁移其产品政策。
- 让项目自定义 Check 能直接复用现有函数、库和命令，而不把这些实现细节误当成 Product-owned scanner 配置。

## 背景
- `lizard`、`scc`、`jscpd` 等具体 backend 仍是内置检查的私有依赖，暴露其 command/args 会破坏产品语义边界。
- Project Definition 中的 custom runner 本身就是项目拥有的可执行实现；禁止它使用工具等同于取消动态 Check 能力。
- 内置依赖配置和项目自定义代码具有不同 owner、稳定性与信任边界。

## 决策
- 采用: Product-owned built-in Check 的 public policy、metadata、starter 和文档只表达稳定产品语义；scanner identity、command/args、安装和平台解析继续由内部 dependency boundary 拥有。
- 采用: Project-owned custom runner 是显式可执行扩展点，可以自行调用 TypeScript 函数、库、Bun API 或子进程；这些选择由项目代码拥有，不由 Core 解释为内置 scanner override。
- 采用: Core 只消费 custom runner 通过稳定 Check/Record ports 提交的结果，不建立通用 command string、exit-code mapping 或 backend object 作为必需公共契约。
- 不采用: 用 tool-neutral 原则禁止 Project Definition 贡献 executable runner，或允许 custom runner 覆盖同名内置检查的私有 dependency binding。
