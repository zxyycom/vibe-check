# Tasks

任务先建立决策与闭合基线，再实现 entity/behavior 分层和 package 测试复用，最后以语义、功能与性能证据验收。

## Readiness

- [x] 0.1 建立未修改 HEAD 的 required Gate、Test Evidence stage、JUnit entity 与 package phase 性能基线。
- [x] 0.2 恢复 testing、Gate、package owner 和相关 active Decisions，确认 required/full、tag 与完整 closure 的修订边界。
- [x] 0.3 建立并核对两条后继 Decision，确认 Change Plan 结构与测试闭合起点。

## Implementation

- [x] 1.1 将 Test Evidence 改为 fail-closed registration JUnit entity closure，并补齐 adapter tests。
- [x] 1.2 建立完整互斥 test execution partition，并实现 package-tests opt-in/full Gate controls。
- [x] 1.3 优化 package lifecycle tests 的 receipt、artifact 与 consumer setup，维护语义 Case。
- [x] 1.4 同步 testing、Gate、script tooling owner 与长期 Decision alignment。
- [x] 1.5 将粗粒度 execution lanes 拆成稳定 owner/package 子 Checks，并把三个巨型 package acceptance 实体拆成共享 fixture 的语义测试。
- [x] 1.6 将 exact prepared candidate 建模为 required typed provider Check，并让 external consumer Check 通过 direct dependency 消费。
- [x] 1.7 让 artifact acceptance Check 消费 prepared-candidate typed output，并保留 direct test 的本地 build fallback。
- [x] 1.8 将 Product package execution lane 按行为 owner 拆成完整、互斥的子 Checks。
- [x] 1.9 将 candidate reuse/recovery 运算判断与物理 build/install evidence 拆到责任明确的边界，不削弱保留的 acceptance 信号。
- [x] 1.10 基于 staging/tar/installed consumer 的实际使用关系收窄 reused candidate audit，保持 corruption fail-closed。
- [x] 1.11 将非物理 `scripts/package/**` 运算与 material tests 从 ordinary scripts lane 拆为 required package-supporting Check。
- [x] 1.12 按 AI-ready 文档原则重审 current owner、Decision 与 Change artifacts，并按项目编码规范收口 typed state、边界错误和声明式 Gate 映射。

## Verification

- [x] 2.1 运行 Test Evidence、目标 Gate/Test Evidence/package tests 与相关 docs/Decision checks。
- [x] 2.2 运行 scripts typecheck、lint、format 和 required/full workspace verification。
- [x] 2.3 用同一环境重复测量 required、显式 package tag与 full Gate，记录与 28.43 秒基线的可比结果。
- [x] 2.4 重新闭合新增测试实体、子 Check partition、package mutex、required/full membership 与细分后的性能结果。
- [x] 2.5 验证 provider parser/digest/path failure、consumer dependency/environment、required snapshot、full acceptance 与最终性能。
- [x] 2.6 对 root scheduler 3 路与 4 路执行 5 组交错 A/B，按 wall 中位数、波动和 Check contention 选择。
- [x] 2.7 验证新增 provider consumer、owner lanes、candidate 分层、Case closure、required/full Gate 与最终性能。
- [x] 2.8 重新运行 format、scripts typecheck/lint、目标测试、docs、Decision Records、Test Evidence 与 Change Plan 检查，验证本次规范审查未改变既定 Gate 行为。
