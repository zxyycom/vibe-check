# Design

本设计让单一 TypeScript Project Definition 成为 Vibe Check 执行配置的组合入口，并由 package-private Bun runtime 完成 project-code loading 与 execution；public package API 只承接配置定义、source selection、当次 context、工具运行和结构化结果。

## Context

当前事实由 `docs/configuration.md` 与 `src/product/config*.ts` 承接：产品仍使用 complete semantic JSON v1、`explicit > discovered > default` selection、sibling editor schema 和 JSON initialization，并由 Product CLI 传入选择参数。当前 `.vibe-check/config.json`、CLI options 和 diagnostics 只证明现行实现。

活动未对齐决策已经确认：single TypeScript Project Definition 取代 JSON；Project Definition 驱动 policy/gate、Checks、scheduler、reporting、cache 和 output；首个 package 只支持 Bun；project-owned code 在 package-private runtime 中执行；普通 invocation 默认启用工具 effects；使用者只接触配置定义与工具运行两个操作。Vibe Check 产品显示名保持不变，fixed path、public imports/symbols、effect paths 和 environment identifiers 仍待上游确认。

Runtime integration 依赖 Check/Record foundation 与 Task orchestration 提供 public catalog/private binding、closed policy、`requiresChecks`、applicability-time factory、TaskPlan validation 和 shared scheduler seams。这些是实施前置事实，不是本 Change 重新选择的产品方向。Metadata 中的 `shelf.reason` 保存执行 `shelve` 时的原始触发条件；当前恢复门禁以本设计的 Open Questions、Resume Conditions 和 Tasks Readiness 为准。

## Goals / Non-Goals

**Goals**

- 用一个 selected TypeScript module 组合 policy、built-in refs、custom Checks、scheduler 和 tool-effect configuration，并在 work 前 validate/freeze declarative inputs。
- 让 explicit locator、fixed discovery target、neutral definition 与 disabled selection 通过工具运行 input 表达，不依赖 Product-owned argv contract。
- 在 package-private Bun runtime 中加载和运行 Project Definition/custom runners，隔离它们对调用宿主的进程故障。
- 用 required closed `scheduler: { maxParallel }` 定义唯一 invocation-wide concurrency budget。
- 把每个 custom declaration 解析成 public metadata 与恰好一个 private direct/task binding。
- 为 project-code bypass、default effects、dynamic policy diagnostics、provenance/fingerprint 和 custom-cache exclusion 提供可测试行为。
- 原子删除 JSON selection/schema/init workflow，不让 Core 同时理解两种配置模型。

**Non-Goals**

- 选择 registry package、public import/export、symbol、fixed path、effect path 或 environment identifier。
- 支持 Node.js direct import、dual-runtime module resolution 或 public worker/process protocol。
- 提供 command provider、public operation union、generic subprocess protocol、custom exit-code mapping、hot reload 或 plugin marketplace。
- 提供 filesystem/network/credential sandbox、public process lifecycle control 或 execution-time Check/Task registration。
- 支持 function-based policy、custom-result cache、file-policy algorithm 或 future feature fields。
- 增加 retry/priority、per-Check concurrency budget 或由 Check declaration 覆盖 global budget。

## Decisions

### 1. 本 Change 只拥有 Project Definition 集成

Public host、private containment、default effects、configuration-driven execution 和 exactly-two-operations surface 由上游活动决策拥有。本 Change 只拥有 Project Definition authoring、selection、loading、normalization 与 foundation handoff。

恢复 implementation 前，foundation seams 必须成为 current facts；fixed discovery path、public imports/symbols、effect paths 与 operational identifiers 必须进入上游 current public-contract source。Local alias、placeholder string 或 compatibility branch 不能绕过这些门。

### 2. 每次 invocation 只选择一个 serializable source

Source selection 按 explicit serializable Project Definition locator、fixed discovery target、ungated Product neutral definition 的优先级产生一个 final source。Typed disabled selection 在任何 project import 前绕过 fixed discovery；它与 explicit source 或任何 gate 冲突。Gate 必须从成功加载并归一化的 Project Definition 中选择 named policy。

