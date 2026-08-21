# Proposal

本 Change 为首次公开 package 建立任意 custom Check 与 Product-provided default Check 共用的最小 Record contract。Check 提供局部 `id` 和自己的数据对象；Product 只负责安全接收、归属、生命周期、Core storage 与 publication。Record 数据类型、读取解析、comparison、presentation 和 Check-specific dependencies 不进入 Product-wide Record foundation。

## Why

当前 Record API 是从三个 metric/finding built-ins 反推出来的。它要求 executable Check 预先声明 `recordTypes`、field descriptors、`identityFields` 与 policy metadata，并让每条 Record 固定携带 classification、message、location 和 fields。Product 还提供 comparison input、reference reporting 与 relation predicates。

这些概念不是 arbitrary custom Check 的共同义务。Repository summary、API health、performance sample、dependency fact 与 file finding 的数据形状、身份、展示和 comparison semantics 各不相同。把 built-in 字段提升为基础契约，会迫使所有 Check 学习无关 vocabulary，并让 Product 维护没有共同消费者的类型、Schema、identity 和 relation 系统。

API 审核还暴露了第二个边界问题：`CheckExecutionContext.project` 当前同时提供 `root`、`changedFiles`、`flags`、`files`、`comparison` 和 `cache`。某个值重要或当前已存在，并不能证明它应留在所有 custom Checks 的基础 context。Per-run invocation fact、Product capability 和 Check-specific dependency 必须按 owner、生命周期与实际消费者分开；本 Change 不能在迁移 Record 时默认复制旧 `project` surface。

Typed readback 也不要求恢复 Record 类型目录。Product 返回 generic canonical `data`；需要领域类型的消费者可以使用 producing Check 自己维护的 parser。Parser 是普通 consumer adapter，不进入 Definition、Core 或 machine contract；本 Change 只要求它能解析一份已经选中的 data，不让 parser 承担 Record 查找、缺失或 upstream outcome 判断。

## Outcome

最小 Record authoring 形态为：

```ts
const apiHealth = defineCheck({
  checkId: "api-health",
  displayName: "API health",

  async execution({ records }) {
    const data = {
      endpoint: "/health",
      latencyMs: 238,
      statusCode: 200
    } satisfies ApiHealthData;

    records.report({ id: "endpoint:health" }, data);

    return { status: "completed", verdict: "passed" };
  }
});
```

Reporter scope 提供 `checkId`；author 提供在该 Check 内唯一的 `id`。Product 将 `data` materialize 为 detached、frozen canonical JSON object，并把 Core Record 保存为：

```ts
interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: CanonicalJsonObject;
}
```

`RunResult` 不恢复 Check-local TypeScript type。需要 typed readback 时，Check owner 可以提供普通 parser：

```ts
const data = parseApiHealthData(record.data);
```

这个 parser 不向 Product 注册，也不让 Product 解释 `data`。

Machine contract 硬切到 v4：Record row 只发布 schema identity、`checkId`、author `id` 和 generic canonical `data`。Row identity 是 `{ checkId, id }`；machine consumer 不重算 author ID，也不存在 generic Record relation/reference entity。

Readiness 将另行固定 `CheckExecutionContext` 的最小非 Record surface。`root`、`flags`、`changedFiles` 只有在被证明是语义一致且由 Product 拥有的 per-run facts 时，才进入一个明确的 invocation boundary；`files`、`cache` 或其它能力只有在同样通过 consumer/owner 检验时才进入公共 context，否则由需要它们的 Check 或 dependency owner 提供。跨 Check settled output 与类型传递由 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 独立设计；本 Change 不预设具体字段，也不建立通用 provider registry。

## Scope

纳入范围：

- 将 public reporter 收敛为 `records.report(identity, data)`；`identity` 是 closed `{ id: string }`，`data` 是 non-array canonical JSON object。
- 让 `id` 在 owning Check 内唯一，由 reporter scope 绑定 `checkId`；Product 不从 data、location、selector 或 hash 重新定义 author identity。
- 删除 public `recordTypes`、field descriptor vocabulary、`CheckRecordType` generic、`identityFields`、`identify` 与 `reportReference`。
- 审计 public `CheckExecutionContext`：区分 typed options、Product lifecycle、per-run invocation facts 与 Check-specific dependencies，并用 declaration/runtime consumer prototype 固定最小 target surface。
- 删除 Product-wide comparison/reference input；需要 comparison 的 Check 自己获得输入、计算结果并返回领域 verdict。
- 让 Product runtime 只验证 fixed identity input、canonical JSON safety、ownership、duplicate/conflict、late write 与 reporter lifecycle；它不验证 custom data shape。
- 将 Core Record 收敛为 `{ checkId, id, data }`，并保持 Check outcome 与 Record facts 相互独立。
- 将 Product-wide policy/Gate 收敛到真正通用的 Check facts，不解释 custom Record data 或 comparison relations。
- 将 machine publication 硬切到 v4，并同步 schemas、independent validators、fingerprints、examples 与 package materials。
- 迁移 default Checks、repository Project Definition、Project Gate、fixtures 与直接 consumers；Check-local types、parsers、dependencies 和 presentation adapters 继续由对应 owner 管理。

