> **核心句：**本 change 通过 check-record foundation 的 opaque execution-contribution seam，为 applicable 自定义 Check 建立调用期静态 TaskPlan 与共享 scheduler，而不改变公共 Check、Record 或 policy 模型。

## Why

自定义 Check 如果各自使用 `Promise.all` 或私有 scheduler，Vibe Check 无法统一治理多个 Check 之间的任务 admission、并发上限、资源互斥和依赖失败。项目需要一个小而明确的 private execution adapter，让 Check 作者声明简单任务图，同时继续只通过 foundation-owned Check 与 Record 表达产品结果。

## What Changes

- 新增 task-orchestration `CheckExecutionBinding`：它通过 foundation-owned `CheckExecutionContribution` envelope 提交 opaque TaskPlan payload；public `CheckDefinition` 继续只包含可序列化 metadata，direct `CheckRunner` 只是另一种 private binding adapter。
- 在 selection freeze 前用 `requiresChecks` 对初始 requested checks 形成 transitive closure，并预检 unknown check 与 cycle；quality verdict `failed` 不等于 execution failure，不会阻止依赖 Check。
- 只为 requested/applicable invocation 调用 invocation-scoped TaskPlan planner。Planner 接收 foundation-approved immutable context 与 opaque domain-work handles，在任何 scheduler work 前完成构造、全量验证和冻结；runner 执行期间不能追加 Task。
- 使用一个 invocation-scoped shared scheduler 统一管理 direct-runner adapter work、显式 async Tasks 和 TaskPlan completion work 的 global `maxParallel` 与 named exclusive resources。
- Task `needs` 只表达同一 Check 内的 successful-fulfillment prerequisite；Task opaque value 只交给 owning Check 的 completion binding，dependent Task 不读取前置 value。
- 每个 fulfilled Task 通过 foundation acknowledgement port 增量确认其静态关联的 0..n domain-work handles；Task count、identity 和 completion work 不成为 public coverage。
- 将 Task throw、Task dependency block 与 completion throw/rejection 归一化为 foundation `execution-failed` report；合法 completion return 形成 `returned` report。独立 work 继续运行，质量 `failed` verdict 不触发 scheduler fail-fast。
- 保留并发提交的 valid records 与已有 acknowledgements；conflicting duplicate record 仍由 foundation 按 identity-integrity failure 处理，scheduler 不采用 first-arrival winner。
- 产品实现不得 runtime import、vendor 或复制 `scripts/tools/parallel-task-runner` gitlink；它只作为已验证需求的历史原型，不成为 Product dependency。

## Capabilities

### New Capabilities

- `check-execution-orchestration`: 定义 private TaskPlan binding、requested dependency closure、静态 plan、shared scheduler、incremental acknowledgement 与 ExecutionReport 映射。

### Modified Capabilities

无。本 change 完全消费 `quality-checks` 已声明的 public-definition/private-binding 分离、opaque contribution、incremental acknowledgement 与 terminal `ExecutionReport` extension seam，不重新定义或修改 `CheckDefinition`、`CheckRun`、`CheckResult`、`QualityRecord` 或 `DecisionPolicy` requirement。

## Impact

- **前置依赖：**`establish-check-record-core` 必须先实现并同步 `CheckExecutionBinding`/contribution、selection/applicability、opaque domain-work handles、ack port、bound record sink、terminal report set 与 Core finalization。
- **后续消费者：**`adopt-typescript-project-definition` 可以提供 task-orchestration binding factory、`requiresChecks`、TaskPlan factory 和 invocation scheduler policy authoring；module discovery、load-time 信任和配置迁移不属于本 change。
- **Product runtime：**实现位于 `src/product/**` execution boundary；foundation Core 只看到 opaque contribution envelope、ports 和 terminal reports，不读取 Task payload。
- **并发边界：**`maxParallel` 只统计 scheduler 实际调用且尚未 settled 的 functions；Task 或 runner 内部自行创建的 Promises、threads 或 subprocesses 不受该数字约束。
- **不在范围：**caller cancellation、public `AbortSignal`、timeout、hard termination、运行中 Task 追加、result-driven fan-out、command runner、worker/process/remote isolation、distributed queue、retry、priority、persistent recovery 和 scheduler 解释业务结果。
