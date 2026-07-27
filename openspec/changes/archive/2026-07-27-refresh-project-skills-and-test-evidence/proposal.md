本 change 在不改变产品 runtime 的前提下更新项目级 agent 工作流，并把长期决策与测试证据切换到最新上游契约；当前文件只形成待审计计划，不代表已经完成实现。

## Why

项目已经固定维护一组 `.codex/skills`，但 4 个 OpenSpec skill 和
`decision-records` 落后于上游最新分发，且缺少几项与当前 owner、依赖边界和跨场景契约
判断直接相关的能力。测试证明材料仍使用单文件聚合账本与源码 `@case` marker，和待采用的
`test-evidence-review` 原生测试入口模型不兼容，继续并行维护会形成两个事实源。

## What Changes

- 原样更新 `openspec-apply-change`、`openspec-archive-change`、`openspec-explore` 和
  `openspec-propose`，并原样添加用户选定的 5 个项目级 skill。
- 升级 `decision-records` 分发单元，再把现有决策 Markdown、领域目录和派生索引迁移到
  最新契约；项目 wrapper 继续只传入仓库根并复用随包 ESM API。
- **BREAKING**：添加 `test-evidence-review`，把 `docs/testing/cases.md` 和
  Vibe Check-owned 源码 `@case` marker 迁移为
  `docs/test-evidence/<topic-id>/<case>.md` 的单原生测试入口
  case，删除被取代的旧账本入口和 marker 校验。
- 为测试证据 CLI 增加项目级薄 wrapper、package scripts 和 workspace 验证接线，并同步
  testing、script tooling、navigation、AGENTS 与 OpenSpec 长期规范。
- 记录用户已经确认的项目 skill 组合与测试证据 owner 取舍，并在迁移后严格校验长期
  决策集合。

## Capabilities

### New Capabilities

- `agent-workflows`: 项目级 skill 的选择、原样分发、薄适配、升级和迁移验收边界。

### Modified Capabilities

- `test-fixtures`: 测试证明目标从聚合账本与源码 marker 改为受控 topic 下的一入口一 case
  目录，并由派生索引和确定性 CLI 校验。

## Impact

- `.codex/skills/**`：更新 5 个现有分发单元并新增 6 个分发单元。
- `docs/decisions/**`、`scripts/decision-records.ts` 及其文档入口：迁移最新决策记录契约。
- `docs/testing/**`、`docs/test-evidence/**`、测试源码 marker、workspace verifier 与
  package scripts：切换测试证据 owner 和验证入口，并确认通用 docs validator 不承担
  第二套格式校验。
- `openspec/specs/test-fixtures/spec.md` 及新增 `agent-workflows` spec：同步长期能力契约。
- `src/product/**` 的产品实现、CLI 输出和 scanner 行为不在本 change 的修改范围内。
