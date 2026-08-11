# Tasks

先验证 Check/Record foundation seam，再依次实现 dependency closure、静态 plan、shared scheduler、foundation port mapping 和产品验收；只有实际产物与证据完成后才勾选 Implementation 或 Verification。

## Readiness

- [x] 0.1 已核对 proposal、design 与 tasks 只建立 private TaskPlan/shared-scheduler adapter，不复制公共 Check、Record、policy 或 foundation failure owner。
- [x] 0.2 已读取当前架构、Product/runtime dependency、相关活动决策、foundation 计划与历史形成材料，并把 foundation 落地明确为 implementation 顺序依赖而非未定义方向。
- [x] 0.3 已确认 Task identity、planner timing、selection closure、slots/resources、ack/report、ordinary failure 与 fatal drain 边界；`Open Questions` 无阻塞实施的未决项。

## Implementation

- [ ] 1.1 在修改测试前按 `test-evidence-review` 恢复 selection、execution、partial record/progress 和 dependency boundary Cases，并先证明 `establish-check-record-core` 的 catalog/binding、handles、sink、ack、report 和 finalization seams 已在当前 owner/runtime 可用。
- [ ] 1.2 在 `src/product/**` 定义 private schedule declarations、`requiresChecks`、TaskPlan factory/payload、SchedulerPolicy、canonical work keys、TaskDefinition 与 opaque TaskOutcome；只通过 shallow boundary 暴露后续 authoring 需要的稳定 types。
- [ ] 1.3 实现 requested Check transitive closure 及 unknown/self/cycle validation，确保 selection 在 applicability、record work 和 plan factory 前冻结。
- [ ] 1.4 实现 applicability-time factory 调用和全 batch TaskPlan validation/freeze，覆盖 duplicate/foreign/missing handles、unknown/cross-Check edges、cycles、invalid resources/policy 和 execution-time mutation。
- [ ] 1.5 实现一个 invocation shared scheduler：direct/Task/completion 统一 slot accounting、canonical ready selection、atomic exclusive resources、same-Check `needs` propagation 和 owner-only opaque value map。
- [ ] 1.6 接入 foundation bound context、record sink、adapter-owned incremental ack 和 Check dependency readiness；把 normal return、dependency unavailable、Task/completion failure穷尽映射到既有 terminal reports。
- [ ] 1.7 实现 ordinary failure isolation 与 scheduler-owned fatal stop-admission/drain，证明不构造 caller cancellation、public timeout、synthetic coverage 或第二套 primary diagnostic。
- [ ] 1.8 将现有 direct bindings 经同一 scheduler adapter 执行，更新 owner docs、public/private boundary tests 和语义 Case catalog；确认 public Check/Record snapshot 与 machine bytes 不因 private adapter 变化。

## Verification

- [ ] 2.1 运行 dependency closure、factory timing、plan mutation、cycle/resource、slot utilization、settlement race、opaque values、ack/report 和 fatal drain 的 deterministic target tests。
- [ ] 2.2 运行 concurrent record/ack 与 foundation integration tests，证明 later failure 保留 valid evidence、quality-failed prerequisite 可继续、execution-invalid prerequisite 被阻止且每项 applicable contribution 恰有一个 report。
- [ ] 2.3 运行 product import/dependency boundary、`bun run typecheck:product`、`bun run lint:product`、`bun run test:product` 与 `bun run test-evidence:check`。
- [ ] 2.4 运行 `bun run decisions:check`、`bun run validate` 与针对本 Change 的 `bun run change-plan -- check changes/establish-check-task-orchestration`。
- [ ] 2.5 运行 `bun run verify:vibe-check-workspace:required`；若实际 diff 跨 config/output/runtime 多个 owner，再运行 full verifier 和 full dogfood，并确认无 `scripts/tools/parallel-task-runner` Product runtime import、无 Task public identity、无未声明 cancellation/timeout 契约。
