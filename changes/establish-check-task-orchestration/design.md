# Design

本设计把 Task orchestration 实现为 private `CheckExecutionBinding`/coordinator adapter；foundation 继续独占公共 Check/Record 模型、受控 ports、terminal reports 和 finalization。

## Context

本 Change 的 implementation 依赖 `establish-check-record-core` 已建立并同步以下 seam：serializable `CheckDefinition` 与 private `CheckExecutionBinding` 分离；selection/applicability freeze；opaque domain-work handles；bound record sink 和 incremental ack port；完整 contribution batch 与 closed terminal report set；CheckManager/RecordManager finalization。依赖是实施顺序，不阻止本计划先被确认。

活动未对齐决策 `use-static-check-task-plans-with-shared-scheduling` 已确认静态计划、invocation shared scheduler 和 Task 私有身份方向。`src/product/**` 仍是唯一 Product runtime owner；`scripts/tools/parallel-task-runner` 是开发脚本实现，当前 Product dependency rule 禁止 runtime 反向 import。后续 Project Definition 只 author task binding/schedule data，不拥有本设计的 runtime semantics。

## Goals / Non-Goals

**Goals**

- 让 direct 与 TaskPlan private bindings 共享一次 invocation 的 scheduler 与 foundation report seam。
- 在任何 function execution 前闭合 Check dependencies，并构造、验证和冻结全部 applicable TaskPlans。
- 用最小 `needs`、global slots 与 exclusive resources 治理跨 Check 声明 work。
- 经 foundation ack/sink/report ports 保留 partial progress 和 records，不让 Task 成为公共产品对象。
- 普通 failure 隔离影响；只有 scheduler-owned fatal invariant/admission failure停止 admission 并真实 drain started work。

**Non-Goals**

- 重新定义 CheckDefinition、CheckRun、CheckResult、QualityRecord、DecisionPolicy 或 ExecutionReport。
- caller cancellation、timeout、hard termination 或 bounded drain。
- runtime Task registration、dependent value passing、cross-Check Task edge 或 result-driven graph expansion。
- command/process/worker/remote execution、retry、priority、capacity resource 或 per-Check budget。
- 控制 admitted function 内部自行创建的 Promise、thread、worker 或 subprocess。

## Decisions

### 1. Task 是 private execution identity

Task 仅以 invocation-private `(checkId, taskId)` 用于 plan validation、admission、diagnostic 和 completion lookup。它不进入 `CheckDefinition`、QualityRecord identity、policy selector、comparison、coverage 或 machine artifact。Task 的拆分和合并因此仍是 private implementation change。

### 2. TaskPlan 在 applicable invocation 后构造

Resolution 注册 private TaskPlan binding、serializable schedule metadata 与 factory；不在 module load 或 public definition 中创建 TaskPlan。Foundation 把 Check 判为 applicable 后，factory 才接收 immutable approved planning context 与 opaque domain-work handles。Factory 不能访问 sink、ack port、manager、output writer 或 runtime registration port。

Coordinator 收集所有 applicable payload：direct binding 归一化为一个 managed direct work，Task binding 保持 structured plan。全 batch 在任一 managed function 启动前完成 ID、handle ownership、edges、cycles、resources、policy 和 mutation validation并冻结。Skipped/not-applicable Check 不调用 factory；applicable empty plan 直接进入 owning completion，不能从 emptiness 推断结果。

### 3. `requiresChecks` 在 selection 前闭合

每个 private schedule declaration 可以列出 Check-level `requiresChecks`。Planner 从 initial caller/policy request 计算 transitive closure，拒绝 unknown ID、self edge 和 cycle，再冻结 selection。

Dependency 表达 lifecycle readiness，不表达 quality policy：preclosed not-applicable、合法 `passed` 和合法 `failed` result 都满足依赖；unavailable、execution-failed 或 invalid returned candidate 阻止 dependent functions，并为 dependent binding产生一个 foundation `execution-failed` report。若 dependent 需要具体领域材料，应由自身 applicability 说明，不由 scheduler 读取 records。

### 4. 一个 scheduler 只治理自己调用的 functions

`SchedulerPolicy.maxParallel` 是 invocation-owned positive integer。Direct adapter、Task 和 completion 每个在被 scheduler 调用且 promise 未 settled 时占一个 slot。函数内部创建的 Promise、thread、worker 或 subprocess 不计入，也不获得全局保证。

