# Tasks

按配置、呈现与证据顺序实施，验证后交付工作区改动。

## Readiness

- [x] 0.1 核对 owner、相关 active Decisions、干净 main 和起点 Case 全树检查；确认只改变 flag mismatch 展示。

## Implementation

- [x] 1.1 增加配置、默认值、共享验证和 fingerprint，扩充对应边界测试。
- [x] 1.2 实现默认摘要和有界名称预览，验证 barrier、顺序、转义与事实隔离。
- [x] 1.3 同步公开指南、内部 owner、changelog 和连续 Case 证明。

## Verification

- [x] 2.1 执行目标测试、全树 Case check、材料校验、类型/lint 与 changed Gate，记录实际结果和边界。
- [x] 2.2 由非实施代理基于实际 diff 反查行为与文档影响，处理实质问题并审计局部 diff。
- [x] 2.3 按 ai-ready-docs、Test Design 与完整编码规范复查本轮 diff，优化说明和测试辨错信号，重验并记录证据。

## Evidence

- `bun test src/project-definition src/project-run/controls src/project-run/progress-rendering scripts/project/gate/definition.test.ts`：91 pass、0 fail，35 files。
- `bun run test-evidence -- check --root .`：791/791 current entities，192 Cases、17 topics。既有进度配置验证提取为配对原生节点，两个 rename 和新增 large-group 节点延续原 Case。
- `bun run validate`、`bun run docs:api`、Product/scripts typecheck 与 lint、format check、`git diff --check` 均通过。machine example 无漂移，未改 schema 或 generated outputs。
- `bun run check -- --changed`：current candidate `0.0.0-local.ca0982d29b9e`，36 passed、0 failed、7 not-applicable；日志 `.log/project-gate/2026-10-26T02-40-45.715Z-213443-72761166-1f47-4076-b629-cbe34a330045/`。包括受影响行为、依赖/入口、artifact、installed docs/runtime 和文件/函数指标。
- 非实施代理从实际 diff 独立审查通过，并定向复核配对测试迁移及 writer helper 复用；指南措辞建议已修正。未扩展为完整发布文档审计。
- 后续复查按 ai-ready-docs 整理任务层次、收敛重复说明与长 Case 段落，清理旧授权描述；Test Design 补强 barrier 的 callback 观察、依赖传播名单身份、formatter 隔离和合法数值边界。完整编码规范审查及非实施代理的独立复审通过，无新增例外或 waiver。
- 最新 `bun run check -- --changed`：36 passed、0 failed、7 not-applicable；日志 `.log/project-gate/2026-10-26T02-50-10.887Z-222083-b6e95134-fedc-4453-a017-1a4e64ca92ee/`。
- 最终 `bun run check -- --all`：candidate `0.0.0-local.7374ef1af2cd`，41 passed、0 failed、2 not-applicable；日志 `.log/project-gate/2026-10-26T02-52-31.298Z-228757-59a51901-33e5-4d6b-b25a-c0a51d7a50ec/`。额外单跑三个强化后的测试文件为 12 pass、0 fail；全树账本仍为 791/791。
- 未运行 `--consumer-types`、admission workbench 或正式 release 验收；本次不发布，不执行 Change finalize/delete。本轮已授权整理提交和 hook 自身触发的推送。
