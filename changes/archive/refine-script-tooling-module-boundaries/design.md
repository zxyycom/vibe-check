# Design

本设计以 caller audit 和现有 Project Gate 语义为约束，重组脚本 owner 而不改变 Product runtime 或根命令契约。

## Context

实施前的 `docs/script-tooling.md` 把 Foundation、Docs validation、package API inventory 和 Gate checks 描述为多个混合 owner。已对齐的 `integrate-foundation-into-workspace-assurance` 允许删除无生产消费者的 Foundation 能力；`default-project-gate-to-required-profile` 允许 required/full 同集；`refine-project-run-and-settlement-owners` 要求 public inventory 位于 docs/package/candidate tooling 能消费的 owner。

## Goals / Non-Goals

目标是以真实稳定责任重组 scripts、保持 machine artifact provider 与独立 acceptance、保留 quality 四层和 Gate 两层，并同步文档、layout characterization、Tests/Cases。非目标是不改变 `src/**` 产品行为、根命令、Gate aggregation/profile/exit 语义或引入新的 generic utils/shared/helpers 容器。

## Decisions

### Intended Change

将共享 process execution 收敛为扁平的 `scripts/process-execution/{execution,contract,failure,plain-text-environment,result,runner}.ts` 与根命令 adapter，repository file/path 操作保留在 `scripts/repository-files/**`，小型诊断和值边界使用 `scripts/error-message.ts` 与 `scripts/value-guards.ts` 根 capability。删除 caller audit 确认无生产消费者的原 Foundation args/CSV/Git/NDJSON/JSON-file API，并以 node:test 维护存活 boundary Tests。将 docs validation workflow 及其 task/validator 子树归入 `scripts/validation/documentation/**`，并让 repository 文件/path adapters 直接位于该 owner；`scripts/docs/**` 只保留 provider。Gate 将 native/process mapping 归入 `check-execution/**`，具体 Check 归入其 docs/governance/test-evidence owner。package parent owner 承担跨 artifact/candidate 的 contract、inventory、file collection、Bun invocation/digest 与 `package-material-audit.ts`；artifact audit 分为 `documentation-audit.ts`、`staging-audit.ts` 与 `packed-tar-audit.ts`。quality 包含所有非测试 scripts TypeScript，并明确 candidate fingerprint 的保守 invalidation。

### Resulting Impacts

移动会改变 imports、测试实体路径、Case 映射、layout characterizations 和文档路由，必须同步并通过 Test Evidence closure。package API projections 与 Check guides 必须分开 registry，以免 artifact/candidate 读取 docs projection registry 作为 public contract。独立 machine artifact acceptance 仍由 validation 调用 docs provider，不能混入生成端。现有其它 active Changes 若只引用旧脚本路径，只做最小 current-path 同步。

## Risks / Trade-offs

大规模路径移动可能漏掉动态 imports、Case entity 映射或 Gate transcript dependencies；通过 TypeScript、target tests、layout validation、Change/Decision/Test Evidence checks 和 required Gate 关闭。candidate fingerprint 继续覆盖 package scripts 的所有输入，牺牲局部重建性能以保持 candidate 安全证据。

## Open Questions

无；本轮仅执行已批准的机械 owner 路径选择，不修订长期方向。
