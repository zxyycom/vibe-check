---
title: 将 Project change flags 统一为 effective flags
id: 260914-unify-project-change-flags-as-effective-flags
status: active
alignment: aligned
createdAt: 2026-09-14T14:36:47Z
purpose: 以字符串 AST 和同一 effective flags 统一 change preparation、选择与 callback
background: 旧 condition 分层、caller-only context 与单值 Git kind 增加无能力收益的契约
decision: change token 只在注入和保护时特殊，之后作为普通 effective flag 使用
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: 260909-prepare-project-change-flags-before-selection
    summary: 统一 AST、effective flags 与 Git source
---

## 目的

- 让 flag condition 的公开类型、builder output、Definition snapshot、fingerprint 与 evaluator input 使用同一递归结构。
- 让 change-derived token 只在产生和 namespace protection 时特殊，注入后与 caller token 共享 selection 和 callback 语义。
- 删除没有独立表达能力且尚未进入公开 release tag 的旧 shorthand，避免长期双 grammar。
- 保留 Project preparation 在 selection 前派生 change flags 的主体方向，同时用实际 Git acquisition 契约取代单值 source discriminator。

## 背景

- 已实现的 builder 生成带字符串 child 的 operator node，但 Definition 随后把字符串包装为 `{ kind: "flag" }`，导致 builder output 不是正式 AST，并额外暴露 `CheckFlagConditionInput` 与 normalized `CheckFlagCondition` 两层类型。
- `{ flags, mode }` 的四种 mode 已分别由 `all`、`any`、`none` 与 `notAll` 完整表达；保留它只增加 normalization、类型、文档和测试分支。
- change preparation 已把 derived tokens 与 caller flags 合并用于 effective selection，但 callback `project.flags` 仍只投影 caller input。这让同一个 token 在 selection 后继续携带不必要的来源差异。
- Change flag 的真实特殊性是由 Product 内置注入且使用 caller 不可伪造的保留前缀；predicate 仍只检查字符串 presence，change evidence 也已有独立 `project.changes` owner。
- `ProjectChangeSource.kind` 只有 `"git"` 一个值且 runtime 没有 source dispatch；`compareWith` 实际直接作为 Git revision 用于 `<revision>...HEAD`，已经能承接 branch、hash、relative revision 与 tag。

## 决策

- 采用: `CheckFlagCondition` 使用非空字符串作为唯一 leaf，并只保留 `all`、`any`、`none`、`not-all`、`exactly-one` 与 unary `not` operator node。删除 `{ kind: "flag" }` 与 `CheckFlagConditionInput`；builder 直接返回该正式 AST，Definition 只复制、验证、冻结并保留 child 顺序与 multiplicity。
- 采用: `enabledByFlags` 只接受 `{ when, propagateDependsOn? }`。删除 `{ flags, mode }` shorthand 与 `CheckFlagEnablementMode`；Run Controls 的 caller `flags` 和 Project changes 的 region `flags` mapping 不受此删除影响。
- 采用: change preparation 在 selection 前形成唯一 canonical `effectiveFlags = callerFlags ∪ derivedFlags`。同一冻结集合同时驱动 predicate evaluation，并作为 `project.flags` 传给 `prepare` 与 `execute`；callback 不获得 caller-only 第二集合。
- 采用: AST parser 与 evaluator 不识别 change flag 类型。Controls owner 拒绝 caller 提供受保护前缀；Definition 的 project-change reference check 确认受保护 token 有同一 Definition 声明的 producer；Git preparation 负责正常或 unavailable conservative injection。
- 采用: `project.changes` 继续独立提供可信 files 或 unavailable reason，只解释 derived token 的 evidence，不改变 token 注入后的普通 flag 语义。
- 采用: `ProjectDefinition.changes` 继续由根配置一次 Git comparison 和 change flag regions。`source` 收敛为 `{ compareWith }`，删除没有分派行为的 `kind: "git"`；Git 解析 branch/ref、commit hash、`HEAD~N` 等 relative revision 与 tag，Definition 只拒绝 empty、leading-dash、U+0000 和 unknown fields。
- 采用: Product 在完整 input/graph validation 后、effective selection 和 Scheduler admission 前至多准备一次 change snapshot。committed `<revision>...HEAD`、staged、unstaged、untracked、rename 与 deletion paths 继续参与 project-root-relative region matching；嵌套 root、exclude-first glob、一个 path 命中多个 flags 和 shared data-boundary matcher 保持不变。
- 采用: Git/repository/revision/path evidence 不可用时，`project.changes` 返回 reason 而不伪造 files，并将全部 declared change tokens 注入 effective flags；可信零命中返回空 files 且不注入 derived token。`prepare` 与 `execute` 读取同一冻结 context。
- 采用: change context 不自动进入 machine、diagnostic、cache 或跨 Run state。Project Gate 的 product-runtime lane 继续作为真实 consumer，以 region completeness、unchanged、changed、unavailable 与显式 force workloads 验证固定 preparation 和选择结果。