不纳入范围：

- 为 custom `data` 建立 Product-owned TypeScript generic、Schema、codec、descriptor、registry 或 validator DSL。
- 保证 `RunResult.snapshot.records[].data` 自动恢复 producing Check 的 TypeScript type。
- 把 Check-owned parser 注册到 Definition、Core、machine schema 或 Product runtime；没有命名外部消费者时也不新增 built-in parser export。
- 实现 downstream Check 对 upstream settled output 的 typed access、parser identity relationship 或 `dependsOn` authoring 演进；这些由 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 承接。
- 把 `kind`、level、subject、message、location、comparison、relation、acceptance 或 presentation 加入 base Record contract。
- 仅为移除当前 context 字段而建立 generic dependency injection、provider token 或 capability registry。
- 在本 Change 中决定 terminal/live presentation grammar；该能力由 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 独立承接。
- 保留 v3 reader/writer、legacy reporter adapter、dual machine contract 或旧/new API compatibility path。
- 改变 `completed`、`not-applicable` 与 `unavailable` result grammar，或从 Record presence 推断 verdict。

## Success Criteria

1. Ancestry-external package consumer 可以定义一个没有 Record catalog 的 ordinary custom Check，并通过 `records.report({ id }, data)` 提交 nested canonical object。
2. Public declarations 不包含 `CheckRecordType`、Record tuple generic、`recordTypes`、field descriptor、identity extractor 或 reference reporter；options inference、plain object composition 与 direct result typing 保持成立。
3. Declaration/runtime probe 明确列出 `CheckExecutionContext` 的最终字段，并证明每个基础字段都有 Product owner、per-run lifecycle 和 arbitrary-custom-Check-wide semantics；旧 `project` 字段不会仅因现状或重要性被保留。
4. Product 接收 malformed identity、non-canonical data、duplicate/conflict 与 late write 时 fail closed；它不验证 Check-local property、union 或业务 constraints。
5. Core snapshot 中每条 Record 只有 owning `checkId`、Check-local `id` 与 frozen `data`；不同 Checks 可以使用相同 `id`，同一 Check 不能提交冲突 identity。
6. Check owner 可以用 local interface/`satisfies` 获得 write-side typing，并能用普通 local parser 从 generic `record.data` 恢复 read-side领域类型，而无需 Product registry。
7. Base context、Run Controls、Core facts 与 machine publication 不包含 generic comparison/reference vocabulary；需要 comparison 的 Check 自己拥有输入和结论。
8. Product-wide policy 与 Gate 不读取 custom Record data；领域阻断结果由 producing Check verdict 表达。
9. Base Record 不包含 kind、level、subject、message 或 location；presentation/annotation 只能使用明确的 Check-owned projection/parser，不猜测 custom data。
10. Machine v4 发布 `{ checkId, id, data }`，验证 canonical JSON、composite identity uniqueness、Check ownership、canonical order 与 complete Records set fingerprint，并拒绝 v3。
11. Default Checks、repository dogfood、Project Gate、docs examples、package declarations 与 isolated consumer 完成迁移并通过 required workspace gate。

## Affected Owners

- Public Check authoring 与 invocation：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、[`src/product/definition/project.ts`](../../src/product/definition/project.ts)、[`src/product/run/`](../../src/product/run/) 与 [`docs/configuration.md`](../../docs/configuration.md)。
- Record runtime、Core 与 policy：[`src/product/quality-core/check-record/`](../../src/product/quality-core/check-record/) 与 [`docs/quality-metrics.md`](../../docs/quality-metrics.md)。
- Machine publication：[`src/product/quality-core/output/`](../../src/product/quality-core/output/)、[`docs/output.md`](../../docs/output.md)、[`docs/schemas/`](../../docs/schemas/) 与 [`docs/examples/artifacts/`](../../docs/examples/artifacts/)。
- Built-in/project consumers：default Checks、[`scripts/quality/project-definition.ts`](../../scripts/quality/project-definition.ts)、[`scripts/quality/project-gate/`](../../scripts/quality/project-gate/)、annotation consumer 与相邻 fixtures。
- Public package：[`scripts/package-candidate/`](../../scripts/package-candidate/)、public-contract inventory、declaration emit、JSDoc 与 isolated installed consumer evidence。
- Adjacent presentation owner：[`add-check-associated-result-presentation`](../add-check-associated-result-presentation/)；它消费 minimal Record data 或明确的 Check-owned adapter，不向本 Change 反向添加 presentation fields。
- Adjacent dependency-output owner：[`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/)；它消费 minimal Core Record，并负责 direct dependency output access、parser identity 与 downstream type inference。
- Long-term direction：[Check-local Record data](../../docs/decisions/report-check-owned-record-data-with-local-identities.md)、[Check-owned comparison](../../docs/decisions/keep-comparison-semantics-inside-producing-checks.md) 与 [直接 Check execution + 最小 Record reporting](../../docs/decisions/use-direct-check-execution-with-minimal-record-reporting.md)；三项均为 `active + unaligned`，在本 Change 实施完成前只表示 future direction。
- 测试证据：Definition authoring、execution context、Record/Core、policy/Gate、machine publication、default Checks、package declarations 与 external consumer tests。
