---
title: 在 Check 语义外显式绑定外部程序
status: active
alignment: unaligned
createdAt: 2026-08-14T05:52:51Z
purpose: 允许过渡 runtime 使用外部程序，同时保持 built-in Check 配置与结果不受具体 scanner 塑形。
background: Package 形成阶段仍需 Python、scc 等实现；禁止具体 binding 会阻断 installed consumer，直接把工具字段写入 Check policy 又会形成短命产品语义。
decision: Configuration 显式绑定外部程序；Check policy 保持工具中立，Product 继续拥有能力、诊断和结果。
relations: []
---

## 目的
- 让 installed consumer 能确定性地提供过渡阶段所需的 Python、`scc` 等外部程序，而不把 scanner implementation identity、native flags 或输出格式变成 built-in Check 的产品语义。

## 背景
- Tool neutrality 的目标是稳定 built-in Check policy、metadata 和含义，不是隐藏开源实现，也不是禁止 runtime 使用或公开说明具体工具。
- 当前 repository 通过 mise、workspace dependencies 和 ambient development state 提供部分 scanner implementation；exact package consumer 不能依赖这些未声明前提。
- 外部 binding 是 `0.0.x` 形成阶段的过渡实现。后续能力可以逐步内化，但当前 package 不能通过静默缺失或缩减主要 built-in capability 来规避 dependency closure。
- 旧 tool-shaped config 的 command/args 与 scanner-native policy 已被 hard cut；新的 operational dependency binding 必须与 Check policy 字段拥有不同责任和 precedence。

## 决策
- 采用: Project Definition/configuration 可以在与 Check policy 分离的 closed operational dependency boundary 中显式提供受支持 external executable locations；该边界可以位于同一配置入口，不要求建立第二份配置文件。
- 采用: Built-in Check 的 policy fields、metadata、identity 和结果含义不按 `scc`、Lizard、jscpd 或其它 backend 的名称、native flags、exit code 或输出格式塑形；源码和文档可以如实说明实际 implementation。
- 采用: Product-owned dependency resolver 在任何 scanner work 前验证 binding、可执行性和必要版本，缺失或无效时返回 Product diagnostic；未配置 external prerequisite 不回退到 ambient `PATH` 中的同名程序。
- 采用: 具体程序只提供 implementation capability。Product 继续拥有 Check/Record identity、normalization、diagnostics、failure 和 result semantics，外部工具不能成为第二产品 contract owner。
- 采用: 当 implementation 内化后，可以在 `0.0.x` breaking release 中移除不再需要的 operational binding；semantic Check policy 不因 backend 更换而迁移。
- 不采用: 在 built-in Check policy 中公开 scanner-native thresholds/flags/commands，禁止或隐藏具体工具，或把 runtime discovery 留给 repository mise、workspace dependencies 或 ambient `PATH`。
