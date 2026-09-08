# Tasks

本 Change 已以保留基线收敛；没有 Product 代码、测试或用户行为变更。下列状态只记录已经发生的工作，
不以计划文件或失败的质量门禁替代独立审查。

## Readiness

- [x] 0.1 核对 makespan 优先、资源累计占用次之、无用户关键任务选项及不采用出口。
- [x] 0.2 核对 helper/平台/Gate 的职责与信息边界，保留旧比较计划暂停及独立发布授权。
- [x] 0.3 审核基线先行、比较前冻结协议、有限候选探索及停止流程，不预定最终算法。
- [x] 0.4 完成独立方案审查，确认上游依赖、测试、真实成本和采用/不采用交接可执行。

## Implementation

- [x] 1.1 v1 用当前 helper 冻结 12 个既有 fixture 的基线；v2 保留它们并加入 9-task weighted shared-dependency 反例，基线为 204 makespan。
- [x] 1.2 在候选比较前冻结 v1 的逐场景口径、seed/重复、secondary 与成本预算；v2 加入反例并冻结 fresh-handle public-context direct-decide 的 15 个样本与 1.25× p95 guard。
- [x] 1.3 比较 c1（public `canAdmit` filter，无可采用收益）和 c2（再以 public resource-claim backlog 同分打破）；c2 虽使 gate-shape 1000→900，却在新反例五次均为 300，已还原。
- [x] 1.4 作出 no-adopt 决定并交接到 `docs/tooling/workspace.md`；新增 workbench replay Test/Case，但未发生指南、JSDoc 或 Product 行为影响。

## Verification

- [x] 2.1 运行 `bun run typecheck`、`bun run lint`、`bun run format check` 及 `bun test src/learned-critical-path/strategy.test.ts scripts/project/admission-workbench/policy.test.ts`（6 pass）。
- [x] 2.2 以两个公开 artifact 重跑 v2；记录 package-content hashes、基线 context corpus hash/count、raw samples 与 204→300 回归。计时只含 fresh public prepared `decide`。
- [x] 2.3 将 v1 和旧 wrapper-cost evidence 标为 `historical-non-gating` / superseded，不作为采用证据。
- [x] 2.4 完成独立正确性与文档影响复核、AI-ready 文档及编码规范优化；新增 replay 测试与 Case，592/592 evidence 通过，聚焦 quality 门禁通过。先前六项 metrics 失败已修复，不作为通过证据。
- [x] 2.5 `bun run package:candidate:integration`（6 tests）、helper/workbench 目标测试（26 tests）与 `bun run check -- --all`（36/36）通过；真实接线摘要交给稳定 evidence。已独立复核 no-adopt 与用户材料不变的边界；通过本次稳定提交向发布交接，不授权 0.0.2 发布。
