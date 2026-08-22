# Proposal

本 Draft 让 downstream Check 通过 declared direct dependency读取upstream settled output，并借助upstream-owned parser获得精确领域类型。它的主要目标是 typed dependency authorization/readback；最小Check/Record contract把final data提升为主结果所引起的source调整，是本Draft必须重新闭合的上游影响。

## Why

当前`dependsOn`只保证执行顺序。多个Checks需要复用changed files等前置结果时，只能重复计算、扩大所有Checks的基础context，或通过未记录的closure传值。

目标minimal contract提供两类可复用facts：每个passed/failed Check恰好一个final data，以及零到多个supplemental Records。Final data适合承载主要的single output；Records适合承载多个可独立标识的补充事实。Typed dependency不能继续假定“所有output都必须先变成Record”，也不能把两者合并成第三份store。

直接返回generic canonical data会迫使consumer使用cast。Producing Check因此需要拥有parser，Product则需要保证dependency authorization、settlement barrier、source selection与structured failure。

## Outcome

领先的主结果读取形态如下；exact names和signature仍需prototype验证：

```ts
const changedFilesCheck = defineCheck({
  checkId: "changed-files",
  displayName: "Changed files",

  async execution() {
    const files = await collectChangedFiles();
    return {
      status: "passed",
      data: { version: 1, files }
    };
  }
});

const changedFilesResult = defineCheckResultParser(
  changedFilesCheck,
  parseChangedFilesData
);

const analyzeChangedFiles = defineCheck({
  checkId: "analyze-changed-files",
  displayName: "Analyze changed files",
  dependsOn: [changedFilesCheck],

  execution({ dependencies }) {
    const changedFiles = dependencies.get(changedFilesResult);

    if (!changedFiles.ok) {
      return { status: "unavailable", reason: changedFiles.error.reason };
    }

    return {
      status: "passed",
      data: { analyzedFileCount: changedFiles.data.files.length }
    };
  }
});
```

若真实consumer需要某个supplemental Record，upstream可以另外导出绑定exact Record ID的parser。Draft形成Plan前必须决定首版是否同时公开Record getter；不能为了保留旧Record-only方案而默认加入。

完整类型链是：

```text
declared Check dependency
  -> dependency-scoped getter
  -> upstream-owned parser bound to final data or an exact Record ID
  -> typed success or structured failure
```

Parser只执行“已选中的canonical data → domain value”。`dependencies.get()`负责dependency authorization、upstream status、source selection、parser调用和failure information。

## Scope

本Change负责：

- direct dependency的settled output读取授权；
- `dependsOn`、getter、parser descriptor与返回值之间的TypeScript推导；
- final data读取，以及真实consumer证明需要时的exact supplemental Record读取；
- upstream unavailable/not-applicable、missing source和parser rejection的downstream failure boundary；
- changed-files producer与至少两个consumers的runtime、type和external readback proof。

相邻owner负责：

- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)提供四态Check outcome、canonical final data和Core`{ checkId, id, data }`Records；
- 已归档的 [`add-check-terminal-messages-and-visibility`](../archive/add-check-terminal-messages-and-visibility/)（archived）提供structured terminal messages、`RunResult` readback与显式human visibility；messages不进入dependency facts，也不改变本Change的dependency access责任；
- producing Check决定自己的domain status、data shape与parser实现。

本Change不建立custom-data search、query language、parser registry、global mutable store、transitive/live output reader、第三类Core output、multi-Check aggregation或通用provider framework，也不决定`root`、`flags`、`files`、`cache`等现有inputs的长期归属。

## Success Criteria

1. Downstream只能读取declared direct dependencies，并且只能读取settled、frozen output。
2. `dependsOn → dependencies.get → parser → result.data`在declarations与isolated consumer中完成推导，不需要`any`、cast或手写tuple generic。
3. Final-result parser绑定producing Check；若首版包含Record parser，它还必须绑定exact Record ID。Parser不负责authorization、lookup或upstream status判断。
4. Getter对upstream unavailable/not-applicable、missing source和parser failure返回structured information，不转换成`undefined`、empty data或passed。
5. Final `RunResult`、Core与machine继续只保存canonical Checks/Records；dependency view不形成第二份output store。
6. Changed-files proof由至少两个dependent Checks复用且只收集一次；它优先使用upstream final data，不为单一主结果创建伪Record。
7. Supplemental Record getter只有在命名consumer确实需要多个/独立identified facts时进入首版；不存在consumer时从首版删除。

## Plan Readiness

本Draft只有在minimal Check/Record contract已实施并成为当前owner事实后才进入Plan。随后必须形成：

1. TypeScript prototype选定唯一dependency authoring grammar，并证明inline/exported/recursive Check与declaration emit inference。
2. Runtime prototype固定getter failure codes、upstream status mapping和settlement barrier。
3. Source prototype比较“final data only”与“final data + exact supplemental Records”，由真实consumer决定首版数量，而不是继承旧Record-only设计。
4. Changed-files producer、两个downstream consumers与external readback prototype证明capability有真实复用价值。

Presentation visibility是独立UX能力，不是本Change的Plan前置。Multi-Check aggregation属于Gate Change，不通过dependency getter实现。

## Affected Owners

- Public Check authoring：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、Check normalization与[`docs/configuration.md`](../../docs/configuration.md)。
- Task graph/execution：[`src/product/task-scheduler/`](../../src/product/task-scheduler/)、[`src/product/run/check-execution.ts`](../../src/product/run/check-execution.ts)与callback context。
- Core read view：[`src/product/quality-core/check-record/`](../../src/product/quality-core/check-record/)；不新增persistent entity。
- Package evidence：public declarations、candidate package与isolated consumers。
- Long-term direction：[让依赖Check读取上游settled outputs](../../docs/decisions/let-dependent-checks-read-settled-upstream-outputs.md)；实现前为`active + unaligned`future direction。
