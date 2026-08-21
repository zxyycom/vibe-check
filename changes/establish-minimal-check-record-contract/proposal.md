# Proposal

本 Change 收紧 Product 的两个基础事实契约：一个 Check 以单一终态和 Check-owned `data` 返回主结果，并可另外提交零到多个最小 Records。由这两个主契约变化引起的 machine、policy、output 与项目验证迁移作为次级影响处理，不反向扩大基础契约。

## Why

当前设计把两个不同问题混在一起：

1. `CheckResult` 用 `completed + verdict` 表达通过或失败，却没有承载 Check-owned 主结果；调用方只能依赖 Records、领域外字段或额外 policy 才能恢复“这个 Check 最终得到了什么”。
2. Record API 从少量 metric/finding built-ins 反推公共模型，要求 executable Check 预先声明 `recordTypes`、field descriptors、`identityFields` 与 policy metadata，并让每条 Record 携带 classification、message、location 和 fields。

这些要求不是 arbitrary custom Check 的共同义务。Repository summary、API health、performance sample、dependency fact 与 file finding 的主结果、补充事实、identity、presentation 和 comparison semantics 都可能不同。继续维护统一 catalog、字段语法、关系与 policy，会让 Product 拥有生产 Check 才能解释的领域结构。

本 Change 的目的不是重做 Gate、typed dependency 或 presentation，而是建立足以让这些消费者独立演进的最小事实源。旧设计已经进入 Core、RunResult、machine、DecisionPolicy、default Checks 与项目验证，因此它们必须迁移或退出；这些工作是主契约变化的后果，不是决定基础契约形状的理由。

## Outcome

### 主设计结果

Custom/default Check 使用一个直接的最终返回：

```ts
type CheckResult =
  | {
      readonly status: "passed";
      readonly data: object;
    }
  | {
      readonly status: "failed";
      readonly data: object;
    }
  | {
      readonly status: "not-applicable";
      readonly reason?: CheckNotApplicableReason;
    }
  | {
      readonly status: "unavailable";
      readonly reason: CheckDeclaredUnavailableReason;
    };
```

`passed` / `failed` 本身就是 Check 的终态，不再额外嵌套 `completed` 或 `verdict`。两者的 `data` 是该 Check 唯一的主结果；没有领域数据的 Check 返回 `{}`。`not-applicable` 与 `unavailable` 不伪造主结果。

同一个 Check 可以另外提交零到多个补充事实：

```ts
const apiHealth = defineCheck({
  checkId: "api-health",
  displayName: "API health",

  async execution({ records }) {
    const endpoint = await inspectEndpoint("/health");

    records.report(
      { id: "sample:health" },
      { latencyMs: endpoint.latencyMs, statusCode: endpoint.statusCode }
    );

    return endpoint.ok
      ? { status: "passed", data: { endpoint: "/health" } }
      : { status: "failed", data: { endpoint: "/health" } };
  }
});
```

Reporter scope 提供 `checkId`；author 提供 owning Check 内唯一的 `id`。Product 将最终结果 `data` 和 Record `data` 安全 materialize 为 detached、deep-frozen canonical JSON object。Core Record 固定为：

```ts
interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: CanonicalJsonObject;
}
```

Core Check 保存新的终态及其 canonical final data。`RunResult` 在 completed facts 中返回 canonical Checks 与 Records；它不把多个 Check 的汇总策略伪装成固定运行事实。

### 次级影响结果

- Machine contract 硬切到 v4，投影新的 Check 终态/final data 与 `{ checkId, id, data }` Records。
- 依赖旧 Record catalog、comparison/reference、acceptance/view、DecisionPolicy 与 GateResult 的直接 plumbing 和 evidence 退出。
- Repository `required/full` 入口保持运行；本 Change 作为次级迁移在 `RunControls` 中加入显式 Check aggregation，由 package 求值并让 CLI adapter只做运行结果到exit code的映射。
- Typed dependency、presentation 与更完整的 Gate composition 只消费新事实源；其 API、读取、展示和组合规则由对应 Change 决定。

## Scope

### 主设计与实现

- 将 public Check final return 收敛为 `passed | failed | not-applicable | unavailable`；`passed` / `failed` 必须携带 Check-owned `data`，并删除 `completed + verdict` 双层表达。
- 将 public reporter 收敛为 `records.report(identity, data)`；`identity` 是 closed `{ id: string }`，`data` 是 non-array canonical JSON object。
- 让一个 Check 的 final `data` 表达主结果，Records 表达零到多个补充事实；Record presence、count 或内容不决定 Check status。
- 让 Product 只验证 fixed identity、canonical JSON safety、ownership、repeated identity、late write 与 reporter lifecycle；它不验证 Check-owned domain shape，也不替 producing Check 检测或清洗敏感内容。
- 将 Core Record 收敛为 `{ checkId, id, data }`，并让 Core Check outcome 保存新的终态及其 canonical final data。
- 让 completed `RunResult` 返回新的 canonical Checks/Records facts，不内建 mandatory multi-Check aggregate。

### 由主设计引起、在本 Change 中完成的次级迁移

- 删除 public `recordTypes`、field descriptor vocabulary、`CheckRecordType` generic、`identityFields`、`identify` 与 `reportReference`。
- 删除旧 Record contract 拥有的 common comparison/reference inputs、Record-aware DecisionPolicy、GateResult 与派生 decision/reference evidence。
- 在 `RunControls.checkAggregation` 中实现无默认值的 closed aggregation配置，并在`RunResult`中以`aggregate: CheckAggregate | null`返回派生结果；raw Check facts始终保留。
- 将 machine publication 硬切到 v4，并同步 schema、independent validator、fingerprint、examples 与直接 output consumers。
- 迁移 default Checks、repository Project Definition、fixtures、package declarations、public-contract inventory 与 isolated consumer evidence。
- 在删除旧 GateResult 前，将repository`required/full`迁移到上述显式aggregation；正式入口不暂停、不降级为CLI-local reducer。

