# Proposal

本 Change 在不改变产品公开 Run、machine、Record 或 Gate evidence 合同的前提下，收敛内部源码与测试入口，并让目录层级恢复真实 owner、生命周期和证明边界。

## Why

前一轮已收拢 Product process、candidate runtime evidence、Gate terminal 与 project-run 的 Invocation/completion/outputs 文件；深层审计仍发现 Scheduler 的 immutable admission core 与 measurement lifecycle 平铺、Lizard port core 混合多个稳定内部责任、以及少数 scripts/test-support 的父子归属反向或误导。测试也有随旧根路径散落的跨文件行为证据，但不能用类型集中破坏就近阅读。

## Outcome

维护者可从源码和共置测试路径恢复 admission-core、Scheduler measurement、Lizard analyzer 的 model/context/pipeline、Gate entry factory、test-evidence profile/discovery 与 Check test helper 的真实 owner；单文件测试保持配对，跨文件测试和专属 support 仅随其被证明的 owner 移动，Case ID/Proves 与公开行为保持连续。

## Scope

### Intended Change

在既有整理基础上：将 Scheduler admission-core 和 measurement 子簇收拢；由 source-aligned analyzer 的独立实施维护其 private core 分解；修正 test-evidence profile/discovery 的契约方向、Gate entry factory/runtime type 与 package Check test helper 的归属；同步最小的 project-run/Scheduler 测试、support、Case 实体路径、架构和脚本工具说明。

### Resulting Impacts

更新内部 imports、受影响测试及其 Case entity key；不建立 tests/ 集中目录、barrel、兼容 re-export 或产品 CLI，不改变 Run lifecycle、public API、machine/Record 或 Gate result/evidence data，也不把同 owner 的纯路径移动升级为长期架构政策。

## Success Criteria

每个新目录都有真实 child owner；相邻单文件 tests 仍共置，跨文件行为测试与 support 只在其 owner 下收拢；全部 Case 的 ID/Owner/Proves 连续且实体路径有效；基于最终完整 diff 运行的目标测试、test-evidence closure、type/lint/import/layout 验证和 `bun run check -- --all` 通过，或有明确的既有/环境失败归因。

## Affected Owners

架构、脚本工具、测试策略/Case 账本；`src/project-run/**`、`src/package-checks/**`、`scripts/test-evidence/**`、`scripts/project/gate/**`、`scripts/package/**` 与 source-aligned function-metrics analyzer。
