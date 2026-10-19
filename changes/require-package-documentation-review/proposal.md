# Proposal

建立从包消费者视角检查对外文档与 JSDoc 的语义审查，并由发布流程强制触发。

## Why

机械验收证明材料、投影、声明和示例的一致性，日常 diff 审查关注变更影响；两者都不能替代对实际随包说明本身的完整阅读。本 Change 开始时，发布流程尚未明确要求这项审查。

## Outcome

维护者能独立开展对外文档使用者审查；每次正式发布都取得覆盖最终包文档与对外 JSDoc 的独立语义结论，与机械验收分别核对。

## Scope

### Intended Change

- 在文档 owner 定义对象、使用者阅读路径、内容判断、覆盖记录与完成条件。
- 发布 owner 强制触发整体审查，安排准备期修正与正式包确认，保存到现有 release Change evidence。
- 导航与知识治理路由到同一审查 owner，长期 Decision 保留与 diff 审查、机械验收的责任区别。
- 按 `ai-ready-docs` 复查新增规则的重心、重复与阅读结构，并提交本次改动。

### Resulting Impacts

- 流程约束由发布执行者落实；不新增 CLI 审批开关、receipt 字段、测试实体或平行账本。
- 正式包身份确认继续服从 clean source、双工作区和同一 tarball 验收；审查修正影响发布输入时重新冻结。
- 本次交付是审查规则及其 Git 提交；实际全包审查、推送、正式发布与 Change 删除均不在范围内。

## Success Criteria

- 从文档或发布入口均能恢复审查对象、方法、责任与证据边界。
- 发布整体范围覆盖未修改页面及消费者需要的 supporting declarations / 字段 JSDoc。
- 语义阻断、覆盖不足、审查不可用与材料变化的后续处理明确。
- 非实施代理确认整理后仍能恢复完整流程；文档、知识与 Change 检查通过，提交范围准确。

## Affected Owners

- `docs/tooling/documentation.md`：独立的对外文档使用者审查。
- `docs/tooling/package-release.md`：发布必需触发、最终包绑定与 evidence 保存。
- `docs/navigation.md`、`docs/governance/knowledge-maintenance.md`：任务路由与既有 diff 审查的关系。
- `docs/decisions/`：长期责任与验收取舍；不改变产品源码或测试。
