# Tasks

先恢复当前证明与测量基线，再实施 fixture-only 候选并完成同 workload、工程与独立审查。

## Readiness

- [x] 0.1 读取 owner、完整编码规范、活动性能方向与完整 Case 闭合；确认起点无现有工作树改动。
- [x] 0.2 完成 Core / supporting 隔离各三样本与完整 Gate 三样本，记录 runtime、源码和原日志。
- [x] 0.3 用 compiler-read 观察隔离 Node ambient types 成本，确认最小 fixture 配置仍通过 no-emit；supporting 暂不改。

## Implementation

- [x] 1.1 fixture 与 alias 变体共享显式 ESNext / types 配置，真实 validator 与仓库配置保持不变。
- [x] 1.2 保留原 19 行违规矩阵与有效校验，补 no-emit 真实类型错误拒绝并同步原 Case。

## Verification

- [x] 2.1 同 workload 复测局部与完整 Gate；保存 source hashes、原始样本、采用理由与测量限制。
- [x] 2.2 最窄目标测试、scripts 类型/lint、精确路径格式、公共材料与完整 Case 闭合通过。
- [x] 2.3 独立代理从实际 diff 反查证明连续性、完整编码规范及用户/内部文档影响。
- [x] 2.4 Check 当前 Change、审计最终范围与证据；保留辅助材料，不结项删除。
