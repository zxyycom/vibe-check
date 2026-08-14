# Design

本设计先建立唯一 current public-contract source 及 Project Definition 所需的 definition-facing fields，再把 TypeScript definition 解析到既有 Check/Record、orchestration、policy 与 effect owners，形成可由 API-only package 单向消费的 package-private runtime seam。

## Context

当前事实由 `docs/configuration.md` 与 `src/product/config*.ts` 承接：产品仍使用 complete semantic JSON v1、`explicit > discovered > default` selection、sibling editor schema 和 JSON initialization，并由 Product CLI 传入选择参数。当前 `.vibe-check/config.json`、CLI options 和 diagnostics 只证明现行实现。

Check/Record Core 与 Product-owned Task orchestration 已成为当前实现事实：public catalog/private binding、closed policy、`requiresChecks` closure、applicability-time TaskPlan factory、plan validation 和 shared scheduler 均有源码、测试、owner 文档与已归档 Change 证据。Reporting、cache 与 output 的当前行为也有各自 owner；本 Change 只把它们组合成 closed Project Definition fields，不复制其算法。

活动未对齐决策已经确认：single TypeScript Project Definition 取代 JSON；Project Definition 驱动 policy/gate、Checks、scheduler、reporting、cache 和 output；首个 package 只支持 Bun；project-owned code 在 package-private runtime 中执行；普通 invocation 默认启用工具 effects；使用者只接触配置定义与工具运行两个操作。API-only package Change 还已确认 unscoped `vibe-check`、MIT、public distribution、`0.0.x` prestable 与 configured external prerequisites，并把 exact identifiers、paths 和 environment names 委托给工程闭合。

执行只采用 Project Definition → API package 的单向顺序：本 Change 当前可执行，在 `src/product/**` 建立唯一 current public-contract source 的 definition-facing fields 并完整交付 Project Definition；API Change 必须等本 Change 完成并归档后，才消费同一 source 和 runtime seam、添加 package/release fields。执行期间不在两个 Change 之间切换。

### Terms

- **Current public-contract source**：计划在 `src/product/**` 建立的唯一 package-private 当前值 owner；决策记录保存选择理由，不复制 literal values。该 source 目前尚未成为实现事实。
- **Definition-facing fields**：本 Change 在上述唯一 source 中建立并验证的 identifiers、fixed/default paths、environment 与 dependency-binding names；它们不是另一份 source。
- **Package/release fields**：API-only package Change 在前置交付完成后，依据 release history 和 exact-tarball evidence 添加到同一 source 的 version、support、manifest 与 release values。
- **Package-private runtime seam**：本 Change 交付给后续 API Change 的稳定调用边界；worker/process module、IPC 和 executable bindings 不属于该 seam 的 public contract。

## Goals / Non-Goals

**Goals**

- 建立唯一 package-private typed current public-contract source，并让 Project Definition 的 fixed path、authoring/import identifiers、default effect paths、environment 与 dependency-binding names 从该 owner 取得当前值。
- 用一个 selected TypeScript module 组合 policy、built-in refs、custom Checks、scheduler 和 tool-effect configuration，并在 work 前 validate/freeze declarative inputs。
- 让 explicit locator、fixed discovery target、neutral definition 与 disabled selection 通过 package-private execution input 表达，不依赖 Product-owned argv contract。
- 在 package-private Bun runtime 中加载和运行 Project Definition/custom runners，隔离它们对调用宿主的进程故障。
- 用 required closed `scheduler: { maxParallel }` 定义唯一 invocation-wide concurrency budget。
- 把每个 custom declaration 解析成 public metadata 与恰好一个 private direct/task binding。
- 为 project-code bypass、default effects、dynamic policy diagnostics、provenance/fingerprint 和 custom-cache exclusion 提供可测试行为。
- 原子删除 JSON selection/schema/init workflow，不让 Core 同时理解两种配置模型。
- 向 API-only package Change 交付稳定的 contract source 和经过目标测试验证的 package-private runtime seam，不保留反向 handoff。

