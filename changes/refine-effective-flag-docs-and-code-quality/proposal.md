# Proposal

本 Change 对刚落地的 effective-flag 文档与代码做一次以权威规范为基准的收敛式复审。

## Why

前一轮以行为契约和迁移完整性为主，相关文档仍可能把篇幅消耗在已退场的形状、负向对照或分散重复上，代码也需要直接对照完整编码规范，而不是以相邻实现为风格依据。

## Outcome

AI 和实现者能从当前 owner 文档直接恢复正向的单一 AST、effective flags 与 change evidence 模型；本轮相关代码则在 owner、边界、类型、数据流、命名、控制流、抽象和验证上满足项目编码规范。

## Scope

### Intended Change

1. 按 `ai-ready-docs` 重审相关当前 owner、公开示例、changelog、Decision 与 Semantic Cases，优先处理主承诺与正文重心偏移、负向表达占据主线、迁移残留、重复、过长段落和 Markdown 样式不一致。
2. 按 `docs/development/coding-style.md` 全文重审前一轮 `src/**` 与 `scripts/**` 差异，以行为 owner 和编码规范为唯一裁决基准；相邻代码只恢复当前调用事实。
3. 只实施能具体指向语义恢复、规范符合或文档可用性的最小修改，不把审查信号、行数或个人偏好升级为重构义务。

### Resulting Impacts

1. 公开指南、API mechanics 及投影示例必须继续保持单一事实源和可执行投影。
2. 内部 Definition、Run 与 Gate owner 只保留实现者完成当前职责所需的精确边界，不复制公开教程。
3. 如测试正文变化，必须保留 Case 身份并同步证明内容；如只改生产表达，不机械改写 Case。
4. 文档投影、类型、lint、format、行为测试、Test Evidence 和完整 Gate 继续是分离的验收证据。

## Success Criteria

1. 文档主线先说明当前模型和正确使用，已退场 API 只在 changelog 或必要拒绝边界出现。
2. 同一规则由唯一 owner 完整解释，其他材料只保留本地使用所需的摘要或链接；Markdown 标题、列表、表格与段落保持可扫描且局部自足。
3. 本轮相关代码没有以旧代码为依据的规范偏离；输入边界、不变量、主数据流、失败归属与副作用在局部可恢复。
4. 公开 API、runtime behavior、fingerprint、effective `project.flags`、Git evidence 和 Gate selection 契约不变。
5. 定向验证、文档投影/校验、Test Evidence 与 `bun run check -- --all` 通过。

## Affected Owners

- `docs/development/coding-style.md`：代码质量和 package 对外中文主叙述规则。
- `docs/guides/extending-check-lifecycle.md` 与 `docs/api-mechanics.md`：公开使用主线。
- `docs/development/project-definition.md` 与 `docs/development/project-run.md`：Definition 与 Run 实现契约。
- `docs/tooling/project-gate.md`：Gate 真实 consumer 边界。
- `src/check/**`、`src/project-definition/**` 与 `src/project-run/**`：产品实现与相邻测试。
- `scripts/project/gate/**` 与 `scripts/package/**`：仓库 consumer 与已安装 package 证据。
