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
    declarative snapshot + fingerprint + complete static graph validation
      │ sequential all-Check preflight barrier
      ▼
    prepared Checks / blocked unavailable outcomes
      │ build the ready task graph; apply dependency, mutex and parallel scheduling
      ▼
    author execution + terminal settlement
      ▼
    snapshot + messages + durations
      │ optional aggregation + machine publication
      ▼
    RunResult

Run 在 preflight 前验证包含全部可执行 Check 的静态 task graph；完整 barrier 结束后，blocked Check 先结算为
`unavailable`，其余 prepared Checks 再形成 ready task graph。Run snapshot 保存 Check facts；progress rendering 呈现
execution lifecycle；machine publication 在 terminal snapshot 形成后写入 machine files。所有 author execution 都在完整
preflight barrier 之后开始，optional aggregate 也在 terminal facts 结算后计算。

## Definition 与 invocation 的责任

- `defineCheck(value)` 保留 literal `checkId`、options 和 typed-provider parser 的 TypeScript inference。它与同 shape 普通 Check object 具有相同 runtime 语义。
- `defineConfig(value)` 形成带默认 `apiVersion`、outputs 和 scheduler policy 的 Project Definition。
- `run(definition, controls?)` 拥有 invocation validation 与 normalization：它关闭递归 Check grammar，detach / canonicalize authored options，并形成 declarative snapshot 与 fingerprint。

fingerprint 使用 normalized declarative fields；preflight 与 execution callbacks 保持为执行行为。同一份 Definition 可以重复调用，每次 Run 都从 authored input 派生自己的 project context、prepared options、terminal facts 和 output statuses。

## options preflight 与 execution

可执行 Check 可以提供 `preflight(options, signal)`，在 author execution 前准备本次 invocation 使用的 options。authored 与 prepared options 同形时可以直接使用 authored options；两种 shape 不同时，TypeScript 要求提供 preflight。

preflight 返回以下三种 closed result 之一：

| 结果 | execution 输入与 Check outcome |
| --- | --- |
| `{ status: "success", preparedOptions, messages? }` | 使用 `preparedOptions` 进入 execution。 |
| `{ status: "failure", action: "block", reason, messages? }` | owning Check 以 `unavailable` 结算。 |
| `{ status: "failure", action: "continue", reason, fallback, messages? }` | 使用 `fallback` 进入 execution。 |

Run 按 Definition 顺序执行所有 Check 的 preflight，完整 barrier 结束后才启动 Check scheduler。preflight throw、malformed result 或 noncanonical prepared value 把 owning Check 结算为 `unavailable`。prepared options 与 fallback 都会成为 detached、deep-frozen 的 invocation-local value；preflight messages 与后续 terminal outcome 共同呈现 preparation 结果。

### 完整运行示例

下面的完整示例故意让 Check 返回 `failed`。预期组合是 `RunResult.kind === "completed"`、该 Check outcome 为 `failed`、显式 aggregate 也为 `failed`；这三个值分别表达 Run lifecycle、单项业务结果和调用级 policy：

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

function hasValidLicensePolicyOptions(options: object): boolean {
  const denied: unknown = Reflect.get(options, "denied");
  return (
    Object.keys(options).length === 1 &&
    Object.hasOwn(options, "denied") &&
    Array.isArray(denied) &&
    denied.every((license) => typeof license === "string")
  );
}

const licensePolicy = defineCheck({
  checkId: "license-policy",
  displayName: "License policy",
  options: { denied: ["GPL-3.0-only"] },
  preflight(options) {
    return hasValidLicensePolicyOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } };
  },
  visibility: "attention",
  execution({ options, records, signal }) {
    if (signal.aborted) return { status: "unavailable", reason: { code: "cancelled" } };

    const deniedCount = options.denied.length;
    if (deniedCount > 0) {
      records.report({ id: "denied-license" }, { count: deniedCount });
      return {
        status: "failed",
        data: { deniedCount },
        messages: [{ level: "warning", code: "denied-license", message: "Denied licenses found." }]
      };
    }
    return { status: "passed", data: { deniedCount: 0 } };
  }
});

