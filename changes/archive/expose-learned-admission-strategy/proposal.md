# Proposal

将 learned critical-path 从 Product 内置特例改成调用方显式接入的公共策略，本文保存本次授权范围与验收出口。

## Why

当前 closed admission policy union 和 Invocation provider 特殊识别 learned，内部可以使用普通策略作者无法取得的 normalized inputs、observer 与 diagnostic channel。用户已确认删除这一特例，要求开发者与使用者通过相同公开接口接入可选功能。

## Outcome

调用方从 package root 导入可配置的 learned strategy 工厂，并把返回值放入现有 public prepared strategy 位置；仓库 Gate 采用相同入口。未接入时没有 learned history I/O，Invocation 与 Scheduler 不识别 learned 专用 kind 或私有 observer。

## Scope

### Intended Change

- 导出可选 learned strategy 工厂，使用 public prepare、decide 与 complete，显式配置 caller-owned history identity、存储位置及少量真实模型参数。
- 删除 learned 专用 policy grammar 与 runtime resolver/observer/channel 特例，不提供旧 kind 兼容分支。
- 保留 Scheduler 对关系、具名互斥、容量、取消与结算的唯一责任，不把算法重构扩大为调度优化。

### Resulting Impacts

- 同步 Definition validation、fingerprint、公开类型、diagnostic readback、随包示例、Gate 调用与 package public inventory。
- 保持 history/observer failure 隔离与默认模型含义；说明转为普通 custom strategy 后的测量开销边界，不声称未测量的性能等价。
- 演进直接相关长期决策，并在既有 optimize-learned-admission-strategy Plan 中标明旧 private 基线需要重新核对；不实施其 backfill 实验。
- 迁移语义 Case 与目标测试，运行完整 Project Gate 并由非实施代理审阅实际 diff 及用户文档。

## Success Criteria

1. 新工厂可从实际安装包根导入，示例与 Gate 不通过任何 learned 私有入口接入。
2. 旧 learned kind 被当前 grammar 拒绝；运行时不存在基于该能力身份的特权分支。
3. 目标测试覆盖冷启动、历史记录/复用、caller identity、参数边界、失败隔离及不绕过 Scheduler guards。
4. 随包文档解释具体 hook、输入、输出、失败与取消边界；默认未接入行为保持静态且无 learned I/O。
5. 验证、决策和计划状态据实际命令如实交付；不发布、不提交、不归档 Change 或改写旧 release evidence。

## Affected Owners

- `src/project-definition/**`、`src/project-run/**` 与新可选策略 helper；对应 architecture、Project Definition 和 Project Run owner。
- `scripts/project/gate/**`、package public inventory 与 external consumer acceptance。
- README、API mechanisms、scheduling guide 与可执行 package API examples。
- learned strategy 与 private lifecycle 决策、相关测试 Case、本 Change 与既有优化 Change。