**Non-Goals**

- 构建 public package entry、candidate manifest、declarations、legal/release materials、staging、pack 或 exact-tarball consumer。
- 删除剩余 Product CLI、承诺 Node.js direct import，或公开 worker/process protocol。
- 在本 Change 中生成 evidence-derived host matrix、选择 candidate version 或证明 registry authority。
- 提供 command provider、public operation union、generic subprocess protocol、custom exit-code mapping、hot reload 或 plugin marketplace。
- 提供 filesystem/network/credential sandbox、public process lifecycle control 或 execution-time Check/Task registration。
- 支持 function-based policy、custom-result cache、file-policy algorithm 或 future feature fields。
- 增加 retry/priority、per-Check concurrency budget 或由 Check declaration 覆盖 global budget。

## Decisions

### 1. 实施范围与单向完成顺序

本 Change 的实施范围是 Project Definition authoring、selection、private loading/normalization、foundation handoff、JSON hard cut，以及建立这些行为所需的 current public-contract source definition-facing fields。稳定 literal values 由 `src/product/**` 的 source 承接，长期方向由活动决策承接；“实施范围”不建立第二个长期 owner。

`establish-api-only-npm-product-boundary` 在本 Change 完成前不实施 public entry、package host、CLI hard cut 或 staging。它随后只消费已验证的 runtime seam，并在同一 current public-contract source 中补全 package version、support evidence、manifest projection 和 release-facing values。两个 Change 不再通过中间任务相互恢复。

### 2. 唯一 current public-contract source 按证据逐步闭合

本 Change 在 `src/product/**` package-private boundary 建立 typed current public-contract source。由本 Change 添加的 definition-facing fields 只保存已经由工程选择且由当前消费者使用的值：unscoped package identity 与 MIT identifier、public export/symbol plan、fixed Project Definition path、default output/cache paths、supported environment identifiers 和 operational dependency-binding names。

Source 只保存当前已经选定的值，不为 candidate version、host matrix、legal provenance 或 package inventory 写 placeholder。API Change 后续在同一 owner 中增加有实现或 evidence 支撑的 package/release fields。Canonical Project Definition example、loader、diagnostics 和后续 public entry 从该 source 生成，或由方向明确的 comparison check 做单向核对；handwritten files 不复制名称集合。

Source 保持 package-private，不通过 public exports 暴露，也不因提前存在而证明 package 已可安装或已发布。配置定义与工具运行两个 operation identifiers 可以在 source 中冻结，但本 Change 只实现前者所需的 package-private authoring seam；后续 API Change 才建立 exact public entry。

### 3. 每次 invocation 只选择一个 serializable source

Source selection 按 explicit serializable Project Definition locator、fixed discovery target、ungated Product neutral definition 的优先级产生一个 final source。Typed disabled selection 在任何 project import 前绕过 fixed discovery；它与 explicit source 或任何 gate 冲突。Gate 必须从成功加载并归一化的 Project Definition 中选择 named policy。

Fixed target 的目录和文件名来自 current public-contract source；Configuration owner 只拥有“project root 下恰好一个 fixed TypeScript discovery target”的语义。现行 JSON path 仅用于 migration diagnostic，不能成为未来 TypeScript path 的命名依据。

Package-private input 不接受 function、module namespace、closure、worker handle 或其它不能稳定跨越 private boundary 的 host object。普通 local/bare imports 由 private Bun runtime 相对 selected project module 解析。

本 Change 删除 JSON reader、comment grammar、`$schema`、runtime/editor JSON schemas、sibling schema 与 JSON initialization。Legacy JSON、missing definition 或 explicit-source failure 只返回 actionable diagnostic，不自动转换、创建文件或尝试 alternate source。

### 4. Runtime authority 是 closed plain export

