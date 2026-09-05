# 编写会正确结算的自定义 Check

返回 [README](../../README.md)。本专题面向需要把项目规则接入 Vibe Check 的调用方：选择 `preflight` 或 `execution`，读取 callback 输入，返回可信终态，并在需要时发布补充事实。先能用一个普通 `execution` 完成规则；只有必须在执行前准备或验证 options 时才增加 `preflight`。一次 Run 的公共生命周期、输出优先级和完整结果模型见 [API 机制](../api-mechanics.md)。

## 选择扩展点

| 需求 | 使用方式 | 不要用它做什么 |
| --- | --- | --- |
| 规则可直接测量并结算 | `execution(context)` | 不要在 callback 外留下未等待的工作。 |
| 执行前验证或把 authoring options 变成 invocation-local 的准备值 | `preflight(options, signal)` 后接 `execution(context)` | 它不是全局启动 hook；只在本 Check 已获准入后运行。 |
| 保存不决定终态的逐项事实 | `context.records.report({ id }, data)` | Record 不能替代 `passed`、`failed`、`not-applicable` 或 `unavailable`。 |
| 读取已声明上游结果 | `dependsOn` 或 `observes`，再从 `context.dependencies` 读取 | 不能读取未声明、传递或任意已运行的 Check。 |

`defineCheck(...)` 定义的 object 是公开 authoring surface。`execution`、`preflight`、`parseData` 都是调用方实现的受信任回调；它们不是 package 提供的 plugin hook，也不会获得 Scheduler、其它 Check 的可变状态、输出 writer 或任意文件能力。

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
```

## 按 flag 选择 Check

`enabledByFlags` 只决定本次 Run 是否选择 executable Check；它不是权限、环境检测或 callback 内的条件替代。该字段的完整公开 grammar 是：

```ts
{
  flags: ["token", ...],
  mode: "all" | "any" | "none" | "not-all",
  propagateDependsOn?: true
}
```

`flags` 必须是非空 token 列表，Product 会去重并稳定排序。`all` 要求全部声明 token 存在，`any` 要求至少一个存在，`none` 要求全部不存在，`not-all` 要求至少一个不存在；它们都不是“恰好一个”的条件。predicate 不命中时 Check 在它自己的 preflight / execution 前以 `not-applicable` 结算。

只有字面量 `propagateDependsOn: true` 才会把命中 root 的**传递** `dependsOn` prerequisite 一并加入本次选择；省略字段保持仅选择 direct match 的行为，不能写 `false`。这份传递闭包覆盖其中 dependency 自己的 flag predicate miss：被带入的 dependency 会继续正常调度，而不会先因 flag 结算为 `not-applicable`。`observes` 不参与该扩展选择；未被选择的 dependency 才仍可成为 `not-applicable` outcome，dependent 的 hard prerequisite 是否通过仍由 Scheduler 处理。需要带值 flag、恰好一个或嵌套布尔条件时，在 `execution` 中基于 `context.project.flags` 做项目自己的解释，并继续用 preflight/execution 结算真正的环境条件。

## `preflight`：准备、阻止或带 fallback 继续

`preflight(options, signal)` 收到 authoring options 的深度只读视图和这次 Run 的同一取消 signal。它只能返回以下三种结果：

- `{ status: "success", preparedOptions }`：把准备后的 object 交给 `execution` 的 `context.options`。
- `{ status: "failure", action: "block", reason }`：本 Check 直接结算为 `unavailable`，不会运行 `execution`。
- `{ status: "failure", action: "continue", fallback, reason, messages? }`：以 `fallback` 继续执行。`reason` 是 Check-owned diagnostic identity，不会单独形成 outcome；需要让调用方观察准备诊断时，在 `messages` 返回说明，随后仍以 execution 的 terminal outcome 为准。

准备值只属于本次 invocation，Product 会 canonicalize 并冻结后再交给 `execution`；不要修改传入 options，也不要把它当作跨 Run 缓存。preflight 或 execution 中的 throw、拒绝 promise、非法返回值和 Record 写入错误都不能产生可信 Check data，Product 会把它们作为不可用执行失败处理。

## `execution` 可读取与可写入的内容

`execution(context)` 的输入是 Product 提供、不可变或受控的 callback context：

| 输入 | 可以做什么 | 边界 |
| --- | --- | --- |
| `options` | 使用本 Check 已准备的 options。 | 不修改；不是原始 authoring object。 |
| `project.root` / `project.flags` | 使用本次规范化的绝对根目录和 flags。 | flags 只参与选择，不是环境或权限判断。 |
| `dependencies` | 读取已声明 direct `dependsOn` / `observes` 的终态。 | `get` 不授权未声明或传递依赖；`list` 不是全局执行历史。 |
| `artifactDirectory` | 写本 Check 的 invocation-local artifact；未授权时为 `null`。 | 不推导 sibling、machine、diagnostic 或跨 Run state 的路径。 |
| `records` | 发布 object-shaped supplemental facts。 | 每个 ID 仅在本 Check 内唯一，且不会决定 status。 |
| `signal` | 在可等待工作中协作退出。 | 取消后不要启动背景工作或把部分结果伪装为通过。 |

成功与失败都必须返回 object-shaped final `data`；`not-applicable` 表示当前没有适用工作，`unavailable` 表示无法形成可信结果并必须带稳定 `reason.code`。`messages` 是有序的人读补充信息，不保证每个 outcome 都有；把完整或敏感详情留在调用方拥有的安全位置，不要依赖 progress 文本保存事实。

## 依赖与取消的实践

必须取得上游成功 data 才能开始时，声明 `dependsOn`，并先检查 `dependencies.get(id).ok`；上游未提供 data 时返回 `unavailable`，而不是猜测空值。需要等上游无论何种终态都结算后再审计时，声明 `observes`，用 `dependencies.list()` 处理各项 outcome。需要恢复 provider 的业务类型时，调用 provider Check 的 `parseData`。

对 `fetch`、子进程或自有异步 API，把 `signal` 传下去；若已取消，尽快停止并返回 `unavailable`。Vibe Check 不会取消调用方没有连接 signal 的外部工作，也不替调用方回收文件、网络或子进程资源。

## 下一步

- 需要安排多个 Check、编写 admission policy、模拟假设分支或复用本地时长历史时，阅读[调度 Check](scheduling.md)。
- 需要组合/继承 Check 或理解 dependency data、aggregation、machine outputs 的共同结果模型时，阅读[API 机制](../api-mechanics.md)。
- 只需使用 package 提供的检查时，从 [README 的 Check 概览](../../README.md#随包提供的-check)进入对应指南。
