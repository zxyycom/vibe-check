---
title: 观察与门禁都使用项目持有的 Project Definition
status: active
alignment: unaligned
createdAt: 2026-08-14T08:18:33Z
purpose: 让项目运行脚本始终绑定一个明确配置，同时让门禁只使用其中已验证的政策。
background: 项目同时持有配置文件和运行脚本；无配置发现与 Product 文件生成不再属于运行模型。
decision: 每次项目运行都传入使用者持有的 Project Definition；观察可采用中性配置，gate 必须选择其中的 named policy。
tags:
  - configuration
relations:
  - type: 修订
    target: use-neutral-observation-and-project-definition-gates.md
---

## 目的

- 让 non-blocking observation 和 blocking gate 都从项目运行脚本显式绑定的配置值恢复行为。
- 确保 gate 使用项目明确持有、可提交且在执行前通过验证的完整政策，同时避免 Product 与项目共同管理配置文件。

## 背景

- 项目运行脚本用普通 import 获得 Project Definition，因此 Product 不需要在“未发现配置”时选择另一套执行路径。
- Product-owned neutral behavior 仍适合作为 observation 的配置起点，但应由项目配置明确采用，而不是在缺失 definition 时静默代替项目 owner。
- 配置文件与运行脚本都由项目持有；Product 创建、发现或绕过其中任一项都会增加第二套 ownership 和 precedence。

## 决策

- 采用: 每次 Package Run invocation 都接收一个已由项目运行脚本绑定的 Project Definition value；缺失、无效或未通过验证的 definition 在任何 Check work 前返回 typed invalid-input/configuration result。
- 采用: Non-blocking observation 可以使用配置定义函数提供的 Product-neutral authoring defaults，但最终仍形成并传入一个明确 Project Definition value；Product 不在缺失配置时静默合成另一份运行定义。
- 采用: 任一 gate 在 work 前要求传入 definition 成功 normalization 和 validation，并显式选择其中 resolved named `DecisionPolicy`；Product 不从环境、history 或 neutral defaults 推断缺失的阻断政策。
- 采用: 使用者自行创建、提交并持有 Project Definition 与项目运行脚本。Product 提供配置定义函数、Package Run、必要 types、canonical examples 与 actionable legacy diagnostics。
- 不采用: Product `init`、bootstrap、scaffold、create-file、template/resource、固定配置发现或绕过 project-owned definition 的执行模式。