const definition = defineConfig({
  checks: [licensePolicy],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition, {
  checkAggregation: {
    checks: "all",
    mode: "all",
    unavailable: "propagate",
    notApplicable: "exclude",
    empty: "passed"
  }
});
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
if (result.aggregate !== "failed") throw new Error("Expected the selected Checks to fail");
const outcome = result.snapshot.checks.find(
  ({ checkId }) => checkId === licensePolicy.checkId
)?.outcome;
if (outcome?.status !== "failed" || outcome.data.deniedCount !== 1) {
  throw new Error("License policy did not produce the expected failed outcome");
}
```

## terminal result、Records 与 messages

每个可执行 Check 返回一个 terminal result：`passed` / `failed` 带 Check-owned object final data；`not-applicable` / `unavailable` 以 reason 表示本次调用的数据边界。settlement 会 detach、canonicalize 并关闭 final data；callback throw、malformed result 或 noncanonical data 对应 `unavailable` outcome。

`records.report({ id }, data)` 在 owning Check namespace 内追加 supplemental Record。每个 `id` 非空且在该 Check 内唯一，Record data 使用 canonical JSON object；无效或重复 Record 把 owning Check 结算为 `unavailable`。settlement 保留此前已经接受的 Records。

`messages?` 是通用 Check API 允许携带的有序人读补充信息，不是所有 Check 或所有状态都必须提供的字段。owning Check 决定哪些 preflight / terminal 分支携带 message；consumer 必须先按 outcome 处理事实，不能依赖 message presence 判断状态。`visibility: "attention"` 只选择需要 attention 时呈现的 progress。final data、supplemental Records 和 messages 分别承载主要事实、补充事实和可选人读说明。

随包 Check 对其代码明确结算的失败、不可用和 non-blocking finding 分支，均附带至少一条可操作 message；各 Check 指南列出
具体 message codes。这项 Check-local 保证不会把 generic `messages?` 改成必需字段，也不覆盖 Product 在 callback 之外形成的
防御性 settlement。

## 递归组合与继承

带 `execution` 的 Check node 形成自己的 outcome，也可以同时包含子 `checks`；没有 `execution` 的 node 只组织子 Check
及其 scheduling scope。解析后的每个可执行节点获得自己的 effective display、options、dependency、mutex、visibility 与
parallel budget。container 自身不产生 outcome。

普通对象字段表示显式 replacement：新的 `options` 提供 owning Check 的完整 closed shape，新的 `dependsOn` 或 `mutex` 数组替换 inherited collection。`inherit({ add, remove })` 表示在父 collection 上增删。effective configuration 完全由这些显式值和 edits 决定。

## 类型化依赖数据

producer 同时声明 `execution` 与 `parseData`，从而拥有 final-data contract。consumer 先声明 direct `dependsOn`，再用非泛型 `dependencies.get(checkId)` 读取 canonical data、收窄 `ok`，最后调用 producer 的 parser。

### 完整运行示例

```ts
import { defineCheck, defineConfig, run } from "vibe-check";

const CHANGED_FILES_DATA_VERSION = 1 as const;

type ChangedFilesData = Readonly<{
  readonly files: readonly string[];
  readonly version: typeof CHANGED_FILES_DATA_VERSION;
}>;

const changedFiles = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",
  parseData(data): ChangedFilesData {
    if (
      data.version !== CHANGED_FILES_DATA_VERSION ||
      !Array.isArray(data.files) ||
      !data.files.every((value): value is string => typeof value === "string")
    ) {
      throw new TypeError("Unsupported changed-files data");
    }
    return { files: data.files, version: data.version };
  },
  execution() {
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION }
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles.checkId);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    const data = changedFiles.parseData(read.data);
    return { status: read.status, data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

dependency reader 为已声明且具有 `passed` / `failed` final data 的 direct dependency 返回 `ok: true`，并保留 upstream status；其它读取返回包含原因的 `ok: false`。producer parser 负责 shape、invariant 和 compatibility validation，consumer 显式调用该 parser 恢复 provider data。七个随包 Check 都在返回对象上提供 `parseData`，并从 package root 额外导出同一 final-data parser；名称与 final-data types 见 [README 的内置结果、消息与解析器](../README.md#内置结果消息与解析器)。

## RunControls 与 Check aggregation

`RunControls` 只作用于一次 `run(definition, controls)`：

- `projectRoot` 决定项目相对路径的解析根。
- `flags` 成为 callback 可读的 normalized project context。
- `signal` 供 preflight 与 execution 协作取消；取消结果记录对应 phase。
- `outputs` 覆盖本次 machine publication 或 progress rendering。
- `checkAggregation` 选择 `checks`，并以 `all` / `any`、`unavailable`、`notApplicable` 与 `empty` policy 形成 invocation aggregate。

aggregation 是 terminal outcomes 之外的 invocation-level fact。它在完整 terminal facts 结算后产生 `passed`、`failed`、`not-applicable` 或 `unavailable`；未配置 policy 时 `aggregate` 为 `null`。consumer 需要调用级结论时显式选择 policy，同时保留每项 Check outcome。

Check-specific invocation facts 由 owning Check 的 options 或 producing Check 的 final data 承载。多个 Checks 共享同一事实时，producer 负责 acquisition policy 与 data shape，下游通过 direct `dependsOn` 读取；上面的 typed dependency 示例聚焦这条 data handoff。

## outputs 与 RunResult 边界

Definition outputs 提供 machine publication 和 progress rendering defaults，RunControls 可以对当前调用局部覆盖。machine publication 从完整 snapshot 产生 `run.json` 与 `records.ndjson`；progress rendering 呈现人读 lifecycle。两个 output 都由 Run 调度，并分别记录 status。machine bytes、schema identity、完整 publication-set validation 与随包示例由 [machine output 契约](output.md)说明；Check final-data parser 只处理已经取得的单个 data object，不替代该契约。

按 `RunResult.kind` 和 cancellation phase 读取结果：

| 分支 | 可用 facts 与处理方式 |
| --- | --- |
| `completed` | 完整 `snapshot`、`checkDurations`、`checkMessages`、`outputs` 与可选 `aggregate`；继续读取单项 Check outcome。 |
| `output` | 完整 Check facts 与 output failure diagnostic；消费 facts 并处理失败的 output。 |
| `cancelled` / `phase: "execution"` | 取消时关闭的 snapshot、durations 与 messages；按 cancellation result 处理。 |
| `cancelled` / `phase: "pre-work"` 或 `"planning"` | invocation metadata 与 cancellation phase；按 phase 结束调用。 |
| `configuration` | Definition、controls 或 aggregation selection diagnostic；project callback 执行数为零。 |
| `planning` | task-graph diagnostic 与 invocation metadata。 |
| `execution` | Product execution-settlement diagnostic 与 invocation metadata。 |

Check `failed` 是已结算的业务 outcome；Run `execution` 是 invocation infrastructure diagnostic；Run `output` 是完整 Check facts 附带的 publication / rendering diagnostic。
