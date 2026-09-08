# Project Definition

Vibe Check configuration is a project-owned TypeScript **Project Definition**. `defineConfig` creates its plain value; a project-owned wrapper calls `run(definition, controls)`. Product never discovers, reloads, or accepts a second configuration module.

本文拥有 Project Definition 的 validation、normalization、声明性 snapshot 与 fingerprint 实现不变量。公开参数和组合规则由 [API 机制](../api-mechanics.md)、[Check authoring](../guides/extending-check-lifecycle.md)、[依赖数据](../guides/check-dependencies.md)与[调度指南](../guides/scheduling.md)定义；本页为维护实现解释这些承诺，不建立第二份公开规则。Check/Record settlement 实现属于 [Check results](check-results.md)，每项随包 Check 的 consumer contract 属于对应[随包 Check 指南](../navigation.md#随包-check-指南)，owner-local external-tool adapter boundary 属于 [Check-owned scanner dependencies](scanner-dependencies.md)，result/output DTOs 属于 [Output](../output.md)。

`ProjectDefinition` 只拥有 ordinary Check tree、scheduler 与明确的 diagnostic logging、machine publication/progress rendering outputs。它没有 package-specific `quality`、file scope 或 code-area 字段；需要项目文件或领域 policy 的 Check 在自己的完整 `options` 中声明并消费这些输入。

它不拥有 invocation controls、Run execution/result compatibility、各 Check 的 domain options、scanner adapter 或 machine DTO。

## Progress preview 配置

公开 defaults、数值范围、formatter 输入与失败语义由[输出指南](../guides/run-outputs.md#check-messages-与受管-progress)定义。Definition validation 在 progress disabled 时仍验证所有字段；normalization 为省略字段补齐同一默认值，renderer 只消费 effective policy。

数值和 formatter 的 `default`/`custom` 种类进入 declarative snapshot；函数 identity/source/closure 和 RunControls 均不进入 fingerprint。字段变动可能改变版本间 fingerprint，不承诺跨版本字符串稳定；维护时同时核对 authoring defaults、direct Definition normalization 与输出消费。

## Public authoring surface

package surface 包含 `defineAdmissionPolicy`、`defineConfig`、`defineCheck`、`inherit`、`run`，六个可补齐默认值的 Check constructors
`duplicateDetection(options?)`、`fileMetrics(options?)`、`functionMetrics(options?)`、`jsonValidation(options?)`、
`jsonSchemaValidation(options?)`、`markdownLinkValidation(options?)`，以及必填输入的 `secretDetection({ files })` 与
`maintenanceReminders(entries)`。八项函数都返回 ordinary Check object，不引入第二种 execution model；其余 authoring helper、Definition
value 与 invocation operation 各自保持其显式责任。仓库 private consumer 的 Definition 由
[`scripts/project/gate/definition.ts`](../../scripts/project/gate/definition.ts) 组装；下例只说明 Project Definition 的 authoring 形状，不是该 Gate Definition 的逐行副本。

Finding waiver 分为两层 public authoring：`reconcileFindingWaivers(...)` 是任意 producer 可在完整 Finding 集合上调用的
独立 helper；`fileMetrics`、`functionMetrics`、`duplicateDetection` 与 `secretDetection` 另外在自己的 options 中接受
`findingWaivers`。四项 identity grammar、Records、messages 和 settlement 分别由对应 Check 指南拥有；其它 constructor
没有因为 generic helper 存在而自动接受同名字段。完整 helper grammar 见
[对账 Finding waiver](../guides/finding-waivers.md)。

```ts
import {
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  functionMetrics,
  jsonSchemaValidation,
  jsonValidation,
  markdownLinkValidation,
} from "@zxyycom/vibe-check";

const licenses = defineCheck({
  checkId: "licenses",
  displayName: "Dependency licenses",
  async execution({ records, signal }) {
    if (signal.aborted)
      return { status: "unavailable", reason: { code: "cancelled" } };

    const disallowed = await inspectDependencyLicenses();
    for (const dependency of disallowed) {
      records.report(
        { id: `dependency:${dependency.name}` },
        { license: dependency.license, name: dependency.name },
      );
    }
    return disallowed.length === 0
      ? { status: "passed", data: { disallowedCount: 0 } }
      : { status: "failed", data: { disallowedCount: disallowed.length } };
  },
});

export default defineConfig({
  checks: [
    {
      checkId: "repository-checks",
      displayName: "Repository checks",
      maxParallel: 2,
      checks: [
        duplicateDetection(),
        fileMetrics(),
        functionMetrics(),
        jsonValidation(),
        jsonSchemaValidation(),
        markdownLinkValidation(),
        licenses,
      ],
    },
  ],
  scheduler: {
    maxParallel: 4,
    resourceCapacities: { browser: 2 },
  },
});
```

`defineCheck` 只改善 TypeScript inference。Definition validation 负责关闭 ordinary Check grammar、拒绝 unknown Check keys 或 malformed declarative fields，并把 authored `options` snapshot 为 canonical immutable JSON；它不解释 options 的领域 shape。没有 `execution` 的 Check 是 container，只能携带递归 `checks` 和 scheduling fields；空 container 会产生 definition warning，而不会被静默当作 executable Check。

### Flag-enabled Checks

公开 authoring grammar、四种 predicate、传递选择和用户边界由[按 flag 选择 Check](../guides/extending-check-lifecycle.md#按-flag-选择-check)定义。本节只拥有将其转换为 invocation 输入的实现不变量：

- validator 仅在 executable 节点接受 closed enabledByFlags，拒绝 container、空/sparse token 列表、非法 mode、非 literal-true propagation 和 unknown fields；normalizer 复制、去重、按文本排序并冻结 token，不向 children 继承字段。
- normalized control 进入 declarative snapshot/fingerprint；省略 propagation 与显式 opt-in 保持可区分，不能在 normalization 时隐式开启传播。
- Run 在任何 control settlement 或 author work 前验证完整 executable graph，再计算唯一 private effective selection。matching opt-in roots 的 normalized dependsOn closure 取去重并集，以 canonical Check order 消费；不读取 observes，也不再次验证或运行 provider。
- effective selection 同时供 flag settlement 与 effective aggregation 消费；未匹配且不在 selection 中的 Check 才结算为 flag-condition-not-matched。被激活的 dependency 保留普通 pending/admission 路径，all-passed prerequisite 仍由 Scheduler 重检。
- cancellation precedence 在 flag control 之前，不把 cancelled Task 伪造成 flag miss；pre-admission result 留在同一 graph、dependency readback 和终态 snapshot 中，没有 started fact，duration 为 null。
- selection 保持 invocation-private，不投影新的 ID list、callback capability 或 machine/diagnostic telemetry。callback 仍读取完整 canonical project.flags；人读压缩由[输出指南](../guides/run-outputs.md#progress-rendering)定义。

### Scheduler 配置

`scheduler.resourceCapacities` 是 resource ID 到正 safe-integer units 的 closed mapping；省略规范化为冻结的 `{}`。resource ID 必须含至少一个非空白字符。每个 Check 的 effective `resourceClaims` 必须引用这里声明的 ID，claim units 也必须为正 safe integer 且不能大于对应 capacity。未知或 oversized claim 会使 Definition 在任何 author work 前失败。capacities、effective claims 及其 canonical key order 都进入 declarative snapshot/fingerprint。

`scheduler.admissionPolicy` 是 closed `static | custom` authoring field。省略与显式
`{ kind: "static" }` 都规范化为同一个 static policy；`defineAdmissionPolicy(...)` 只保留 literal inference，与同形
inline object 没有额外运行语义。custom branch 是 `{ kind: "custom", strategy }`，其中：

- simple strategy 为 `{ kind: "simple", decide(context) }`；
- prepared strategy 为 `{ kind: "prepared", prepare({ graph }) }`，它可 return 或 resolve 当前 Run 的
  `{ decide(context), complete? }`；
- 两种 `decide` 都同步返回精确 `{ kind: "select", taskId }` 或 `{ kind: "wait" }`。

exact validation 接受上述 closed grammar，并拒绝 unknown authoring fields 与 async/thenable `decide`。
prepare throw/reject 或 malformed prepared result 在 Scheduler 启动前映射为
`admission-strategy-preparation-failed`。strategy kind 进入 declarative snapshot/fingerprint；callback
identity/source/closure 不进入。调用顺序、冻结 context 和 output/result matrix 由
[调度指南](../guides/scheduling.md#自定义准入-policy) 完整拥有。

#### Learned critical-path strategy helper

`createLearnedCriticalPathStrategy(...)` 返回 public prepared custom strategy，调用方将其放入
`{ kind: "custom", strategy }`。Definition 按同一 custom grammar 验证它；factory 自己验证 history directory、
caller identity projection 与 model controls。调用方提供的配置和 closure 遵循本页的 runtime/declarative 分工。
具体参数、安全、退化及 observation 语义由[调度指南](../guides/learned-scheduling.md)拥有，
模型与 lifecycle 的实现归属见[架构](architecture.md#learned-critical-path-helper-owner)。

### Scheduler measurement Hooks

`scheduler.measurementHooks` 是可选的 readonly function array；省略时规范化为冻结空数组。validation 只接受
exact function entries，normalization 复制并冻结列表。每个 callback 接收同一个递归冻结的
`SchedulerMeasurementContext`，可同步返回或返回 `Promise<void>`。该 context 只交付 canonical graph、
admitted/settled kind observation 与 Scheduler-owned raw measurement；它不交付 Task value/error/callback、clock、
mutable Scheduler 或完整 interval history。

这是一项 Definition-owned runtime callback，而不是可由 `RunControls.outputs` 配置、覆盖或注入的 output。Hook
function 的 identity、source 与 closure 不进入 declarative snapshot/fingerprint；nonempty configured list 或 successful
prepared result 实际包含 `complete` 才启用 `outputs.measurementHooks`。终态调用顺序、context 形成、closed status 与主 Run
failure 的优先级由
[Architecture](architecture.md#execution-boundary) 和 [API mechanisms](../guides/run-outputs.md#输出状态与失败处理)
完整拥有。

### Admission policy context

`AdmissionPolicyContext` 是每次**实际** custom callback 新建的 detached、deep-frozen ordinary data snapshot。

- `graph` 是 invocation 内一次规范化、递归冻结后供所有 callback 共享的唯一 `SchedulerGraphSnapshot`；所有公开 Task identity 都是 `taskId`，topology、`admissionPriority`、canonical `resourceCapacities` 与每项 `resourceClaims` 只在这里的静态 metadata 中出现。
- `admissionState` 是当前同型 immutable admission boundary。重复读取在同一 callback 内保持同一 handle identity；调用方可保留 predecessor 并以 `select` / binary `settle` 推演 hypothetical successor，但不能启动、取消、reservation、等待或结算真实 Task。
- 其余动态 facts 包含 relation/mutex/resource candidates 的 `{ taskId, canAdmit }`、root/effective capacity、`admissionState.inspection.resources` 中每个资源的 `{ resourceId, capacity, inUse, available }`、running/settled/active-scope IDs、cancellation runtime facts，以及调用前已 flush 的 `measurement`。named shortage 的 selection rejection 使用 `resource-capacity-insufficient` 并列出所有不足资源的 required/occupancy facts。

`measurement.cumulative` 只给有界累计 scalar/peak/discrete facts，完整 per-Task table 只属于 terminal raw measurement；`measurementCount` 和 `measurementAt(index)` 是 context 创建时捕获的 invocation-local append-only frozen action-observation prefix reader。`measurementAt(index)` 是同步 getter，不返回 live array 或 per-round slice；index 不在 `[0, measurementCount)` 时返回 `undefined`，即使 Scheduler 在该 callback return 后继续执行也不能读取后续 append。每条 observation 给出 accepted `select`/`wait` 的 sequence/kind/task identity、从其 post-action state 开始到下一次实际 custom callback 前结束的 occupancy interval，以及期间 admitted/settled effects。该 interval 是 closed union：`availability: "available"` 才含数值 `contribution`，`availability: "unavailable"` 只含 reason，绝不以全零伪造失效 timing；合法 zero span 仍是 available contribution。它不表达 action 因果、duration 或 critical path，也不暴露 private Scheduler object、`Set`/`Map`、Check options/functions/data、Records、messages、logger、clock、signal 或真实 Task command。完整 callback 的 trusted、reentrancy、hard guard 与 fault 边界见
[调度指南](../guides/scheduling.md#自定义准入-policy)。

### Check options preflight

公开的 authoring 与结果 grammar 由[自定义 Check 指南](../guides/extending-check-lifecycle.md#preflight准备阻止或带-fallback-继续)定义；通用 final data/Record/messages 由 [API 机制](../api-mechanics.md#terminal-resultrecords-与-messages)定义。本节维护 Definition 与 invocation 之间的实现边界：

- Definition 只保留 trusted preflight function，不执行它，也不把 callback identity/source/closure 放入 declarative fingerprint。Run 完成 graph validation 与 flag control 后，才由 admitted Task 执行 preflight；它使用同一次 cancellation signal，受 direct relations、mutex、capacity 和 priority 约束。
- prepared/fallback 重新 snapshot 为 detached、canonical、deep-frozen 的 invocation-local value，不回写 authored options 或 fingerprint。throw 映射 preflight-threw；malformed result/message/reason 或 noncanonical prepared/fallback 映射 invalid-preflight-result；失败只结算 owning Check，不升级为 Definition configuration failure。
- preflight block 没有 author-execution started fact、duration 为 null，但保留 accepted preparation messages、terminal fact、aggregation 和 settled lifecycle。prerequisite-blocked Task 则不运行 preflight/execution，也没有 author Record/message；direct blocker facts 由 settlement 保存。
- console/author message 依照 preparation、execution 的先后次序交付；即使 execution 后续抛错，已经接受的 preparation messages 仍保留。通用 terminal grammar 由 settlement 验证，Definition 不解释任何 Check 领域 data。

### Typed dependency data

公开的 provider 类型、parser 责任与 `dependencies.get` / `list` 契约由[依赖数据指南](../guides/check-dependencies.md)拥有。维护时区分三个边界：`defineCheck` overload 保留 synchronous parser 与 execution data 的类型关系；Definition validator 仅保存 executable object 的合法 function（自有 `undefined` 规范化为省略）；runtime handoff 根据 normalized direct relation union 提供已冻结 facts，不调用 parser。

类型证据需覆盖 PromiseLike 拒绝与普通 recursive Check 仍合法；运行时证据需覆盖 direct 授权、四态可用性、稳定列表和 immutable handoff。[Architecture](architecture.md) 拥有 handoff 实现，[Check 结果](check-results.md)拥有 canonical settlement 不变量。

### Message attachment validation

公开 message shape 与终态作用见 [API 机制](../api-mechanics.md#terminal-resultrecords-与-messages)，显示控制见[输出指南](../guides/run-outputs.md)。validator 以 descriptor-safe 方式整体接收 attachment：非法 item 不接受 partial messages；省略、自有 undefined 和空数组归一到无 messages，合法 attachment 保持 author 顺序且不去重。captured console 由 execution owner 生成，再复用同一 accepted-message readback shape。Finding helper 的输入与输出契约见[呈现指南](../guides/presenting-findings.md)，不是 Definition 的领域规则。

## Recursive Check tree

Every node has a unique `checkId` and non-empty `displayName`. An executable node can also contain children; execution and containment are independent ordinary fields. Containment contributes scheduling inheritance only: it does not create a separately published Check or a hierarchy in the final snapshot.

`maxParallel` is a positive safe integer. The definition scheduler supplies the root value (default `4`), and a node's value is inherited by descendants unless a child supplies its own value.

`resourceClaims` 是 resource ID 到正 safe integer 的 closed mapping。它继承最近的显式完整 mapping：省略时保留，`{}` 明确清空，其它显式 mapping 完整替换而不逐 key 合并。每个 effective claim 必须引用 `scheduler.resourceCapacities` 已声明的资源，并且不能超过该资源总量。一个 Task 的全部 claims 在 admission 时原子取得，贯穿 task-local preflight 与 execution，并在任意 settlement path 一起释放。

`admissionPriority` is a signed safe integer. It inherits from the nearest explicit ancestor and defaults to `0`. It is immutable Task metadata: static/custom policies can read it only through the full graph, and it only orders otherwise-ready work in the same scheduler selection layer. It does not change declaration order or bypass direct dependencies, mutexes, root or scoped capacity, or lifecycle cancellation. Use a few relative bands rather than a unique number for every Check.

`dependsOn`、`observes` 与 `mutex` 都接受 exact string collection 或 `inherit({ add, remove })`：

- an exact collection replaces the inherited collection, including `[]` to clear it;
- `inherit` changes the parent collection deliberately, then canonicalizes and de-duplicates it;
- `dependsOn` 与 `observes` 都命名同一 Definition 中的 executable Check IDs；mutex values 命名 shared resources。
- `dependsOn` 只在所有 direct provider 都已 `passed` 后授权本 Check 的 preflight/execution；`observes` 只等待所有 direct provider 形成任意 terminal outcome。两类 relation 的 union 授权 `dependencies.get` / `list`，同一 provider 不得同时出现在两者。

The following field fragments are the only three collection forms. They belong on an ordinary Check; they are not a second configuration format. Use Check IDs that are executable in the same Definition.

```ts
import { inherit } from "@zxyycom/vibe-check";

const inheritedScheduling = {
  // Omit collections or `resourceClaims` to retain the parent's value.
};

const exactScheduling = {
  dependsOn: ["compile"], // Replace the inherited dependencies.
  observes: ["publish-summary"], // Replace the inherited terminal observations.
  mutex: [], // Deliberately clear inherited mutexes.
  resourceClaims: {}, // Deliberately clear the inherited complete mapping.
};

const editedScheduling = {
  dependsOn: inherit({ add: ["test"], remove: ["lint"] }),
  observes: inherit({ add: ["report"] }),
  mutex: inherit({ add: ["network"] }),
};
```

An executable Check may declare `visibility: "always" | "attention"`. Omission and explicit `undefined`
normalize to `always`; a container cannot declare visibility, does not pass it to children, and unknown
values fail Definition validation. Visibility is declarative presentation identity: normalized executable
declarations always carry it, so `always` has the same fingerprint whether omitted or explicit and
`attention` changes that fingerprint. It does not change scheduling, execution, options, Check/Record
facts, machine output, Run Controls, or invocation-wide progress configuration. `attention` 的 `passed` Check 在默认 progress 中仅当没有 accepted Record 也没有 accepted message 时隐藏；任一类存在时仍显示其 settled block。

The declaration order of `checks` is not execution order. After validation, Product flattens executable nodes to a canonical Check catalog and runs task-local preflight plus direct callbacks subject to `dependsOn` / `observes` relation semantics, mutexes, root/scoped parallel budgets, and atomic named resource claims.

## Package-provided Check composition

本节只拥有随包 Check 与 Project Definition 的共同组合边界。每项 Check 的 consumer options、默认值、领域校验、结果、
Records、不可用原因和定制依赖用法由[随包 Check 指南](../navigation.md#随包-check-指南)中的对应 owner 完整表达。

八个函数都返回 ordinary executable `Check`，Product core 不注册或特殊解释这些 Check ID。前六个 constructor 接受
可省略的 authoring policy、同步拒绝未知或非法输入，并产生完整、冻结的 resolved options；
`secretDetection({ files })` 要求完整显式 files policy，`maintenanceReminders(entries)` 要求显式提醒政策。若调用方在 constructor 后用原生对象组合替换完整
`options`，owning Check 的 preflight 仍负责拒绝缺失、未知或非法 resolved shape；Definition 只保存 canonical authored
JSON，不把领域错误提升为整个 Definition 的 configuration failure。

六个读取文件的 defaulted constructor 共用 package root 导出的深冻结 `defaultProjectFileSelection` 作为可组合基线；`secretDetection` 则要求 caller 提供完整 explicit selection，但各 Check
仍拥有自己的精准 include、领域字段和 exact-input eligibility。公共文件选择、默认排除和原生组合方式见
[Project files and Check exact inputs](project-files.md#check-owned-file-selection)；每项 Check 的 resolved 默认值只见对应指南。
scanner executable、command marker 和 adapter protocol 由 owning Check 及
[Check-owned scanner dependencies](scanner-dependencies.md#check-owned-command-options)承接，不是 Definition、Run Controls 或
环境变量中的共享 override。
