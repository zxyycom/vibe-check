---
title: 让 Check options 拥有执行依赖
status: active
alignment: aligned
createdAt: 2026-08-17T16:29:25Z
purpose: 让每个普通 Check 通过自己的 options 持有外部程序等执行配置，并由自己的 execution 负责使用。
background: 分离的 operational binding 会让 Run 按 Check 来源或身份重建实现，而普通 Check 已能通过完整 options 表达并原生覆盖自身配置。
decision: Check options 拥有 Check-specific execution dependencies；Run 只传 effective options，不维护来源专属 binding。
tags:
  - configuration
relations:
  - type: 替代
    target: bind-external-programs-outside-check-semantics.md
  - type: 替代
    target: limit-tool-neutrality-to-built-in-checks.md
  - type: 修订
    target: hard-cut-legacy-tool-shaped-config.md
---

## 目的

- 让一个 Check 的普通对象完整表达它自己的参数、外部程序和其它 Check-specific execution configuration。
- 让 Product 默认 Check 与项目 Check 使用同一种 options、execution 和 native object composition 规则。
- 让 Run 只提供共享 invocation context，不根据 Check 来源、`checkId` 或 exported value identity 重建隐藏 implementation binding。

## 背景

- Check 已经是包含 `options` 与 `execution` 的普通对象；execution 会读取项目通过 object spread 得到的当前 effective options。
- `scc` executable 等外部因素直接决定某个 Check 怎样执行以及为何可能 unavailable，属于该 Check 自己需要理解的配置。
- 把这些字段放在单独的 Project operational dependency map 或 Run Controls override 中，会让一个 Check 的实际行为分散在第二个配置 owner，并迫使 Run 按来源或身份重新 join implementation。
- 旧 top-level `tools`、`scc`、`lizard`、`jscpd` config 仍是另一套已经退出的配置 grammar；允许 Check-owned options 不表示恢复旧 reader 或旧 precedence。

## 决策

- 采用: 每个 Check 的完整 typed `options` 拥有该 Check-specific execution configuration，包括 execution 所需的 external executable reference 和相邻实现参数；这些字段的名称、默认值和验证由该 Check 的 options contract 拥有。
- 采用: Product 默认 Check values 提供完整 options。项目作者通过普通 object spread、nested spread 和属性覆盖选择 executable 或其它实现配置，Definition 与 execution 消费同一个最终 Check value。
- 采用: Run 把当前 effective options 直接交给该 Check 的 execution。Run 不维护平行 operational dependency map，不通过 Run Controls 覆盖 Check-owned settings，也不按 `BuiltInCheck`、来源、`checkId` 或 object identity 查找特殊 runtime binding。
- 采用: project root、changed files、flags、signal、显式 aggregation 和 outputs 等真正 invocation-wide 输入继续由各自的 Run/context owner 提供；它们不因某个 Check 使用外部程序而复制进 Check-specific dependency registry。
- 采用: Check 因 executable 缺失、外部环境或其它自身执行条件无法工作时，可以返回带原因的 `unavailable` result；Core 只消费稳定 result 与 Record ports，不解释 executable、args 或 backend output。
- 采用: 新 runtime 继续在 work 前拒绝旧 top-level tool-shaped config，不读取或执行旧 command/args，也不保留 compatibility reader。迁移目标是对应普通 Check 的 options，而不是另一个 operational binding boundary。
- 不采用: Product 默认 Check 强制 tool-neutral options、Project-wide operational dependency map、Run Controls dependency override、按 Check 来源恢复 binding、ambient hidden state，或把旧 tool-shaped document 当作新 options 输入。
