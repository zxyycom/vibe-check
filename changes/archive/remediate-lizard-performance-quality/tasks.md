# Tasks

按 owner、协议拆分、兼容性验证和 quality evidence 的顺序完成本 active Plan。

## Readiness
- [x] 0.1 阅读 AGENTS、文档导航、coding style、script-tooling performance owner、testing owner、相关 investigation，并确认仅限 opt-in tooling。
- [x] 0.2 运行实施前 Test Evidence check，记录 current Case closure 基线。
- [x] 0.3 审阅现有 command/test exports、errors、A/B/C protocol seam 与同一 focused-quality 基线（29 条 finding）；该基线只衡量维护性。

## Implementation
- [x] 1.1 保留 command entry/export façade，并按 plan-local responsibility 拆分 arguments、workload/target evidence、sampling/comparison、identity/context 与 layer 模块；稳定 owner 不变。
- [x] 1.2 将 fixed Lizard 1.24 provisioning、analyzer-only B、current-decomposition C 与 historical-product A 交给各自 implementation module，同时保持 cleanup/failed semantics。
- [x] 1.3 将 comparison formation、layer guard、evidence/summary write 与 canonical comparator 分离，保持 identity/schema/order/summary boundary。
- [x] 1.4 审阅局部 diff，必要时同步直接 test/Case evidence，且不触及 Product、Gate、Python/Lizard analyzer source 或性能结论。
- [x] 1.5 完成 P0 compatibility repair：inherited CLI key fail-closed，且 non-finite canonical comparison 保留既有 fallthrough；在同一 Case 的既有实体中补可观察证明，不新增或改换 Case ID/Owner。
- [x] 1.6 default Gate 发现 canonical 的顺序 guard chain 触发 target nesting-depth finding 后，改为保持同一 truthy fallthrough 的 field-list loop，恢复 quality baseline。

## Verification
- [x] 2.1 运行最窄 `bun test scripts/development/lizard-performance`，只使用现有 mock/fixture tests；其结果不等同真实 A/B/C workload 或 benchmark。
- [x] 2.2 在测试变更（如有）后运行 Test Evidence check，并审阅 Case 连续性。
- [x] 2.3 运行 scripts typecheck、lint、format check 与同一 focused repository-quality 比较（29 → 13）；不运行 default/full Gate、真实 benchmark 或 full workload。
- [x] 2.4 运行 Change Plan check，记录未验证真实 benchmark/full-workload 边界。
- [x] 2.5 对 P0 follow-up 运行目标 tests、Test Evidence、scripts type/lint/format、focused quality 与 Change Plan check；fake helper parity 不替代真实 parity，且不运行 default/full Gate、真实 benchmark 或 full workload。
- [x] 2.6 default Gate 后以目标 tests、focused quality 与 Change Plan check 确认 13 条非目标 Records；不第二次运行 default Gate。
