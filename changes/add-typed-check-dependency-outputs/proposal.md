# Proposal

本Plan交付一条最小typed dependency data path：downstream Check按string读取declared direct dependency的canonical final data，再显式调用producing Check拥有的parser恢复该producer声明的数据类型。

## Why

当前`dependsOn`只建立Task顺序。多个Checks需要复用同一个前置结果时，只能重复执行、扩大所有callbacks共享的project context，或通过未记录的closure传值。

Core已经拥有所需事实：`passed` / `failed` Check各有一个detached、deep-frozen `CanonicalJsonObject` final data。新能力应读取这个existing fact，而不是建立第二output store或通过machine JSON绕回runtime。

访问授权与领域typing是两个不同责任。Runtime必须按normalized direct dependency strings授权；producer只需让自己的`execution` data与`parseData`返回类型保持一致。把`dependsOn` literals、Check identity和getter return type组成跨Check泛型链不会替代runtime授权，且会显著扩大overload、inherit与declaration维护成本。

## Outcome

完成后：

1. Callback通过`dependencies.get(checkId: string)`读取upstream final data；getter是non-generic runtime capability。
2. Data-bearing typed provider通过`parseData(CanonicalJsonObject): Data`声明其data contract；该`Data`同时约束provider的`execution`结果。
3. Consumer在getter成功后显式调用producer parser，并从普通函数返回值获得领域类型。
4. 四态Check都完成dependency settlement；getter只对`passed` / `failed`成功，对no-data status返回closed failure。
5. Core、RunResult和machine继续只保存canonical Checks/Records，不增加事实实体或schema字段。

精确public shape、调用示例、runtime状态表与架构流程由[`design.md`](design.md)唯一承接。

## Scope

### Intended Change

本Change负责：

- 在`CheckExecutionContext`增加pure string `dependencies.get`，并按normalized effective direct dependency IDs进行runtime授权。
- 返回data-bearing success，或`dependency-not-declared` / `upstream-data-unavailable`两种closed failure。
- 为typed executable provider增加Check-owned synchronous `parseData`和provider-local `Data` generic；ordinary no-parser Checks继续合法。
- 让consumer显式组合raw getter与producer parser；Product不调用parser，也不拥有parser error vocabulary。
- 移除ordinary`unavailable`到Task failure的适配，让downstream在四态settlement后自行处理read result。
- 从同一个Core settled Check派生invocation-local immutable view，不复制或持久化facts。
- 用changed-files producer、两个consumers、declaration emit和installed consumer证明runtime、typing与external readback。

本Change不负责：

- compile-time证明getter string属于`dependsOn`，或让`inherit` / Check identity参与getter generic；
- getter接收Check object、parser或caller type argument；
- supplemental Record readback、transitive/live/partial reads、search/query、parser registry或新Core entity；
- 迁移existing project callback inputs；
- 修改presentation、messages、visibility、aggregation或machine v4 schema。

### Resulting Impacts

- Public Check/result types、`defineCheck` overloads与callback context需要同步，同时保持options/no-options、ordinary object、recursive composition和native spread。
- Definition validation需要接受executable-only runtime parser，并继续把functions排除在snapshot/fingerprint之外。
- Core/Run需要settled Check read seam与direct-ID view；Run orchestration需要迁移`unavailable` prerequisite行为。
- Type/runtime/Case/package evidence需要分别证明provider contract、runtime authorization、四态admission和external declaration consumption。
- Configuration、Architecture、Quality Metrics、public inventory与相邻Change导航需要同步最终事实；Output只确认existing data兼容，不改schema。
- Typed dependency Decision已演进为本Plan的final-data-first边界；它在implementation与stable owners完成对齐前保持`active + unaligned`。

## Success Criteria

1. Public getter精确为`get(checkId: string)`；没有Check object、parser参数、caller generic或由`dependsOn`推导的ID union。
2. Runtime只授权normalized effective direct dependency；undeclared和transitive ID返回`dependency-not-declared`且不泄露upstream facts。
3. `passed` / `failed`返回原status和同一个frozen canonical data；`not-applicable` / `unavailable`返回带原status的`upstream-data-unavailable`。
4. Parser返回类型锚定typed provider的`Data`，并约束该provider的`passed` / `failed` execution data；mismatch在provider定义处产生可理解的type error。
5. Consumer只用string getter与producer parser获得typed data，不需要`any`、consumer cast、manual tuple generic或ancestry import。
6. Stable docs明确区分author object、canonical runtime object与JSON text，并准确说明parser owner和类型锚启发的安全边界。
7. 四态outcome都完成普通dependency settlement；cancellation、invalid graph和trusted engine/Core failure仍保持独立阻断边界。
8. Core、RunResult与machine没有第二output store、Record getter、新runtime root或schema变化。
9. Changed-files proof确认producer只执行一次、两个downstream复用同一data，external consumer用同一parser读取version-matched RunResult/machine data。
10. Stable owners、Decision、Case ledger、public inventory、candidate declarations和required/full Gate与implemented contract一致。

## Affected Owners

- Public authoring：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、[`src/product/definition/check-tree/`](../../src/product/definition/check-tree/)、[`src/product/public-contract/current.ts`](../../src/product/public-contract/current.ts)、[`docs/configuration.md`](../../docs/configuration.md)。
- Runtime read与settlement：[`src/product/run/check-callback.ts`](../../src/product/run/check-callback.ts)、[`src/product/run/check-execution.ts`](../../src/product/run/check-execution.ts)、[`src/product/quality-core/check-record/core-session.ts`](../../src/product/quality-core/check-record/core-session.ts)、[`src/product/task-scheduler/`](../../src/product/task-scheduler/)、[`docs/architecture.md`](../../docs/architecture.md)。
- Facts与output：[`docs/quality-metrics.md`](../../docs/quality-metrics.md)、[`docs/output.md`](../../docs/output.md)及RunResult/machine focused tests。
- Test与package evidence：[`docs/testing/cases/quality-runtime.md`](../../docs/testing/cases/quality-runtime.md)、[`scripts/package-candidate/`](../../scripts/package-candidate/)及ancestry-external installed consumer。
- Long-term direction：[`read-direct-dependency-final-data-by-string.md`](../../docs/decisions/read-direct-dependency-final-data-by-string.md)。
- Downstream handoff：[`ship-public-package-api-documentation`](../ship-public-package-api-documentation/)与[`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/)。
