# 读取 Check 依赖与类型化数据

需要把一项 Check 的结果交给另一项使用时，先声明 direct `dependsOn` 或 `observes`，再通过 dependency reader 读取上游结果，并用 provider parser 恢复业务类型。需要上游通过才开始时选择 `dependsOn`；需要审计任意终态时选择 `observes`。这些关系还约束 Scheduler 准入，调度预算见[调度 Check](scheduling.md)。

## 完整运行示例

```ts
import { defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

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
    return { status: "passed", data: { analyzedFileCount: data.files.length } };
  }
});

const definition = defineConfig({
  checks: [changedFiles, analyzeChangedFiles],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
```

上例先收窄 `get` 的 `ok`，再显式调用 producer 的 `parseData`。`dependsOn` 保证 callback 只在 provider `passed` 后开始；`!read.ok` 仍作为读取边界防御。八个随包 Check 都提供 `parseData` 和同实现的 package-root parser，名称与类型见各自指南。

### 用普通 wrapper 复用读取步骤

调用方可以把 `dependencies.get`、provider parser 和业务查询对象的构造封装为普通高阶函数，再让它调用实际 execution。组合后的责任保持显式：

| Owner | 责任 |
| --- | --- |
| 外围 Check | 声明 direct `dependsOn` / `observes`，拥有 preflight、终态和 aggregation。 |
| Wrapper | 读取和解析 provider data，构造查询对象，并定义读取或解析失败的映射。 |
| Provider | 通过 canonical data 提供唯一依赖事实源。 |

Wrapper 可以为下游函数构造 `{ ...context, change }` 一类冻结的扩展对象；`change` 是 wrapper API，不是 Product 向所有 Check 注入的 context 字段。可变索引留在私有闭包中，module-global registry 不能代替 direct relation、parser 或单次 Run 的生命周期。

## 批量审计 direct outcomes

审计任意终态时声明 `observes`，再用 `dependencies.list()` 读取 direct union 的冻结 `{ checkId, outcome }[]`。四态 outcome 都是正常可观察事实；以下 Check 从中形成自己的结果，而不修改 producer：

```ts
const auditChangedFiles = defineCheck({
  checkId: "audit-changed-files",
  displayName: "Audit changed files",
  observes: [changedFiles.checkId, analyzeChangedFiles.checkId],
  execution({ dependencies }) {
    const observations = dependencies.list();
    const readable = observations.filter(
      ({ outcome }) =>
        outcome.status === "passed" || outcome.status === "failed",
    );
    const changedFilesObservation = readable.find(
      ({ checkId }) => checkId === changedFiles.checkId,
    );
    if (changedFilesObservation === undefined) {
      return {
        status: "unavailable",
        reason: { code: "changed-files-data-unavailable" },
      };
    }

    const data = changedFiles.parseData(changedFilesObservation.outcome.data);
    return {
      status: "passed",
      data: {
        directDependencyCount: observations.length,
        changedFileCount: data.files.length,
      },
    };
  },
});
```

读取 `passed` / `failed` data 后仍需调用 producer parser；其余状态保留原 reason。consumer 可据此形成 summary、I/O、Records、messages 与自身终态，但不能修改、取消、重跑或重结算 producer。

## Provider 类型与解析边界

通过 `defineCheck({ execution, parseData })` 建立 typed provider：同步 parser 的返回类型同时约束该 Check 的 `passed` / `failed` data，返回值保留必需的 `parseData`。普通递归 `Check` 类型本身不声明 parser；仅写 `satisfies Check` 或 inline `defineConfig` 不建立该类型关系。没有 parser 的普通 Check 仍合法，container 则不能声明 parser。

TypeScript 拒绝 async 或返回 `PromiseLike` 的 parser，即使推断结果类型很宽。canonical JSON 中非 callable 的 `then` 字段仍是普通数据。JavaScript 或显式 cast author object 上的 function parser 可以通过 runtime Definition validation，但不会因此取得 TypeScript 关系；自有 `parseData: undefined` 规范化为省略。

parser 接收 Check-facts-owned 的 detached、deep-frozen canonical object，而不是原始 author object 或 JSON 文本。provider 拥有 shape、版本、业务不变量与抛错策略；Product 不自动调用 parser，也不另建 parser-rejection result。consumer 在自己的 execution 中调用 parser 时，未捕获的抛错沿用 Check execution 的失败边界。

同版本可信 provider 若已有测试保证 shape，可以把 parser 用作 identity/type anchor；这不是对 JavaScript、cast、跨版本 artifact 或不可信输入的运行时验证。此类输入应由 provider 显式验证。每个随包 Check 的同名 `parseData` 与 package-root parser 只解析单个 final-data object，不替代 [machine publication/schema 验证](../output.md)。

## Direct relation 与读取规则

- `dependsOn` 与 `observes` 命名同一 Definition 中的 executable Check。两者各自可继承父 collection；精确数组完整替换（`[]` 清空），`inherit({ add, remove })` 显式增删后去重。一个 provider 不得同时出现在两类 relation 中。
- `dependsOn` 等所有 direct provider 通过才允许本 Check 的 preflight/execution；任一 provider 非 `passed` 时，本 Check 在 author work 前成为 `unavailable / dependency-not-passed`，reason 带 direct blocker `checkIds`，duration 为 `null`。`observes` 只等待终态，不要求通过。
- `get(checkId)` 是 non-generic string read，只授权 normalized effective `dependsOn ∪ observes` 的 direct ID（包括各自继承项）。未声明、传递或 malformed ID 返回不泄露 upstream fact 的 `dependency-not-declared`。
- 已声明 provider 的 `passed` / `failed` 返回 `ok: true`、status 与 canonical data；`not-applicable` / `unavailable` 返回 `ok: false`、该 status 与 `upstream-data-unavailable`。TypeScript 类型本身不授予访问权。
- `list()` 无参返回同一 direct union 的完整四态 observations，按 normalized effective direct ID 稳定排序并去重；数组、每项与 Core-owned outcome 都冻结。不读取传递、未声明或 ambient executed Checks，也不提供 Records、scheduler timing 或全局历史。
