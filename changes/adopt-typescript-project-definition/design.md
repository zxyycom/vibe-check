# Design

本设计定义 Product-owned Bun loader：它把结构化 Project Definition 解析为冻结 declarative data、public Check definitions 与 private execution bindings，并把 TaskPlan creation 留在 applicability-time orchestration planner。

## Context

当前事实由 `docs/configuration.md` 与 `src/product/config*.ts` 承接：产品仍使用 complete semantic JSON v1、`explicit > discovered > default` selection、sibling editor schema 和 JSON `init`。活动未对齐决策 `use-bun-typescript-project-definition` 已确认 `.vibe-check/config.ts`、Bun loading、single source 与 JSON hard cut；`use-neutral-observation-and-project-definition-gates`、`treat-project-definitions-as-trusted-code` 和 `limit-tool-neutrality-to-built-in-checks` 分别约束 neutral/gate、信任与内置/自定义执行边界。

本 Change 的 runtime integration 依赖 `establish-check-record-core` 与 `establish-check-task-orchestration` 已实施并同步：前者提供 public catalog/private binding、closed policy 与 manager ports，后者提供 `requiresChecks`、applicability-time factory、TaskPlan validation 和 shared scheduler。依赖是实施顺序，不阻止本计划先被确认。

## Goals / Non-Goals

**Goals**

- 用一个 selected `.ts` module 声明完整 policy、built-in refs 与 custom Checks，并在 work 前验证/freeze 所有 declarative inputs。
- 用 required closed `scheduler: { maxParallel }` author invocation-wide scheduler budget，并为 Product neutral definition 与 canonical starter 提供稳定默认。
- 把每个 custom declaration 明确解析成 public metadata 与一个 private direct/task binding。
- 让 canonical starter 无需项目安装 SDK，同时让已安装匹配 package 的项目获得 optional typed helpers。
- 为 trusted discovery、untrusted bypass、dynamic policy diagnostic 与 honest fingerprint/cache boundary提供可测试行为。
- 原子删除 JSON selection/schema/init workflow，而不让 Core 同时理解两种配置模型。

**Non-Goals**

- Command provider、generic subprocess protocol 或 custom exit-code mapping。
- Runtime Check/Task registration、hot reload、implicit plugin discovery 或 marketplace。
- Worker/process sandbox、public cancellation、timeout、hard termination 或 bounded drain。
- Function-based policy、custom-result cache、file-policy override algorithm 或 future feature fields。
- Scheduler retry/priority、per-Check / feature-specific concurrency budget、由 Check declaration 覆盖 global budget，或 Task machine identity。

## Decisions

### 1. 只选择一个 TypeScript source

Source selection 按 explicit `--config <file.ts>`、fixed `.vibe-check/config.ts`、ungated Product neutral definition 的顺序返回一个 final source。Product neutral definition（包括 disabled bypass 使用的 neutral observation）显式携带 `scheduler: { maxParallel: 4 }`。`--no-project-definition` 在 import 前绕过 fixed discovery并选择 disabled provenance；它与 explicit config 或任何 gate 冲突。Gate 必须从成功加载、归一化的 Project Definition 中选择 named policy。

本 Change 删除 `.vibe-check/config.json` reader、comment grammar、`$schema`、runtime/editor JSON schemas、sibling schema 与 dual-target init。普通 discovery 遇到 legacy JSON 只产生可行动迁移诊断，不继续 neutral fallback或自动转换；explicit source 失败也不尝试其它 source。

### 2. Runtime authority 是 closed plain export

Selected module default export 是 closed plain object，包含 literal `apiVersion: "1"`、policy catalog、required `scheduler: { maxParallel }` 与有序 project Check declarations。Bun 可以先完成 module top-level await，但最终 default value 不得是 function、Promise 或 unknown envelope。Product runtime validator是唯一加载 authority。

`scheduler` 是 closed object，唯一字段 `maxParallel` 必须满足 `Number.isSafeInteger(maxParallel) && maxParallel > 0`；missing field、unknown field 或非法数值都在 work 前形成 typed config error。Loader 不为已选择的 project module 隐式补值；Product-owned neutral definition 与 canonical `init` starter 都显式使用 `scheduler: { maxParallel: 4 }`。

Loader 把该值归一化为 orchestration-owned `SchedulerPolicy.maxParallel`。它是一次 invocation 中 direct、Task 与 completion work 共同服从的唯一 scheduler budget；Check declarations 与 schedule metadata 不提供 per-Check / feature-specific concurrency leaf，不能覆盖、另建或放大该预算。本 Change 只拥有 public authoring、default 与 validation，不复制 scheduler 的 slot accounting 或 runtime semantics。

匹配版本的 package 可以提供 `vibe-check/project` 下的 `defineProject`、`defineCheck` 和 public types；helpers 只返回同一 input shape，不添加 brand 或额外 runtime authority。Canonical `init` starter 使用 import-free plain export，避免 Bun CLI 依赖被扫描项目已安装 SDK，亦避免把另一 package version 的 built-in handles带入当前 Product。

### 3. Authoring declaration 不是 resolved CheckDefinition

Project Check entry 要么是 serializable built-in reference，要么是 custom declaration。Built-in ref 由当前 Product registry 解析；custom declaration 含 public metadata candidate、serializable schedule metadata 与一个 execution variant。Loader 把 metadata 交给 Check owner生成 public `CheckDefinition`，把 direct function 路由给 direct adapter，把 task factory 路由给 orchestration binding。它不 cast authoring input 为 resolved type，也不检查 function source。

