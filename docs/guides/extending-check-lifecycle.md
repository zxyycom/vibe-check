# 编写会正确结算的自定义 Check

本专题面向需要把项目规则接入 Vibe Check 的调用方：选择 `prepare` 或 `execute`，读取 callback 输入，返回可信终态，并在需要时发布补充事实。先能用一个普通 `execute` 完成规则；只有必须在执行前准备或验证 options 时才增加 `prepare`。一次 Run 的公共生命周期、输出优先级和完整结果模型见 [API 机制](../api-mechanics.md)。

## 选择扩展点

| 需求 | 使用方式 | 不要用它做什么 |
| --- | --- | --- |
| 规则可直接测量并结算 | `execute(context)` | 不要在 callback 外留下未等待的工作。 |
| 执行前验证或把 authoring options 变成 invocation-local 的准备值 | `prepare(options, signal, project?)` 后接 `execute(context)` | 它不是全局启动 hook；只在本 Check 已获准入后运行。 |
| 保存不决定终态的逐项事实 | `context.records.report({ id }, data)` | Record 不能替代 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 读取已声明上游结果 | `dependsOn` 或 `observes`，再从 `context.dependencies` 读取 | 不能读取未声明、传递或任意已运行的 Check。 |
| 向 direct prerequisite consumer 交接 same-Run reference | 在 provider 上声明 `handoff: true`，并在 `passed` result 返回 `handoff` | 不能用它发布到 RunResult、machine、progress、diagnostic 或 cache；不扩大 `observes` 权限。 |

`defineCheck(...)` 定义的 object 是公开 authoring surface。`prepare`、`execute`、`parseData` 都是调用方实现的受信任回调。Product 只提供各自声明的输入；回调独立执行的 I/O 仍由调用方负责。

## 定义 Check

下例同时展示 options 验证、取消、Record、message 和 terminal data。例子的固定输入只为独立运行；接入项目时应以自己拥有的读取或测量逻辑替换它。

