> **核心句：**本 design 定义一个由 Product 拥有的 Bun loader：它把结构化 Project Definition 解析为冻结的声明式数据、public `CheckDefinition` 与 private execution binding；`TaskPlan` 仍由 orchestration planner 在 foundation 完成 applicability 后按 invocation 创建。

## Context

See [proposal.md](proposal.md) for motivation. `establish-check-record-core` 已经把 serializable public
`CheckDefinition` 与 private `CheckExecutionBinding`/opaque contribution 分开；direct `CheckRunner` 只是一个
private adapter。`establish-check-task-orchestration` 以 `check-execution-orchestration` 拥有
`requiresChecks` closure、applicability 后的 invocation planner、TaskPlan validation/freeze 与 shared scheduler，
并且没有 public cancellation、`AbortSignal` 或 timeout contract。

本 change 在实施与主 spec apply 顺序上位于两者之后，但在 runtime data flow 中向它们提供已解析的声明与
private binding。它读取 project authoring module，却不得让 authoring shape 等同 resolved `CheckDefinition`、
把 TaskPlan 提前到 module load，或把 functions 纳入 public catalog/fingerprint。它还要替换 current JSON
selection/init/schema workflow，并诚实处理 import 本身即 same-process code execution。

## Goals / Non-Goals

**Goals:**

- 一个 selected module 声明完整 policy、built-in refs 与 custom checks，所有 declarative input 在 work 前验证/
  freeze。
- Custom declaration 明确解析成 public metadata 与 private execution binding 两张表。
- Direct 和 task-based custom checks 共享 foundation final Check/Record model 与 invocation scheduler。
- Canonical starter 无需 project 安装 authoring package，普通 custom imports 仍遵循 Bun resolution。
- Trusted discovery、disabled observation、dynamic policy help 与 honest fingerprint/cache boundaries 可测试。

**Non-Goals:**

- Command provider、generic subprocess helper、exit-code mapping 或 command protocol。
- Runtime check/Task registration、hot reload/watch、implicit plugin discovery、remote/package marketplace。
- Worker/process sandbox、public cancellation、timeout、hard termination 或 bounded drain。
- Function-based policy evaluator、custom result cache、完整 file override 算法或 future feature fields。
- Scheduler retry/priority/per-Check budgets 或 Task machine identity。

## Data flow and ownership

```text
CLI selects one .ts module
          |
          v
Bun evaluates structured ProjectDefinitionInput once
          |
          +--> declarative policy / built-in refs / custom metadata / schedule metadata
          |                -> owner validators -> detached frozen data
          |
          +--> custom direct function or task binding factory
                           -> owning execution adapter -> private binding
          |
          v
public CheckDefinition[] + private CheckExecutionBinding[]
          |
          v
initial request: built-ins by Product rules + every custom declaration
          |
requiresChecks closure -> foundation applicability/work handles
          |
          v
task binding factory creates invocation TaskPlan -> validate/freeze full execution plan
          |
          v
foundation reports / CheckRuns + record sink / QualityRecords -> policy -> output
```

Project Definition 负责 source selection、authoring envelope、declaration routing 与 provenance。Foundation
负责 resolved public metadata 与 private binding contract；orchestration 负责 selection closure、planner、
`TaskPlan` 与 scheduler；Config、Decision 和 Output owner 继续负责各自的声明式数据语义。

## Decisions

### Decision 1: Use one TypeScript source and remove the JSON workflow

Source selection 按以下顺序执行：显式 `--config <file.ts>`、固定
`.vibe-check/config.ts`、仅用于非门禁观察的 neutral definition。显式路径仍以 project root 为基准。
`--no-project-definition` 会在 import 前绕过 module discovery，并改用 neutral data；任何 gate 都要求
module-backed policy。

本 change 一次性删除 `.vibe-check/config.json`、comment grammar、`$schema`、sibling schema 与双目标 init。
普通 discovery 遇到 legacy config 时只给出迁移诊断，不执行 default fallback；显式选择的 source 是最终选择。

**Why:** 产品尚未发布，没有发布兼容包袱。双 reader 会复制 selection、validation、init、editor 与 failure
semantics，却仍然不能表达 custom function。

### Decision 2: Accept a plain structured export; helpers are optional

