# Design

本设计以“机械迁移现有 runner，再增加 Check adapter”为唯一主线：通用调度语义只有一个实现 owner，Product-specific planning、failure containment 和 foundation lifecycle 留在边缘层。

## Context

`scripts/tools/parallel-task-runner` 当前是 revision `025af7350e2d624eeded23784f411bec5f4a1473` 的 gitlink。它已经通过自身 tests 证明 task normalization、nested group expansion、父组 `type` / `mutex` / `dependsOn` / `env` / `envFile` 继承、group dependency 到全部 descendant leaves 的展开、unknown/duplicate dependency validation、explicit concurrency、mutex exclusion，以及 `run + onComplete` 都 resolve 后才完成 dependency。Resolved result 对 scheduler opaque。

该 runner 不是无人使用的历史材料。`scripts/vibe-check-workspace/checks/normalization.ts`、`checks/model.ts` 和 `verify/runner.ts` 直接 import 它；root package scripts、pnpm workspace/lockfile、Script Tooling owner 和 repository-tooling Cases 也引用旧路径。因此“迁入 Product”必须同时迁移这些 consumers 并退出 gitlink，不能复制一份后让两处继续演进。

仓库已有明确的 source-lift precedent：`src/product/README.md` 用 pinned provenance、byte-preserved source/tests 和独立 integration adjustments 建立 Product ownership。本 Change 沿用同一方法，把 runner 放到 `src/product/task-orchestration/**`。迁入后，原 foundation import 作为显式 integration adjustment 改为 Product-owned `foundation/src/args.ts`；它不再经过 `scripts/**`。

当前 Check/Record foundation 已经拥有 public definitions、private bindings、selection/applicability、owned work handles、acknowledgement ports、record sinks、CheckRun、snapshot integrity 和 completeness。`QualityRecord` 本身只含 record content 与 manager-bound identities；coverage/integrity 是 run/snapshot facts。现有 coordinator 只在全 batch 完成后 finalize managers，因此本 Change 必须增加 foundation-owned per-Check settlement，才能在不复制 result/ack/record 判断的前提下支持 `requiresChecks`。活动决策另已确认静态 `TaskPlan`、invocation-scoped shared scheduler 和 Task 私有身份。

## Goals / Non-Goals

**Goals**

- 机械迁移并保留现有 runner 的完整可观察 behavior，而不是根据 behavior 另写一份实现。
- 让 script tooling 与 Product Check orchestration 消费同一 Product-owned source owner。
- 用 closed Product adapter 把静态 TaskPlan 接到 runner；scheduler 不理解 Check、Record、work handle 或 quality verdict。
- 在任何 user-managed function 前完成完整 Check/Task planning、validation 与 freeze。
- 保持 foundation 与 publication contract 不变，并明确区分私有执行结构、稳定 run/snapshot facts 和单条 record content。

**Non-Goals**

- 在 source lift 同时重设原 runner 的通用 authoring 或 normal scheduling semantics。
- 把 runner deep source path、Task identity、manager ports 或 scheduler state 变成 public product API。
- 让 Product TaskPlan 接受原 runner 的 open arbitrary metadata，或让 script-only `type` / `env` / `envFile` 进入 Check/Record contract。
- 增加动态 graph、cancellation、timeout、retry、priority、capacity resources、per-Check concurrency 或内部 fan-out governance。

## Decisions

### 1. Source migration 与 Product adjustment 分成两个可审阅阶段

迁移目标固定为 `src/product/task-orchestration/**`，并按以下顺序实施：

1. 从 pinned gitlink object 提取 runner 的 `src/**` 与 `test/**`，在新位置保持 byte identity；在 `src/product/README.md` 记录 revision、提取来源和 byte-preserved file set。
2. 把 package/test configuration、consumer imports 和 foundation dependency 接到 repository Product boundary；这些文件或行属于明确列出的 integration adjustments，不伪装成 byte-preserved 内容。
3. 运行迁入后的原 tests 与 workspace verifier acceptance，证明 source ownership 变化没有改变行为。
4. 只有迁移基线成立后，才增加 closed Product planning 与 Check adapters；每项 Product delta 使用独立 tests，与原 runner parity tests 分开。
5. 所有 consumers 切换后，移除 `scripts/tools/parallel-task-runner` gitlink、`.gitmodules` entry、旧 pnpm workspace/lockfile importer 和过时 root toolkit scripts。仓库最终只保留一个 implementation owner。