```ts
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
  execute({ options, records, signal }) {
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

`enabledByFlags` 只决定本次 Run 是否选择 executable Check；它不是权限、环境检测或 callback 内的条件替代。兼容 shorthand 继续可用；新的 expression 优先直接导入 builder，以字符串作为 atom：

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

直接导出的 `all`、`any`、`none`、`notAll` 与 `exactlyOne` 接受至少一个字符串或嵌套条件，`not` 接受一个条件；单个 token 直接写成 `when: "token"`。字符串 token 必须非空，这一要求由 Definition validation 执行。`changeFlag(id)` 只生成受保护前缀的字符串 token（对 literal `id` 保留 `vibe-check:change:<id>` literal type），不创建专用 AST node，也不在调用时确认 ID。将该 token 用作 `when` 时，Definition 必须在同一 `changes.flags` 声明该 ID；否则在 author work 前失败。

`CheckFlagConditionInput` 是字符串或递归 raw AST input。raw AST 仍是可序列化、生成器等场景的兼容输入：atom 为 `{ kind: "flag", flag: "token" }`，set 为 `{ kind: "all" | "any" | "none" | "not-all" | "exactly-one", conditions: [/* 至少一个条件 */] }`，unary 为 `{ kind: "not", condition: /* 条件 */ }`；这些递归位置同样可以使用字符串 atom。builder 只构造 operator authoring node，并原样保留它收到的字符串和 raw child；它不遍历、验证或规范化 child。Definition 才复制、验证并把所有 authoring input 规范化为同一 object-only canonical AST。没有 `flag()` 或 builder namespace；发生名称冲突时按普通 ESM import alias 处理。

`enabledByFlags` 只可写在 executable Check 上，container 不接受也不向 children 继承它；额外字段、空/sparse child、空字符串、非法 kind/mode 或非 literal-true propagation 都会在 author work 前使 Definition validation 失败。legacy `flags` 必须是无空洞的非空列表，每个 token 是非空字符串；Product 会复制、去重、稳定排序后降级为等价 `when`。builder output 与 raw AST 都进入同一 normalization：set child 顺序和重复次数保留，重复项会影响 `exactly-one`，顺序也保留在 declarative identity 中。没有 `enabledByFlags` 的 executable Check 默认被选择。

`all` 要求全部 child 为真，`any` 要求至少一个为真，`none` 要求零个为真，`notAll` 要求至少一个为假，`exactlyOne` 要求恰好一个为真，`not` 反转其唯一 child。每个 atom 只测试 token presence；普通 token 仍由 caller 定义。predicate 不命中且未被下述依赖传播带入时，Check 在自己的 preparation / execution 前以 `not-applicable / flag-condition-not-matched` 结算，duration 为 `null`。

只有字面量 `propagateDependsOn: true` 才会把命中 root 的**传递** `dependsOn` prerequisite 一并加入本次选择；省略字段保持仅选择 direct match 的行为，不能写 `false`。这份传递闭包覆盖其中 dependency 自己的 flag predicate miss：被带入的 dependency 会继续正常调度，而不会先因 flag 结算为 `not-applicable`。`observes` 不参与该扩展选择；未被选择的 dependency 才仍可成为 `not-applicable` outcome，dependent 的 hard prerequisite 是否通过仍由 Scheduler 处理。嵌套条件和“恰好一个”直接使用 DSL；只有需要解释 token 的值、外部状态或其它非 presence 事实时，才在 `prepare` / `execute` 中处理并结算对应条件。

## `prepare`：准备、阻止或带 fallback 继续

`prepare(options, signal, project?)` 收到 authoring options 的深度只读视图、这次 Run 的同一取消 signal，以及同 `execute` 一致的只读 project context。Product 每次 Run 都传入第三参数；公开 callback 类型把它标为 optional，以兼容调用方直接调用既有两参数 callback。需要读取它时先处理 optional value，而不是推断配置 `changes` 时 Product 会省略 project。authored 与 prepared options 同形时可省略 `prepare`；两种 shape 不同时，TypeScript 要求提供它。它只能返回以下三种结果（每种都可附有序 `messages`）：

- `{ status: "success", preparedOptions }`：把准备后的 object 交给 `execute` 的 `context.options`。
- `{ status: "failure", action: "block", reason }`：本 Check 使用该 reason 直接结算为 `unavailable`，不接受 `fallback`，不会运行 `execute`。
- `{ status: "failure", action: "continue", fallback, reason, messages? }`：以 `fallback` 继续执行。`reason` 是 Check-owned diagnostic identity，不会单独形成 outcome；需要让调用方观察准备诊断时，在 `messages` 返回说明，随后仍以 execution 的 terminal outcome 为准。

准备值只属于本次 invocation，Product 会 canonicalize 并冻结后再交给 `execute`；不要修改传入 options，也不要把它当作跨 Run 缓存。preparation throw/reject 使用 `preparation-threw`，非法结果/message/reason 或非 canonical prepared/fallback 使用 `invalid-preparation-result`，只使本项 `unavailable`，不是整个 Definition 的配置错误。block 或 preparation failure 尚未开始 author execution，duration 为 `null`；已经接受的 preparation messages 仍保留。execution 的 throw、非法返回值和 Record 写入错误也会由 Product 结算为本项不可用。

## `execute` 可读取与可写入的内容

`execute(context)` 的输入是 Product 提供、不可变或受控的 callback context：

| 输入 | 可以做什么 | 边界 |
| --- | --- | --- |
| `invocationId` | 关联本次 Run 的工作。 | 同一次 Run 的 callback 使用相同 ID，不是跨 Run state。 |
| `options` | 使用本 Check 已准备的 options。 | 不修改；不是原始 authoring object。 |
| `project.root` / `project.flags` / `project.changes` | 使用本次规范化的绝对根目录、caller flags，以及已配置时同一次冻结的 change result。 | Product 只按 token presence 做选择；project.flags 不混入 derived change token，changes evidence 不证明环境或权限。 |
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
