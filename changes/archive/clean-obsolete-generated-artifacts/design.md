# Design

本 Plan 以一个现有 Process Check integration test 的显式 Run controls 和 test-local filesystem boundary 兑现已批准的 fixture 遗留修复。

## Context

`run` 在没有 `projectRoot` 时以 `process.cwd()` 作为 project root，而 Project Definition 的 machine publication 默认 target 是 `artifacts/vibe-check`。目标测试已将 check transcript 指向临时 `checks` 路径，但旧的 `outputs.output` 字段不属于 current config grammar，因此没有禁用 default machine publication；它会在仓库 cwd 下产生两个文件。已获授权的窄清理只删除这两份 767B fixture 遗留文件，保留空父目录，未批准扩展删除或重建；精确删除证据保留在 [cleanup-evidence.md](cleanup-evidence.md)。

稳定事实 owner 是 `docs/development/project-run.md`、`docs/output.md` 和 `docs/tooling/project-gate.md#project-gate`。测试实体属于 `AUX-PROJECT-GATE-PROCESS-001`，该 Case 已证明同一 public Run 的 failure Record、message、progress preview 与 transcript-only child output boundary。

## Goals / Non-Goals

目标是让该 Run invocation 的 root、machine publication control 与无默认输出的结果都由测试自身直接观测，且保持已有 failure-safety evidence。不目标是改变 Product defaults、增加 reusable fixture abstraction、验证或迁移其他旧 output 配置、清理更多 artifacts 或修改 package candidate。实施阶段不与 cold candidate 实验并发运行 Gate/build/install；稳定 combined 工作树的最终集成 Gate 仍由任务 2.5 承接。

## Decisions

### Intended Change

在既有 `try/finally` 临时 root 内，将 target `defineConfig` 的陈旧 `output` override 改为 current `machinePublication: { enabled: false }`，并把同一 `root` 传给 Run 的 `projectRoot`。完成 Run 后断言 `result.outputs.machinePublication` 表示 disabled，并以该 test-local root 的两条 exact default artifact paths 均不存在，证明本次 invocation 没有生成默认 publication。只编辑既有 Case 的 `Proves`，使其描述新增可观察边界而不拆分或新增 Case。

### Resulting Impacts

- 直接调用 Product Run 时，test-local root 也是 process Check project context 的 root；该目标 Check 不依赖 repository cwd。
- `checkArtifactBaseDirectory` 继续是绝对的 test-local `root/checks`，所以既有 transcript reference 和 file-existence assertions 不变。
- disabled state 与 file absence 分别证明 Run observable result 和 filesystem outcome；不创建或覆盖仓库根文件来测试未写入。
- current output owner 已有 default-enabled publication coverage，因此本 Change 不复制它，只针对 disabled invocation 的 fixture isolation 做窄证明。

## Risks / Trade-offs

检查“不存在”只能覆盖本次临时 root，不能证明任意调用者均不会选择默认 publication；这正符合本测试的 invocation-local scope。断言 public `outputs.machinePublication` 状态避免仅以 absence 推断配置生效，同时保留 file absence 防止未来移除状态但仍生成默认 files 的回归。

## Open Questions

无；用户已明确批准测试修复范围、之前两份 fixture 文件的删除和空父目录保留，并明确排除产品生成机制与更多清理。

## Implementation Observations

独立正确性审查确认测试的 `projectRoot`、public disabled status 与 test-local default-path absence 分别覆盖路径解析、配置结果与文件系统结果；既有安全 Record、message、progress 和 transcript-only material assertions 保持。最终代码可推理审查未发现需要额外 helper、重构或测试正文改写的具体语义障碍。

2026-09-07 最终独立运行 `bun run check` 通过：candidate `0.0.0-local.926808c01f43`，31 passed、5 not applicable、0 failed/unavailable，13.4s。日志标识为 `2026-09-07T09-25-41.710Z-229660-21535962-d365-40de-9eef-12fdf51ffe37`。本次未选择 package acceptance；它不替代 cold 调查，也不使用报告写入失误触发的 Gate 作为验收。用户已授权在本 Change 验收后归档并单独本地提交。
