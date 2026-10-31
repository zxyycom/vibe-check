# Proposal

统一 Gate 领域范围与指标扫描范围，并交付可核对的局部指标执行。

## Why

现有 scope 只强制选择输入 region 对应的 Check，指标另行维护 codeAreas，不能用同一领域范围执行局部质量检查。

## Outcome

领域边界只维护一次；显式 scope 同时选择领域检查与适用指标，指标实际输入限于所选领域，默认反馈包含基础 Markdown 检查。

## Scope

### Intended Change

在仓库 Gate 中建立共享领域范围表，复用现有 scope 名称，派生测试 owner 路径和指标配置。为 scoped invocation 投影实际指标文件交集，保留公共文档检查。

### Resulting Impacts

更新 Gate selection、candidate-bound 组装、测试及 Case、内部 owner 和入口说明。不修改 Product API、scanner 实现、指标阈值或发布验收义务。

## Success Criteria

- 领域路径由共享表拥有，相关测试分区及指标配置引用同一来源。
- 单领域和多领域选择实际限制指标输入，保留指标排除、阈值和重复比较边界。
- 非 scoped 模式不缩小指标覆盖；默认基础文档检查执行。
- 目标测试、类型/lint、Case 完整性和相关 Gate 证据可复核。

## Affected Owners

`docs/tooling/project-gate.md`、`docs/tooling/gate-repository-quality.md`、`docs/tooling/gate-test-execution.md`、`docs/navigation.md`、`docs/testing/case-maintenance.md`。
