---
title: 将空 information Check warning 保持为 Run facts
status: active
alignment: aligned
createdAt: 2026-08-21T16:10:24Z
purpose: 让合法空 information Check 的非阻断 warning 只作为所有 RunResult 分支的结构化事实，而不恢复 Product warning presentation。
background: 空 Check warning 已由 Definition normalization 形成；Product 使用明确 outputs。
decision: 空 Check warning 通过 definitionWarnings；Product 不恢复 logs 或 warning renderer。
tags:
  - configuration
relations:
  - type: 修订
    target: allow-empty-information-checks-with-warning.md
---

## 目的

- 保持递归 Check authoring 可以在渐进配置、对象组合或临时占位中使用没有 execution 或 children 的合法 information Check。
- 让该节点的无意义 warning 在每个 RunResult 分支中可结构化读取，而不把 warning 变成 Check/Record fact、隐式质量结论或 Product presentation contract。

## 背景

- `execution` 缺失且 `checks` 缺失或为空的节点不产生 executable Check、Task、outcome、Record 或 aggregate；Definition normalization 已为它形成 non-blocking warning。
- Package Run 在配置、planning、cancelled、execution、output 与 completed result 分支都保留 `definitionWarnings`，使调用方不需要依赖终端文本恢复该事实。
- Product outputs 只有 machine publication 与 progress rendering。progress 只使用 Run-owned Check lifecycle、duration 和受控 reason code，不是 generic definition-warning renderer；项目自己的 Gate transcript 也不构成 Product logs output。

## 决策

- 采用：空 information Check 继续是合法 Definition input，且不产生 runtime fact；normalization warning 不改变该节点合法性，也不伪造成 Check outcome、Record 或 aggregate。
- 采用：所有 RunResult 分支通过结构化 `definitionWarnings` 暴露完整 normalized warning collection；阻断 Definition validation 失败时该 collection 为 `[]`。
- 采用：Product 不恢复 logs output、warning renderer、warning-specific output channel 或从 warning 推导 Check terminal status。progress 只负责 Check lifecycle presentation。
- 采用：项目 consumer 如需处理 warning，显式读取 structured `definitionWarnings` 并在自己的 invocation、Gate 或 presentation boundary 决定后续行为。
- 不采用：因空节点拒绝整个 Definition、静默把它视为 executable work，或由 Product 日志/文本 fallback 代替 structured Run facts。
