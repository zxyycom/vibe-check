# Tasks

先证明等价，再实现最小路径并验证文件获取不变量。
实施与验证 checkbox 记录文档整理前已验收快照；具体证据与后续复验边界见 design。

## Readiness
- [x] 0.1 读取 owner、当前实现和普查证据；Test Evidence 起点全树通过。
- [x] 0.2 实际 pinned native 对照确认 literal batch ordering/dedup、复杂/未规范化/超长 fallback。

## Implementation
- [x] 1.1 共享 safe-literal membership 并优化最终批次。
- [x] 1.2 用 lazy slash 游标共享 prefix 遍历，保留 policy 顺序/短路并更新内部/公开说明。
- [x] 1.3 补直接行为与操作量证明，复用 scan-scope 既有 Case。

## Verification
- [x] 2.1 最窄 tests、完整 Test Evidence 与 before/after 操作计数通过，范围见 design。
- [x] 2.2 审查 diff、文档影响、不采用项及计数与计时的证据边界。
- [x] 2.3 Product/scripts 工程、材料、同 candidate required/complete Gate 与非实施文档反查通过。
