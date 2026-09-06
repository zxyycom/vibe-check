# Tasks

先闭合公共命名与 metadata 边界，再以 exact package 和远端回读完成交付验证。

## Readiness

- [x] 0.1 恢复 package manifest、public inventory、consumer acceptance、README、GitHub metadata 与相关长期决策 owner。
- [x] 0.2 审计 supporting declarations 的真实消费者命名场景并明确保持私有的边界。
- [x] 0.3 确认共同 description、稳定 keywords、不增加 homepage 及仅更新 GitHub description 的授权范围。

## Implementation

- [x] 1.1 在 generated manifest closed contract 中增加 description 与 keywords，并同步 writer、audit 与测试证据。
- [x] 1.2 从 package root 导出审定的 supporting types，并同步 public inventory、API 文档要求与 isolated consumer acceptance。
- [x] 1.3 同步 README 核心产品定位和直接相关的长期 Decision records。
- [x] 1.4 在本地验证闭合后只更新 GitHub repository description，并回读确认 homepage 与 topics 未被修改。
- [x] 1.5 按用户澄清将共同 description 修正为通用 TypeScript 质量门禁工具，并修订 README、manifest contract、GitHub 与长期 Decision。

## Verification

- [x] 2.1 运行 Test Evidence、目标 package 测试、package API docs、typecheck、lint、format 与 docs validation。
- [x] 2.2 构建 exact candidate，并让隔离消费者、package material audit 与完整 Project Gate 验收同一候选。
- [x] 2.3 由非实施代理根据实际 diff 反查用户说明、内部 owner、公共契约与授权边界。
- [x] 2.4 运行 Decision、Change 单项与全部 active Change 检查，并核对相关决策 alignment。
- [x] 2.5 重建修订后的 exact candidate，重跑受影响的 package tests 与完整 Project Gate。
- [x] 2.6 由非实施代理复核 Node host 与项目适用范围的区分，并完成远端与治理最终回读。