这不是 vendor snapshot：迁入后源码由 Vibe Check Product 持续拥有。Pinned provenance 只说明形成时来源和 byte-preserved 基线，不建立第二个 live upstream owner。

### 2. 一份 runner source 服务两类 repository-internal consumer

迁入的通用 runner 保留现有 `TaskDefinition` / `NormalizedTask`、`expandTasks`、`validateTaskGraph` 和 `runParallelTasks` 行为，以免 workspace verifier 因 Product 接线丢失 `type`、`env`、`envFile` 等 script metadata。

Check orchestration 不直接接受这个 open `TaskDefinition` 作为 Product contract。它拥有一个 closed private TaskPlan validator，只允许 Check scheduling 所需的 group/leaf ID、`dependsOn`、`mutex`、owned work assignment 和 functions；验证通过后再映射为 runner tasks。这样：

- group expansion、dependency scheduling、concurrency 和 mutex 算法只有迁入 runner 一份；
- script consumer 继续获得原有完整 metadata；
- Product adapter 不把 open bag、script command metadata 或 runner types 提升为 public Check API；
- `src/product/task-orchestration/**` 是 repository-internal source owner，不加入 public package exports。

### 3. 原 runner 的 normal scheduling contract 原样保留

| Runner capability | 迁移后保持的 contract |
| --- | --- |
| Parent group | Descendant leaves 继承累计的 `type`、`mutex`、`dependsOn`、`env` 与 `envFile`；group 自身不执行。 |
| Group dependency | 对 group ID 的依赖展开为其全部 descendant leaf IDs。 |
| Dependency completion | `run` 与 `onComplete` 都 resolve 后才满足 `dependsOn`；resolved value 内容不参与判断。 |
| Parallelism | Ready 且 mutex-compatible 的 independent tasks 可以并行；显式 concurrency 限制 active task 数。 |
| Mutex | 一个 task 的全部 mutex 在 admission 时共同可用才启动，并持有到 lifecycle completion。 |
| Result | Scheduler 只收集 opaque resolved values，不解释 `{ verdict: "failed" }`、`{ ok: false }` 或 Product outcome。 |

Pinned runner 只预检 duplicate/unknown dependency，cycle 会在 schedule blocked 时暴露。静态 Product TaskPlan 需要更强的 pre-work guarantee，因此 full cycle detection 属于 closed Product plan validator；它不通过改写 generic runner contract 来实现。Product 总是显式提供 `SchedulerPolicy.maxParallel`，不依赖 runner 的 omitted-concurrency behavior。

### 4. Product planning 在调用 runner 前闭合

一次 invocation 按以下顺序形成执行输入：

1. Validate/freeze public Check definitions、private direct/task bindings、closed schedule declarations 和 positive-safe-integer `SchedulerPolicy.maxParallel`。
2. Validate 完整 `requiresChecks` graph，拒绝 unknown/self/cycle，并从 initial selected Checks 计算 prerequisite closure。
3. 只为 selected Checks 解析 applicability；unselected 与 not-applicable Checks 不调用 binding 或 factory。
4. 按 canonical Check ID 同步调用 applicable TaskPlan factories。Factory 只获得 owning frozen planning input，不获得 sink、ack manager 或动态 registration port。
5. 对所有 plans 执行 closed shape、unique ID、known dependency、full cycle、group expansion、exactly-one Check-level completion function、leaf function 与 exact owned-work partition validation，再 detached freeze。
6. 任一 catalog、applicability、factory 或 plan failure使 planning 整体失败；在该阶段 user-managed execution function zero calls。
7. 全部 plans 合法后，adapter 才生成一个 invocation-wide runner task list并调用迁入的 scheduler。

TaskPlan 可以使用 nested groups。Product group/leaf 的 `dependsOn` 和 `mutex` 直接映射到 runner 同名字段；parent inheritance 与 group-dependency expansion 复用 `expandTasks`。所有 runner IDs 在 invocation 内私有 namespace 中唯一，避免不同 Check 的 local task IDs 冲突。

### 5. Direct、Task 与 Check completion 只在 adapter 中不同

Adapter 生成三类私有 runner task，但 scheduler 不读取其类别：

- applicable direct binding 生成一个 task，执行现有 binding 并形成 owning Check terminal outcome；
- TaskPlan leaf 生成普通 task，拥有该 leaf 的 private work assignment，执行时获得 function-scoped record sink；
- 每个 TaskPlan 生成一个 synthetic completion task，依赖其全部 owning leaves；它调用该 plan 中
  exactly-one `complete(outcomes)`，只读取 owning Check 的 opaque leaf outcomes 并返回 candidate Check
  result。

