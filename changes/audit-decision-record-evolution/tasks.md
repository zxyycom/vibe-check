# Tasks

任务先恢复 v53 集合，再完成三个独立审计切面、统一实施和完整验证。

## Readiness

- [x] 0.1 核对 skill 更新版本、Decision v53 契约、项目入口和起始 Git 状态。
- [x] 0.2 从 Git 历史恢复 22 条非法 alignment 的证据边界，并在隔离副本验证迁移路径。
- [x] 0.3 由 Terra 子代理分别完成关系、生命周期/记录边界和 tags 的全量审计提案。

## Implementation

- [x] 1.1 原位修复 22 条 archived alignment，并全量重建 v11 Decision 索引。
- [x] 1.2 核对并实施 223 条关系 summary：203 条通过现有事务入口写入；20 条拆分/重划边按用户一次性授权手工补写并全量同步。
- [x] 1.3 核对并实施 13 条有充分正文依据的 tags 编辑性修正。
- [x] 1.4 核对生命周期、alignment、合并、拆分、归并、重划和演进建议；仅执行一条有完整事实证据的 mark-aligned。
- [x] 1.5 审查项目治理文档影响；现有导航、知识治理和项目入口仍与 v53 命令及 owner 边界一致，无需修改。
- [x] 1.6 按 `ai-ready-docs` 复审两个 skill、Decision 集合与 Change 交接材料，统一 adopted-clause 样式、拆分极端长语义单元并收敛过期或重复审计叙述。

## Verification

- [x] 2.1 在最终文档与索引状态运行 Decision/Investigation 严格检查、关系图抽查和 skill 结构验证。
- [x] 2.2 运行相关目标测试、类型检查与 Git diff 检查，并核对正文编辑未改变摘要字段或关系身份。
- [x] 2.3 运行完整 Project Gate 并审阅最终 diff、一次性例外与剩余风险。
- [x] 2.4 复核 AI-ready 消费契约：报告可直接恢复最终状态，结构化证据与当前索引一致，Markdown 标题与 adopted-clause 样式稳定。
