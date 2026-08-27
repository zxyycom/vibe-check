---
title: 让高成本 package lifecycle Gate 测试显式启用
status: archived
alignment: aligned
createdAt: 2026-08-26T16:55:30Z
purpose: 让默认 required Gate 保持快速必须 assurance，同时由 full 或显式 tag opt-in 承担高成本物理 package 验收。
background: 物理 artifact、candidate 与外部 consumer tests 占完整测试执行约八成时间，并具有独立的发布和 package lifecycle 风险边界。
decision: required 默认不执行三项 package lifecycle Checks，显式 tag 加入；full 自动执行全部。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: default-project-gate-to-required-profile.md
---

## 目的

- 让默认与 `:required` Gate 执行日常必须的 Product、scripts 和测试实体闭合，而不隐式承担每次物理 package build/install/external-consumer 验收。
- 让需要 package assurance 的本地调用方可以显式加入三个独立 acceptance Checks，并让 `:full` 继续表示当前全部 Checks。
- 让被排除的高成本测试保持可见、可解释且不进入该次 aggregate，而不是在 Test Evidence 内静默跳过。

## 背景

- 当前 required 与 full 暂时拥有同一 membership；既有决策允许在出现真实独立非必须 assurance 时建立 full-only 差异。
- package lifecycle tests 会重复执行 TypeScript emit、pack、tar audit、物理依赖安装、外部 consumer typecheck 和 integrated Run；它们证明的发布边界独立于日常 Product 与 ordinary scripts tests。
- Project Gate 已有 project-local tags 和 `--disable-tag` partial invocation，但没有表达“required 默认不选择、显式 opt-in 后选择”的控制。
- 正式 `:full` root 不传 tag overrides，必须继续选择 catalog 中的全部 Checks；本地 partial invocation 仍可显式 disable tag。

## 决策

- 采用: Project Gate 增加受控 opt-in tag grammar；`--enable-tag package-tests` 在 required profile 中选择 package artifact、candidate lifecycle 与 external consumer acceptance Checks。presence 表示启用，不接受布尔值、环境变量或隐式 host/CI 推断。
- 采用: 三个 package lifecycle Checks 同时属于 `tests` 与 `package-tests` tags，并在 required 与 full profiles 中分别保留稳定 Check identity。required 未 enable 时各自以 `tag-not-enabled` 结算为不可适用并排除出 aggregate。
- 采用: 三个 package lifecycle Checks 各自保留 terminal fact 与 process transcript，并共享一个 named mutex 以串行使用高成本 build/install 资源；mutex 不把它们重新合并成一个 Check。
- 采用: full profile 自动选择所有未被本地 `--disable-tag` 排除的 Checks，不要求重复传 `--enable-tag package-tests`；正式 `:full` root 因而继续表达当前全部 assurance。
- 采用: 同一次 invocation 不允许同时 enable 和 disable 同一 tag。输入重复值被规范化，未知 tag 或冲突选择在任何 candidate/Gate execution 前失败。
- 采用: 按稳定 owner 分区的 Product/scripts tests 和完整 Test Evidence entity closure 保持 required；package lifecycle entities 仍进入完整 Case mapping，即使该次 required invocation 没有执行它们的 behavior Checks。
- 采用: package 发布、完整 package acceptance 或明确要求全部 assurance 的流程运行 full；默认 required 的通过不声称完成物理 package lifecycle 验收。
- 不采用: 让 required 继续无条件执行高成本 package Checks、让 full 也依赖 opt-in tag、从 ambient CI 自动开启、隐藏 excluded Checks、把三个责任合并成一个 terminal fact，或把 package entities 从 Test Evidence surface 移除。
