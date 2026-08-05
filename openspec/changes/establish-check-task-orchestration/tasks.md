> **核心句：**本任务清单按 foundation 同步门禁 → selection/TaskPlan → shared scheduler → ports/reports → 验收实施 private Check 任务编排，Task 始终不成为第三套质量模型。

## 执行规则

- **阻塞门禁：**tasks 1.1–1.4 必须全部完成，且 `establish-check-record-core` 已经实施并同步到主 spec/docs/runtime 后，才能执行 task 2.1 及之后的任何实现、测试修改或长期文档迁移；任一 1.x 未完成都必须停止。
- Checkbox 只有在对应代码、测试证据、owner 文档与验证全部完成后才能勾选；命令成功本身不等于行为已证明。
- 实施发现会改变 selection closure、TaskPlan timing、dependency、resource、ack、ExecutionReport 或公开 authoring 边界的新选择时，先更新本 change artifacts 并重新执行全部 1.x 门禁，不在代码中临时决定。
- 本 change 不修改或提前细化 future format/network/duplicate Checks；下游 change 只能消费已证明的通用 contract。

## 1. 实现前阻塞审计与依赖同步

- [ ] 1.1 **[BLOCKING]** 对 proposal、design、`check-execution-orchestration` delta spec 与 tasks 执行实现前审计并保存可复核结论：四类 artifacts 必须共享“private TaskPlan binding 消费 foundation opaque contribution seam”的核心句；capability ID/目录一致；没有重新定义 public Check/Record/Policy types；`requiresChecks`、planner timing、applicability、ack、report、failure 与 concurrency scope 一致；没有 caller cancellation/AbortSignal/timeout 承诺；Open Questions 无未回答问题；运行 `openspec validate establish-check-task-orchestration --type change --strict --no-interactive` 通过。
- [ ] 1.2 **[BLOCKING]** 证明 `establish-check-record-core` 已实施并同步，而非只完成临时 artifacts：public CheckDefinition/private CheckExecutionBinding separation、selection/applicability freeze、opaque contribution、invocation-private handles、bound sink、incremental ack、foundation result validator、exhaustive ExecutionReport、report-set integrity 和 Core finalization 在主 spec/docs/runtime/tests 中可用；若 seam 缺失或语义漂移，停止并先修 foundation。
- [ ] 1.3 **[BLOCKING]** 使用 `decision-records` skill 和 `bun run decisions:list` 核对 dynamic Check binding、Task internal identity、shared scheduler、same-process trust 与 scripts gitlink dependency 方向；需要演进的长期 decision 先由对应 owner 确认并运行 `bun run decisions:check`，不得以本 OpenSpec design 代替长期 owner。
- [ ] 1.4 **[BLOCKING]** 使用 `test-evidence-review` skill 运行 `bun run test-evidence:check`，通过 `topics`、`list` 与 `show` 恢复 selection/applicability、ExecutionReport、incremental ack、record identity conflict、Check finalization 与 product dependency boundary 相关 Cases，并写清新增测试各自证明的可观察 contract。

## 2. Selection closure 与 invocation TaskPlan

- [ ] 2.1 在 `src/product/**` private execution boundary 定义 `CheckScheduleDeclaration`、TaskPlan `CheckExecutionBinding`、TaskPlan factory/payload、`SchedulerPolicy`、canonical work key、TaskDefinition 与 private TaskOutcome；全部 foundation types 通过 shallow owner import 复用，不在 public CheckDefinition 增加 execution fields。
- [ ] 2.2 先建立失败测试，再实现 `requiresChecks` transitive requested-selection closure：覆盖 multi-hop、duplicate edge、unknown ID、self edge 与 cycle，并证明 closure 在 applicability/contribution/record work 前冻结。
- [ ] 2.3 实现 invocation-scoped TaskPlan planner：只为 applicable invocation 调用，输入仅 foundation-approved immutable planning context 与 owned work handles；skipped/not-applicable 不调用，plan factory 无法取得 sink、ack、manager、output 或 runtime registration port。
- [ ] 2.4 先建立失败矩阵，再实现全 batch plan validator：duplicate Task、unknown/foreign/duplicate/missing handle association、unknown same-Check `needs`、cross-Check Task reference、Task cycle、invalid/duplicate resource、invalid `maxParallel` 和 execution-time mutation 全部在任一 scheduler function 前失败。
- [ ] 2.5 实现 applicable empty TaskPlan 与 direct contribution normalization：empty plan 仍产生 completion work；direct runner 只是一个 private scheduler adapter work，二者都不从 zero/count 推断 applicability、quality 或 coverage。
- [ ] 2.6 在 Product shallow authoring boundary 只导出稳定 schedule/binding factory types 与 runtime normalization；不得导出 scheduler internals、foundation managers、opaque handles 实例、scripts toolkit types 或运行中 registration API。

## 3. Shared scheduler kernel

