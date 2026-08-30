---
title: 聚合 Project Gate 的全部 eligible Check statuses
status: active
alignment: aligned
createdAt: 2026-08-30T04:05:34Z
purpose: 让 Project Gate 的调用级结论只由同次 selection 的全部 eligible Check terminal statuses 通过显式 all policy 形成。
background: 旧 Gate 以 quality entry 排除 raw failed；用户确认非阻断应由 producing Check policy 表达。
decision: 以 all 聚合全部 eligible statuses；非阻断由 producing Check policy 形成，Records/messages/findings 不参与。
tags:
  - configuration
  - workflow-policy
relations:
  - type: 修订
    target: observe-repository-quality-checks-inside-project-gate.md
---

## 目的

- 让 required、full 与 local partial Project Gate 从同一 eligibility projection 得到唯一、可解释的调用级结论。
- 让 Gate 保留每项 Check 的四态 terminal facts，同时不从 findings、messages、Records、presentation 或 log 文本创建第二 aggregate。
- 将“某 finding 非阻断”的责任放在拥有该领域含义的 producing Check，而不是 Gate entry 的隐藏例外。

## 背景

- `observe-repository-quality-checks-inside-project-gate.md` 记录的已实现基线让四项 repository-quality observations 直接运行并保留 raw facts，却以 entry metadata 排除 assurance aggregate。用户现已明确纠正该选择：raw failed + aggregate exclusion 不是期望的长期模型。
- package Run 已有显式 aggregation，且稳定 owner 已规定 aggregation 是 invocation-level fact，只读取 selected settled Check statuses，不读取 Record data、messages、definition warning、output 或 presentation。
- 当前 repository-quality findings 可在 producing Check 的 non-blocking `findingPolicy` 下形成 passed Check 与完整事实；scanner/source/parse unavailable 不是 finding，必须继续是 ordinary unavailable 并由 aggregate policy处理。
- 本记录的完整方向已成为当前 Gate implementation fact；前序记录保存已实现 aggregate-exclusion 基线的 aligned 历史。

## 决策

- 采用: Project Gate 对每次 required、full 或 local partial selection 的完整 eligible Check ID set 显式配置 `checkAggregation.mode = "all"`；同一 projection 同时服务 Gate definition、controls、aggregate 解释与 adapter exit mapping。
- 采用: Gate aggregate 只消费每个 eligible Check 的 settled terminal status，并沿用 explicit all policy对 passed、failed、unavailable、not-applicable 与 empty selection 的处理；任何 eligible failed 或 unavailable 不得因质量标签、entry metadata 或 Record 内容而被 Gate 忽略。
- 采用: repository-quality finding 是否阻断仅由 producing Check 的公开/closed `findingPolicy` 决定。non-blocking finding 由该 Check 返回 passed、完整 final data/Records 与 actionable warning；blocking finding 由该 Check 返回 failed。Gate 不改写这些 outcomes。
- 采用: scanner、source、parse 或其他 Check-owned不可用继续结算为 `unavailable`，不降级成 non-blocking finding/warning，并由 all aggregate 的普通 policy影响调用级结论。
- 不采用: quality-specific aggregate exclusion、从 findings/messages/Records 重算 status、nested quality Run、quality-only aggregate/report、将 Gate warning 当作 producing Check policy，或为了保持 aggregate passed 而伪造 raw status。
