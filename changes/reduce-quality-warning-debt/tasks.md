# Tasks

先冻结告警基线和工作区边界，再并行完成局部修复并集中审计可能的单项豁免，最后执行全量验证。

## Readiness

- [x] 0.1 已通过 `bun run quality` 冻结当前 33 条未接受记录的类别、位置和初始检查结果。
- [x] 0.2 已读取当前质量、配置、scanner、测试、Change 和子代理协作 owner，并排除过时的泛化 file-policy Change 作为本次捷径。
- [x] 0.3 三个互斥工作区均已完成 owner/测试/Case 审阅；33 条记录均判定为可维护性重构事项，没有候选误报。

## Implementation

- [x] 1.1 已修复定义与 Run 工作区的文件行数、函数行数和复杂度记录，并以目标测试保持 Project Definition 与 Run 可观察契约。
- [x] 1.2 已修复 quality-core 工作区的记录、策略验证、输出与 scan-command 告警，并以目标测试保持 Check/Record/Output 契约。
- [x] 1.3 已修复输入与 task-scheduler 工作区的告警，并以目标测试保持 Git 输入、materialization 和 scheduler 行为。
- [x] 1.4 已由三个独立工作区复核全部记录；没有候选误报，因此无需设计 acceptance。
- [x] 1.5 已核对 repository Project Definition 未加入任何 policy acceptance；零记录结果不需要例外配置。

## Verification

- [x] 2.1 各工作区已运行最窄测试；测试改动保持实体身份并通过全树 test-evidence closure，且交付定向 SCC/Lizard 消除证据。
- [x] 2.2 `bun run quality` 已产生零 records；报告同时确认没有 accepted records、policy 或未分类记录。
- [x] 2.3 已运行 Product test/typecheck/lint、完整 validate、test-evidence、Change check、required 与 full workspace verification，并审计最终 diff。

- [x] 2.4 已按 ai-ready-docs 复审本 Change 的文档 delta，收敛 default scanner option 的唯一完整 owner，并明确 command 字段与 private adapter handoff 的关系。
- [x] 2.5 已按 `docs/coding-style.md` 复审全部本次源码 delta；相邻实现仅作为接口事实，移除任何没有独立职责的 module/helper 或不清晰的类型边界。
- [x] 2.6 已对 standards-review 修订重新运行受影响测试、test-evidence、文档/格式/lint/typecheck、quality、required 与 full workspace verification，并复核最终 diff。
