---
title: 让 Project Gate 以默认聚合委托有效选择
id: 260915-delegate-project-gate-direct-presets-to-effective-selection
status: active
alignment: aligned
createdAt: 2026-09-15T10:33:17Z
purpose: 让 Gate 保持 direct preset intent 与 Product 依赖选择的统一，同时使用 Product 默认严格聚合。
background: Gate 已不再传入 effective selector 或 all policy；这些已由 Product 的默认有效列表折叠取代。
decision: 保留 Gate direct presets 和 dependsOn propagation，省略 aggregation controls 并消费 Product 默认严格结果。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: 260904-delegate-project-gate-selection-to-product-effective-selection
    summary: 以 Product 默认聚合替换 Gate policy
---

## 目的

- 让维护者从一个 central Gate manifest 恢复 command、direct preset membership、scheduler、outputs、默认 aggregate 和唯一 afterGate，而不在 Gate 层复制 Product 的 `dependsOn` closure 或聚合 policy。
- 让 required、focused 与 `--all` 的 caller intent、依赖启动和调用级结论继续建立在同一次 Product effective selection 上。
- 保持 Gate 的命令、preset、candidate、`observes` 可读性、报告与 process-exit 边界，不把它变成另一套选择或聚合实现。

## 背景

- 前序 Decision 已让 `enabledByFlags.propagateDependsOn: true` 把 matching direct root 的 normalized `dependsOn` prerequisite 加入 private effective selection，并让 Gate 停止手工维护 prerequisite closure 和 aggregate IDs。
- Product 现在对 complete settlement 从该 effective selection 直接执行严格默认折叠；Gate 已移除 `checkAggregation.checks: "effective"`、`mode: "all"` 与 empty/unavailable/not-applicable policy。旧记录中把这些 controls 作为 Gate adopted behavior 的部分不再准确。
- `observes` 只等待终态而非 prerequisite，仍需 Gate 维持有限 selection closure 以保证 observer readback；这不是 Product propagation 的一部分。

## 决策

- 采用: `bun run check` 继续是唯一 Project Gate root；无参数运行 required，`--typecheck`、`--lint`、`--test`、`--docs` 与 `--quality` 选择各自 direct focused preset，`--all` 独占其它 preset 并选择完整 Gate。preset 只表达 direct consumer intent，不手工补齐 `dependsOn` closure。
- 采用: central manifest 为 Gate Check 投影 native `enabledByFlags`，以 literal `propagateDependsOn: true` 委托 Product 启动 matching downstream Check 的 normalized `dependsOn` prerequisite。dependency predicate 未命中仍按 Product ordinary lifecycle 运行；Gate 不建立 graph resolver、selection DSL 或 propagation algorithm。
- 采用: bound Gate Run 不传 `checkAggregation`，直接消费 Product 从同一 private effective selection 形成的默认严格 aggregate：只有非空且所有有效 Check `passed` 才为 `passed`，空选择或任一其它终态为 `failed`。Gate adapter 不遍历 snapshot、Findings、Records 或日志重算 status；它继续将正常 aggregate 与 Run Promise rejection 映射为报告和 process exit。
- 采用: Gate 继续校验 `dependsOn` 与 `observes` 的 exact collection、self relation 和 missing target；仅为 `observes` 保留 required/preset selection closure，以确保 observer readback 可用。Product 不传播 `observes`，且此 Gate-local 可读性要求不扩张为 Product selection policy。
- 采用: central Definition 继续是 composition manifest，可引用各 owner 的普通 Check 对象或闭合对象组；领域 options、scanner protocol、test partition 与 execution mechanics 仍由领域 owner 负责。owner 自带 `enabledByFlags` 继续被拒绝，防止 Gate projection 静默覆盖条件。
- 不采用: 在每个 preset 手工复制 `dependsOn` 或 aggregate IDs、恢复显式 aggregation selector/policy、自动选择 `observes`、以 Gate 私有代码替代 Product effective selection，或开放任意 `--check`、任意 tag、negative exclusion、package-only preset。
