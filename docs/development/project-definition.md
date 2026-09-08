# Project Definition

本文拥有 project-owned TypeScript Definition 的 validation、normalization、声明性 snapshot 与 fingerprint 不变量。公开 authoring 由 [API 机制](../api-mechanics.md)、[Check lifecycle](../guides/extending-check-lifecycle.md)、[依赖数据](../guides/check-dependencies.md)及[调度指南](../guides/scheduling.md)定义；Run Controls 和 capability 投影见 [Project Run](project-run.md)。

Definition 仅含 ordinary Check tree、scheduler 与默认 outputs；file selection、领域 policy 和 scanner options 留在 owning Check，不按随包 Check ID 解释。`defineConfig` 生成普通 value，Product 不发现或重载配置模块。

## Progress preview 配置

公开 defaults、数值范围、formatter 输入与失败语义由[输出指南](../guides/run-outputs.md#check-messages-与受管-progress)定义。Definition validation 在 progress disabled 时仍验证所有字段；normalization 为省略字段补齐同一默认值，renderer 只消费 effective policy。

数值和 formatter 的 `default`/`custom` 种类进入 declarative snapshot；函数 identity/source/closure 和 RunControls 均不进入 fingerprint。字段变动可能改变版本间 fingerprint，不承诺跨版本字符串稳定；维护时同时核对 authoring defaults、direct Definition normalization 与输出消费。

## Public authoring surface

`defineCheck`/`defineConfig` 等 authoring helper 与随包 constructors 通过同一 ordinary Check tree 集成，不建立第二 execution model。public export inventory 由 `src/index.ts` 和[API 机制](../api-mechanics.md)维护；下例说明 authoring 形状，不是[仓库 Gate Definition](../../scripts/project/gate/definition.ts)的副本。

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

公开 resource mapping、policy grammar 和 callback proposals 由[调度指南](../guides/scheduling.md)定义。validator 在 work 前关闭 scheduler grammar：resource ID 必须含非空白字符，capacities/claims 使用正 safe integer；每个 effective claim 必须引用已声明资源且不超过 capacity。normalizer 将省略 capacities 变为冻结 `{}`，并将 canonical capacities/effective claims 纳入 fingerprint。

省略 admissionPolicy 与显式 static 规范化为同一值；`defineAdmissionPolicy` 只改善 inference。custom simple/prepared 的 strategy kind 进入 snapshot/fingerprint，function identity/source/closure 不进入。closed validation 拒绝 unknown fields；同步 decide 的 runtime result 检查拒绝 async/thenable。prepare failure 由 Invocation 在 Scheduler 启动前映射，不是 Definition validation 执行 callback。维护时同时核对 authoring types、direct-value validation 和 [Scheduler handoff](scheduler.md)。

#### Learned critical-path strategy helper

`createLearnedCriticalPathStrategy(...)` 返回 public prepared custom strategy，调用方将其放入
`{ kind: "custom", strategy }`。Definition 按同一 custom grammar 验证它；factory 自己验证 history directory、
caller identity projection 与 model controls。调用方提供的配置和 closure 遵循本页的 runtime/declarative 分工。
具体参数、安全、退化及 observation 语义由[调度指南](../guides/learned-scheduling.md)拥有，
模型与 lifecycle 的实现归属见[架构](architecture.md#learned-critical-path-helper-owner)。

### Scheduler measurement Hooks

`scheduler.measurementHooks` 是 Definition-owned runtime function array。validation 只接受 exact function entries；normalization 复制、冻结列表，省略时为空。callback identity/source/closure 不进入 snapshot/fingerprint，RunControls.outputs 不能注入或覆盖它。

context、ordered delivery 和 prepared complete 的接线见 [Scheduler terminal handoff](scheduler.md#terminal-hooks-与-completion)；公开 status 与 failure priority 见[输出指南](../guides/run-outputs.md#输出状态与失败处理)。

### Admission policy context

Definition 只提供 normalized static graph metadata，不能给 callback 暴露 authored options/functions/data。Invocation 内唯一 frozen graph DTO 与每次 callback 的 detached dynamic context、lazy admissionState 和 captured-prefix measurement 由[Scheduler collector](scheduler.md#measurement-collector-与-immutable-context)构造；字段、inspection 与 proposal 的公开使用规则由[调度指南](../guides/scheduling.md#自定义准入-policy)定义。

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

validation 要求全树唯一 checkId 和非空 displayName。execution 与 containment 独立：executable 也可有 children；container 只影响 scheduling inheritance，不创建单独的 published hierarchy。

root maxParallel 为正 safe integer，省略默认 4；admissionPriority 为有符号 safe integer，默认 0。normalization 按父子关系解析以下继承，具体 authoring 范围见[调度指南](../guides/scheduling.md)：maxParallel 和 admissionPriority 继承最近显式值；resourceClaims 继承整个 mapping，显式 `{}` 清空，不逐 key merge；dependsOn/observes/mutex 的 exact collection 完整替换（含空数组），inherit 则在父集合上 add/remove 后排序去重。normalized direct dependsOn 与 observes 不得包含同一 provider，二者只引用 executable IDs。

effective priority/claims 是 immutable graph metadata；admission 时原子取得全部 claims，贯穿 preflight/execution，任意 settlement 一起释放。declaration order 不代替 execution order，也不绕过 prerequisite、mutex、capacity 或 cancellation。

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

`visibility` 只允许 executable 声明，不继承给 children；省略/undefined 规范化为 always，unknown values 失败。normalized declarations 始终携带该值，因此显式/省略 always 有相同 fingerprint，attention 则不同。它不改变 execution 或 facts；呈现由[progress owner](human-output.md#progress-presentation-maintenance)消费。

## Package-provided Check composition

各 constructor 同步验证 authoring input 并物化完整、冻结的 resolved options；哪些输入可省略由对应[Check 指南](../navigation.md#随包-check-指南)定义。其结果仍是 ordinary executable Check，没有 Core registry 或 ID 特权。

constructor 后通过原生对象组合替换 options 时，owning preflight 仍须拒绝缺失、unknown 或非法 resolved shape。Definition 只保存 canonical authored JSON，不把领域错误升级为全局 configuration failure。默认 file-selection 的共同机制见 [Project files](project-files.md#check-owned-file-selection)，scanner protocol 与 unavailable mapping 见 [Scanner dependencies](scanner-dependencies.md)；这些不是 Definition/Controls 的共享 override。
