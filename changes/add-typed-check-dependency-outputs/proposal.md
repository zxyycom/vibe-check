# Proposal

本 Draft 在最小 Record contract 实施后，让 downstream Check 通过 declared direct dependency 读取 upstream settled outcome 与 Records，并借助 Check-owned parser 获得精确领域类型。它把 `dependsOn` 从纯调度 edge 扩展为“调度顺序 + settled output access”，但不新增 Core entity、第二份 output store 或 execution-input migration framework。

## Why

当前 `dependsOn` 只保证执行顺序。多个 Check 需要复用 changed files 等前置结果时，只能重复计算、扩大所有 Check 的基础 context，或通过未记录的 closure 传值。

现有 Check outcome 与 Records 已经保存了可复用事实；缺口是安全的 downstream 读取边界。直接返回 generic `record.data` 又会迫使 consumer 使用 cast，因此还需要由 producing Check 提供 parser，并让 TypeScript 从 dependency 和 parser 推导返回值。

## Outcome

目标调用形态如下；名称和 exact signature 仍需 prototype 验证：

```ts
const changedFilesCheck = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",

  async execution({ records }) {
    const files = await collectChangedFiles();
    records.report({ id: "files" }, { version: 1, files });
    return { status: "completed", verdict: "passed" };
  }
});

const changedFilesData = defineCheckDataParser(changedFilesCheck, {
  id: "files",
  parse: parseChangedFilesData
});

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFilesCheck],

  execution({ dependencies }) {
    const files = dependencies.get(changedFilesData);

    if (!files.ok) {
      return { status: "unavailable", reason: files.error.message };
    }

    // files.data is readonly ChangedFileData[]
    return { status: "completed", verdict: "passed" };
  }
});
```

完整类型链是：

```text
declared Check dependency
  -> dependency-scoped getter
  -> parser descriptor bound to the same Check and Record ID
  -> typed success or structured failure
```

Parser 只执行“已选中的 `data` → 领域值”。`dependencies.get()` 负责 dependency authorization、upstream outcome、Record 查找、parser 调用和 failure information。

## Scope

本 Change 负责：

- direct dependency 的 settled outcome/Records 读取授权；
- `dependsOn`、getter、parser descriptor 和返回值之间的 TypeScript 推导；
- getter 的 data-present / failure result，以及 upstream 异常状态的 downstream 边界；
- 一个 producing Check 对多个 stable Record IDs 提供多个 parsers；
- changed-files producer 与至少两个 consumers 的 runtime、type 和 external readback proof；该 proof 验证 capability，但不顺带清理其它 execution-context fields。

相邻 owner 负责：

- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/) 提供 Core `{ checkId, id, data }` 与 canonical data；
- [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 提供显式 Check visibility 字段；visibility 只影响人读直接显示，facts 与 lifecycle events 始终产生；
- producing Check 决定自己的 domain verdict 和 parser 实现。

本 Change 不建立 custom-data search、query language、parser registry、global mutable store、transitive/live output reader、第三类 Core output 或通用 provider framework，也不决定 `root`、`flags`、`files`、`cache` 等现有 inputs 的长期归属。

## Success Criteria

1. Downstream 只能读取 declared direct dependencies，并且只能读取 settled、frozen output。
2. `dependsOn → dependencies.get → parser → result.data` 在 declarations 和 isolated consumer 中完成推导，不需要 `any`、cast 或手写 tuple generic。
3. Parser descriptor 绑定 producing Check 与 exact Record ID；parser 不负责 Record 查找、缺失或 upstream 状态。
4. Getter 对 missing data、upstream unavailable/not-applicable 和 parser failure 返回结构化信息，不把它们转换成 `undefined`、empty data 或 passed。
5. Final `RunResult`、Core 与 machine 继续只保存 `checks` / `records`；dependency output 是派生 view。
6. External consumer 可以按 `{ checkId, id }` 选择 machine v4 data，再使用版本匹配的 Check-owned parser。
7. Changed-files proof 被至少两个 dependent Checks 复用且只收集一次；本 Change 不以此删除或重构其它 base execution-context fields。

## Plan Readiness

本 Draft 只有在最小 Record contract 已实施并成为当前 owner 事实后，才进入 Plan。随后还需形成以下证据：

1. TypeScript prototype 选定唯一 dependency authoring grammar，并证明 inline/exported/recursive Check 与 declaration emit inference。
2. Runtime prototype 固定 getter failure codes、upstream outcome mapping 和 settlement barrier。
3. Changed-files producer、两个 downstream consumers 与 external readback prototype 证明 capability 有真实复用价值。

Presentation visibility 是独立的 downstream UX 能力，不是本 Change 的 Plan 前置。Supporting Check 在 presentation Change 实施前按普通 Check 直接显示。

兼容不是成功标准。若 Check-value `dependsOn` 满足原型，Plan 默认一次 hard cut，不长期保留 string/value 两套 public grammar。

## Affected Owners

- Public Check authoring：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、Check normalization 与 [`docs/configuration.md`](../../docs/configuration.md)。
- Task graph / execution：[`src/product/task-scheduler/`](../../src/product/task-scheduler/)、[`src/product/run/check-execution.ts`](../../src/product/run/check-execution.ts) 与 callback context。
- Core read view：[`src/product/quality-core/check-record/`](../../src/product/quality-core/check-record/)；不新增持久 entity。
- Package evidence：public declarations、candidate package 与 isolated consumers。
- Long-term direction：[让依赖 Check 读取上游 settled outputs](../../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)；实现前为 `active + unaligned` future direction。
