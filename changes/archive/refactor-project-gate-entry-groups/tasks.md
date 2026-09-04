# Tasks

按唯一 config owner、保持行为的实现和分层验证顺序完成 Gate manifest 重构；focused quality 已验收，默认 workspace Gate 仍单独待运行。

## Readiness
- [x] 0.1 阅读 Change Plan、Gate/script-tooling 与 coding-style owner，确认 `definition.ts` 保持唯一中央 config。
- [x] 0.2 运行实施前 Test Evidence closure 与 focused quality，确认 536 current entities / 122 Cases 以及 46 个 advisory Records（含 `createProjectGateEntries` 162>150）。

## Implementation
- [x] 1.1 在 `definition.ts` 内按真实 Gate 职责提取私有 entry-group helpers，并令中央 entry factory 保留 runtime-local prerequisites 与既有总顺序。
- [x] 1.2 审阅 target diff，确认不改变 entries、order、factory inputs、relation/mutex/preset/required metadata、outputs、scheduler、aggregation、afterGate 或 exports。

## Verification
- [x] 2.1 运行 `bun test scripts/project/gate/definition.test.ts`。
- [x] 2.2 运行 scripts typecheck、lint 和 format check。
- [x] 2.3 运行实施后 Test Evidence closure。
- [x] 2.4 运行 `bun run check -- --quality`；以完整 stable Record set 比较 46→45，确认目标 ID 消失、零新增，且无 waiver、threshold 或 selection exclusion 变更。
- [x] 2.5 运行默认 `bun run check`，独立记录 required Gate 的完整 status 分布；它不能由 focused quality 成功推断。
