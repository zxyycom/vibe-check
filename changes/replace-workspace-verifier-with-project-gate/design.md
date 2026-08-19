# Design

本 Design 只处理 repository Gate 的正式切换与旧 verifier 退役；功能建设、public Run interaction 和 package candidate 分别由前置 Change 负责。

## Context

[build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 已应提供 <code>gate-readiness-handoff.md</code>：候选 package identity、必要类别映射、profile/tag/N/A semantics、固定 capacity、renderer/log/exit behavior，以及 exact-tarball 与对照证据。[establish-npm-package-candidate-and-quality-dogfood](../establish-npm-package-candidate-and-quality-dogfood/) 仍是 artifact/dogfood owner；若上游 public package contract 已变化，cutover 前必须刷新其证据。

当前 workspace verifier 是独立 scripts-only implementation，且其命令、CI/workflow、文档或开发者脚本可能有多处引用。本 Change 的风险在于正确切换每个权威入口并删除旧 implementation，而不重新解释每个 Check 的功能结果。

## Goals / Non-Goals

### Goals

- 审阅 readiness handoff，确认必要类别、exact package evidence、partial controls、progress/output 和 exit behavior 已可作为正式 gate 使用。
- 将仓库标准验证入口、CI/workflow 与文档切换到同一个 Project Gate implementation；保留的 alias 仅作转发。
- 精确删除旧 workspace verifier implementation、重复脚本和失效说明，保留清晰的 VCS rollback 边界。
- 用新的唯一入口重复 required/full 或已定义的正式 acceptance，并写出 <code>gate-handoff.md</code> 给 release Change。

### Non-Goals

- 不新增或重写 Check callback、类别映射、Process adapter、profile/tag grammar、observer/renderer、scheduler capacity 或 package build。
- 不更改 invocation controls、lifecycle feedback、timestamp/duration policy、Product CLI 或 public package exports。
- 不访问 npm registry、凭据或执行 npm publish；也不以 cutover 补偿 readiness evidence 的缺口。

## Decisions

### 1. Readiness evidence 是切换的硬前置

没有完成且与当前 candidate 相匹配的 readiness handoff，就不更改正式入口或删除 verifier。若发现类别缺失、artifact drift、tag/N/A policy 未决或 renderer/exit 行为不可靠，工作返回 Gate-build Change，而非在 cutover 中临时实现。

### 2. 只保留一个权威 implementation

正式 command、CI 和文档均指向 Project Gate。为减少迁移摩擦而保留旧命令名时，它必须是无行为差异的薄转发，不能继续维护第二套 command tree、profile selection 或 result interpretation。

### 3. 删除必须可核对且可回退

先定位旧 verifier 的定义、scripts、package commands、CI/workflow、文档和测试引用；切换后的最窄验证通过后再删除精确目标。回退是恢复该 Change 的 source/entry references，不是让新旧实现长期并行成为两个门禁真相。

### 4. Cutover handoff 是公开发布的唯一 gate evidence

<code>gate-handoff.md</code> 记录实际入口、候选 identity、覆盖类别、控制语义、固定 capacity、output/exit/log evidence、刻意未继承项、删除清单与重新验证条件。[publish-public-api-only-npm-package](../publish-public-api-only-npm-package/) 只能消费它，不得把 registry publish 当作补齐仓库迁移的手段。

## Risks / Trade-offs

- **隐藏调用者：** 未发现的 package script、CI 或文档引用会留下双入口；需要 repo-wide reference audit。
- **artifact 过期：** cutover 时 package/public interaction 已变更会使 readiness evidence 失效；应回到 candidate/gate-build 刷新。
- **删除过早：** 不完整 category mapping 会失去已知门禁；删除前必须有切换后 acceptance。
- **兼容 alias 漂移：** alias 若自行解析参数或生成结果，会重新长成旧 verifier；只允许薄转发。

## Open Questions

- 最终唯一 root command 的名称，以及哪些旧命令名需要短期转发；Plan 时应以实际 CI/开发者入口决定。
- 哪些 formal profiles 必须在 cutover acceptance 中执行，及 CI 对 disabled tags 的明确拒绝/允许策略；必须直接消费 readiness evidence。
