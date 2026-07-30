本 change proposal 以完整 Bun 测试实体发现和语义 Case 双向覆盖，替换迁移前一原生节点一份模板证据的账本。Proposal 只定义目标与范围；实现状态以 tasks、代码和验证证据为准。

## Why

建立本 change 前，173 个原生测试节点各自对应一份 Case，但项目检查只校验手写目录，不能证明 runner
入口没有遗漏或漂移；机械拆分还让多数 `Contract` / `Proves` 只复述测试名称。Docnav
已经验证了更直接的责任分层：scanner 负责完整当前测试事实，语义 Case 负责稳定证明目的，
严格门禁只要求二者双向闭合而不强制一对一。

## What Changes

- **BREAKING**：把 `Entry -> Contract -> Proves` 的一节点一文件模型替换为
  `Topic -> Case(Owner, Entities, Proves)`；Case 按 owner 契约与可观察结果划分，允许
  Case 与当前测试实体多对多。
- 新增 Vibe Check-owned Bun 测试实体发现：版本化 profile 选择完整测试面，
  ast-grep 静态发现与 Bun JUnit runtime report 必须闭合为唯一实体集合。
- 严格 `check` 阻断 static-only、runtime-only、unsupported / duplicate entity、未知
  Case entity、未被任何 Case 关联的当前实体，以及非法 topic、Owner 或 Case source。
- 把迁移前 173 份单节点模板按既有 35 个稳定责任组迁移为语义 Case；历史 30 个聚合 Case
  只作当前语义复核种子，新增的 5 个责任组按当前 owner 与测试事实维护；移植后新增的
  test-evidence tool nodes 另由 3 个测试基础设施 Case 承接。
- 收敛 3 处动态 test registration：参数矩阵保留在具有稳定字面量名称的原生节点内部，
  避免运行时生成无法与静态声明确定性闭合的身份。
- 删除 committed test-evidence index、`sync-index`、旧目录和兼容双读；查询直接读取
  topic/Case source，`check` 每次从当前 checkout 发现测试实体。
- 把全树 test-evidence closure 接入 required workspace profile，并删除 full profile
  对同一 Bun 测试面的重复调度。
- 将项目级 `test-evidence-review` 改为 Docnav 的能力感知语义审查版本；测试实体发现、
  runner profile、目录 grammar 与门禁继续由项目工具和 owner 文档拥有。

## Capabilities

### New Capabilities

- `test-evidence-management`: 定义完整当前 Bun 测试实体发现、语义 Case 目录、双向覆盖、
  查询和 required gate 契约。

### Modified Capabilities

无。

## Impact

- 开发工具：`scripts/test-evidence/**`、workspace verifier；删除旧
  `scripts/test-evidence.ts` 薄 wrapper。
- 测试：3 处动态 Bun test registration 及其目标验证。
- 长期材料：`docs/testing.md`、`docs/testing/case-maintenance.md`、
  `docs/testing/cases/**`、文档导航、脚本工具说明、项目指令和长期决策。
- Skill：`.codex/skills/test-evidence-review/**` 从上游 v7 目录运行时改为项目级语义审查
  指导；其它已安装工程 skills 不受影响。
- 依赖：新增精确锁定的开发期 `@ast-grep/cli`；不进入产品 runtime 或 release artifact。
- 不改变 Product CLI、quality core、scanner/output public contract 或产品运行时依赖方向。
