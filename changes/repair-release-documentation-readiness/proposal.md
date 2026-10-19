# Proposal

本 Change 按发布前文档普查修复已确认的说明、示例和知识职责失配，不改变产品能力。

## Why

用户文档存在旧 callback 示例、文件选择说明、返回值缺项和版本归属错误；部分活动判断、Case 与暂停计划仍描述退场机制，历史调查又被误作当前行动状态 owner。机械校验通过不足以证明这些自然语言与示例正确。

## Outcome

用户可按当前随包文档完成示例和升级判断；维护者能区分当前契约、长期理由、当轮调查与实施授权，已确认的迁移残留得到有证据的修复。

## Scope

### Intended Change

- 修复六项用户文档问题及公开页中的维护叙述；受管示例从源更新。
- 将标签之后的净变化放入未发布章节，保留已发布版本的准确历史。
- 修复协调页、Case、暂停 Network Plan、活动 Decision 与 Investigation 的已确认职责或当前描述失配。
- 修正历史资源的现存路径说明，保留原始测量和形成时结论。
- 提交前按 ai-ready-docs 再复查公开页与本轮内部改动，收敛现行叙述、迁移入口和过密结构；必要约束与历史证据保持完整。

### Resulting Impacts

- 示例投影、安装后消费者及类型验收需要与正文一起验证。
- 新增 audit 投影触发 registry 的文件规模门槛；按 Gate 构建指南的既有任务边界提取投影分组，保持注册内容与顺序不变。
- 子分组源继续进入 candidate fingerprint；既有测试与 Case 补充仅改变分组 bytes 即失效的证明，防止后续复用陈旧候选。
- Decision/Investigation 的已知正文维护需要同步派生索引；实质演进使用各自 CLI 并先做语义复核。
- Case 保留身份与映射，只修正已经变化的证明说明；暂停计划不因此恢复实施。

## Success Criteria

- 原依赖审计示例经实际候选包执行成功，当前返回值与支持范围说明可直接使用。
- changelog 可区分已发布 0.0.3 与标签后变化，不声明本次已发布或擅定正式版本。
- 稳定 owner、长期判断和历史报告不互相替代，必要安全及授权边界完整保留。
- 独立审查及相关材料、知识集合、Case 和完整 Gate 验证有实际证据。

## Affected Owners

- 用户文档与投影：`docs/tooling/documentation.md`、`docs/tooling/repository-material-validation.md`。
- 知识与变更：`docs/governance/knowledge-maintenance.md`、Decision/Investigation/Change skills。
- 测试证明：`docs/testing/strategy.md`、`docs/testing/case-maintenance.md`。
- 发布说明：`docs/changelog.md`、`docs/tooling/package-release.md`。