Selected module 在 private Bun runtime 中 evaluate；default export 是 closed plain object，包含 literal `apiVersion: "1"`、policy catalog、ordered Check declarations、required `scheduler: { maxParallel }` 和 tool-effect configuration。Bun 可以执行 top-level await，但最终 default value 不能是 function、Promise 或 unknown envelope。Runtime validator 是唯一 loading authority。

`scheduler.maxParallel` 必须满足 `Number.isSafeInteger(maxParallel) && maxParallel > 0`；missing、unknown 或 invalid value 都在 work 前产生 typed diagnostic。Product neutral definition 与 canonical example 显式使用 `scheduler: { maxParallel: 4 }`，selected project module 不获得隐式补值。

Loader 把该值归一化为 orchestration-owned `SchedulerPolicy.maxParallel`。Direct、Task 与 completion work 共同服从这一预算；Check declaration 与 schedule metadata 不能覆盖或放大它。

Project Definition 还组合 reporting、cache 和 output owners 定义的 closed configuration。各 owner 决定字段、defaults 和 validation；Configuration 不复制 reporter、cache invalidation 或 publication algorithms。

### 5. 配置 authoring 与 resolved execution 分离

Project Check entry 是 serializable built-in reference 或 custom declaration。Built-in ref 由 Product registry 解析；custom declaration 包含 public metadata candidate、serializable schedule metadata 与一个 execution variant。Private runtime 把 metadata 交给 Check owner 生成 public `CheckDefinition`，并把 direct function 或 task factory 保存在 private execution table。

Foundation 验证并冻结 catalog 与 binding table 的一对一关系。Function、closure、Task/completion handle 和 internal port 不进入 public result，也不跨到 public host。Loader 不暴露 manager、record sink、ack port 或 contribution envelope。

配置定义操作提供构造 closed Project Definition 所需的最小 runtime function 和 types。它只返回同一 plain input shape，不添加 brand、builder state 或额外 runtime authority；普通 definition 可以使用 Bun local/bare imports。该 operation 的当前 symbol 来自 current public-contract source，但本 Change 不建立最终 package export。

### 6. Selected module 每次 invocation 只加载一次

同一 private-runtime invocation 对 selected definition 只 import/evaluate 一次，并只 normalize default value 一次。Syntax、resolution、evaluation、export、API 或 validation failure 都在 work 前映射为 typed configuration diagnostic，不执行 valid subset。

Public host 与 private runtime 维持一对一 invocation semantics。Warm worker reuse 可以是 package-private optimization，但不能改变 single-invocation evaluation、cache invalidation、cancellation、cleanup 或 diagnostics。

### 7. Custom Check selection 与 TaskPlan timing 保持最小

Selected definition 中每个 custom declaration 进入 initial requested set。Built-in Checks 继续遵循 Product request rules；selected policy requirements 与 private `requiresChecks` 在 applicability 前闭合。首版不增加 custom profile、priority、include/exclude selector 或 name-based implicit selection。

Module resolution 只保存 serializable schedule metadata 与 private task-factory binding，不创建 TaskPlan。Foundation 完成 selection/applicability 后，orchestration 才调用 factory、验证并冻结完整 plan；skipped/not-applicable Check 不调用 factory，execution context 不提供 registration port。

### 8. Declarative identity 与 executable code 分离

Policy、built-in refs、custom public metadata、schedule metadata 和 effect configuration 经过 detached copy、owner validation 与 freeze。Direct runner、factory、Task/completion function、imports、closure 与 private runtime environment 保持 private。

Definition fingerprint 只 canonicalize validated declarative data，不包含 function source、module graph、absolute path 或 ambient environment。首版 custom binding 每次 invocation 都执行，不使用 custom-result cache；fingerprint 不被表述成 executable identity、code attestation 或 replay guarantee。

### 9. Private runtime 提供故障 containment，不提供权限 sandbox

Package-private Bun worker/child process 承接 Project Definition evaluation、custom execution、planning 和 private bindings。Package-private host 只发送 serializable source/context，并接收稳定 result/effect/failure projection；worker module、IPC、arguments 和 exit code 不进入后续 package exports 或 `bin`。