Canonical runtime envelope 是一个 closed plain object，包含 `apiVersion: "1"`、policy、global scheduler policy
与有序的 project check entries。Loader 通过 runtime validation 接受该对象，不要求 helper 创建的 brand。
Default export 为 function 或 `Promise` 时拒绝；module 可以通过 top-level `await` 完成求值后再导出对象。

已安装的 package MAY 暴露 `defineProject`、`defineCheck` 与相关 types，作为 typed identity helpers。它们只
返回同一 authoring shape，不具有额外 runtime authority。Canonical init starter 使用 import-free plain export，
避免 Product A 依赖 project-local SDK 副本，也避免导入 Product B 的 built-in runner。

**Why:** 强制 config 导入 `vibe-check/project` 会让 bunx、global 与 source invocation 的 resolution 变得脆弱，
还可能把一个 CLI 与另一 package 版本的 execution handle 配对。由 runtime 拥有的 plain validation 更小、更稳定。

### Decision 3: ProjectCheckDeclaration is authoring input, not CheckDefinition

Project check entries are:

1. a serializable built-in reference, resolved against the current Product registry；or
2. a custom `ProjectCheckDeclaration` with public metadata candidate、serializable schedule metadata and one
   execution variant。

Loader 把 metadata 委托给 `quality-checks`，由后者产生 public `CheckDefinition`；direct function 路由到 direct
adapter，task binding/planner factory 路由到 `check-execution-orchestration`，最终产生 private
`CheckExecutionBinding`。Foundation 随后为每个 applicable invocation 创建 opaque contribution。Loader 不把
resolved types 暴露为 authoring shape，也不检查 function source 来验证 adapter。

**Why:** Public catalog/fingerprint must remain executable-free；private variants can evolve without machine or
policy migration。

### Decision 4: Load once per CLI invocation, then snapshot declarations

在一次 CLI process invocation 中，Bun ESM import 与 evaluation 只发生一次。ESM 或 top-level `await` 完成后，
default value 也只 normalize 一次。可捕获的 syntax、resolution、evaluation、export 或 validation error 都是
pre-work config error，映射为 exit `3`，并且不运行任何 valid subset。只支持显式 import，不执行 directory、
package 或 plugin discovery。

Bare/local import 按 Bun 支持的契约相对于 selected module 解析。Product 不回退到自己的 `node_modules`，也不
自建 resolver。本 contract 不承诺未来 embedding API 在同一 process 执行多个 invocation 时的 ESM cache 行为。

### Decision 5: Use the smallest custom selection rule

Selected definition 中的每个 custom declaration 都属于 initial requested set。Built-in checks 继续遵循
Product-owned profile/request semantics。Selected policy 可以通过 foundation input 要求 checks；
`requiresChecks` 在 applicability 前对该集合做 transitive closure。首版不增加 custom profile DSL、priority、
include/exclude selector 或 name-based inference。

**Why:** Users adding custom checks expect them to run；another selection language is not needed to establish the
extension boundary。Foundation applicability 仍决定 requested work 是否 applicable。

### Decision 6: Task factories run only after applicable invocation inputs exist

Module resolution 只保存 serializable schedule metadata 与 private task binding factory，不创建 `TaskPlan`。
Selection 与 applicability 完成后，foundation 才提供 immutable planning context 和 opaque domain-work handles。
Orchestration binding 按 invocation 调用 factory，验证 Task ID、`needs`、resource、handle association 与 cycle，
并在任何 managed function 启动前冻结所有 direct/Task work。

Skipped 或 not-applicable check 不调用 factory。Execution context 不提供 registration port，因此 Task 不能修改
plan。Project authoring 不增加 cancellation、`AbortSignal`、timeout 或 hard termination 承诺。

**Why:** Module-load plan 无法绑定 invocation-owned handle；runtime registration 又会阻止 complete validation
与 shared scheduler governance。

### Decision 7: Separate all functions from declarative identity

Policy、built-in refs、custom public metadata 与 schedule metadata 会被复制、验证并冻结。Direct runner、
planner/binding factory、Task/completion function、import 与 closure state 保持 private。Function source、module
graph 与 ambient environment 不进入 `CheckDefinition`、machine output 或 definition data fingerprint。