### 不纳入本 Change、只建立下游交接

- Typed dependency 如何授权并读取 upstream final data 或 Records；由 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 承接。
- Project Gate 的catalog去重、native Check composition、CLI/process边界与profile优化；由[`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/)承接，不阻塞本Change的最小aggregation cutover。
- Final data/Records 如何进入 terminal/live human presentation；由 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 承接。
- `root`、`flags`、`changedFiles`、`files`、`cache` 等其它 execution inputs 的重新归属或迁移。
- 为 custom data 建立 Product-owned TypeScript generic、Schema、codec、descriptor、registry、domain validator、redactor 或 secret detector。
- 保留 v3 reader/writer、legacy reporter adapter、dual machine contract 或其它 old/new compatibility path。

## Success Criteria

1. Ancestry-external package consumer 可以定义没有 Record catalog 的 ordinary custom Check，以新的四种终态返回 Check-owned final data，并通过 `records.report({ id }, data)` 提交零到多个 supplemental Records。
2. Public declarations 不再包含 `completed + verdict`、`CheckRecordType`、Record tuple generic、`recordTypes`、field descriptor、identity extractor 或 reference reporter；options inference、plain object composition 与 direct result typing 保持成立。
3. `passed` / `failed` final data 与 Record data 都按同一 canonical safety boundary 形成 detached、deep-frozen Core facts；Product 不验证 Check-local property、union 或业务 constraints。
4. Core 中每个 Check 只有一个终态；每条 Record 只有 owning `checkId`、Check-local `id` 与 canonical `data`。不同 Checks 可以使用相同 Record `id`；同一 Check 的相同 `id` 不能重复提交。
5. Record absence、presence、数量或 data 不改变 Check status；invalid report 只使 owning Check unavailable，不撤销此前已经接受的 Records，也不影响其它 Checks。
6. Completed `RunResult` 返回 canonical Checks/Records facts但不固定 multi-Check aggregate；没有 aggregation 配置的调用方可以直接读取所有终态自行决定。
7. Machine v4 发布新的 Check terminal data 与 `{ checkId, id, data }` Record rows，并验证 canonical JSON、composite identity、ownership、ordering 与 complete-set fingerprint；v3 当前 writer/reader 被拒绝。
8. `RunControls.checkAggregation`必须显式选择`all | any`、目标Check集合及unavailable/N/A/empty-set处理；未配置时`aggregate`为`null`，不存在hidden default。
9. 旧 Record-aware comparison/reference、DecisionPolicy、GateResult 与 decision/reference evidence 在直接消费者迁移后退出；没有用dependent Check或CLI-local traversal冒充通用替代方案。
10. `verify:vibe-check-workspace:required/full` 保持正式可用，并通过package-owned aggregation消费新的Check终态；adapter只负责invocation、日志与exit mapping。
11. Typed dependency、presentation 与 Gate authoring Changes 各自记录新 Check/Record facts带来的输入变化，本 Change 不替它们决定具体 API。

## Affected Owners

### 主契约 owners

- Public Check authoring 与 final result：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、Check normalization 与 [`docs/configuration.md`](../../docs/configuration.md)。
- Check/Record Core facts：[`src/product/quality-core/check-record/`](../../src/product/quality-core/check-record/) 与 [`docs/quality-metrics.md`](../../docs/quality-metrics.md)。
- Run facts与minimal aggregation：[`src/product/run/`](../../src/product/run/)；completed/effect facts保留raw Checks/Records，并只在显式`RunControls.checkAggregation`存在时返回derived aggregate。

### 次级影响 owners

- Machine/output：[`src/product/quality-core/output/`](../../src/product/quality-core/output/)、[`docs/output.md`](../../docs/output.md)、[`docs/schemas/`](../../docs/schemas/) 与 [`docs/examples/artifacts/`](../../docs/examples/artifacts/)。
- Legacy comparison/reference/policy removal：Record-related Definition、Run Controls、evaluation 与 publication plumbing。
- Direct consumers：default Checks、[`scripts/quality/project-definition.ts`](../../scripts/quality/project-definition.ts)、fixtures、public-contract inventory、candidate package 与 isolated installed consumers。
- Repository Gate direct consumer：[`scripts/project-gate/`](../../scripts/project-gate/)与[`scripts/quality/project-gate/`](../../scripts/quality/project-gate/)在本Change迁移到package-owned aggregate；[`align-project-gate-with-native-check-authoring`](../align-project-gate-with-native-check-authoring/)只拥有后续catalog/CLI/process优化。
- Typed dependency：[`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 决定 upstream final data 与 supplemental Records 的读取边界。
- Presentation：[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 决定 final data/Records 的显式人读 projection。
- Long-term Decisions：实现前核对 [Check-local Record data](../../docs/decisions/report-check-owned-record-data-with-local-identities.md)、[Check-owned comparison](../../docs/decisions/keep-comparison-semantics-inside-producing-checks.md)、[直接 execution + 最小 reporting](../../docs/decisions/use-direct-check-execution-with-minimal-record-reporting.md) 与现行 Core/DecisionPolicy/machine Decisions 的 evolution/alignment。
- 测试证据：Check authoring/result、Record/Core safety、Run facts、machine/output、legacy policy removal、Project Gate、package declarations 与 external consumers。