Fixed target 的目录和文件名来自 current public-contract source；Configuration owner 只拥有“project root 下恰好一个 fixed TypeScript discovery target”的语义。现行 JSON path 仅用于 migration diagnostic，不能成为未来 TypeScript path 的命名依据。

Public input 不接受 function、module namespace、closure、worker handle 或其它不能稳定跨越 private boundary 的 host object。普通 local/bare imports 由 private Bun runtime 相对 selected project module 解析。

本 Change 删除 JSON reader、comment grammar、`$schema`、runtime/editor JSON schemas、sibling schema 与 JSON initialization。Legacy JSON、missing definition 或 explicit-source failure 只返回 actionable diagnostic，不自动转换、创建文件或尝试 alternate source。

### 3. Runtime authority 是 closed plain export

Selected module 在 private Bun runtime 中 evaluate；default export 是 closed plain object，包含 literal `apiVersion: "1"`、policy catalog、ordered Check declarations、required `scheduler: { maxParallel }` 和 tool-effect configuration。Bun 可以执行 top-level await，但最终 default value 不能是 function、Promise 或 unknown envelope。Runtime validator 是唯一 loading authority。

`scheduler.maxParallel` 必须满足 `Number.isSafeInteger(maxParallel) && maxParallel > 0`；missing、unknown 或 invalid value 都在 work 前产生 typed diagnostic。Product neutral definition 与 canonical example 显式使用 `scheduler: { maxParallel: 4 }`，selected project module 不获得隐式补值。

Loader 把该值归一化为 orchestration-owned `SchedulerPolicy.maxParallel`。Direct、Task 与 completion work 共同服从这一预算；Check declaration 与 schedule metadata 不能覆盖或放大它。

Project Definition 还组合 reporting、cache 和 output owners 定义的 closed configuration。各 owner 决定字段、defaults 和 validation；Configuration 不复制 reporter、cache invalidation 或 publication algorithms。

### 4. 配置 authoring 与 resolved execution 分离

Project Check entry 是 serializable built-in reference 或 custom declaration。Built-in ref 由 Product registry 解析；custom declaration 包含 public metadata candidate、serializable schedule metadata 与一个 execution variant。Private runtime 把 metadata 交给 Check owner 生成 public `CheckDefinition`，并把 direct function 或 task factory 保存在 private execution table。

Foundation 验证并冻结 catalog 与 binding table 的一对一关系。Function、closure、Task/completion handle 和 internal port 不进入 public result，也不跨到 public host。Loader 不暴露 manager、record sink、ack port 或 contribution envelope。

配置定义操作提供构造 closed Project Definition 所需的最小 runtime function 和 types。它只返回同一 plain input shape，不添加 brand、builder state 或额外 runtime authority；普通 definition 可以使用 Bun local/bare imports。

### 5. Selected module 每次 invocation 只加载一次

同一 private-runtime invocation 对 selected definition 只 import/evaluate 一次，并只 normalize default value 一次。Syntax、resolution、evaluation、export、API 或 validation failure 都在 work 前映射为 typed configuration diagnostic，不执行 valid subset。

Public host 与 private runtime 维持一对一 invocation semantics。Warm worker reuse 可以是 package-private optimization，但不能改变 single-invocation evaluation、cache invalidation、cancellation、cleanup 或 diagnostics。

### 6. Custom Check selection 与 TaskPlan timing 保持最小

Selected definition 中每个 custom declaration 进入 initial requested set。Built-in Checks 继续遵循 Product request rules；selected policy requirements 与 private `requiresChecks` 在 applicability 前闭合。首版不增加 custom profile、priority、include/exclude selector 或 name-based implicit selection。

Module resolution 只保存 serializable schedule metadata 与 private task-factory binding，不创建 TaskPlan。Foundation 完成 selection/applicability 后，orchestration 才调用 factory、验证并冻结完整 plan；skipped/not-applicable Check 不调用 factory，execution context 不提供 registration port。

### 7. Declarative identity 与 executable code 分离

Policy、built-in refs、custom public metadata、schedule metadata 和 effect configuration 经过 detached copy、owner validation 与 freeze。Direct runner、factory、Task/completion function、imports、closure 与 private runtime environment 保持 private。

