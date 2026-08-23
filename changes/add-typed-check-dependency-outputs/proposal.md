# Proposal

这个仍处于 active、尚未获归档授权的 Plan 已完成 20/20 个任务。它交付了一条最小 typed dependency data path：downstream Check 按 string 读取 declared direct dependency 的 canonical final data，再显式调用 producing Check 拥有的 parser 恢复该 producer 声明的数据类型。

本 Plan 保留形成时的问题、范围和验收脉络；当前 Product contract 以 [Configuration](../../docs/configuration.md)、[Architecture](../../docs/architecture.md)、[Quality Metrics](../../docs/quality-metrics.md) 和 [Output](../../docs/output.md) 为准。`active` 在这里仅表示尚未归档，并不表示本 Plan 仍有未完成任务。

## Why

本 Change 形成时，`dependsOn` 只建立 Task 顺序。多个 Checks 需要复用同一个前置结果时，只能重复执行、扩大所有 callbacks 共享的 project context，或通过未记录的 closure 传值。

当时 Core 已拥有所需事实：`passed` / `failed` Check 各有一个 detached、deep-frozen `CanonicalJsonObject` final data。该能力读取这个既有事实，而不是建立第二 output store 或通过 machine JSON 绕回 runtime。

访问授权与领域 typing 是两个不同责任。Runtime 必须按 normalized direct dependency strings 授权；producer 只需让自己的 `execution` data 与 `parseData` 返回类型保持一致。把 `dependsOn` literals、Check identity 和 getter return type 组成跨 Check 泛型链不会替代 runtime 授权，且会显著扩大 overload、`inherit` 与 declaration 维护成本。

## Outcome

已实现的结果如下；精确 public shape、调用示例、runtime 状态表与架构流程仍由 [`design.md`](design.md) 记录，稳定 current owner 见本文开头。

1. Callback通过`dependencies.get(checkId: string)`读取upstream final data；getter是non-generic runtime capability。
2. Data-bearing typed provider通过`parseData(CanonicalJsonObject): Data`声明其data contract；该`Data`同时约束provider的`execution`结果。
3. Consumer在getter成功后显式调用producer parser，并从普通函数返回值获得领域类型。
4. 四态Check都完成dependency settlement；getter只对`passed` / `failed`成功，对no-data status返回closed failure。
5. Core、RunResult和machine继续只保存canonical Checks/Records，不增加事实实体或schema字段。

## Scope

### Intended Change

本 Change 负责：

- 在`CheckExecutionContext`增加pure string `dependencies.get`，并按normalized effective direct dependency IDs进行runtime授权。
- 返回data-bearing success，或`dependency-not-declared` / `upstream-data-unavailable`两种closed failure。
- 为typed executable provider增加Check-owned synchronous `parseData`和provider-local `Data` generic；ordinary no-parser Checks继续合法。
- 让consumer显式组合raw getter与producer parser；Product不调用parser，也不拥有parser error vocabulary。
- 移除ordinary`unavailable`到Task failure的适配，让downstream在四态settlement后自行处理read result。
- 从同一个Core settled Check派生invocation-local immutable view，不复制或持久化facts。
- 用changed-files producer、两个consumers、declaration emit和installed consumer证明runtime、typing与external readback。

本 Change 不负责：

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
- Typed dependency Decision 已演进为本 Plan 的 final-data-first 边界；implementation 与 stable owners 完成后已核对为 `active + aligned`。

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
