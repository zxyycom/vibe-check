# Tasks

任务先确认路径和 Case 语义连续，再按真实 owner 迁移实现、测试与说明；前轮验证记录保留为阶段证据，最终完整 Gate 只验收最终完整 diff。

## Readiness
- [x] 0.1 核对相关 architecture、output、script tooling、decision 与测试证据 owner，并记录 Process/Gate/project-run 的初始边界。
- [x] 0.2 完成 project-run 生产模块簇、Invocation 状态、跨子 owner 依赖与 public-consumer 审计，确认前轮同 owner 路径收拢。
- [x] 0.3 完成深层布局审计、test-evidence closure baseline 与本轮测试共置方案；确认同-owner move 不需新长期 Decision。
- [x] 0.4 接收并审阅 analyzer private split 的 source/import/Case 映射，限定跨域同步范围。

## Implementation
- [x] 1.1 整理 Product process façade并移除未消费的终端 writer，保持 Product/scripts 依赖方向与未公开边界。
- [x] 1.2 将 candidate external-consumer runtime evidence 收拢为具名私有子系统，保持其外层消费入口。
- [x] 1.3 精简 Gate terminal info，保留完整 gate.log、Product progress、warning/error、logs path 与最终 result。
- [x] 1.4 实施 project-run 同 owner的 invocation、completion 与 outputs 路径收拢；不改变 lifecycle、public 契约或 scheduler owner。
- [x] 1.5 收拢 Scheduler admission-core 与 measurement 真实子簇，保留 shell/terminal lifecycle 边界。
- [x] 1.6 修正 test-evidence profile/discovery、Gate entry factory/runtime type 与 package Check test-helper 的归属。
- [x] 1.7 按被证明 owner 迁移最小 project-run/Scheduler 测试与专属 support，更新连续 Case 实体路径。
- [x] 1.8 整合 analyzer private split 的外部 imports、Case、architecture/script-tooling owner 说明。

## Verification

### Earlier verification evidence (not final acceptance)

- 在完整 Gate 首次运行中，formatter 对 TypeScript oracle fixture 的意外写入使 three analyzer oracle tests 失败；未改 expected，已精确恢复 `fixtures/lizard-1.24.0/typescript/{normal,edge}.ts` 的基线内容，并确认除有意 evidence 映射外原始样本无 diff。
- 恢复后 exact local candidate `0.0.0-local.8595adfe68c6` 的 complete Gate（36/36）通过；日志为 `.log/project-gate/2026-09-05T10-29-49.706Z-2309153-df9bf481-1edf-4fa1-a658-e3b47ba3ff67`。

### Final verification evidence

- 最终完整 diff 已完成编码规范与 AI 阅读审查；architecture、script tooling、Case 与调查报告均已按 current owner 或形成时快照边界复核。
- exact local candidate `0.0.0-local.156ed70a3c24` 的 `bun run check -- --all` 通过：36/36 passed，0 failed/not-applicable/unavailable；日志为 `.log/project-gate/2026-09-05T10-58-41.282Z-2322205-840f7673-2a8e-49a9-bc50-27b877de5a88`。

- [x] 2.1 完成前轮 test-evidence closure、受影响 target tests 与布局/import 验证，作为路径迁移的阶段证据。
- [x] 2.2 完成前轮跨产品/脚本/输出边界的 `bun run check`，并审查当时 diff、Plan 检查与未覆盖风险。
- [x] 2.3 完成迁移后的目标 tests、test-evidence closure、类型/lint/import/layout 检查，并区分当时已有失败。
- [x] 2.4 完成一次当时的 `bun run check -- --all`；该结果仅覆盖日志所指的 candidate，不能替代下列最终验收。
- [x] 2.5 审阅最终完整 diff：确认代码符合编码规范，架构/脚本工具/Cases 描述 current owner，调查报告仍只表达形成时认识，并记录未解决风险。
- [x] 2.6 在 2.5 后对最终完整 diff 运行 `bun run check -- --all`；如失败，区分既有、环境与本轮失败，并把证据与剩余风险写入交付。
