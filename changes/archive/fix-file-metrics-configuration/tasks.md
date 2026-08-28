# Tasks

任务先建立长期方向与当前基线，再实现 constructor、area measurement 与 adapter boundary，最后同步公共材料并完成分层验证。

## Readiness

- [x] 0.1 恢复 Configuration、scanner dependencies、scan scope、file-metrics source/tests 与 jscpd 参考 Change。
- [x] 0.2 运行 Change、Decision 与 Test Evidence 起点查询，确认共享工作区已有改动与当前证据闭合。
- [x] 0.3 建立并审核两条 active/unaligned file-metrics Decision，确认不存在未解决的长期方向冲突。
- [x] 0.4 将本 Change 固化为 Plan，并确认 implementation 与 verification 覆盖 public hard cut 和所有 resulting impacts。

## Implementation

- [x] 1.1 实现 authored/resolved fileMetrics option types、closed default resolution 和 specialized constructor。
- [x] 1.2 实现 area-owned exact-path collection、去重 union、membership 与最严格有效上限 Record conversion。
- [x] 1.3 将 SCC public scanner 缩为 executable-only，并让 availability/scan adapter 固定全部 protocol arguments。
- [x] 1.4 更新 repository dogfood Definition、package exports、public inventory 与 isolated candidate type material。
- [x] 1.5 更新 Configuration、file-metrics guide、scanner dependencies、scan scope、architecture/quality owner 中受影响事实。
- [x] 1.6 更新目标测试与语义 Case 账本，覆盖 defaults、invalid input、不同 area、重叠 area、single scan 与 executable-only protocol。
- [x] 1.7 按完整编码规范复核边界类型、parser 输出和共享文件职责，删除已无人消费的通用 code-area 分类模型。

## Verification

- [x] 2.1 运行 file-metrics owner 最窄测试并审阅新增/修改测试的证明信号。
- [x] 2.2 运行完整 Test Evidence wrapper 与 Decision/Change checks。
- [x] 2.3 运行 typecheck、lint、format check 和目标文档/公共 API validation。
- [x] 2.4 运行 `bun run verify:vibe-check-workspace:required` 覆盖跨产品、文档与 package 边界。
- [x] 2.5 审查局部 diff、稳定 owner 与 Decision alignment，只保留本 Change 可归因改动。
- [x] 2.6 重新运行目标测试、Test Evidence、required/full Gate、repository quality 与 candidate package 验证。
