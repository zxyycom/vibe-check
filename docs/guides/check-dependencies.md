# 读取 Check 依赖与类型化数据

需要把一项 Check 的结果交给另一项使用时，先声明 direct `dependsOn` 或 `observes`，再通过 dependency reader 读取上游结果，并用 provider parser 恢复业务类型。需要上游通过才开始时选择 `dependsOn`；需要审计任意终态时选择 `observes`。若同一次 Run 的 direct prerequisite 还必须交接不能 canonicalize 的 reference（例如 `Map` 或 typed bytes），provider 在 `defineCheck` 中声明 `handoff: true`，consumer 才能以 provider object 读取它。这些关系还约束 Scheduler 准入，调度预算见[调度 Check](scheduling.md)。

## 先选择读取契约

| consumer 要解决的问题 | provider 声明与 consumer 读取 | 不能获得的能力 |
| --- | --- | --- |
| 只需要已结算的 canonical final data，或需要审计任意终态 | 以 `dependsOn` 或 `observes` 声明 relation；使用 string `get(checkId)` 或 `list()` | 不保留原始 reference identity，也不能读取未声明或传递 provider。 |
| 必须在同一次 Run 内交接不可 canonicalize 的 reference | provider 声明 `handoff: true`，在 `passed` 返回 `handoff`；consumer 将 provider 设为 direct `dependsOn` 并调用 `get(provider)` | 不授权 `observes`、string ID、传递 provider 或任何 Run 外读取；reference 不会发布。 |

`handoff: true` 是唯一的 authoring declaration：它必须写在 `defineCheck(...)` 的 executable provider 上，不是数据、parser、serializer 或 author 创建的 token。Product 在 package-runtime 内部的 WeakMap 注册该 provider identity；identity 只连接已定义 provider、Definition 与 execution，不是 package API 或跨 package instance 的兼容协议。每次 Run 的 private store 才暂存已接受的 handoff reference。`handoff` 只可为 executable provider 的精确 `true`；container、其它值和自有 `undefined` 都会在 Definition validation 被拒绝。

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
  // `true` 是唯一的 runtime declaration；返回值的 handoff 类型由 execution 自动推断。
  handoff: true,
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
    const bytesByPath = new Map<string, Uint8Array>([
      ["src/index.ts", new TextEncoder().encode("export {}\n")]
    ]);
    return {
      status: "passed",
      data: { files: ["src/index.ts"], version: CHANGED_FILES_DATA_VERSION },
      handoff: bytesByPath
    };
  }
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFiles.checkId],
  execution({ dependencies }) {
    const read = dependencies.get(changedFiles);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };

    // canonical data 仍在 parser 边界；handoff 保留 same-Run reference identity。
    const data = changedFiles.parseData(read.data);
    const firstFile = data.files[0];
    const firstFileBytes = firstFile === undefined ? undefined : read.handoff.get(firstFile);
    if (firstFileBytes === undefined) {
      return { status: "unavailable", reason: { code: "changed-file-bytes-unavailable" } };
    }
    return {
      status: "passed",
      data: { analyzedByteCount: firstFileBytes.byteLength, analyzedFileCount: data.files.length }
    };
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

上例的 `handoff: true` 是 provider 的最小 runtime declaration；`passed` result 中的 `Map<string, Uint8Array>` 自动成为 provider-aware read 的 handoff 类型。provider 只能在 `passed` branch 返回同型、non-null 的 `handoff`；`dependencies.get(changedFiles)` 只在 current Run 中由 direct `dependsOn` consumer 成功，返回 provider 的 canonical `data` 和同一 `Map` reference。fan-out consumer 读取的也是这个引用，而 repeated Run 不共享它。

先收窄 `get` 的 `ok`，再显式调用 producer 的 `parseData(read.data)`：parser 继续只负责 detached、deep-frozen canonical data，绝不解析或 clone `handoff`。`dependsOn` 保证 callback 只在 provider `passed` 后开始；`!read.ok` 仍是读取边界防御。八个随包 Check 都提供 `parseData` 和同实现的 package-root parser，名称与类型见各自指南。

provider-object read 的失败不返回上游 `data` 或 `handoff`：输入不是 `handoff: true` 定义的 provider，或不是 effective direct `dependsOn` 时，错误为 `dependency-not-declared`；已获 direct authorization 但本次 execution 没有接受到该 provider 的 `passed` handoff 时，错误为 `upstream-handoff-unavailable`。consumer 必须像示例一样先处理 `!read.ok`，不能把 TypeScript 推断当作运行时授权。

handoff 保留 identity，因此 Product 不会 freeze、clone、serialize、缓存或验证其领域含义。producer 与所有 consumer 必须把它作为 immutable observation：上例不调用 `Map#set`，也不改写其中的 `Uint8Array`。execution graph 结束时 Product 清空自己的 private-store reference；该 `clear()` **不是** disposer，不会调用 `close`、`dispose` 或任意 symbol hook。真实资源的创建者/调用方必须以显式 graph ordering、consumer `try/finally` 或 Run 外层 lifecycle 在最后一个 consumer 后清理，不能依赖 handoff store、GC 或 machine/diagnostic publication。

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
- `get(provider)` 是 provider-aware read，只接受以 `handoff: true` 定义的 provider object，并且只授权 normalized effective direct `dependsOn`。成功时固定为该 provider literal `checkId`、`status: "passed"`、canonical `data` 与 typed `handoff`；direct `observes`、transitive、未声明、lookalike provider 或本次未接受 handoff 都 fail closed，不泄露 upstream data/reference。它不改变 string `get(checkId)` 或 `list()` 的授权、shape 与四态 observation。
- 已声明 provider 的 `passed` / `failed` 返回 `ok: true`、status 与 canonical data；`not-applicable` / `unavailable` 返回 `ok: false`、该 status 与 `upstream-data-unavailable`。TypeScript 类型本身不授予访问权。
- `list()` 无参返回同一 direct union 的完整四态 observations，按 normalized effective direct ID 稳定排序并去重；数组、每项与 Core-owned outcome 都冻结。不读取传递、未声明或 ambient executed Checks，也不提供 Records、scheduler timing 或全局历史。
