# Design

以文档 owner 承接独立审查方法，以发布 owner 承接必需触发与同包结论。

## Context

本 Change 从 main 的 `917bab67` 开始。用户要求检查包使用者实际取得的文档与 JSDoc，并在规则落地后按 `ai-ready-docs` 整理和提交。现有行为变更审查与发布双工作区约定继续有效。

## Goals / Non-Goals

目标是让执行者按稳定规则完成语义审查并判断是否允许发布。本次范围为规则、路由、Decision 与计划的整理和提交；实际包内容审查、发布及 package/runtime 改动另行开展。

## Decisions

### Intended Change

- 复用文档 owner 的独立章节，不新建仅服务发布的第二份标准。以实际包清单、公开导出及可达类型恢复整体对象，从用户任务检查入口、完整性、准确性与表达。
- 发布准备期可提前审查候选；发布完成结论必须核对正式 tarball。复用已有阅读结论须证明材料和相关行为仍适用，不能直接把开发候选当正式证据。
- 独立语义结论与机械结果分别记录；覆盖不足或影响正确使用的未解决问题阻断发布，纯偏好不强制改写。
- 新增长期独立 Decision：包体审查与既有 diff 影响审查互补，不替代、归档或改写原判断。
- 表达整理以任务步骤和正向完成条件为主，收敛多处重复，保留独立审查、完整覆盖、最终包绑定与安全边界。

### Resulting Impacts

- 由导航与治理说明建立显式阅读路径；同一标准只在文档 owner 完整定义。
- 以已有任务/Change 的 `Manual CR:` 保存范围、包身份、审查者、使用任务、发现与处理，不增加 schema 或永久审查账本。
- 发布修正遵循已有重新冻结和完整验收要求，记录只在实现工作区维护；CLI 成功不表示语义审查已完成。

## Risks / Trade-offs

完整包审查增加发布阅读成本，但能发现未进入 diff 的存量问题。覆盖清单只证明读过哪些对象，不能把勾选替代语义判断。独立审查者可查实现核对真实性，但不能用内部上下文补齐用户实际拿不到的说明。

## Open Questions

无。用户已授权本次 Git 提交；推送、发布与 Change 删除不在授权范围内。

## Implementation Observations

- 审查方法集中在 documentation owner，发布承接触发、正式包确认与阻断；导航和治理路由到同一标准。按 `ai-ready-docs` 收敛重复否定与对话残留，将密集判断表改为主题列表，明确全包与局部专项的任务范围。
- Manual CR: 非实施代理 `review_package_documentation_review_workflow` 重新读取整理后的实际 diff、owner、Decision 与本 Change，推演局部专项、无文档 diff 的正式发布、行为变化但文档 bytes 未变三项任务。完整覆盖、JSDoc 辅助声明/字段、独立核验、双工作区和最终包绑定均可恢复，无阻断；最后两处范围与形成时背景澄清已定向复核。
- Decision `261019-require-consumer-oriented-package-documentation-review` 为 active/aligned，relations 为空；表达整理保留采用方向并通过 CLI 同步索引。严格检查 372 条记录通过；aligned 表示规则已落地。
- 最终整理后 `validate`、`test-evidence -- check --root .`、目标 Change 与 diff 检查通过，覆盖 756 entities / 188 Cases。`bun run check` required Gate 9 passed / 34 not-applicable，结果 passed，日志：`.log/project-gate/2026-10-19T04-57-18.341Z-678306-ea13626c-3570-4ced-b276-05361fa4ce4f/`。
- 本次仅验收规则及接线，CLI、receipt、Product、测试与包材料未改变；未执行实际全包文档审查、正式 prepare/verify、发布或 `--all` package acceptance。按本轮授权保存 Git 提交，保留 Change。