- [ ] 3.1 先建立 deterministic admission 测试，再实现一个 invocation shared scheduler：direct adapter、Task 与 completion 按 canonical discriminated key admit，共同受 positive `maxParallel` 约束。
- [ ] 3.2 实现 invocation-global exclusive resource claims 的 atomic acquire/release；证明 multi-resource work 不 hold-and-wait、跨 Check 同名 resource 不重叠、resource-blocked 前项不阻止后续 compatible work 使用 slot。
- [ ] 3.3 实现 Task `needs` successful-fulfillment 传播：fulfilled 解锁，throw 递归形成 private dependency-blocked；dependent Task 只读取 prerequisite status，不读取 opaque value、record 或 quality verdict。
- [ ] 3.4 实现 fulfilled Task opaque value 的 owner-only readonly map：只在全部 Tasks fulfilled 后交给 owning completion，never parse/serialize/cache/hash/cross-Check share，并在 binding report 完成后释放 references。
- [ ] 3.5 用 Task 内部 `Promise.all` 和 test-owned subprocess 证明 `maxParallel` 只统计 scheduler-managed unsettled functions；文档、diagnostic 和 tests 不得声称控制 function 内部并发。
- [ ] 3.6 实现 arrival-order invocation progress events 与 canonical private outcome index 分离；使用可控 settlement race 证明 events 可变化而 Task keys/public Check/Record order 不变。

## 4. Foundation ports、dependencies 与 reports

- [ ] 4.1 将 foundation bound execution context/record sink 交给 owning Task，但 ack port 只由 Task adapter 持有；Task fulfilled 后逐 handle 增量 ack，throw/dependency-block 不 ack，unknown/foreign/late ack 继续服从 foundation protocol failure。
- [ ] 4.2 实现 Check dependency readiness：preclosed not-applicable 与 foundation-validator 接受的 returned passed/failed result 满足 `requiresChecks`；unavailable、execution-failed 或 invalid returned candidate 阻止 dependent functions 并产生其 execution-failed report，不把 quality failed 当作 scheduler failure。
- [ ] 4.3 实现 TaskPlan terminal mapping：all Tasks fulfilled 后运行 completion；normal return→foundation `returned(candidate)`，Task throw/dependency-block/completion throw 或 rejection→`execution-failed`，binding dependency unavailable→`unavailable`；scheduler 不创建 CheckRun/Result 或自报 coverage/counts。
- [ ] 4.4 验证单项 Task/Check failure 不停止 unrelated admission，且每个 applicable contribution 恰好一个 terminal report；missing/duplicate/unknown/unsettled report set 继续映射 foundation Product integrity failure。
- [ ] 4.5 建立 concurrent record/ack tests：valid records 与 accepted acks 在 later failure 后保留；byte-equivalent replay 保持 idempotent；same-ID different-body conflict 不 first-arrival-wins 并阻止可信 final publication。
- [ ] 4.6 只为 scheduler-owned fatal invariant/admission failure 实现 stop-admission 与 started-function drain；删除/拒绝 caller cancellation、public AbortSignal、timeout 与 cancelled Task surface，并用 deferred Promise 证明不在 started function 实际 settle 前声称 drained。
- [ ] 4.7 检查完整 failure precedence 组合：invalid record、ack violation、invalid completion candidate、unavailable、Task/completion throw 与 record identity conflict 均由 foundation owner 按既定优先级 finalize，scheduler 不建立第二套 primary diagnostic 逻辑。

## 5. Product 接入、文档与验收

- [ ] 5.1 在 foundation opaque coordinator seam 接入 Task orchestration payload 并迁移 current direct bindings 通过同一 shared scheduler adapter；证明 public definitions/fingerprint、CheckRun/Result/Record 与 machine output 不因 private adapter 形状改变。
- [ ] 5.2 检查 `src/product/**` runtime import graph 并增加 boundary test，保证不 import、vendor 或复制 `scripts/tools/parallel-task-runner`，repository scripts 仍只单向调用 Product 入口。
- [ ] 5.3 更新对应 Product owner 文档与 `docs/navigation.md`：记录 private Task identity、requested closure、applicability/planner timing、slot scope、resources、ack/report mapping、fatal internal drain 和无 caller cancellation/isolation 边界；不得宣称 future Checks 已迁移。
- [ ] 5.4 按 task 1.4 证明目标新增/更新语义 Cases，先运行最窄 selection/planner/scheduler/coordinator tests，再运行完整 `bun run test-evidence:check` 闭合新增实体。
- [ ] 5.5 运行 Product import、typecheck、lint、dependency 与 targeted 入口检查，以及 `openspec validate establish-check-task-orchestration --type change --strict --no-interactive`、`bun run validate` 和受影响 active changes strict validation。
- [ ] 5.6 运行 `bun run verify:vibe-check-workspace:required`；如果实现跨多个 output/config/runtime 边界，再运行 `bun run verify:vibe-check-workspace:full` 与 full dogfood，记录 same-process non-settling function 无法验证 hard deadline 的边界。
- [ ] 5.7 最终审查 diff、public exports 与 dependency graph：只实现自定义 Check 最小静态任务编排，没有 public model 复制、runtime Task append、caller cancellation、command execution、isolation、retry/priority 或 future feature-specific contract。
