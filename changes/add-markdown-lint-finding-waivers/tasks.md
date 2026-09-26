# Tasks

先固定精确 identity 与完整对账边界，再实施、同步使用材料并验证；本 Change 本轮不结项删除。

## Readiness

- [x] 0.1 核对 Markdown lint、通用 waiver、现有 cache 与 Gate owners，以及相关活动 Decisions。
- [x] 0.2 固定公开 range identity、重复匹配失败闭合、计数兼容、缓存外实时对账与不变的 Gate policy。

## Implementation

- [x] 1.1 实现闭合 waiver authoring、identity 校验、安全快照和公开类型。
- [x] 1.2 在完整 traversal 后对账并发布 applied evidence、unused/overmatched audit 与当前结算消息。
- [x] 1.3 补齐局部行为、缓存组合、hostile authoring 与 Case 证据。
- [x] 1.4 更新公开指南、JSDoc、示例、changelog，以及 package 类型与 runtime consumer 验收。

## Verification

- [x] 2.1 运行受影响的最窄测试，证明无配置 parity、失败完整性、cache hit 实时 waiver 与精确匹配。
- [x] 2.2 通过 Test Evidence 全树闭合、Change 检查、文档投影/材料、typecheck、lint 和 dependency 验证。
- [ ] 2.3 完成 required 与 complete Gate 的最终门禁验收，包含当前 profile/runtime 的本机硬时间预算。
- [x] 2.4 完成非实施代理基于实际 diff 的产品/文档独立反查并处理阻断项。

## Verification Evidence

2026-09-26 的实施与独立审查证据：

- `mise exec -- bun test src/package-checks/markdown-lint`：16/16；独立审查重跑同一测试集通过。
- `bun run test-evidence -- check --root .`：661 entities / 160 Cases，全树闭合。
- Product/scripts typecheck 与 lint、`bun run validate`、`bun run docs:api`、renderer/API inventory tests、Change 集合检查及 `git diff --check` 通过。Bun 测试以 mise 锁定的 1.3.14 为正式证据。
- 首轮 required 发现 options resolver CC 11 与测试文件 322 code lines，已通过移除重复验证、按完整性边界组织测试修正；未调整 policy 或新增质量 waiver。
- 非实施代理从实际 diff 反查产品、用户材料、测试与 consumer；示例误用未公开 subtype 的问题已改为公开 `MarkdownLintRecordData`，独立 noEmit 与投影复验通过，最终无剩余审查阻断。
- `bun run check -- --all`：43/43 Checks 通过，包括 artifact、installed types/docs/Node runtime；Product Run 为 29.2 秒。日志：`.log/project-gate/2026-09-26T03-16-05.429Z-3347423-f77cc34c-99bc-4fcd-ba7c-c7ce0c416e1f/`。
- 修复后的 `bun run check`：34 Checks 通过、9 项按条件 N/A；Product Run 为 21.5 秒。日志：`.log/project-gate/2026-09-26T03-16-55.600Z-3353295-f0cd47d2-40f9-4218-aa9e-c8bd1a75f55d/`。

上述两次标准 Gate 最终均因 `project-gate-performance-baseline-missing` 退出非零。当时声明指纹为 `4b41682dc1c549ff125403f5691fea7db5ff7b01eb8999fc4216a551213d3d02`，与已有本机配置不匹配。未修改 `.cache/vibe-check/project-gate/performance-baseline.json` 或 required 20 秒 / all 60 秒阈值。required 的上述 Run 时间已超过 20 秒，不能把指纹更新视为时间门槛达成。

后续用户另行授权解除不必要的指纹阻断；[当前 Gate 预算决策](../../docs/decisions/apply-gate-time-budgets-without-fingerprint-gating.md)改为按 profile/runtime 比较原有硬预算，无需刷新本机指纹。该 Gate policy 修订不属于本 waiver 的产品实现，也不代表耗时已经达标；任务 2.3 仍等待预算内的 required / complete 最终验收，不结项删除。

06:39 / 06:40 UTC 两次 `bun run check` 已不再因指纹失败，均为 34 passed / 9 N/A；总预算计量分别 20,534.8 / 20,503.5ms，仍略超原 20 秒上限而退出 1。本阶段未重跑 complete Gate；性能候选与证据见[后续调查](../../docs/investigations/diagnose-required-gate-head-of-line-wait.md#7-后续补证阻断解除与测试成本分解)，任务 2.3 保持未完成。

### 提交前审查与复验（07:04–07:05 UTC）

- 按编码规范全文审查受影响调用链，并用 `ai-ready-docs` 复核使用材料与历史/当前边界；非实施代理复核后无剩余审查阻断。消费者断言已加强为完整 Record（含版本、identity 和 data）一致性，构造器 JSDoc 已明确默认或指定 checkId。
- Markdown lint 与 Gate 选择、Definition、adapter、预算测试合计 53/53 通过；`docs:api`、`validate`、664 entities / 160 Cases 全树闭合通过。
- `bun run check -- --all`：43/43 Checks、最终 passed；总预算计量 42,961.6ms，包含 candidate preparation 10,337.5ms，低于原 all 60 秒阈值。日志：`.log/project-gate/2026-09-26T07-04-35.944Z-3487855-4db08135-603f-4085-9a4f-72c129ff5290/`。
- 随后的 `bun run check`：34 passed / 9 N/A、无失败 Check；总预算计量 20,497.7ms，仍因超出原 required 20 秒阈值最终 failed。日志：`.log/project-gate/2026-09-26T07-05-21.015Z-3493744-bdb8a39a-2332-4842-8a88-f4b401a525df/`。

两次使用同一 candidate `0.0.0-local.b1b8dcad7e34`，本机预算文件未改写；没有据此宣称性能改善或稳定达标。任务 2.3 仅剩 required 预算验收，保持未完成；本次按用户要求先固定提交，布局与全部端到端测试的优化另行审查。
