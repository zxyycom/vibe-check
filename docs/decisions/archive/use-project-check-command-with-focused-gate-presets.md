---
title: 用 check 命令和闭合 preset 运行 Project Gate
status: archived
alignment: aligned
createdAt: 2026-09-04T04:36:20Z
purpose: 让日常 Gate 通过短命令和少量高频 preset 形成可读、可组合且依赖闭合的项目选择。
background: 本 Decision 建立前，旧入口名称冗长，profile 与正反 tag 控制分散且没有直接使用 Product 的原生 flag settlement。
decision: 采用唯一 check 根命令、required 默认、显式 all 和少量闭合 preset，并由组合配置引用各 owner 的 Check 对象。
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让维护者用 `bun run check` 进入唯一 Project Gate，并用少量高频开关快速运行类型、lint、routine tests、文档或 repository quality assurance。
- 让中央配置呈现完整 Gate 组合、选择与运行级策略，同时允许具体 Check 由其领域 owner 以普通对象或闭合对象组定义。
- 在 Product 尚未拥有 flag 依赖传递能力时，以项目内闭合 preset 保证 selection、依赖和 aggregate 一致，不把临时通用选择 DSL 引入 Gate。

## 背景

- 本 Decision 建立前，package scripts 同时公开 `verify:vibe-check-workspace`、`:required` 与 `:full`，但无参数和 `:required` 等价；profile 的实际差异主要是 package acceptance，仍叠加 enable/disable tag grammar。
- Gate 已拥有一个中央 Definition，但 flag catalog、selection、aggregate 和 output binding 分布在 runtime modules；另一方面，完整 quality options 和 test lane descriptors 全部展开在 Definition，又使组合入口过长。
- Product 的 `enabledByFlags` 能在 author work 前统一结算未选择 Check，但不会自动选择 `dependsOn` 闭包。当前项目可以为有限 preset 显式维护闭包；通用传递能力由形成时的 Draft Change [`propagate-flag-selection-through-check-dependencies`](../../../changes/archive/propagate-flag-selection-through-check-dependencies/proposal.md) 评估，该 Draft 不授权本轮实施 Product API。
- exact candidate preparation、candidate-bound package import、完整 release evidence 和显式 all-status aggregate 已有独立 owner，命令与选择整理不能绕过这些边界。

## 决策

- 采用: `check` 是 Project Gate 唯一根命令，并继续由该 script 通过 `mise exec` 进入锁定工具环境；`scripts/project/gate/run.ts` 保持唯一 process entry，内部仍使用 Project Gate 领域名称。两个 Codex environment 配置同步调用 `bun run check`；旧 `verify:vibe-check-workspace`、`:required` 与 `:full` 删除，文档、验证指引和调用方不得再使用旧名。
- 采用: `bun run check` 默认选择日常 required assurance。显式 `--typecheck`、`--lint`、`--test`、`--docs` 与 `--quality` 选择对应闭合 preset；多个 preset 取并集并替换默认集。`--test` 不隐式选择高成本 package artifact 或 external-consumer acceptance。
- 采用: `--all` 独占其它 selection preset，选择完整 Gate，并承接调整前的完整运行调用语义；formal release receipt 只接受 `--all`。不从 CI、host 或其它 ambient state 推断选择。
- 采用: 每个 preset 显式覆盖其 Check 及所需 `dependsOn`；本 Gate 还保守要求 `observes` 目标属于同一 selection，以保持观察输入可用，但这不表示 future Product propagation 自动选择 `observes`。同一项目投影同时形成 Product 原生 `enabledByFlags` 和 explicit aggregate Check IDs。未选择 Check 保留 `not-applicable / flag-condition-not-matched` 事实，已选择 Check 自身返回的 `not-applicable` 仍使 aggregate failed。
- 采用: 中央 Gate Definition 是组合 manifest，可以引用由 checks owner 定义的普通 Check 对象或对象组；领域 options、scanner protocol、文件分区和执行 mechanics 不为追求物理单文件而复制到 manifest。完整成员、选择、跨 owner 覆盖、scheduler、outputs、aggregate 与唯一 `afterGate` 仍可从该组合入口恢复并由测试闭合。
- 采用: 本轮不提供任意 `--check`、任意 tag、负向 exclude、package-only preset 或通用依赖传播。新增 preset 只在出现稳定高频消费者并能闭合依赖与 aggregate 后逐项评估；Product 级 flag 传递由独立 Change 承接。