Fingerprint 只 canonicalize 已验证的声明式数据。首版不缓存 custom result；definition fingerprint 与 catalog
fingerprint 都不能单独作为 cache validity。Built-in cache 继续遵循各自 Product-owned identity contract。

**Why:** Function text 与 closure inspection 不能证明行为 identity；错误复用 cache 比重复执行 custom check 更差。

### Decision 8: Treat module and runner code as trusted same-process execution

普通 discovery 会导入受信任的 project code；该代码拥有 Vibe Check process 的 filesystem、network、
environment、Bun、subprocess 与 global permissions。Help 与 pre-evaluation provenance 必须在 import 前说明这一点。
`--no-project-definition` 是面向不可信 repository 的 non-executing path，并在 load 前与 `--config` 或 gate 判为冲突。

Owning boundary 可以归一化可捕获的 throw/rejection，但同进程无法可靠恢复或强制终止 `process.exit`、global
mutation 或 non-settling code。因此本 contract 不承诺 public cancellation 或 timeout。Project code 可以自行调用
command，但 Core 不解析命令，也不映射 exit code。

### Decision 9: Static help and machine provenance expose only facts available at their stage

`scan --help` 不加载 project module。它只说明 dynamic policy source，不枚举 policy ID。Definition resolution
完成后，unknown `--gate` ID diagnostic 才列出本次 invocation 的 resolved catalog。

Resolved context 记录 source、API、module path 与 definition data fingerprint。Console MAY 显示 selected absolute
path；machine output 只发布 source、API 与 fingerprint，不发布 absolute host path、policy body、runner/factory 或
module graph。Fingerprint 的文档必须明确排除 code attestation、cache 与 replay 承诺。

### Decision 10: Init materializes current Product references without imports

`init` 只确保 `.vibe-check/config.ts` 存在。生成的 plain export 包含 literal API version、complete neutral policy、
global scheduler policy 与 serializable built-in references。Load 时，current CLI 对照自己的 registry 解析这些
references；文件不会携带来自另一 package 副本的 built-in runner handle。

Existing safe target bytes 保持不变；missing target 通过 exclusive create 写入；unsafe node、race、write failure
与 cleanup 继续遵循当前 ownership。`init` 不导入已有或新生成的 module。只有 legacy JSON 的项目获得 manual
migration 诊断，不创建第二个 active file。

## Risks / Trade-offs

- **[Trusted code can terminate or hang CLI]** → 在 load 前提示，并提供 `--no-project-definition`；isolation 需要
  独立的 future change。
- **[Plain objects receive less editor assistance]** → Canonical starter 保持 dependency-free；安装匹配 package 的
  项目可以选择 identity helpers/types，不改变 runtime semantics。
- **[Built-in ref can disappear across Product versions]** → 在 work 前以 unknown ref 失败，并要求重新生成或迁移
  explicit definition；不得静默导入另一版本的 binding。
- **[Dynamic authoring can produce different data per invocation]** → 每次 invocation 只 snapshot 一次并发布
  fingerprint；不承诺跨 invocation determinism。
- **[Runner code is outside fingerprint]** → 禁用 custom cache，并明确记录 identity boundary。
- **[Hard cut invalidates current JSON materials]** → 原子迁移 config、starter、fixtures、docs 与 dogfood；不保留
  dual reader。

## Migration Plan

1. Complete blocking audit and require `establish-check-record-core` then
   `establish-check-task-orchestration` implementation/spec synchronization before Product edits。
2. 建立 plain envelope validator、declaration resolver 与 optional authoring helper types；证明 import-free 和
   custom import paths。
3. 将 selection、neutral context、CLI/help 与 init hard cut 到 `.vibe-check/config.ts`；删除 JSON parser/schema paths。
4. 把 custom metadata/private binding tables 接入 foundation，再把 task factory 接入 applicability-time planner 与
   shared scheduler。
5. 增加 honest provenance/fingerprint 且不启用 custom cache；迁移 dogfood、fixtures、docs 与 test evidence。
6. 在 temporary copy 中，使用 official OpenSpec archive builder 按 core → orchestration → this change 顺序 apply，
   并在 implementation/archive 前 strict validate resulting specs。

Rollback 要求完整回退本 change，并恢复与之匹配的 JSON config/schema materials。任何 binary 都不会同时读取两种格式。

## Open Questions

无未回答开放问题，可以进入实现前审计。
