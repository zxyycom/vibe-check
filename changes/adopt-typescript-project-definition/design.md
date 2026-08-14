# Design

本 Design 把项目持有的 TypeScript Project Definition 接入既有 Vibe Check Product：项目运行脚本将配置绑定到 Package Run，Package Run 调用项目函数，并把 work 交给既有 Task 系统。

## Context

### Document Authority

本 Design 规定 `adopt-typescript-project-definition` 的实现契约、owner 边界、任务顺序和下游 handoff。长期方向由下列 active decisions 拥有；本 Design 只把它们映射为当前 Change 的工程行为：

- `configuration/pass-project-definition-value-to-run.md`：项目运行脚本把普通 import 得到的 Project Definition value 交给 Package Run。
- `configuration/drive-run-from-project-definition-value.md`：Project Definition 拥有稳定执行语义，run controls 只补充当次信息。
- `configuration/use-user-owned-definition-for-observation-and-gates.md`：每次运行都使用项目持有的 definition；gate 选择其中的 named policy。
- `product-contract/expose-config-definition-and-project-run-operations.md`：package 公开配置定义函数与 Package Run 两个 callable operations。
- `product-contract/execute-project-functions-through-task-system-in-caller-runtime.md`：Package Run 直接调用项目函数，Task 系统管理执行。
- `product-contract/use-static-check-task-plans-with-shared-scheduling.md`：静态 `TaskPlan` 和 shared scheduler 拥有 Product task scheduling。
- `configuration/bind-external-programs-outside-check-semantics.md`：operational dependency binding 与 built-in Check policy 分离。
- `product-contract/confirm-config-run-and-package-names-before-publication.md`：exact package names 在 publishable candidate 前确认。

当前实现仍使用 JSON config、config discovery、schema generation 和 Product CLI `init`。上述 target contract 在本 Change 完成前不是当前产品事实。

### Stable Terms

| 术语 | 精确定义 |
| --- | --- |
| **Project Definition** | 配置定义函数返回的 plain typed value；包含声明式配置和明确允许的项目函数 |
| **项目配置文件** | 项目持有的 TypeScript module；default export Project Definition |
| **配置定义函数** | Package operation；提供 authoring inference，返回 Project Definition |
| **Package Run** | Package operation；接收 `(Project Definition, Run Controls)` 并执行完整 Vibe Check |
| **项目运行脚本** | 项目持有的 module；导入 Project Definition，调用 Package Run，导出项目 Run |
| **项目 Run** | 项目运行脚本导出的已绑定入口；其他调用方只传项目允许的 controls |
| **Run Controls** | 只对本次运行有效的 context/overrides，不拥有项目政策 |
| **Product 运行内核** | 本 Change 在 `src/product/**` 建立、由下游 Package Run 公开的实现 boundary |
| **Task 系统** | 当前 `TaskPlan`、shared scheduler 和 execution owners；管理依赖、并行上限和命名资源 |

后文只按这些含义使用 `run` 相关术语。代码示例中的 `defineConfig` 和 package `run` 是语义示例，不提前确认 exact public symbols。

### Consumer Call Path

```text
其他调用方
  │ 只传项目允许的 Run Controls
  ▼
项目 Run
  │ 已绑定 Project Definition
  ▼
Package Run
  │ 验证 definition 与 controls
  │ 调用 custom runner / TaskPlan factory
  ▼
Task 系统
  │ 执行 direct work 或静态 TaskPlan
  ▼
Task / Check / Record / decision / effect results
```

关键关系：

1. 项目运行脚本，而不是 Product，负责 import 项目配置文件。
2. 其他调用方调用项目 Run，而不是直接重新组装 Project Definition。
3. Package Run 自己调用配置中明确函数槽位里的函数。
4. Task 系统决定 task dependency、可并行工作、全局并行上限和 named resources。
5. Product 不根据文件路径发现或重新 evaluate 项目配置。

### Canonical Usage

```ts
// project-definition.ts
import { defineConfig } from "vibe-check";

export default defineConfig({
  // policies, checks, scheduler, effects, operational dependencies
});
```

```ts
// run.ts
import projectDefinition from "./project-definition";
import { run as runVibeCheck } from "vibe-check";

export function run(controls = {}) {
  return runVibeCheck(projectDefinition, controls);
}
```

```ts
// another caller
import { run } from "./run";

const result = await run({
  // only controls exposed by this project
});
```

这些名称和文件路径只证明调用关系。Task `1.2` 选择 package symbols；项目自行选择两个文件的路径和 public wrapper convention。

## Goals / Non-Goals

### Goals

- 用一个 Project Definition 组合 policy、Checks、custom functions、scheduler、effects 和 operational dependencies。
- 让项目只维护配置文件和运行脚本，并让其他调用方只调用项目 Run。
- 在 work 前验证 Project Definition 与 Run Controls，并建立一个确定的 invocation snapshot。
- 复用当前 Check/Record foundation、`TaskPlan` 和 shared scheduler。
- 建立下游可直接公开的 Product 运行内核和 current public-contract source。
- 原子迁移 JSON/schema/init、fixtures、dogfood、owners 和 Cases。

