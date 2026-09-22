# Proposal

将 Project Gate 的单命令检查接到公共 commandCheck，以真实使用验证能力并消除重复进程生命周期。

## Why

Gate 已有两个 commandCheck consumer，其余 22 个单命令 entry 仍使用私有 process adapter。继续维护两套环境、进程结算和 transcript 路径增加接入成本，也掩盖公共能力在实际 Gate 中的不足。

## Outcome

Gate 的全部单一无 shell 外部命令使用 commandCheck；领域投影、依赖材料与选择策略保持 Gate-owned，完整 Gate 能证明接入有效。

## Scope

### Intended Change

- 迁移 typecheck、lint-scripts、format、Git whitespace 与 17 个 test lane，并复用已迁移 lint-product 的完成阶段模式。
- 使用 dependsOn 和 resolveEnvironment 注入已验证的 candidate / external-consumer 环境。
- 删除不再使用的通用私有单进程执行器；保留 ast-grep 多步骤 workflow 和 native Checks 所需的局部能力。

### Resulting Impacts

- 显式继承环境及 plain-text policy；原 adapter consumer 保留 64 MiB 输出上限，原无 timeout 命令新增 120 秒上限，已有 30 秒配置保持。
- 使用 Product transcript format 和 unavailable codes；依赖 resolver 故障统一为 command-environment-resolution-failed。
- 保留安全 failure Records、projector fallback、catalog、selection、mutex、resource claims 与 candidate provenance。
- 同步 Gate 文档、Decision 与 Case；记录接入中已证实的限制，不推测性扩张公共 API。

## Success Criteria

1. 全部单命令 entry 通过 public package commandCheck 构造，无第二套单进程 lifecycle。
2. 真实 child 验证环境、依赖解析、transcript-before-callback、nonzero projection 与 generic fallback；非法依赖不启动 child。
3. Gate identity、selection 和调度 metadata 保持，ast-grep 两步 workflow 与 native Checks 行为保持。
4. 最窄测试、Case、类型、lint、格式、文档、Decision 和完整 Gate --all 通过。
5. 独立正确性审计及最终代码规范、AI-ready 文档优化完成，交付明确真实接入发现及剩余边界。

## Affected Owners

- scripts/project/gate/definition.ts、checks/entry-factories.ts、checks/process/ 与 checks/test-execution/。
- docs/tooling/project-gate.md、gate-diagnostics.md、workspace.md。
- docs/testing/cases/repository-tooling.md 与对应 Decision。
- docs/guides/command-check.md 为公共契约依据；若仅消费现有能力则不修改公开契约。
