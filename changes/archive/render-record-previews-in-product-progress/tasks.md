# Tasks

按事实 owner、产品实现、契约材料与验证顺序完成此 Change。

## Readiness
- [x] 0.1 阅读 output/configuration/architecture owner、编码规范、测试策略、相关现有 Decision 与 progress/native 邻近实现，确认 Product renderer 是唯一终端 owner。
- [x] 0.2 复核起点 Test Evidence closure，并建立 revision candidate，保留 Native Gate owner-safe Record 方向。

## Implementation
- [x] 1.1 将 settled Check 的完整 accepted Records 从 Core session 经 Product-private execution lifecycle 交付 progress rendering，不改变 public results、machine output 或 callback surface。
- [x] 1.2 实现 Record 与 Check message 的独立五条、单条长度受限 progress preview，并使 attention passed Record 可见。
- [x] 1.3 移除 Native Gate adapter 的 diagnostic message preview，只保留独立 focused command message，并更新目标测试与 Case evidence。
- [x] 1.4 更新 architecture/configuration/quality owner 说明与 revision Decision，使 preview owner、事实保留和 package quality message coexistence 清晰。

## Verification
- [x] 2.1 运行受影响的 Core session、progress renderer/invocation 与 native Gate 测试，证明完整 facts 与有界 terminal presentation 分离。
- [x] 2.2 运行 Test Evidence closure、类型检查、lint、format、docs/decisions validation、Change Plan check 及日常 `bun run check`；不运行 `bun run check -- --all`。
