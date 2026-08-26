# Proposal

本 Change 把 `scripts/**` 收敛为按真实 workflow、验证边界、Gate Check 与 package lifecycle 划分的模块，并保存实施与验证出口。

## Why

实施前的 `scripts/foundation/**` 与 Gate `checks/` 把变化原因不同的能力集中在一起；文档生成和文档验收又形成目录级双向 owner。package public contract 与 candidate 复用能力也位于错误的生命周期目录，使调用方向难以审计。

## Outcome

`scripts/**` 不再保留 catch-all Foundation 或泛化 Gate Check 容器；文档生成、独立验收、Gate execution 和 package lifecycle 都有单向且可验证的明确 owner，同时根命令与现有 product/Gate 行为保持不变。

## Scope

### Intended Change

- 按 caller audit 删除原 Foundation 中无生产消费者的文件，并迁移其余 process、repository、diagnostic/value boundary。
- 将文档 validation workflow 及 validators 移入 validation/documentation；Docs 保留 machine/package provider。
- 重组 Gate native/process execution 与每一个 docs、governance、test-evidence Check owner。
- 将 package public contract、跨 lifecycle capability、registry 与 audit 拆到真实 owner，并同步 quality、fingerprint、layout、测试、Cases 和文档。

### Resulting Impacts

所有 import、Tests、semantic Case 映射、layout characterization、package/docs references 与 active Change 的 current path 必须同步；保留根命令和既有 Gate/quality/machine artifact 行为。

## Success Criteria

- 不存在 `scripts/foundation/**` 或 `scripts/project/gate/checks/**` source owner，且无生产 import 指向它们。
- Docs provider 不拥有 validation orchestration，validation 不再回调 docs validation workflow。
- public inventory、candidate/artifact shared capability 与 audit 子域均位于其真实 package owner。
- Test Evidence、scripts checks、validation、Decision/Change gates 与 required workspace verification 通过。

## Affected Owners

- `docs/script-tooling.md`、`docs/navigation.md`、`scripts/validation/layout-characterization.ts`：稳定 scripts owner、路由与结构约束。
- `scripts/**`、`docs/testing/cases/**`：实现、Tests、Case entity mapping 与 workflow evidence。
- `changes/refine-script-tooling-module-boundaries/**`：本 Change 的范围、设计、任务和验证证据。
