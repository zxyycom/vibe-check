---
title: 由 Check-owned execution options 驱动 Run
status: active
alignment: unaligned
createdAt: 2026-08-17T16:29:26Z
purpose: 让 Project Definition 中的普通 Check functions 和各自完整 options 驱动执行，而 Run Controls 只补充共享 invocation 输入。
background: executable Check 已拥有 execution 和依赖配置；Run dependency override 会复制配置 owner 并恢复隐式 binding。
decision: Run 执行 definition 中的 Check values；options 拥有执行依赖，Run Controls 只提供共享 invocation 输入。
tags:
  - configuration
relations:
  - type: 修订
    target: drive-run-from-project-definition-value.md
---

## 目的

- 让一个已导入的 Project Definition value 完整拥有 recursive Checks、每项 execution configuration、政策、调度和 effects。
- 让 Run Controls 只表达无法稳定写入 Check 或 Project Definition 的共享 invocation 信息。
- 避免 Run 按 Check 来源、身份或平行 dependency configuration 重建 execution behavior。

## 背景

- 项目运行脚本已经普通 import Project Definition，其中的 Check objects、options、functions 和 closures 已存在于调用方 Bun runtime。
- 当前模型中每个 execution-bearing Check 贡献一个独立 callback 和 Task；它不需要 TaskPlan factory、runtime registration 或第二套 binding collection。
- external executable 等 Check-specific dependencies 已属于对应 Check options。通过 Run Controls 或 Project-wide operational map 再次覆盖它们会产生两个 precedence owner。
- changed files、显式 comparison、signal 和 invocation effect overrides 只在特定 Run 中存在，仍适合作为 closed Run Controls。

## 决策

- 采用: Project Definition value 是产品执行语义的主要公开配置输入，拥有 policy catalog、recursive Check declarations、每个 Check 的完整 options、scheduler、effects 与 selected policy。
- 采用: Package Run 接受一个 Project Definition value 与一个 closed Run Controls object，在 work 前验证并展开 recursive Checks，并把每个 execution-bearing Check 投影为一个独立 Task。
- 采用: Run Controls 只表达 shared invocation input，例如 changed files、显式 comparison、signal 和受支持的 effect override；它不能注册 Check、改写 Check options、覆盖 external executable 或增加 execution variant。
- 采用: Run 将每个 Check 的 effective options 与共享 execution context 交给该 Check function；不按 `checkId`、来源或 object identity 构造另一份 runtime binding collection。
- 采用: 项目拥有的 Run script 绑定其 Project Definition，并决定向其他调用方暴露哪些 Run Controls；Product 不发现、选择、import 或重新 evaluate 配置 module。
- 不采用: Project-wide operational dependency map、Run Controls dependency override、TaskPlan factory、配置路径 discovery、旧 CLI command union，或用不同 run method 表达 gate。