任一 owning leaf failed 或 blocked 时，adapter 不调用 `complete`，而是直接向 foundation settlement提交 execution-failed candidate。Zero-leaf plan 仍拥有并调用唯一 completion function。`complete` 不是 reducer registry或第二种 binding；它只是 TaskPlan 对应 direct binding return 的 Check-level 单一出口。

`requiresChecks` 连接到 prerequisite Check 的 synthetic/direct terminal task，而不是连接任意内部 leaf，也不允许跨 Check 读取 Task value。Selected not-applicable Check 由 planning 预先形成可信 terminal outcome，无需 runner task。

Repository built-ins 在本 Change 中保持 direct binding，并通过同一 runner 占用 global slot。其函数内部现有 `Promise.all` 或 scanner fan-out 仍是未声明内部工作，不获得额外 scheduler guarantee；本 Change 不为了展示 TaskPlan 而拆分它们。

### 6. Ordinary failure 由 Product adapter 收敛，不改写 scheduler success model

Product adapter 不让 project-code 或 ordinary Check protocol failure直接 reject generic scheduler。每个 wrapper 把调用结果收敛成 invocation-private outcome；runner 仍只看到一个 resolved opaque value。

| Upstream situation | Foundation / adapter meaning | Dependent user function |
| --- | --- | --- |
| Task 正常 resolve 任意 value | Private fulfilled outcome；value 不被 scheduler 解释。 | 可以执行。 |
| Check 合法完成并返回 `passed` 或 quality `failed` | 形成可信 completed CheckRun。 | `requiresChecks` 已满足，可以执行；是否门禁失败由 DecisionPolicy 决定。 |
| Check 为 `not-applicable` | 形成可信 zero-work terminal CheckRun。 | `requiresChecks` 已满足，可以执行。 |
| Task/Check function throw/reject，或 foundation settlement判定 result/record/ack protocol失败 | Foundation 返回 unavailable；owning Check 最终使用既有 failed facts。 | 依赖该 availability 的 wrapper 不调用 project function，直接形成 blocked/unavailable outcome。 |
| Trusted adapter/manager invariant 破坏 | 标记 invocation-fatal；后续 wrapper 不再调用 user function，已启动 wrapper完成收敛。 | 不执行；scheduler drain 后整个 invocation 不发布 trusted snapshot。 |

因此 failure isolation 是 Check adapter 的 Product delta，不是给 scheduler 增加 `failed | blocked` 公共状态，也不是改变“resolved value opaque”的原语义。Unrelated wrappers 没有 failed dependency，仍由原 scheduler 正常 admission。

### 7. Stable facts 与 invocation-private structure 严格分层

| Object / layer | 内容与 owner | 稳定性和输出 |
| --- | --- | --- |
| `QualityRecord` | RecordManager 绑定的 record content：`recordTypeId`、`level`、`semanticSubject`、`message`、`fields`、`location`，以及 `checkId`、`checkRunId`、`recordId`。 | 稳定 record contract，发布到 `records.ndjson`；本 Change 不增加字段。 |
| `CheckRun` / coverage | CheckManager 产生 selection、applicability、status、result、diagnostic，以及 aggregate `plannedWorkCount` / `acknowledgedWorkCount`。 | 稳定 run facts，发布到 `run.json`；不发布单个 work handle 或 ack event。 |
| `SnapshotIntegrity` / completeness | RecordManager 与 Core 对 invalid records、conflicts 和 aggregate run/coverage 的最终证据。 | 稳定 snapshot-level facts，发布到 `run.json`；integrity 不是单条 record 的属性。 |
| Work handles、ack ports、record sinks、terminal-settlement calls | Foundation-owned invocation capabilities，用于验证 owned work、提交记录并形成 CheckRun。 | 只存在于执行内存；输出只保留其既有派生事实，不保留 capability/event identity。 |
| Task/group IDs、dependency/mutex state、opaque Task values、private outcomes、observed order | Runner 与 Check adapter 的 invocation state。 | 完全私有；不进入 catalog fingerprint、policy、cache、report、`run.json` 或 `records.ndjson`。 |

