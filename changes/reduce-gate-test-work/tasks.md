# Tasks

按包测试、选择审计和完整验收顺序交付，保留可复核测量。

## Readiness

- [x] 0.1 确认 main、既有改动、owner 与初始 766 entities / 190 Cases 闭合。
- [x] 0.2 冻结 before 测量与 required 场景，记录 candidate 和运行环境。

## Implementation

- [x] 1.1 移除两次重复 artifact 指纹及一次多余 compiler 指纹计算，合并编译器边界子进程而保留全部断言。
- [x] 1.2 审计并收窄已知测试正文的 required 输入，保留 helper、未知输入和全树证明。
- [x] 1.3 更新选择矩阵、Case 和 Gate owner，独立复核文档影响。

## Verification

- [x] 2.1 完成相同负载 after 测量，报告中位数、范围、操作数与证据边界。
- [x] 2.2 最窄测试、完整 Test Evidence、工程/材料验证及正式 complete Gate 全部通过。