Task `resources` 是 invocation-global ASCII lower-kebab exclusive names。一个 work 的所有 resources 在 admission 时原子获取、settlement 时释放，避免 hold-and-wait。Ready work 按 canonical discriminated key 考察；先出现但 resource-blocked 的 work 不阻止后续 compatible work 使用空 slot。首版没有 capacity、读写模式、priority 或 per-Check limit。

### 5. `needs` 只表示同 Check successful fulfillment

Task `needs` 只能引用同一 Check 的 Task。Fulfilled 才解锁 dependent；throw 形成 private dependency-blocked propagation。Dependent Task 不读取 predecessor value。Scheduler 把 fulfilled values 存入 invocation-private readonly map，仅在全部 Tasks fulfilled 后交给 owning completion；不会 parse、serialize、hash、cache 或跨 Check share，binding terminal 后释放引用。

Task 通过 foundation-bound execution context/record sink 提交 final records；ack port 只由 adapter 持有。一个 Task 静态关联零到多个 domain-work handles，function fulfilled 后 adapter 才逐项 ack；throw/block 不 ack。Task 数量、identity、value 和 completion work不形成 public coverage。

### 6. Failure 映射到 foundation reports

所有 Tasks fulfilled 后执行 completion；合法 return 形成 `ExecutionReport.returned(candidate)`，Task throw/dependency block/completion throw 或 rejection 形成 `execution-failed`，pre-admission binding dependency unavailable 可以形成 `unavailable`。Foundation 仍是 result candidate、ack、record integrity 和 run failure precedence 的唯一 validator/finalizer。

普通 Task/Check failure 不停止 unrelated admission。Existing valid records 与 accepted acknowledgements 保留，且每个 applicable contribution 仍返回一个 terminal report。Scheduler 不用质量 verdict控制 admission，也不复制 record identity conflict 或 primary diagnostic 逻辑。

### 7. 只有 scheduler-owned fatal error 才停止并 drain

若 scheduler 在已有 functions 启动后发现自己的 fatal invariant/admission failure，它停止新 admission，等待每个 scheduler-started function 实际 settle，再向 foundation 报告 Product execution-integrity failure；不构造 cancelled Task 或部分可信 report set。同进程 non-settling function 可能让 drain 永久 pending，因此不承诺 bounded latency、timeout 或强制终止。

### 8. Live progress 与 final identity 分离

Scheduler 可以按 observed start/settlement order 发出仅供 live progress 的事件；private outcomes 仍按 frozen canonical keys 存放。Observed order 不进入 Check/Task/Record identity、coverage 或 artifact ordering。最终事实继续由 foundation snapshot canonicalize。

### 9. Product 内重新实现最小 kernel

实现位于 `src/product/**` private execution boundary，只包含 dependency closure、plan validation、bounded scheduler、exclusive resources、opaque values、ack/report mapping 和 fatal drain。`scripts/tools/parallel-task-runner` 可以作为已证明需求的对照，但不能 runtime import、vendor、复制或变成 public type source。

## Risks / Trade-offs

- **Same-process function 可以 hang 或破坏 global state。** 本 Change不声称隔离或取消；Project Definition trust owner 提供跳过项目代码的路径。
- **`maxParallel` 不控制函数内部 fan-out。** 文档和 diagnostics 明示计数边界；需要治理的 work 应显式拆成 Tasks。
- **Opaque values 会保留到 completion。** 值只在 owning binding 内可见，terminal report 后释放引用。
- **一个粗 Task throw 时可能已处理多个领域单元。** Valid records 保留但 handles 不 ack；作者需要更细 coverage 时拆分静态 Tasks。
- **Success-only `needs` 不支持 failure cleanup graph。** Cleanup 留在 started function 的 `try/finally`；只有真实 consumer 证明需求后才扩展 lifecycle。
- **Global resource name 可能意外碰撞。** 碰撞安全地序列化 work；不按 Check 自动 namespace，以保留跨 Check exclusion。

## Open Questions

无。Public Project Definition authoring shape 与 Product-owned `maxParallel` default 由后续 Project Definition owner承接；它们不会改变本 Change 已确定的 normalized scheduler semantics。
