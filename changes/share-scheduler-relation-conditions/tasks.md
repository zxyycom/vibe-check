# Tasks

B1/B2 均不采用；候选实施与评估已冻结，Product 已精确恢复，实际保留 tree 的 dependency/入口、完整 Gate 与安装验收已完成。Git 由 root 串行处理，保留本 Change，不执行结项删除。

## Readiness

- [x] 0.1 核对 owner、测试/Case、完整 Change 契约、两报告和 immutable/性能决策。
- [x] 0.2 确认新 Change/tmp 不存在、责任与写入范围，并收敛有限共享设计。

## Implementation

- [x] 1.1 编译 typed exact/common/residual 条件与双排序 roots，接线 seed 和 relation owner。
- [x] 1.2 实现共享 readiness membership、cell mass/head transition 与 forced/cancel 保真。
- [x] 1.3 collector 使用共享质量与精确进入标记，保留 demand、分类与终态交付。
- [x] 1.4 同步候选所需直接测试、Case 与 Scheduler owner；改动随候选补丁保存，不保留为生产事实。
- [x] 1.5 完成 B1 独立 correctness-only 审查及最终 AI-ready/编码规范优化，并对优化 delta 定向复核。
- [x] 1.6 按授权仅完成一轮有界 B2；小矩阵不支持采用，停止调参并冻结含 4 个新文件的补丁/身份。
- [x] 1.7 root 按 evidence/b2/restore-targets.json 恢复 18 个 tracked paths、删除本轮 4 个新增文件；不得触及无关改动。
- [x] 1.8 最终优化代理仅复核实际保留的文档，清楚区分候选历史和当前 Product。

## Verification

- [x] 2.1 B1/B2 最窄 oracle、Scheduler/measurement 测试、全树 Case closure，以及双 runtime 214-cohort 语义对照。
- [x] 2.2 候选 typecheck/lint 已通过；恢复后对实际保留 tree 完成 dependency/入口校验及局部 diff 审计。
- [x] 2.3 B1 同条件真实 Core+collector 与 Run 完整矩阵：规模、完整读、failure/cancel/deep、旧状态与独立 forks。
- [x] 2.4 B1 独占正式计时及独立计数/内存/profile；B2 只执行停走小矩阵和最小内存，明确不采用及未覆盖边界。
- [x] 2.5 从 c45 基线分别应用 B1/B2 补丁，确认完整 runtime inventory 逐字一致、4 个新文件均可恢复；限定 12 个自有 profiles 无损压缩并逐字解压核对。
- [x] 2.6 在恢复后的实际保留 tree 完成最终完整 Gate 与安装验收；该结果不证明 B2 通过采用验收。

## Validation Notes

2026-10-17：候选实现 checkbox 仅表示可恢复的候选已完成，不表示保留到 Product。

- B1：pinned Bun 1.3.14 Scheduler 74/74（31 files），typecheck/lint、Case 752/752 entities、185 Cases、16 Topics；独立 correctness-only 审查与优化 delta 复核 PASS。最初无 `./` 的测试 filter 曾命中 tmp baseline；审查随后用显式目录重跑。生成 baseline 测试副本已按授权移除，运行时源码身份不变。
- B2：`mise exec -- bun test ./src/project-run/task-scheduler` 74/74、`mise exec -- bun run typecheck -- product`、`mise exec -- bun run lint -- product`、`mise exec -- bun run test-evidence -- check --root .` 752/752 entities、185 Cases，通过。直接测试补充 viable-entry、take/capture、同批取消与时钟故障边界。
- B1/B2 各自对 c45 的 Node 24.18.0 / Bun 1.3.14 语义对照均通过 214 cohorts，含每 effect 投影、精确 queue、preseed/failure/cancel、source snapshots 和独立 forks。
- B1 每 runtime 66 Core + 32 Run timing cohorts、64 fresh-process memory rows；计数 48 行、CPU/allocation 独立。B2 每 runtime 24 timing cohorts（16 Core + 8 Run）、16 fresh-process memory rows，只覆盖停走必需组合。
- B2 **未运行**完整性能矩阵、独立 profile、独立产品审查、最终候选优化或完整 Gate；已决定不采用，不以 B1 审查或恢复后的 Gate 替代。
- 恢复后及补丁无损压缩封存后分别执行 `mise exec -- bun run check -- --all`，均为 43/43 passed，包含 Product typecheck/import boundary、repository layout 及安装后 runtime/types/documentation；candidate 为 `0.0.0-local.45845dd3dad8`。最终本地日志：`.log/project-gate/2026-10-17T04-37-31.717Z-4137536-377f49cd-7398-4fe6-bf09-0a6b7ed4bfad/`。最终一轮耗时 40s，并有非阻断 Check mean/p95 耗时告警；这不是 B1/B2 性能证据。
- 证据见[入口](evidence/README.md)，包含身份、原始结果、完整恢复清单和恢复证明。Gate 后仅补记交付状态，再运行文档、Case、Change 与 diff 检查；不改冻结数据或 Product。
- root 已按 B2 完整补丁与清单逐项匹配、reverse-check/apply 恢复本轮改动，58 项冻结证据 SHA 核对通过。文档收尾阶段只读确认 `src`、稳定 Scheduler owner 与 Case 相对 HEAD 无 diff，4 个本轮新增文件均不存在；候选可恢复性证明与实际基线恢复分别记述于证据入口。
- 保留文档 AI-ready 收尾：pinned `validate`、`test-evidence`（恢复后 749/749 entities、185 Cases、16 Topics）、`format -- check`、Change check 与 `git diff --check` 通过，58 项冻结输入 SHA 再核对通过。这些材料检查不替代 2.2/2.6 的恢复后产品验收。

## Adoption Boundary

**不采用 B1/B2，停止本方向。** exact 共享可减少 source-write、部分 Core 和 retained snapshot 成本；
但完整大图轨迹、A+Bi/unique/deep、真实 Run 和内存代价不足以支持额外维护复杂度。
这不是要求每个 benchmark 更快，也不是以 R=N 或 H=N 否定所有共享可能。
不修改长期 Decision 或历史 Investigation，不 finalize/delete 本 Change。
