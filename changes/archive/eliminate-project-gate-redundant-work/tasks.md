# Tasks

按 candidate 重工作、Function metrics、documentation runner、治理与最终验证的顺序实施，并以一次最终 full 收口。

## Readiness

- [x] 0.1 审阅三份慢 Check 调查、当前 Gate/package owner、测试策略、相关 active Decisions 与用户质量范围判断。
- [x] 0.2 用现有 lane 和 Case 查询确认 candidate 测试移动、Function metrics 测试正文及 documentation 测试的证据映射。
- [x] 0.3 建立并激活修订 candidate lifecycle 和 Function metrics质量范围的长期 Decisions。

## Implementation

- [x] 1.1 将 candidate routine contract 与显式真实 cold integration 分离，提供可发现的 package 命令并移除 full 中的重复物理 lifecycle。
- [x] 1.2 为 Function metrics resource tests 增加私有立即 yield seam，并保留默认 timer cancellation integration。
- [x] 1.3 只从 Function metrics 排除 Product test/test-support，保持 duplicate/file 测试源码 scope 并补配置证明。
- [x] 1.4 将 external documentation examples 与 machine Definition 合并为一个 consumer-owned runner 并保留定位。
- [x] 1.5 同步 Gate 定义、owner 文档、semantic Cases、测试 profile 及 Change 任务事实。
- [x] 1.6 保留 external consumer 真实 `tsgo` typecheck，并用 installed declaration direct audit 替代第二个 LanguageService program。

## Verification

- [x] 2.1 运行 candidate routine 与显式 integration 目标，证明 routine 低于 5 秒且真实硬预算/行为保留。
- [x] 2.2 运行 Function metrics resource/exact lane 和 repository-quality 目标，证明行为与 scope。
- [x] 2.3 运行 documentation consumer 目标，证明单 runner 执行集合、machine evidence 与失败定位。
- [x] 2.4 运行 Test Evidence、Decision、Investigation、Change、docs、typecheck、lint 和 format 局部校验。
- [x] 2.5 只运行一次最终 full Gate，审计所有 Check 耗时、terminal outcomes 和局部 diff。
- [x] 2.6 运行 external types 目标，证明真实 consumer typecheck/JSDoc 证据保留且目标级耗时低于 5 秒。
