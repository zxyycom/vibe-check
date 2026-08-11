# Proposal

本 Change 计划在 Check/Record Core 的私有 execution seam 上建立静态 TaskPlan 与 invocation 共享调度；在进入 implementation 前，proposal 仍可随同一目标的事实核对而修订。

## Why

如果每个 direct/custom runner 各自使用 `Promise.all` 或私有 scheduler，多个 Check 会共同超卖 CPU、IO 和排他资源，且 execution 开始后再扩张任务图无法预先验证依赖、环和完整 work set。产品需要一个小而明确的 private orchestration adapter，同时继续只用 Check、CheckResult 与 QualityRecord 表达公共产品结果。

## Outcome

Initial requested Checks 先通过 `requiresChecks` 形成冻结 closure；每个 applicable invocation 可以贡献完整静态 TaskPlan。一个 invocation-scoped scheduler 在任何 managed function 启动前验证全部 direct work、Tasks 和 completion work，并统一实施 `maxParallel`、同 Check task dependencies 与 named exclusive resources。Task 保持私有执行单元，只通过 foundation-owned ack、record sink 和 terminal report ports 影响最终 Check/Record snapshot。

## Scope

纳入范围：

- private schedule declarations、`requiresChecks` closure、applicability 后的 TaskPlan factory、全 batch validation/freeze 和 direct-runner adapter normalization；
- invocation-global managed-function 并发预算、同 Check `needs`、exclusive named resources、canonical admission、opaque task values 与 owning completion；
- foundation domain-work acknowledgement、bound record sink、Check dependency readiness 与 closed terminal report mapping；
- ordinary failure isolation，以及 scheduler-owned fatal admission/invariant failure的 stop-admission 和 started-function drain；
- `src/product/**` 内最小实现、稳定 authoring types、owner 文档和测试证据。

非目标：修改公共 Check/Record/DecisionPolicy 模型；runtime Task append、cross-Check Task edges、result-driven fan-out；caller cancellation、public `AbortSignal`、timeout 或 hard termination；command runner、worker/process isolation、retry、priority、persistent recovery 或把 `scripts/tools/parallel-task-runner` 作为产品依赖。

## Success Criteria

- Unknown/self/cyclic `requiresChecks` 在 applicability 与 execution 前失败；quality `failed` verdict 仍满足 lifecycle dependency，unavailable/execution-invalid prerequisite 才阻止 dependent execution。
- Skipped/not-applicable Check 不调用 TaskPlan factory；所有 applicable direct/Task contributions 在任一 managed function 启动前形成一个 valid frozen execution plan。
- `maxParallel` 只统计 scheduler 调用且尚未 settled 的 functions；named resources 在 invocation 内原子获取/释放，resource-blocked work 不无谓占用 slot。
- Task identity、value、settlement 和拆分不进入 public catalog、coverage、record identity、policy 或 machine output；coverage 只由 foundation handles 与 acknowledgements 决定。
- Task/completion failure 产生 foundation `execution-failed` report，independent work 继续；valid records/acks 保留，每个 applicable contribution 仍恰有一个 terminal report。
- Product runtime 不 import、vendor 或复制 `scripts/tools/parallel-task-runner`；目标模型、并发/依赖/失败组合和 downstream Project Definition seam 均有完整验证。

## Affected Owners

- `src/product/**`：private execution binding、planning、scheduler、foundation port adapter 和 runtime dependency boundary。
- `docs/architecture.md`：Core 与 private execution/orchestration 的调用方向和职责。
- Check/Record 当前稳定 owner（由 `establish-check-record-core` 同步后的 `docs/` 文档承接）：public catalog、run/result、record sink、ack、terminal report 与 finalization。
- `docs/testing.md`、`docs/testing/cases/**` 与相关 product tests：selection、plan validation、scheduler、failure isolation 和 boundary evidence。
- `scripts/tools/parallel-task-runner/**` 仅作为当前开发脚本 owner 和需求对照，不由本 Change 修改或引入 Product runtime。
