# 编写会正确结算的自定义 Check

本专题面向需要把项目规则接入 Vibe Check 的调用方：选择 `prepare` 或 `execute`，读取 callback 输入，返回可信终态，并在需要时发布补充事实。先能用一个普通 `execute` 完成规则；只有必须在执行前准备或验证 options 时才增加 `prepare`。一次 Run 的公共生命周期、输出优先级和完整结果模型见 [API 机制](../api-mechanics.md)。

## 选择扩展点

| 需求 | 使用方式 | 不要用它做什么 |
| --- | --- | --- |
| 规则可直接测量并结算 | `execute(options, context)` | 不要在 callback 外留下未等待的工作。 |
| 执行前验证或把 authoring options 变成 invocation-local 的准备值 | `prepare(options, context)` 后接 `execute(options, context)` | 它不是全局启动 hook；只在本 Check 已获准入后运行。 |
| 保存不决定终态的逐项事实 | `context.records.report({ id }, data)` | Record 不能替代 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 读取已声明上游结果 | `dependsOn` 或 `observes`，再从 `context.dependencies` 读取 | 不能读取未声明、传递或任意已运行的 Check。 |
| 向 direct prerequisite consumer 交接 same-Run reference | 在 provider 上声明 `handoff: true`，并在 `passed` result 返回 `handoff` | 不能用它发布到 RunResult、machine、progress、diagnostic 或 cache；不扩大 `observes` 权限。 |

`defineCheck(...)` 定义的 object 是公开 authoring surface。`prepare`、`execute`、`parseData` 都是调用方实现的受信任回调。Product 只提供各自声明的输入；回调独立执行的 I/O 仍由调用方负责。

## 定义 Check

下例同时展示 options 验证、取消、Record、message 和 terminal data。例子的固定输入只为独立运行；接入项目时应以自己拥有的读取或测量逻辑替换它。

```ts
import { defineContextCallback } from "@zxyycom/vibe-check";
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

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
  prepare(options) {
    return hasValidLicensePolicyOptions(options)
      ? { status: "success", preparedOptions: options }
      : { status: "failure", action: "block", reason: { code: "invalid-options" } };
  },
  omitQuietPassedRow: true,
  execute: defineContextCallback("check.execute", { contextNeeds: ["records","signal"], callback: (options: { readonly denied: readonly string[] }, { records, signal }) => {
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
  } })
});
```

### 省略安静通过行

把 `omitQuietPassedRow: true` 写在 **executable Check** 上，可在它安静通过时省略其
settled row。它不是一般 boolean 开关：公开类型和 closed runtime grammar 只接受字面量
`true`；省略或自有 `undefined` 都表示默认 `false`。container 不能声明它，它也不会继承给
children；`false`、旧 `visibility` 字段和其它值都会使 Definition validation 失败。

需要按调用方自己的条件启用时，组合对象以加入或省略字段，不要把条件结果赋给该字段：

例如，在 Check object 中写
`...(shouldReduceSuccessfulOutput ? { omitQuietPassedRow: true as const } : {})`；条件为否时字段不存在，
条件为真时才加入 literal opt-in。

