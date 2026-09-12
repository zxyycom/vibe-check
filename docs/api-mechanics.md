# 深入理解 Vibe Check API 机制

本文说明 package 的通用 invocation lifecycle：自定义 Check 如何经过 Definition validation、options preflight、execution 与 settlement，以及一次 Run 如何形成 dependency data、aggregation、outputs 和可判别结果。首次集成先阅读[package README](../README.md)；随包 Check 的 options、业务效果和安全边界由各自指南说明；单个 public 字段与函数签名以 installed declarations 为准。

## 一次 Run 的生命周期

以下顺序描述责任与数据流；箭头表示当前阶段成功形成下一阶段的输入：

    ordinary Check values
      │ defineConfig: fill Definition defaults
      ▼
    Project Definition
      │ run: validate Definition + RunControls, then normalize the Check tree
      ▼
    validated Definition + complete static graph
      │ before execution: apply cancellation and flag selection
      │ prepared admission strategy readies one Run-local decision function when configured
      ▼
    initial control settlements + complete static Task graph
      │ Scheduler applies direct relations, mutex and parallel scheduling
      ▼
    task-local preflight / Product-owned blocked unavailable outcomes
      │ admitted Checks continue to author callback
      ▼
    author execution + terminal settlement
      ▼
    snapshot + messages + durations
      │ terminal measurement Hooks settle; if terminal context exists, prepared strategy completes once
      │ optional aggregation + enabled output completion
      ▼
    RunResult

### Selection 与 Scheduler readiness

