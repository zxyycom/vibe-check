---
title: 让 Project Gate 委托 Product 处理依赖选择
status: active
alignment: aligned
createdAt: 2026-09-04T09:21:35Z
purpose: 让 Gate 的 preset 只表达 direct intent，并由 Product 统一补齐已 opt-in 的 dependsOn prerequisite。
background: Gate 曾为每个 preset 手工维护依赖闭包和 aggregate IDs，现已具备同源 Product effective selection。
decision: Gate 继续拥有命令、preset 与 observes 可读性，但用 authoring propagation 和 effective aggregation 委托 dependsOn 选择。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: use-project-check-command-with-focused-gate-presets.md
---

## 目的

- 让维护者从一个 central Gate manifest 看见 command、direct preset membership、scheduler、outputs、aggregate 和唯一 afterGate，而不再在 Gate 层重复 Product 已拥有的 `dependsOn` closure 或 aggregate-ID projection。
- 让日常 required、focused preset 与 `--all` 继续提供稳定、可读且可组合的 direct selection，同时让 downstream Check 的 prerequisite 与调用级结论来自同一次 Product selection。

## 背景

- `check` 根命令、required 默认、focused preset、exact candidate、bound Run、afterGate 与 process exit 是 Project Gate 的长期边界，不能因 Product selection 能力而迁移到 package runtime。
- 原有 Product flag control 只直接选择 predicate-matching Check；为保持 downstream `dependsOn` 可运行，Gate 曾对 required 与每个 preset 手工校验依赖闭包，并从同一 metadata 复制 aggregate IDs。这使 caller intent、依赖启动与 aggregation 可能随维护遗漏漂移。
- Product 现已在 validated static graph 上提供 `enabledByFlags.propagateDependsOn: true` 和 `checkAggregation.checks: "effective"`：matching opt-in root 的完整 `dependsOn` closure 与 direct flag selection 形成一次 private effective selection；`observes` 不被传播。

## 决策

- 采用: `bun run check` 继续是唯一 Project Gate 根命令；无参数仍运行 required，`--typecheck`、`--lint`、`--test`、`--docs` 与 `--quality` 继续选择各自 direct focused preset，`--all` 独占其它 preset 并选择完整 Gate。preset 只表达 direct consumer intent，不手工补齐 `dependsOn` closure。
- 采用: central entry manifest 为每个 Gate Check 投影 native `enabledByFlags`，并以 literal `propagateDependsOn: true` 委托 Product 启动 matching downstream Check 的 normalized `dependsOn` prerequisite。dependency 自身 predicate 未命中时仍按 Product ordinary lifecycle 运行；不因 Gate 建立另一套 graph resolver、selection DSL 或 propagation algorithm。
- 采用: Gate 使用显式 `checkAggregation.checks: "effective"` 与既有 `mode: "all"`、unavailable/not-applicable/empty policies 形成调用级结论。Product 以同一次 private effective selection 提供 aggregate membership；Gate adapter 继续只读取 package-produced aggregate，不遍历 snapshot、Findings、Records 或日志重算 status。
- 采用: Gate 继续校验 `dependsOn` 与 `observes` 的 exact collection、self relation 和 missing target；只为 `observes` 保留 required/preset selection closure，以确保 observer readback 可用。Product 不传播 `observes`；该 Gate-local 可读性要求不扩张为 Product selection policy。
- 采用: central Definition 继续是 composition manifest，可以引用各 owner 的普通 Check 对象或闭合对象组；领域 options、scanner protocol、test partition 与 execution mechanics 仍留在领域 owner。owner 自带 `enabledByFlags` 继续被拒绝，防止 Gate projection 静默覆盖其条件。
- 不采用: 在每个 preset 手工复制 `dependsOn` 或 aggregate IDs、自动选择 `observes`、将 flags 当作权限、以 Gate 私有代码替代 Product effective selection，或开放任意 `--check`、任意 tag、negative exclusion、package-only preset。
