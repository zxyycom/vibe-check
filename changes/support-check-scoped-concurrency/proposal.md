# Proposal

本 Change 在 composable Check tree 之上增加每个 resolved Check 的 invocation-wide `maxParallel`，由既有 shared scheduler 动态 admission 与 non-preemptive drain；它不重开、修改或归档任何前置 Change。

## Why

顶层 `scheduler.maxParallel` 只表达整个 invocation 的固定并发预算。某些 Check 在其实际执行窗口内需要更低的 invocation-wide 预算，例如为了避免同时占用高成本 CPU、IO 或外部工具；把这一需求塞进 TaskDefinition、CheckDefinition、数组顺序或新的 `parallel` boolean，会破坏 Check/Task 的既有职责，或建立第二个调度模型。

需要的是 Check authoring 可继承的标量上限，并由唯一 shared scheduler 在 Check 实际开始后暂时收紧 admission。低上限 Check 不能因持续有无约束工作被饿死；已经运行的工作也不能被取消或抢占。

## Outcome

完成后，composable Check tree 的 group 或 leaf 可声明 `maxParallel`。未声明的 node 继承最近父 group 的 effective value；只有整条 path 都未声明时才使用顶层 `scheduler.maxParallel`。child 标量覆写 parent，解析出的值必须是正安全整数且不大于 root budget。`1` 表示该 Check active 时 invocation-wide work 串行；不引入 mode、`parallel` boolean 或独立 scheduler。

某个 resolved Check 的 cap 从其首个 executable direct task 或 TaskPlan leaf 被 scheduler admit 时生效，直至 direct execution 或 TaskPlan terminal completion 的 settlement 完成。所有 active resolved Check caps 与 root budget 取最小值。低 cap ready 时 scheduler 使用 deterministic reservation，停止接纳会阻止其达成 cap 的无关新工作，并等待既有 work 自然 drain；不会取消、暂停或抢占已运行 Task。active constrained Check 的 ready work 优先于无约束或较宽松 Check 的 ready work。

## Scope

纳入范围：

- `adopt-composable-check-tree` 的 group/leaf authoring 增加 scalar `maxParallel`，以及其 validation、inheritance、normalization、fingerprint 和 diagnostics；
- resolved Check 到 existing shared scheduler 的 cap handoff，以及 dynamic admission、reservation、drain、activation/release lifecycle；
- direct Check work 与 custom TaskPlan leaf/terminal completion 的统一 lifecycle；
- dependency、mutex、unavailable/failure 与 deterministic scheduling 的回归证据，并确认 phase-boundary cooperative cancellation 继续由既有 Run owner 处理；
- repository dogfood、Configuration/Task owner docs、test evidence 与 downstream npm package Change handoff。

不纳入范围：

- 改变 `adopt-composable-check-tree`、`adopt-typescript-project-definition` 或其他前置 Change 的生命周期，或把本 Change 的任务回写进其 artifacts；前者交付的 Check tree 是本 Change 的直接前置输入；
- 改变 `CheckDefinition`、`TaskDefinition`、Record、policy、machine output、TaskPlan public metadata 或每个 Task 的 authoring shape；
- 新建 scheduler、worker、queue、parallel mode、boolean 开关、抢占、取消或动态 Task/Check registration；
- 以 array order 推断执行顺序，或改变 root `scheduler.maxParallel` 的 invocation-wide owner；
- npm package projection、manifest、publish 或 installed-consumer delivery；仅更新下游 Change 的前置依赖和 acceptance evidence。

## Success Criteria

- 未声明 `maxParallel` 的 node 继承最近父 group 的 effective value，整条 path 都未声明时才使用 root scheduler budget；child scalar 覆写 parent；每个 resolved cap 都是 `1..rootMaxParallel` 的安全整数。
- `maxParallel: 1` 在该 Check active window 内使整个 shared scheduler 至多运行一个 work Task；没有其他 cap 时保留 root budget 下的默认并发。
- active caps 与 root budget 的 effective cap 永远为最小值；cap 的生效不取决于 Check tree array order。
- Check cap 在 first executable direct/leaf admission 才激活，在 direct/terminal settlement 后才释放；selection、planning、skipped 或 not-applicable Check 不会单独收紧预算。
- 低 cap ready 时可预测地取得 reservation；无关新 work 不会无限填满较宽预算，已有 work 不被抢占，drain 后低 cap Check 被 admit。
- active constrained Check 的 ready task 优先；dependency、mutex、unavailable 与 failure 仍由既有 owners 决定，不被 cap bypass 或重写；phase-boundary cooperative cancellation 不进入 scheduler admission contract。
- public Check/Task/Record metadata 与 Core flat catalog 不新增 scheduler-only field；Project Definition normalization 通过独立 private orchestration map 下发 cap，唯一 shared scheduler 实施所有 budget/priority/admission decision。

## Affected Owners

- `adopt-composable-check-tree` 的既有交付：Check tree node shapes、group inheritance和 downstream handoff的直接前置输入；本 Change 不回写该 Change 的 artifacts。
- `src/product/project-definition*.ts` 与 Check-tree normalization owner：authoring scalar、validation、resolved cap 与 diagnostic/fingerprint mapping。
- `src/product/quality-core/src/check-record/**`：resolved Check lifecycle、orchestration-to-scheduler handoff；Check/Record catalog identity 保持 flat。
- `src/product/task-orchestration/**`：唯一 shared scheduler 的 ready selection、reservation、drain、active cap 和 deterministic admission owner；TaskDefinition 不扩张。
- `docs/configuration.md`、Task/Check owner docs、dogfood、Cases 与 test evidence：authoring meaning、runtime boundaries和证明。
- `changes/establish-api-only-npm-product-boundary/`：之后公开此 definition-facing field/types，并在 exact-tarball acceptance 覆盖动态 cap semantics。
