---
title: 公开发布前处置已知仓库质量 Findings
status: active
alignment: unaligned
createdAt: 2026-08-30T04:05:36Z
purpose: 防止 Project Gate 的暂时 non-blocking repository-quality Checks 被误解为公开 package 已具备质量发布条件。
background: 用户原始运行的初始快照为 27 file、129 function 与 2 Markdown link findings；数量可变，公开发布前必须处置届时全部已知 findings。
decision: 在公开发布前处置并复验这些已知 findings；Gate policy上的 non-blocking 仅维持开发期观察，不构成 release waiver。
tags:
  - product-contract
  - product-priority
relations: []
---

## 目的

- 让公开 `@zxyycom/vibe-check` package 的 release readiness 不会把“Gate 可用且 quality finding 非阻断”误读成“已接受已知质量债务”。
- 将用户原始运行的 27 file-metrics、129 function-metrics、2 Markdown link findings 作为形成时初始快照，并要求公开发布前处置与复验届时全部已知 findings。
- 保持当前开发期 Gate 对 quality finding 的 non-blocking 观察能力，同时不削弱既有 candidate、consumer、registry 与外部写入授权条件。

## 背景

- 形成时可复核的两次 Gate 快照分别为 27 file-metrics、129 function-metrics、2 Markdown link findings，以及 28、134、2。它们都是特定 invocation 的证据快照，只用于追溯数量与身份变化，不是稳定 policy 的配额，也不证明任何 finding 已解决。
- 当前 Project Gate 使用 producing-Check non-blocking policy 与 all eligible aggregation；这可以使可信 finding 所属 Check passed，却不是对 public release 风险的自动接受。
- `require-complete-project-gate-evidence-before-public-release.md` 规定公开发布前需要完整 Gate 的真实消费者证据；`publish-user-scoped-vibe-check-publicly.md` 仍要求发布前重新核验 registry authority、authentication、目标 version 与外部写入授权。当前稳定 owner 尚未把初始、最终或发布时任一已知 finding 的 remediation evidence 记为已满足的 current fact。
- 因而本记录只能作为 active/unaligned future direction：只有处置标准、稳定 release owner 和独立实际证据均已完成，才可审阅对齐；它不授予 publish 或任何外部写入授权。

## 决策

- 采用: 在首次公开发布前，处置并复验届时真实 repository Gate 中全部已知的 file-metrics、function-metrics 与 Markdown link findings；形成时初始快照及后续 Gate evidence 只用于追溯数量/身份变化，实际处置可以是修复、经明确授权且有可审计理由的 policy/baseline 变更，或其他经独立 Decision 确认的路径，但不能是无证据的忽略。
- 采用: release readiness 必须保存能区分真实 repository Gate 运行、产生 Check status/final data/Records 与 release candidate/consumer evidence 的验证材料；isolated fixture 或 non-blocking warning 不能单独证明此条件。
- 采用: 只有稳定 release owner 已承接每类 finding 的处置标准，并由对应完整 Gate/candidate verification 证明届时全部已知 finding 已按该标准处置，本记录才可审阅对齐；在此之前保持 unaligned。
- 采用: 开发期 Gate 的 non-blocking `findingPolicy` 只表达 producing Check 目前不阻断日常 Gate 的状态政策，不构成 public-release waiver，也不改变 scanner/source/parse unavailable 的阻断处理。
- 不采用: 以 aggregate exclusion、passed warning、删除链接检查、仅修复其中一类 finding、仅运行 fixture、或未获授权的 release exception 来宣称可公开发布。