Run 先验证包含全部可执行 Check 的静态 graph，再处理 invocation cancellation 与 flag selection。[flag 规则](guides/extending-check-lifecycle.md#按-flag-选择-check)产生一次 private effective selection；未被选择项先结算为 `not-applicable / flag-condition-not-matched`，不会再次 admission。它们仍属于同一张 graph：`dependsOn` dependent 在 preflight 前结算为 `unavailable / dependency-not-passed`，`observes` consumer 则可等待并读取该终态。

### Task-local preflight 与 execution

其余 Check 被 Scheduler 在 direct relation、mutex 与 capacity 允许后 admission，并在自己的 task 中执行 preflight，随后才执行 author callback。没有互相约束的 preflight 可以并行；它们不构成 Definition 顺序的全局 barrier。

### Terminal snapshot、aggregation 与 outputs

Run snapshot 保存 Check facts；progress rendering 呈现 execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files；optional aggregate 也在 terminal facts 结算后计算。

prepared strategy 的 `prepare / decide / complete` 顺序、失败与取消边界由[调度专题](guides/scheduling.md#已准备的-custom-strategy)定义；这些回调不能回写已结算 Check facts。

## Definition 与 invocation 的责任

### 参数应该放在哪里

**Definition 定义项目怎么检查；Controls 指定这一次怎么运行。** `defineConfig(...)` 的返回值是可重复使用的 Definition，`run(definition, controls?)` 的第二个参数只作用于当前调用；没有本次调整时，使用 `run(definition)`。

| 想设置什么 | 参数位置 | 与另一份输入的关系 |
| --- | --- | --- |
| 检查内容、领域 options、依赖与 Check 约束 | Definition 的 `checks` 中各项 Check | Controls 不能替换 Checks 或覆盖 Check options；领域输入继续由 owning Check 或显式 provider 承接。 |
| 调度并行预算、资源总量、策略与终态观察回调 | Definition 的 `scheduler` | Controls 没有 scheduler override，也不能注入 `measurementHooks`。 |
| 默认 machine、diagnostic 与 progress 输出方式 | Definition 的 `outputs` | 建立可重复使用的默认值；默认目录、预览数量和 formatter 都可在这里配置。 |
| 本次根目录、选择 flags 与协作取消 | Controls 的 `projectRoot`、`flags`、`signal` | 只属于本次调用，不是 `defineConfig` 字段。 |
| 本次 Check 产物与 progress 日志目标、diagnostic 文件命名 | Controls 的 `checkArtifactBaseDirectory`、`progressLogFile`、`diagnosticLogFileNaming` | 只属于本次调用；它们本身不是 Definition outputs 的默认值或 override。 |
| 本次开关输出、更换 machine / diagnostic 目录、调整 progress 预览 | Controls 的 `outputs` | 只覆盖当前调用明确提供的字段，其余继承 Definition 默认值。 |
| 本次选择哪些 Check statuses、按什么规则形成 aggregate | Controls 的 `checkAggregation` | 显式、无默认值；省略时 `aggregate: null`，不改写各项 Check outcome。 |

**两处 `outputs` 是默认值和逐字段覆盖值。** 只关闭本次 machine publication 不影响 progress、diagnostics 或下次调用；省略/`undefined` 不覆盖，`false`、预览数量 `0` 和清除 formatter 的 `null` 有效。字段默认值和示例见[输出指南](guides/run-outputs.md)。

相对输出路径从本次 effective `projectRoot` 解析；可复用的默认目录通常放 Definition，本次独占目录通常放 Controls 的对应 output override。Controls 不进入 Definition 的 declarative fingerprint。它也不是任意配置合并对象：unknown fields 会在 author work 前被拒绝；精确 grammar 与结果见下文[RunControls 与 Check aggregation](#runcontrols-与-check-aggregation)。

### 定义与调用如何处理输入

- `defineCheck(value)` 保留 literal `checkId`、options、typed-provider parser 和 `handoff: true` 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `defineAdmissionPolicy(value)` 只保留 closed admission policy literal、特别是 custom strategy 的 inference；它与同形 inline policy value 等价。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight、execution 与 custom admission callbacks 都保持为执行行为。scheduler fingerprint 区分 `static` 与 `custom`，且不包含 callback identity、source 或 closure。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

## options preflight 与 execution

Check 在获准入后执行自己的 `preflight(options, signal)`，再以 prepared options 或 fallback 进入 `execution`；block 或非法准备结果使本项 `unavailable`。不同 prepared shape 的类型要求、三种返回形式、冻结与取消边界见[自定义 Check 的 preflight](guides/extending-check-lifecycle.md#preflight准备阻止或带-fallback-继续)。

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` 表示本次无适用工作，可省略 reason；`unavailable` 表示无法形成可信结论，必须带非空 `reason.code`。两者都没有 final data；无领域 data 的成功/失败结果可返回 `{}`。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

需要在同一 Run 的 direct prerequisite 间保留引用 identity 时，provider 在 `defineCheck({ handoff: true, ... })` 作最小声明，并只在 accepted `passed` result 返回 non-null object/function reference。handoff 类型由该 result 自动推断；direct `dependsOn` consumer 以 `dependencies.get(provider)` 一次取得 canonical data 和 typed reference。provider 的 `parseData` 仍只处理 canonical data。`handoff: true` 背后的 WeakMap identity 是 Product 内部细节；handoff 是 invocation-private capability，不属于 terminal Check facts。

final data 与 Record data 使用 canonical JSON object：root 不能是数组，拒绝不支持的 prototype/descriptor、getter、cycles、sparse arrays 和 non-finite numbers，不调用 `toJSON`。接受后形成 detached、deep-frozen 的 null-prototype facts；不要依赖 JavaScript own-key enumeration 推断 canonical 文本顺序。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records；Record 数量不决定 status。结算后 reporter 关闭，late write 抛错且不能更改事实。

`messages?` 是 owning Check 可选的有序人读说明；consumer 必须先按 outcome 处理事实，不能用 message presence 推断状态。final data、Records 和 messages 分别承载主要事实、补充事实和人读说明。随包 Check 的额外 message 保证由各自指南说明。

author `messages` 是无空洞的有序数组，每项是精确 `{ level, code, message }`：level 为 `info | warning | error`，code 和 message 均为非空字符串。Product 不 trim、Unicode normalize、去重或设置 item/正文长度上限；省略、自有 `undefined` 和 `[]` 都表示无 messages。非法 attachment 使 owning Check 不可用且不接受 partial messages。捕获的 console 复用同一 readback shape，使用 `console-<method>` code。

progress 只呈现这些事实，不修改它们。预览默认值、formatter、console capture 与日志见[配置 Run 输出与诊断](guides/run-outputs.md)。

## 递归组合与继承

每个节点使用唯一 `checkId` 和非空 `displayName`；可执行节点也可以包含子节点，containment 只贡献 scheduling scope，不额外产生 snapshot 层级。带 `execution` 的节点形成自己的 outcome；没有 `execution` 的节点只组织子 Check 和 scheduling scope。普通对象字段表示显式 replacement；`inherit({ add, remove })` 只用于在父 `dependsOn`、`observes` 或 `mutex` collection 上增删。解析后，每个可执行节点拥有自己的 effective options、passed prerequisites、terminal observations、mutexes、visibility、parallel budget 与 admission priority。

## 类型化依赖数据

使用 direct `dependsOn` 取得成功 prerequisite，使用 direct `observes` 等待并审计任意终态；从 string `dependencies.get` / `list` 读取冻结事实，再由 producing Check 的 `parseData` 恢复业务类型。以 `handoff: true` 声明的 provider object 可用于 `dependencies.get(provider)`，向 direct prerequisite consumer 同时交付 frozen canonical data 与 same-Run reference。完整的[依赖数据指南](guides/check-dependencies.md)说明读取授权、继承、parser、identity 与 cleanup 边界，并给出运行示例。

## RunControls 与 Check aggregation

`RunControls` 只作用于一次 `run(definition, controls)`：

- `projectRoot` 决定项目相对路径的解析根；省略时使用调用时的工作目录。
- `flags` 是可省略的 dense 非空 string-token 数组，省略、`undefined` 或 `[]` 得到冻结空数组；合法 tokens 被复制、去重并稳定排序，完整集合进入 callback project context。
- `checkArtifactBaseDirectory` 是可选、invocation-only 的 Check artifact base；它使用非空且无 U+0000 的受信任 directory grammar，relative text 从 effective `projectRoot` 解析，absolute text 直接作为 target。它不进入 Definition fingerprint，不创建 output status，也不授予 Check 读取 base、sibling directory、machine/diagnostic output 或 cross-Run state 的能力；没有配置时 callback 的 `artifactDirectory` 为 `null`。
- `progressLogFile` 是可选、invocation-only 的 terminal-progress tee target，使用同一非空且无 U+0000 target grammar；它不会改变 Definition outputs、Definition fingerprint 或 Check callback capability。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `diagnosticLogFileNaming` 可选 `"unique"`（默认）或 `"channel"`，只控制本次 core/scheduler 日志 basename，不启用 diagnostics、不进入 Definition fingerprint。
- `checkAggregation` 显式选择 `checks: "all"`、Check-ID list 或 `"effective"`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。`"effective"` 只复用本次 private flag-and-dependency selection；`"all"` 和 ID list 不模拟或修改它。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。`"effective"` 的 empty selection 仍由 caller `empty` policy 结算，且不会把 private selection projection 到 `RunResult`、machine、diagnostic 或 callback。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

## RunResult 分支

输出的配置、日志目标、readback statuses 和 failure 优先级见[配置 Run 输出与诊断](guides/run-outputs.md#输出状态与失败处理)。本节说明调用方如何先判别 Run，再读取 Check facts。

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支 | 可用 facts 与处理方式 |
| --- | --- |
| `completed` | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。handoff 已在 execution graph 关闭时清除，不在此结果中。 |
| `output` | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。 |
| `cancelled` / `phase: "execution"` | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。 |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。 |
| `configuration` | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。 |
| `planning` | task-graph diagnostic 与 invocation metadata。 |
| `execution` | Product execution-settlement diagnostic 与 invocation metadata。`diagnostic.code === "admission-policy-failed"` 表示 custom policy 已停止 admission、取消 pending 并 drain started work；它不是 Check terminal status，也不携带 partial snapshot。 |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 output failure diagnostic。
