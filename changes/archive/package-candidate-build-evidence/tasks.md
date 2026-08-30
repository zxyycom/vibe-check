# Tasks

本 Plan 以治理、实现和分层验证顺序记录可复核的交接状态。

## Readiness
- [x] 0.1 读取 package/Gate/testing owner、相邻实现与测试，并核对相关 active Decisions 和独立 release Draft。
- [x] 0.2 建立本 Plan，并为长期 output/command boundary 起草可审核 Decision candidate。

## Implementation
- [x] 1.1 集中 package build/state path contract，迁移 receipt、prepare、build、Gate handoff 与 fixture roots。
- [x] 1.2 增加只读 status、prepare-backed build 和 full Gate verify command，并绑定根 package scripts。
- [x] 1.3 更新相邻 package/Gate tests、Case evidence 和稳定 owner 文档。
- [x] 1.4 在实现事实和 owner docs 对齐后建立并标记长期 Decision aligned。

## Verification
- [x] 2.1 运行最窄 package/Gate tests 和 Test Evidence closure。
- [x] 2.2 运行 typecheck、lint、format、docs/Decision/Change checks及相关 command behavior。
- [x] 2.3 运行 required workspace verification 与 direct full package acceptance，并记录结果或明确未覆盖边界。