### Non-Goals

- 构建或发布 npm candidate；下游 Change 拥有 package projection 和 release evidence。
- 固定项目配置文件或运行脚本的名称和位置。
- 把项目 Run 提升为 Product CLI、`bin` 或第二套 Product contract。
- 公开 internal managers、scheduler、Tasks、bindings 或 execution protocol。
- 为整次 invocation 提供进程隔离或权限 sandbox。

## Decisions

### 1. Two Project Files Have Different Owners and Inputs

项目配置文件拥有稳定项目语义。它 default export 一个 Project Definition，并可以引用项目本地 functions、imports 和 closures。

项目运行脚本拥有集成方式。它 import Project Definition，调用 Package Run，并决定：

- 哪些 Run Controls 对其他调用方可见；
- 哪些 controls 使用项目默认值；
- 是否另外提供项目自有 CLI、service、agent 或 editor adapter。

项目运行脚本不能复制 Project Definition policy，也不能重新实现 Product execution。

### 2. Configuration Definition Is an Authoring Helper

配置定义函数提供：

- exact-key TypeScript authoring；
- field/type inference；
- Product 已拥有的 authoring defaults；
- plain Project Definition value。

它不建立 brand、builder state、registration lifecycle、module identity 或 file ownership。需要 project root、environment 或 executable context 的 validation 由 Package Run 在 work 前完成。

### 3. Package Run Accepts One Definition and Closed Controls

Package Run 的语义输入固定为：

```ts
packageRun(projectDefinition, runControls)
```

`projectDefinition` 是必需输入，每次 invocation 恰好一个。`runControls` 是 closed object，只允许以下类别：

- project root 和 changed-file context；
- explicit comparison/reference；
- cancellation；
- effect destination/disable override；
- operational dependency override。

Run Controls 不能注册 Check、修改 Project Definition policy、替换 scheduler、选择另一份 definition 或提升 gate/network/security authorization。

项目 Run 可以隐藏、固定或转发这些 controls 的一个子集。

### 4. Runtime Validation Owns Executable Input Safety

Package Run 在任何 Check、dependency probe、cache read、reporter 或 output work 前：

1. 验证 Project Definition top-level shape、`apiVersion`、policies、Checks、scheduler、effects 和 operational dependencies。
2. 验证 Run Controls 及其 precedence。
3. 拒绝 unknown keys、invalid identifiers、invalid function slots 和 incompatible gate/reference requests。
4. 只在完整输入有效时继续。

Expected invalid input 返回 typed configuration result，不执行 valid subset，也不依赖 exception text、console 或 exit code。

### 5. Normalization Produces Data and Function Bindings

Validation 后产生两个不同对象：

| 对象 | 内容 | 可以流向哪里 |
| --- | --- | --- |
| Declarative snapshot | Frozen policy、public Check metadata、schedule metadata、scheduler、effects 和 dependency config | Core、fingerprint、machine result、effect owners |
| Execution bindings | Custom runner 与 `TaskPlan` factory function references | 当前 Bun runtime 中的 Check/Task execution owners |

Function、closure、`Task` value 和 internal port 不进入 declarative snapshot、fingerprint、machine output 或 public result。

### 6. Package Run Calls Project Functions Through Existing Owners

每个 custom Check declaration 解析为：

- 一个 foundation-owned public `CheckDefinition`；
- 恰好一个 direct runner 或 `TaskPlan` factory binding。

Package Run 在 resolution/planning 阶段调用必要的 project function：

- direct runner 产生该 Check 的受控 work/result；
- `TaskPlan` factory 在 applicability 确认后返回完整静态 plan；
- skipped 或 not-applicable Check 不调用 factory；
- execution 开始后不能注册、删除或重写 Check/Task。

Package Run 不解释函数源码，也不通过 `Function#toString`、IPC 或 module reload 重建函数。

### 7. The Task System Owns Serial and Parallel Execution

`scheduler.maxParallel` 归一化为一个 invocation-scoped `SchedulerPolicy`，它是 Product task work 的唯一全局并行上限。

Task system 按以下规则执行：

1. Explicit task dependency 决定必须等待的顺序。
2. 没有未满足依赖且 named resources 不冲突的 tasks 可以并行。
3. Shared scheduler 不超过 `SchedulerPolicy.maxParallel`。
4. Direct work、Task work 和 completion work 共享同一 Product budget。
5. Custom runner 自行创建的未声明并行不获得 shared scheduler guarantee。

单个 Task 或 scanner adapter 可以按自身 owner 使用 subprocess、worker 或内部并行；这不改变 Product task graph，也不把整次 invocation 移入另一 runtime。

### 8. Project Definition Owns Semantics; Controls Own Invocation Context

Project Definition 拥有：

- policy catalog 和 selected gate policy；
- built-in/custom Check declarations and selection；
- scheduler；
- reporting、cache 和 output configuration；
- operational dependency defaults。

Run Controls 只在本次 invocation 覆盖已允许的 operational fields。Precedence 固定为：

```text
explicit Run Control
  > supported environment value
  > Project Definition / Product default
```

