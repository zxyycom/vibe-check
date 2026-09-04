# Tasks

任务按先锁定语义与 Case 连续性、再做 owner-local 拆分、最后一次 required Gate 验收的顺序执行。

## Readiness

- [x] 0.1 阅读 Change Plan、Configuration、Quality Metrics、Coding Style、Testing/Case maintenance、`fb695143` diff 和当前 Gate records，确认仅四项新增 finding 在范围内。
- [x] 0.2 在改测试前运行 `bun run test-evidence -- check --root .`，查询将移动或拆分的 flags/aggregation 相关 Case 与当前 entity keys，记录语义连续性判断。
- [x] 0.3 阅读四个目标和相邻 consumers/tests，确定每个候选 helper/module 的独立 owner、输入输出与消费者；拒绝无此依据的抽象。

## Implementation

- [x] 1.1 重构 `parseEnabledByFlags` 的 private grammar stages，保持 omission、invalid、literal-true、mode、dedupe/sort/freeze 的可观察行为与 Definition fingerprint 不变，并将函数的 complexity/nesting 降至阈值内。
- [x] 1.2 以单一完整 private execution stage 拆分 `resolved-checks.ts`，保持 static graph validation、single effective selection、flag control settlement 与 Scheduler handoff 的顺序和 private contract。
- [x] 1.3 按 aggregation fixture 的独立构造责任拆分 `check-facts-aggregation.test-support.ts`，保持所有 fixture/export consumers 和 aggregate assertions 不变。
- [x] 1.4 按 flags validation、canonical snapshot、predicate modes、dependency propagation/cancellation 等既有证明目的拆分 `controls/flags.test.ts`；同步 Case entity mapping，且不为物理拆分新增或拆分 Case。
- [x] 1.5 复核四项改动的 diff、imports、命名和新模块边界，删除没有明确 consumer 或独立责任的临时 helper/module。

## Verification

- [x] 2.1 运行最窄的 Definition authoring、resolved execution、aggregation 与 flags Bun tests，证明 public propagation/effective aggregation/Gate-adjacent lifecycle 行为未变。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`，确认所有移动/拆分后的测试实体与 Case owner/Proves 映射闭合。
- [x] 2.3 运行适用的 typecheck、lint、format 和 docs validation；直接检查四个指定 paths/functions 的 quality records，确认本 Change 的新增 findings 全部消失。
- [x] 2.4 在最终代码状态仅运行一次 `bun run check`；31 个 required Check passed，5 个 package-acceptance Check 按 flags 未选择。指定目标减少 2 个 function findings 与 3 个 file findings；目标路径只剩 Change 前已有的 `parseCheck` nesting-depth 记录，未运行 `--all`。
- [x] 2.5 已审阅 proposal/design/tasks、稳定 owner 与 Case 账本的一致性；本次只改变私有代码和测试组织，没有形成需补充的长期 Decision，并按当前用户已授权范围归档后单独提交一次 Git。
