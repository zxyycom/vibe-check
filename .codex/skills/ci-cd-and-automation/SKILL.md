---
name: ci-cd-and-automation
description: >-
  设计、修改或调试 CI validation、quality gates、workflow automation、job ordering、
  matrix strategy、dependency automation、release automation 和 CI failure triage。
---

# CI/CD 与自动化

## 目标

让自动化对应它声称验证的 contract。每个 job、script、matrix entry 和 required check 都要能回答：它验证哪个 surface，失败时如何本地复现，成功时证明了什么。

自动化不是把所有命令塞进 CI；它是把正确的检查放在正确的阶段，用最小成本阻止真实 merge/release 风险。

## 读取策略

默认只读本文件。需要为 CLI/API、library、schema/example、docs、package/release 或 workspace-level contract 设计验证图时，读 [validation-automation.md](references/validation-automation.md)。

Web deployment、browser E2E、database migration、CDN rollout、native packaging 或 frontend release policy 只有在当前 work item 明确触及这些 surfaces 时才纳入。

`references/original-skill.md` 仅作为迁移前来源记录；运行任务时不默认加载。

## 工作流

1. **识别 changed surface。**
   - 命名受影响 surface：compile/lint/typecheck、unit/integration/E2E、CLI/API、library/module contract、schema/example、docs、release/package、dependency 或 workflow behavior。
   - 区分 correctness validation、compatibility validation、security validation、performance budget、packaging validation 和 deployment safety。

2. **选择最小 validation/check set。**
   - 优先使用 repository-declared scripts，而不是 inline shell block。
   - 只在 shared behavior、cross-boundary contract 或 declared merge risk 需要时扩大到 workspace-level verifier。
   - Matrix 只覆盖已声明 compatibility risk：runtime version、OS/path behavior、database/service version、feature split、packaging target 或 dependency surface。
   - 慢、重复或 observation-only 检查优先作为 report、scheduled job 或手动复现材料；只有明确 budget、public contract 或 merge policy 要求时才成为 required check。

3. **让 failure 保持本地可复现。**
   - 记录 command、working directory、tool version、fixture/input、request payload、mode/flags 和相关 environment variable。
   - 保留能解释 failure 的 machine output、readable output、schema diff、snapshot diff、tool payload、log、screenshot 或 generated artifact。

4. **先理解 check，再更新 automation。**
   - Branch protection 与 required checks 应对应真实 merge risk。
   - Dependency update workflow 使用能证明该 dependency surface 的同一组 required checks。
   - 慢速 compatibility、packaging 或 broad smoke sweep 可以放到 scheduled、merge-required 或 boundary-crossing validation，而不是每个 PR 默认运行。

5. **调试 CI failure。**
   - 先在本地重跑完全相同的 command，或记录为什么当前环境无法复现。
   - 将 failure 分类为 setup/environment、compile/type/lint、unit/integration、E2E、smoke、schema/docs、packaging、deployment 或 dependency。
   - 缩小到仍会失败的最小 fixture、request、test name、generated artifact、browser action 或 package target。
   - 修复底层 contract；如果 required check 已不符合当前 repository policy，再更新 automation。

## Validation 顺序

默认把快速、确定性的失败放在前面：

1. 从 lockfile install/setup，并使用安全、可失效的 cache。
2. Static check：formatting、linting、typechecking 和 generated-code freshness。
3. 受影响 package/crate/module 的 build 和 unit tests。
4. 使用稳定 fixture 的 integration/smoke checks。
5. Schema、example、docs、migration 或 contract validation。
6. Browser E2E、packaging sweep、workspace verifier、release dry-run 或 merge-required compatibility check。

使用 staged jobs 和 `needs` 让快速 failure 阻止后续昂贵工作。

## Matrix 规则

- Runtime：使用 package 支持的 version range；只有 repository 声明兼容范围时才加入额外版本。
- OS：只有为 path handling、shell behavior、native dependency、binary packaging 或 platform-specific failure 提供保护时才加入。
- Feature/package/service：当独立 surface 可独立失败且能缩短 feedback 时拆分。
- Expensive jobs：如果只重复已证明的 contract，把它留给 merge-required、scheduled 或 boundary-crossing validation。

## 完成检查

结束 CI/automation 工作前确认：

- Commands 使用当前仓库声明的 package manager、toolchain 和 scripts；避免 global install 假设。
- 快速 deterministic check 先于慢速 integration、E2E、packaging 或 workspace-wide check 运行。
- 每个 changed surface 都有匹配 validation/check，且 required check failure 可本地复现。
- Cross-boundary work 已运行或明确标注需要更宽 verification。
- Failure artifact 足以支持本地复现。
- Secrets、deployment credentials 和 production access 没有暴露给不需要它们的 job。
- 最终 diff 保持在预期 automation scope 内。