Definition fingerprint 只 canonicalize validated declarative data，不包含 function source、module graph、absolute path 或 ambient environment。首版 custom binding 每次 invocation 都执行，不使用 custom-result cache；fingerprint 不被表述成 executable identity、code attestation 或 replay guarantee。

### 8. Private runtime 提供故障 containment，不提供权限 sandbox

Package-private Bun worker/child process 承接 Project Definition evaluation、custom execution、planning 和 private bindings。Public host 只发送 serializable source/context，并接收稳定 result/effect/failure projection；worker module、IPC、arguments 和 exit code 不进入 exports 或 `bin`。

Product 负责 startup、cancellation、termination、cleanup 与 abnormal-exit normalization。Worker/process 选择和 wire protocol 可以内部演进，只要 public behavior 不变。

Project code 仍可使用 private runtime 获得的 filesystem、network、environment 和 subprocess permissions。Typed disabled selection 完全跳过 module import、runner registration 和其它 project code，只运行 Product neutral observation；需要 project policy 的 gate 不可在该模式运行。

### 9. Diagnostics、effects 和 output 只呈现稳定事实

Static public declarations 不加载 project module，也不枚举 dynamic policy IDs；definition resolution 后遇到 unknown policy ID 时，typed diagnostic 才列出本次 resolved policy catalog。Pre-load diagnostic 可以说明 source kind、Bun prerequisite 与 containment boundary。

Resolved context 记录 safe source kind、API version 与 declarative fingerprint。Human logs 可以按 configured reporter 显示 selected absolute path；machine output 不发布 absolute host path、policy body、runner/factory、imports、module graph 或 private protocol。

Default reporter、cache 与 canonical output 都返回 explicit effect status。Effect failure 不重写领域 gate result；atomicity、cleanup、sensitive material 与 partial publication 由 output/cache owners 承接。

### 10. Project Definition file 由使用者创建和拥有

使用者通过配置定义操作自行定义 closed TypeScript value，并把文件放在 confirmed fixed target。Product 不写入、scaffold 或初始化该文件。Canonical docs/fixture example 证明完整 authoring shape，但不是 package resource、生成模板或名称 owner。

Missing target、legacy JSON、unsafe node 或 invalid module 都返回 typed actionable diagnostic，不创建 second config。Repository tooling 如需生成或维护本仓库 definition，只能在 `scripts/**` 自行拥有实现，不能恢复 Product `init` command、bootstrap export 或 command union。

## Risks / Trade-offs

- **Private runtime 增加 IPC、lifecycle 和 serialization 成本。** 它保护调用宿主免受 project-code process failure；public input 因而只接受 serializable source/context。
- **Containment 不是权限 sandbox。** Docs 与 diagnostics 必须准确说明 project-code permissions。
- **Project Definition 成为多个配置领域的组合入口。** Reporting/cache/output 算法仍由各自 owner 承接。
- **使用者需要自行创建配置文件。** 配置定义操作、公共 types 与 canonical example 提供引导，Product 不维护 file-creation lifecycle。
- **Public naming gate 延后 fixed discovery implementation。** Configuration semantics 已明确，但具体 path/import/symbol 等待 current public-contract source。
- **Dynamic module 可跨 invocation 产生不同数据。** 每次 invocation 只 snapshot 一次，custom executable 不进入 fingerprint 或 cache。
- **JSON hard cut 影响现有 fixtures 与 dogfood。** Config docs、schemas、fixtures 和 repository dogfood 必须在同一 implementation 中迁移。

## Open Questions

1. 上游最终确认的 fixed Project Definition path、public authoring/execution imports 与 symbols、default effect paths 和 operational identifiers 分别是什么？`define` 与 `run` 仅表示角色，不预先选择 symbol。

## Resume Conditions

- Check/Record、Task orchestration 与 reporting/cache/output foundation seams 已成为可用 current facts，或实施顺序已明确等待它们且不会猜测接口。
- 上游已把两个公开操作所需的 path/import/symbol/effect/environment identifiers 建立到唯一 current public-contract source；没有 bootstrap/resource/internal runtime export。
- Proposal、Design 与 Tasks 已按 confirmed identifiers 同步。
- 执行 `resume` 后重新运行 `plan` 记录新 Git baseline；在此之前不得进入 implementation。