Gate 只能选择 Project Definition 中已验证的 named `DecisionPolicy`。Observation 也必须传入明确 Project Definition；Package Run 不在缺失 definition 时静默创建另一份配置。

### 9. Operational Dependencies Resolve Before Work

Operational dependency fields 与 built-in Check policy 分离。它们可以指定 executable location 和 owner 明确允许的 operational values，但不能携带 scanner-native policy、raw flags、exit mapping 或 result semantics。

Package Run 从 definition、supported environment snapshot 和 controls 构造一个 `ScannerDependencySnapshot`。Missing/invalid required binding 在 work 前失败；resolution 不读取 repository mise state，也不回退 ambient `PATH`。

下游 package Change 只决定 installed delivery、supported hosts 和 executable/version evidence，不重新定义 fields、precedence 或 snapshot semantics。

### 10. Effects and Results Share One Validated Model

普通 invocation 默认启用 Product-owned logs/progress、适用 cache 和 canonical output。Project Definition 与 Run Controls 按各自 owner 控制 targets、verbosity 和 explicit disable。

Structured result 区分：

- configuration/validation；
- planning；
- execution；
- gate decision；
- cancellation；
- each effect status。

API result 与 files 是同一次 invocation 对 validated Task/Check/Record model 的不同 projection；它们不能分别计算 identity、records、decision 或 gate facts。

### 11. Runtime Boundary Matches the Project-Owned Entry

项目运行脚本普通 import 配置，因此配置 module top-level code 和配置中的 functions 都在项目调用 Package Run 的 Bun runtime 中执行。Product 对这些 project functions 按 trusted project code 处理。

Product 不承诺隔离 `process.exit`、同步无限循环、global mutation 或 non-cooperative cancellation。Product-owned Task/subprocess adapters 仍应支持其既有 cancellation 和 cleanup contract。

### 12. Package Names and Project File Paths Have Different Owners

Current public-contract source 可以拥有：

- package import/export specifier；
- config-definition 与 Package Run symbols；
- Project Definition、Run Controls 和 result type symbols；
- default output/cache paths；
- supported environment identifiers；
- operational dependency identifiers。

它不能拥有项目配置文件或项目运行脚本路径。Canonical examples 不是 discovery contract。Version、host matrix、MIT/legal 和 manifest fields 由下游 Change 在有证据时补充。

### 13. JSON Migration Is a Hard Cut

本 Change 删除：

- JSON reader 和 comment grammar；
- runtime/editor JSON schemas 与 sibling generation；
- JSON discovery/selection；
- Product config `init`；
- dual-source fixtures 和 dogfood。

Legacy JSON 只触发 actionable migration diagnostic，不自动转换、不执行旧 commands/args，也不选择 alternate source。

### 14. Change Ownership and Handoff

| 能力 | 本 Change | 下游 API package Change |
| --- | --- | --- |
| Project Definition authoring/validation | 建立并验证 | 公开 declarations/exports |
| Product 运行内核 | 建立 definition + controls direct boundary | 作为 Package Run 公开 |
| Task/Check/dependency semantics | 建立并验证 handoff | 直接消费，不重新定义 |
| Project config/run examples | 建立 source-tree canonical pattern | 在 exact tarball 中验证 |
| Package/release fields | 不写 placeholder | 按 evidence 补全 |
| Product CLI hard cut | 不执行 | replacement acceptance 后执行 |
| Pack/publish | 不执行 | build/pack/verify；publish 仍需单独授权 |

### 15. Engineering Closure

| 工程项 | 必须保持的边界 | 证据 |
| --- | --- | --- |
| Current-contract module/fields | 一个 package-private literal owner；无 placeholder | owner-to-consumer comparison |
| Package symbols/types | 两个 callable operations + 必要 types；不从 root/example 偶然继承 | config/run type tests |
| Config-definition input/output | Plain value；无 brand/builder/registration | authoring + runtime validation tests |
| Package Run inputs/results | One definition + closed controls + typed result | type/runtime tests |
| Project config/run examples | 证明 owner 和调用链；不固定路径 | dogfood + docs comparison |
| Effect defaults | 对应 effect owner 的 write/collision/cleanup contract | focused effect tests |
| Environment/dependency identifiers | Closed allowlist；既定 precedence；secret-safe | snapshot/pre-work failure tests |

## Risks / Trade-offs

- Project functions 保留 imports/closures 且调用直接，但它们可以影响项目调用 Package Run 的 runtime；文档不得暗示 whole-run process containment。
- 项目多维护一个运行脚本，但其他调用方因此只依赖一个已绑定配置的项目入口。
- Project Definition 组合多个配置领域；各领域算法仍由原 owner 定义，本 Change 只负责组合、validation 和 precedence。
- JSON hard cut 会同时影响 fixtures、dogfood 和 CLI init，必须在同一 implementation 中迁移。

## Open Questions

无。Exact package symbols、Run Controls 字段编码、authoring defaulting 细节和 internal module layout 已委托给 Tasks 中的 engineering closure；它们不得改变本 Design 的 owner 和调用方向。
