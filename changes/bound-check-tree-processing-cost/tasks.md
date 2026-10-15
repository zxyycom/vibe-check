# Tasks

先确认边界，再实施，并用功能与确定性操作量验证。
实施与验证 checkbox 记录文档整理前已验收快照；具体证据与后续复验边界见 design。

## Readiness
- [x] 0.1 读取 owner、skills、测试规则、当前源码与普查证据，完整 Test Evidence 起点通过（726 entities / 181 Cases）。
- [x] 0.2 用户明确接受仅重复 executable ID 的 planning→configuration 早拒绝；引用正式 Decision。

## Implementation
- [x] 1.1 实施循环/共享 executable 提前失败，同步公开 API 与内部 owner 说明。
- [x] 1.2 实施 scheduling collections 可回滚解析并保持公开输出。
- [x] 1.3 补充必要行为与操作量测试，复用既有 scan-configuration Case。

## Verification
- [x] 2.1 目标 tests、完整 Test Evidence 与 before/after 操作量通过，范围见 design。
- [x] 2.2 核对局部 diff、精确失败边界、操作量收益和未测范围。
- [x] 2.3 Product/scripts 工程、材料、同 candidate required/complete Gate 与非实施语义反查通过。