完整 catalog 与 private binding table 由 foundation 验证一对一关系并冻结。Loader 不暴露 managers、record sink、ack port 或 foundation contribution envelope。

### 4. 每次 CLI invocation 只加载并 snapshot 一次

同一 CLI process invocation 对 selected module 只 import/evaluate 一次，并只 normalize default value 一次。Bare/local imports按 Bun 对 selected module 的 project resolution 处理；Product 不回退自身 `node_modules` 或自建 resolver。Syntax、resolution、evaluation、export、API 或 validation failure 均在 work 前映射为 typed config error和 exit `3`，不执行 valid subset。

本契约只覆盖一次 CLI invocation，不承诺未来 embedding API 在同一 process 多次调用时的 ESM cache 行为。

### 5. Custom Checks 使用最小 selection rule

Selected definition 中每个 custom declaration 都进入 initial requested set。Built-in Checks 继续遵循 Product profile/request rules；selected policy requirements 与 private `requiresChecks` 在 applicability 前闭合。首版不增加 custom profile、priority、include/exclude selector 或基于名称的隐式 selection。

### 6. Task factory 只在 applicability 后运行

Module resolution 只保存 serializable schedule metadata 与 private task binding factory，不创建 TaskPlan。Foundation 完成 selection/applicability并提供 immutable planning context 与 opaque domain-work handles 后，orchestration 才按 invocation 调用 factory、验证完整 plan并在任何 managed function 启动前冻结。Skipped/not-applicable Check 不调用 factory，execution context没有 registration port。

### 7. Declarative identity 与 executable code 分离

Policy、built-in refs、custom public metadata 与 schedule metadata 被 detached copy、owner validation 和 freeze。Direct runner、planner/factory、Task/completion function、imports、closure 与 environment 保持 private。Definition data fingerprint 只 canonicalize validated declarative data；不包含 function source、module graph、absolute path 或 ambient environment。

首版 custom binding 每次 invocation 都执行，不读取或写入 custom result cache。Definition/catalog fingerprint不能单独证明 executable identity、cache validity 或 replay equivalence；built-in cache 继续只使用所属 owner 的 relevant semantic inputs、exact inputs 与 backend identity。

### 8. Project module 与 runner 是 trusted same-process code

普通 discovery/import 和 custom runner 使用 Vibe Check process 的 filesystem、network、environment、Bun、subprocess 与 global permissions。可捕获的 throw/rejection 按 module pre-work 或 owning CheckRun 归一化，但 Product 不承诺从 `process.exit`、global mutation、synchronous infinite loop 或 non-settling code恢复。

CLI/help/docs 在 import 前说明这一边界。`--no-project-definition` 完全跳过 module import、runner registration 和其它 project executable code，只运行 Product neutral observation。Custom runner 可以自行调用函数、library 或 command；Core 不提供 command strings、exit mapping 或 sandbox。

### 9. Help 和 output 只呈现当时可知事实

`scan --help` 不加载 project module，也不枚举 dynamic policy IDs；definition resolution 后遇到 unknown policy ID时，diagnostic 才列本次 resolved catalog。Pre-load console 可以说明 selected/disabled source和 trust boundary。

Resolved context记录 source、API 和 declarative fingerprint。Console diagnostic 可以显示 selected absolute path；machine output只发布 safe source kind、API 与 fingerprint，不发布 absolute host path、policy body、runner/factory、imports 或 module graph。

### 10. Init 只物化 import-free current references

`init` 只确保 `.vibe-check/config.ts` 存在。Starter 使用 deterministic UTF-8/LF plain export，含 literal API version、complete neutral policy、`scheduler: { maxParallel: 4 }`和 current Product-owned built-in references，不 import `vibe-check/project` 或携带 runner handle。Current CLI 在 load 时按自身 registry解析 refs。

Existing safe file保持原 bytes，missing target 使用 exclusive create；unsafe node、race、write/close failure 与 owned cleanup沿用当前 filesystem ownership。`init` 永不 evaluate existing/new module。Legacy-JSON-only project得到 manual migration diagnostic且不会同时创建 second active config。

## Risks / Trade-offs

- **Trusted project code 可以终止或挂起 CLI。** 在 import 前说明并提供 `--no-project-definition`；真正 isolation 需要独立方向。
- **Import-free starter 的 editor assistance 较少。** Canonical starter 保持 dependency-free；一般 definition 仍可使用 bare/local imports，匹配 package 的 helpers/types 是可选 authoring convenience。
- **Built-in ref 可能随 Product version 退出。** Work 前以 unknown ref失败并要求显式迁移，不静默加载另一版本 binding。
- **Dynamic module 可以跨 invocation 产生不同 data。** 每次 invocation 只 snapshot 一次并发布 declarative fingerprint，不承诺跨 invocation determinism。
- **Executable code 不在 fingerprint。** 禁用 custom cache并明确 fingerprint不是 code attestation。
- **JSON hard cut 影响当前 fixtures 和 dogfood。** Config、starter、fixtures、docs、schemas和 repository dogfood在同一 implementation 中原子迁移，不保留双读回退。

## Open Questions

无。Source selection、input envelope、global scheduler authoring/default、public/private routing、planner timing、trust、fingerprint、init 与 hard-cut出口已确定；exact public package export由 `establish-versioned-npm-package-release` 在不改变本 authoring contract的前提下物化。