这里的**安静通过**精确定义为 `status: "passed"`，且该次 settlement 接受的 Records 和
messages 都为空。final `data` 不参与判定；`recordPreviewLimit`、`messagePreviewLimit`、
formatter 返回的文本和终端截断也不会把已有 accepted detail 变成安静通过。非通过 outcome，
或带任一 accepted Record/message 的通过，都会保留 settled presentation。具体终端格式、计数
与默认输出边界见[进度呈现](run-outputs.md#progress-rendering)。

## 按 flag 选择 Check

`enabledByFlags` 决定 executable Check 是否参与本次 Run；它不替代权限、环境检测或 callback 内的业务条件。先选最简单的
正向写法：单个 token 使用 `when: "token"`；组合 token 时导入 builder；只有命中的 downstream Check 还需要启动其
`dependsOn` prerequisite 时才加入 `propagateDependsOn: true`。

```ts
import { all, any, changeFlag, defineCheck } from "@zxyycom/vibe-check";

const sourceAware = defineCheck({
  checkId: "source-aware",
  displayName: "Source aware",
  enabledByFlags: {
    when: any(all("required", changeFlag("source")), "force"),
    propagateDependsOn: true
  },
  execute: () => ({ status: "passed", data: {} })
});
```

### Condition grammar

`CheckFlagCondition` 是 builder、raw JSON、Definition snapshot 与 evaluator 共用的唯一递归 AST；非空字符串
本身就是 atom leaf。

| 要表达什么 | 写法 | 约束 |
| --- | --- | --- |
| 单个 token | `when: "token"` | token 非空；只测试 presence。 |
| 全部、任一、全无、非全、恰一 | `all`、`any`、`none`、`notAll`、`exactlyOne` | 每个 builder 至少接收一个字符串或嵌套 condition。 |
| 反转一个 condition | `not(condition)` | 只接收一个 condition。 |
| 生成或序列化 set condition | raw `{ kind, conditions }` | `kind` 为 `all` / `any` / `none` / `not-all` / `exactly-one`；`conditions` 是非空列表。 |
| 生成或序列化 unary condition | raw `{ kind: "not", condition }` | `condition` 是唯一 child。 |

Definition 复制、验证并冻结这个 AST；set child 的顺序和重复次数保留，因此重复 child 仍影响
`exactlyOne`。`changeFlag(id)` 只生成受保护的 `vibe-check:change:<id>` string token（literal `id` 保留 literal type）；
它不读取 Git。使用该 token 时，Definition 必须在同一 `changes.flags` 声明 `id`，否则在 author work 前失败。需要
Git source、regions 与 `project.changes` evidence 时，使用[按文件变化选择 Check](../api-mechanics.md#按文件变化选择-check)。

### Selection and propagation

没有 `enabledByFlags` 的 executable Check 默认参与选择。condition 命中时 Check 参与选择；不命中且未被传播带入时，
它在 preparation/execution 前以 `not-applicable / flag-condition-not-matched` 结算，duration 为 `null`。

`propagateDependsOn: true` 只把命中 root 的传递 `dependsOn` closure 加入本次选择。被带入的 dependency 即使自身
condition 不命中也按普通 lifecycle 调度；`observes` 永不进入 closure，hard prerequisite 是否通过仍由 Scheduler 决定。
省略 propagation 保持 direct-match selection。Definition 拥有 closed validation、snapshot/fingerprint；Run 拥有
effective selection 和 callback projection。

## Callback 声明与字段

共同 descriptor、类型推导、验证与精确视图规则见[声明式 callback context](../api-mechanics.md#声明式-callback-context)。
Check 的 `prepare` 与 `execute` 都以 options 为第一业务参数，普通 function 默认没有框架字段。
需要字段时使用 `defineContextCallback`；options 是业务输入，signal/project 等框架字段属于 context。

| helper phase | 可声明的完整顶层字段 |
| --- | --- |
| `check.prepare` | `signal`、`project` |
| `check.execute` | `artifactDirectory`、`dependencies`、`invocationId`、`project`、`records`、`signal` |

`CheckPreparationContext` 与 `CheckExecutionContext` 分别定义两个阶段的完整字段 schema；实际 callback 只取得选中字段。
Definition validation 在 author work 前固定声明，非法 descriptor 是配置失败，不等同于 preparation 或 execution throw。
project 视图、dependencies facade、Record reporter 只在有需求时建立；artifact path 还可能因既有输出义务建立。
取消、direct relation guards、console capture、settlement 和配置的 Git/flag 工作不因零需求消失。
请求 `records` 后，reporter 仍在本 Check lifecycle 结束时关闭，关闭后的写入仍被拒绝；声明不延长其生命周期。

## `prepare`：准备、阻止或带 fallback 继续

`prepare(options, context)` 的第一参数是 authoring options 的深度只读视图，第二参数只含本 callback 声明的框架字段。
需要取消 signal 或 project 时，分别声明 `signal` / `project`；双方声明 project 时，它们取得同一 Run 的冻结 project 值，
不是同一个外层 callback context。authored 与 prepared options 同形时可省略 `prepare`；两种 shape 不同时，TypeScript 要求提供它。它只能返回以下三种结果（每种都可附有序 `messages`）：

- `{ status: "success", preparedOptions }`：把准备后的 object 交给 `execute` 的第一业务参数 `options`。
- `{ status: "failure", action: "block", reason }`：本 Check 使用该 reason 直接结算为 `unavailable`，不接受 `fallback`，不会运行 `execute`。
- `{ status: "failure", action: "continue", fallback, reason, messages? }`：以 `fallback` 继续执行。`reason` 是 Check-owned diagnostic identity，不会单独形成 outcome；需要让调用方观察准备诊断时，在 `messages` 返回说明，随后仍以 execution 的 terminal outcome 为准。

准备值只属于本次 invocation，Product 会 canonicalize 并冻结后再交给 `execute`；不要修改传入 options，也不要把它当作跨 Run 缓存。preparation throw/reject 使用 `preparation-threw`，非法结果/message/reason 或非 canonical prepared/fallback 使用 `invalid-preparation-result`，只使本项 `unavailable`，不是整个 Definition 的配置错误。block 或 preparation failure 尚未开始 author execution，duration 为 `null`；已经接受的 preparation messages 仍保留。execution 的 throw、非法返回值和 Record 写入错误也会由 Product 结算为本项不可用。

## `execute` 可读取与可写入的内容

`execute(options, context)` 的第一参数是本 Check 已准备并冻结的 options；第二参数仅交付自己声明的框架字段：

| 输入 | 可以做什么 | 边界 |
| --- | --- | --- |
| `invocationId` | 关联本次 Run 的工作。 | 同一次 Run 的 callback 使用相同 ID，不是跨 Run state。 |
| `project.root` / `project.flags` / `project.changes` | 使用本次规范化的绝对根目录、同一 effective flag 集，以及已配置时同一次冻结的 change result。 | caller token 与 derived change token 在注入后都只按 presence 参与选择和 callback；`changes` evidence 不证明环境或权限。 |
| `dependencies` | 读取已声明 direct `dependsOn` / `observes` 的终态。 | `get` 不授权未声明或传递依赖；`list` 不是全局执行历史。 |
| `artifactDirectory` | 写本 Check 的 invocation-local artifact；未授权时为 `null`。 | 不推导 sibling、machine、diagnostic 或跨 Run state 的路径。 |
| `records` | 发布 object-shaped supplemental facts。 | 每个 ID 仅在本 Check 内唯一，且不会决定 status。 |
| `signal` | 在可等待工作中协作退出。 | 取消后不要启动背景工作或把部分结果伪装为通过。 |

成功与失败都必须返回 object-shaped final `data`；`not-applicable` 表示当前没有适用工作，`unavailable` 表示无法形成可信结果并必须带稳定 `reason.code`。声明 `handoff: true` 的 provider 还必须在 `passed` 返回同型 non-null object/function `handoff`；其它 branch 和 ordinary Check 不能携带该字段。`messages` 是有序的人读补充信息，不保证每个 outcome 都有；把完整或敏感详情留在调用方拥有的安全位置，不要依赖 progress 文本保存事实。

## 依赖与取消的实践

必须取得上游成功 data 才能开始时，声明 `dependsOn`，并先检查 `dependencies.get(id).ok`；上游未提供 data 时返回 `unavailable`，而不是猜测空值。需要等上游无论何种终态都结算后再审计时，声明 `observes`，用 `dependencies.list()` 处理各项 outcome。需要保留 provider reference identity 时，provider-aware `dependencies.get(provider)` 只对 direct `dependsOn` 成功；继续调用 provider Check 的 `parseData(read.data)`，不要把 parser 用于 `read.handoff`。完整示例、immutable observation 和 explicit resource cleanup 边界见[依赖数据指南](check-dependencies.md)。

对 `fetch`、子进程或自有异步 API，把 `signal` 传下去；若已取消，尽快停止并返回 `unavailable`。Vibe Check 不会取消调用方没有连接 signal 的外部工作，也不替调用方回收文件、网络或子进程资源。

## 下一步

- 需要安排多个 Check、编写 admission policy、模拟假设分支或复用本地时长历史时，阅读[调度 Check](scheduling.md)。
- 需要组合/继承 Check 或理解 dependency data、aggregation、machine outputs 的共同结果模型时，阅读[API 机制](../api-mechanics.md)。
- 只需使用 package 提供的检查时，从 [README 的 Check 概览](../../README.md#随包提供的-check)进入对应指南。
