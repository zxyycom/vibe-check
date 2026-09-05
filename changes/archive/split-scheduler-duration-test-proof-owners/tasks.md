# Tasks

任务依次固定证明边界、迁移实体映射，并以范围匹配验证完成 active Plan。

## Readiness

- [x] 0.1 读取测试策略、Case 维护、架构 owner、Change 固定契约和相邻测试；运行变更前 Test Evidence strict closure。
- [x] 0.2 审查原五个实体的断言与两个既有 Case，确认 History Case 的三个 recording/两个 storage 节点和 Prediction Case 的两个 prediction 节点按真实证明责任分配，且不需要新增 Case。

## Implementation

- [x] 1.1 新增最小 secret-bearing prediction input support，并以三个 owner-specific 文件迁移全部既有断言；删除旧聚合测试文件。
- [x] 1.2 将 `quality-runtime.md` 的两个既有 Case entities 更新为七个真实新 Bun entities：History 仅接收 recording/storage，Prediction 仅接收 prediction；保持 ID、Topic、Owner 与 Proves 不变。
- [x] 1.3 审阅局部 diff、Code lines 与 Case 映射，确认没有产品 source、无 owner helper 或无关改动。

## Verification

- [x] 2.1 运行三个目标 Bun 测试文件以证明迁移后的运行断言，并运行完整 Test Evidence strict closure 以证明 current entity discovery/mapping 闭合。
- [x] 2.2 运行 docs validation 以验证 Case 文档、typecheck/lint/format 以验证静态工程边界，以及可不经 Gate 执行的 focused file-metrics quality 验证；这些结果不替代 default/full Gate。
- [x] 2.3 检查 Change Plan、git diff 和 git status，记录 quality 30→29、各局部验证的证明范围、通过的 default Gate 及其 log，并明确 full `--all`、artifact 与 external-consumer acceptance 未运行。