“terminal settlement”表示 adapter 关闭 ports并把返回值交给现有 manager 形成 CheckRun 的内部步骤；它本身不是新 artifact 或 record field。“record integrity”则是 foundation 已有且有稳定机器意义的 snapshot evidence，只是它属于 `run.json`，不属于单条 `QualityRecord`。

### 8. Foundation 仍是 result、coverage 与 integrity 的唯一判断 owner

Task leaf 只在其 user function 正常完成后，通过 adapter acknowledgement 其静态 owned work；throw、blocked 或 unavailable leaf 不伪造 acknowledgement。Valid record 一经 RecordManager 提交，later ordinary failure 不撤销。

每个 applicable Check exactly once进入 foundation settlement：

1. RecordManager 关闭该 Check 的 sinks，冻结其当前 violation/conflict membership，并向 CheckManager 提供只用于 settlement 的 private record-failure fact；此时不生成依赖全局排序的 public integrity evidence ID。
2. CheckManager 冻结该 Check 的 acknowledgement set、terminal candidate 和 record-failure fact，执行唯一的 result/ack/record legality判断，并只返回 private `available | unavailable`。该返回值必须与最终对应 CheckRun 为 `completed | failed` 一致。
3. Settled 后保留的 sink/ack capability只返回rejected，不增加diagnostic或改变已冻结availability，避免dependent启动后prerequisite被追溯改写。
4. Runner drain后，RecordManager仍只在global finalize生成canonical records、integrity和evidence IDs；CheckManager使用这些canonical diagnostics一次性形成全部最终CheckRuns。不同settlement/arrival order必须得到相同snapshot。

Orchestration 只传递 foundation返回的opaque availability，不自行解释candidate result、ack completeness、record validity或quality verdict。Duplicate/unknown settlement，以及runner drain后仍缺少applicable Check settlement，表示 trusted adapter/manager invariant破坏并使invocation fatal；普通project failure、invalid result、missing ack、invalid record或record conflict则产生unavailable并继续unrelated work。

### 9. Concurrency 与 lifetime 只有一个 owner

`SchedulerPolicy.maxParallel` 必须满足 `Number.isSafeInteger(value) && value > 0`。每个 runner-started wrapper 从 `onStart` 到 `onComplete` settlement 占一个 global slot；planning factory、applicability 和函数内部自行 fan-out 不占额外声明 slot。

Product named exclusive resources 映射到 runner `mutex`。一个 task 的全部 mutex 原子检查；mutex-blocked task 不阻止 later compatible ready task使用空余 slot。首版不增加 priority、capacity/read-write mode、fairness knob 或 per-Check override。

Orchestrator 只接收一个已经验证并冻结的 private `SchedulerPolicy`。本 Change 中的 repository composition 显式传入 `{ maxParallel: 4 }`，不建立隐式 default、第二并发预算或 per-Check override。尚未实施的 Project Definition 不在本 Change 中预埋 public scheduler contract；它未来进入实施时应复用这一 private seam。

## Risks / Trade-offs

- **Ownership migration 会同时触及 Product 与 script tooling。** 这是消除 gitlink 和双 owner 的必要范围；用 byte-provenance audit、迁入 runner tests 和 workspace verifier acceptance 分别证明来源与 consumer behavior。
- **Generic runner 仍接受 open metadata。** Workspace verifier 依赖这一兼容性；closed Product validator 是隔离边界，不能把 generic input type 当 public TaskPlan contract。
- **Product adapter 需要维护 private outcome 与 terminal gate。** 这比让 scheduler 解释 Check failure 多一层映射，但保住了 scheduler opacity、原 runner semantics 和 DecisionPolicy owner。
- **Per-Check settlement 新增 manager lifecycle transition。** 它只冻结 private availability；public integrity IDs 和 CheckRuns 仍由 global canonical finalize单点产生，避免出现第二份终态事实。
- **同进程 function 仍可能永久 pending 或内部过度并行。** 本 Change没有 cancellation、timeout、sandbox 或内部 fan-out 强制治理，因此 shared budget只覆盖 runner实际启动的 wrappers。
- **Provenance 容易被后续改动冲淡。** `src/product/README.md` 必须区分 byte-preserved set 与 integration adjustments；迁入源码发生 Product change 后按新差异正常审阅，不继续宣称这些文件与 pinned upstream byte-equal。

## Open Questions

无。实施使用 `src/product/task-orchestration/**` 作为唯一 runner source owner；work handles、ack 和 settlement 保持 invocation-private，snapshot integrity 保持既有 run-level stable fact。
