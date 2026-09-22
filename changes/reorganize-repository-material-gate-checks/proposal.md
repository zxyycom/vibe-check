# Proposal

将当前 `docs` 验收入口重组为按材料责任组织的 `repository-material` 验收，并让 Project Gate、workspace 命令和测试证据使用同一套语义。

## Why

现有 workflow 同时处理 JSON、schema、machine examples、links 和 package API projection，但入口、类型和 Gate identity 都叫 `docs`。调用者无法从名称判断实际责任，也无法据此设计材料变更选择。

## Outcome

- `materials` 成为 workspace validation 与 Project Gate 的当前入口。
- JSON、schema、machine examples 和 links 按责任形成可独立选择、诊断和测试的 Gate Checks。
- Gate adapter 直接调用对应 validator；组合 workflow 只保留为 workspace 的便利编排。
- package API projection 的 owner 和 Gate 范围明确写入当前文档。
- 当前源码、测试和文档使用新语义；归档材料保留其形成时的名称。

## Scope

### Intended Change

重组 validation owner、workspace 命令、Gate preset、Check identity、诊断命令、当前 owner 文档和活动 Test Evidence references。根据 readiness 审计结果决定公共 JSON Checks 的复用边界和材料专用 Check 的最小拆分。

### Resulting Impacts

同步 imports、测试路径、Case references、Gate selection snapshots、mutex 说明、导航和当前命令示例；核对 machine-facing identity、package material registry 和历史性能记录的当前消费者。

## Success Criteria

- `bun run validate -- materials` 及材料 task 可运行；旧入口作为非法参数失败。
- Project Gate 的材料 preset、Check identity、诊断和 focused command 使用同一 canonical vocabulary。
- 每个材料责任都能从 owner、输入、Finding 和验证 Case 恢复；组合 workflow 不再掩盖责任边界。
- JSON、schema、examples、links 的既有验收结果保持可解释；公共 Check 复用带来的差异有明确证据。
- 目标测试、Test Evidence、材料校验、focused Gate 和完整检查通过。

## Affected Owners

- `/workspace/vibe-check/scripts/validation/`
- `/workspace/vibe-check/scripts/validation/workspace.ts`
- `/workspace/vibe-check/scripts/project/gate/definition.ts`
- `/workspace/vibe-check/scripts/project/gate/checks/`
- `/workspace/vibe-check/scripts/project/gate/runtime/`
- `/workspace/vibe-check/docs/tooling/`
- `/workspace/vibe-check/docs/navigation.md`
- `/workspace/vibe-check/docs/testing/cases/`
