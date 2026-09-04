---
title: 将 Foundation 纳入普通 workspace assurance
status: active
alignment: aligned
createdAt: 2026-08-23T16:30:22Z
purpose: 让原 Foundation 迁入主仓后的存活能力由普通项目检查和专门测试证明，不再恢复子仓库时期的独立 Gate identities。
background: 形成此 Decision 时 Foundation 已是主仓 scripts source；独立 package gates 只重复 workspace source 与 test coverage。
decision: 保留存活能力的 repository ownership，取消历史 package 形态产生的独立 Gate 义务，并把真实不变量交给现有 owner 或专门测试。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: vendor-foundation-as-repository-owned-script-tool.md
---

## 目的

- 让原 Foundation 迁入主仓后的存活能力作为 `scripts/**` 的普通实现组成，由同一 workspace typecheck、lint、format 与 Test Evidence 证明。
- 删除只因 Foundation 曾是独立子仓库或 workspace package 而存在的 Gate identities、重复执行和迁移期 package acceptance。
- 让这些能力的真实独有不变量进入相应 owner 或专门测试，而不是以 package wrapper 可运行代替行为证据。

## 背景

- 形成此 Decision 时，Foundation 已从 Git submodule/vendor 输入迁入主仓，源码位于当时的 `scripts/tools/foundation/**`，不再依赖独立 upstream checkout 或子仓库历史。
- 形成此 Decision 时，root scripts typecheck 与 lint 已覆盖 Foundation TypeScript，workspace format targets 已覆盖 Foundation 当时的 manifest/config/source/tests，Test Evidence 已运行 Foundation test files。
- 形成此 Decision 时，当时的完整 Gate 仍分别运行 Foundation typecheck、lint、format 和 tests。除独立 tsconfig 与 package command wiring 外，这些工作重复现有 assurance；package wrapper 本身没有已确认的独立消费者结果。
- 独立 tsconfig、process helper 或其它仍有价值的约束可以由 owner config、import boundary 或专门测试证明，不需要维持四个 Gate identities。

## 决策

- 采用: 原 Foundation 的存活能力继续是 repository-owned source，并保持产品源码不得反向导入 scripts tooling 的既有边界。
- 采用: 这些 source 由 ordinary workspace scripts typecheck/lint/format 覆盖，相关 tests 由完整 Test Evidence surface 覆盖；这些是当前质量事实 owner。
- 采用: 删除 `toolkit-foundation-typecheck`、`toolkit-foundation-lint`、`toolkit-foundation-format-check` 和 `toolkit-foundation-tests` 四个 Project Gate identities。
- 采用: Foundation 独立 tsconfig、manifest scripts或其它局部入口只有存在真实 caller或独有不变量时才保留；保留项由针对性测试或对应 owner验证，不自动成为独立 Project Gate Check。
- 采用: Caller audit 证明零独立消费者的 package wrappers、配置或文档可以按普通代码维护流程删除；是否删除具体文件由实施 Change依据当前调用关系决定。
- 不采用: 仅为验证 historical package command wiring重复执行已经由 workspace/Test Evidence证明的同一 source或test事实。