Product 负责 startup、cancellation、termination、cleanup 与 abnormal-exit normalization。Worker/process 选择和 wire protocol 可以内部演进，只要 package-private seam 的可观察行为不变。

Project code 仍可使用 private runtime 获得的 filesystem、network、environment 和 subprocess permissions。Typed disabled selection 完全跳过 module import、runner registration 和其它 project code，只运行 Product neutral observation；需要 project policy 的 gate 不可在该模式运行。

### 10. Diagnostics、effects 和 output 只呈现稳定事实

Static authoring declarations 不加载 project module，也不枚举 dynamic policy IDs；definition resolution 后遇到 unknown policy ID 时，typed diagnostic 才列出本次 resolved policy catalog。Pre-load diagnostic 可以说明 source kind、Bun prerequisite 与 containment boundary。

Resolved context 记录 safe source kind、API version 与 declarative fingerprint。Human logs 可以按 configured reporter 显示 selected absolute path；machine output 不发布 absolute host path、policy body、runner/factory、imports、module graph 或 private protocol。

Default reporter、cache 与 canonical output 都返回 explicit effect status。Effect failure 不重写领域 gate result；atomicity、cleanup、sensitive material 与 partial publication 由 output/cache owners 承接。

### 11. Project Definition file 由使用者创建和拥有

使用者通过配置定义 operation 自行定义 closed TypeScript value，并把文件放在 current public-contract source 指定的 fixed target。Product 不写入、scaffold 或初始化该文件。Canonical docs/fixture example 证明完整 authoring shape，但不是 package resource、生成模板或名称 owner。

Missing target、legacy JSON、unsafe node 或 invalid module 都返回 typed actionable diagnostic，不创建 second config。Repository tooling 如需生成或维护本仓库 definition，只能在 `scripts/**` 自行拥有实现，不能恢复 Product `init` command、bootstrap export 或 command union。

## Risks / Trade-offs

- **Private runtime 增加 IPC、lifecycle 与 serialization 成本。** 它保护调用宿主免受 project-code process failure；package-private input 因而只接受 serializable source/context。
- **Containment 不是权限 sandbox。** Docs 与 diagnostics 必须准确说明 project-code permissions。
- **Project Definition 成为多个配置领域的组合入口。** Reporting/cache/output 算法仍由各自 owner 承接。
- **Current public-contract source 早于 public package 建立。** Source 保持 package-private，只保存已有当前值且不含 placeholder；docs 不把它表述成可安装或已发布证据。
- **同一 source 会由后续 Change 扩展。** Definition-facing fields 由本 Change 固定并接受回归检查；API Change 只能增加 package/release evidence fields，不能静默重命名已交付的 Project Definition contract。
- **使用者需要自行创建配置文件。** 配置定义 operation、types 与 canonical example 提供引导，Product 不维护 file-creation lifecycle。
- **Dynamic module 可跨 invocation 产生不同数据。** 每次 invocation 只 snapshot 一次，custom executable 不进入 fingerprint 或 cache。
- **JSON hard cut 影响现有 fixtures 与 dogfood。** Config docs、schemas、fixtures 和 repository dogfood 必须在同一 implementation 中迁移。

## Open Questions

无。产品与架构方向已经确认，具体 identifiers、paths 与 environment names 由本 Change 在唯一 current public-contract source 中按最小公共表面和当前消费者闭合；package version、host matrix 和 release evidence 留给后续 API-only package Change。

## Implementation Observations

### 当前状态

在这两个 Change 中，只有本 Change 当前可进入 Implementation；current public-contract source 与 Project Definition runtime 尚未实现，正文中相关描述均是本 Change 的目标状态。下一执行任务是 `1.1` 的测试证据恢复，随后由 `1.2` 建立唯一 source 及其 definition-facing fields；之后按 Tasks 顺序连续完成 `1.3`—`2.6` 并归档。归档前不切换到 API-only package Change。
