# Proposal

本 Change 对 Product-wide Record contract 执行一次完整 hard cut：任意 custom/default Check 只提交局部 `id` 与自己的 canonical data，Product 负责归属、安全接收、Core storage 和 machine publication。它迁移由旧 Record 模型直接造成的消费者，但不同时重构其它 execution inputs、typed dependencies 或 presentation。

## Why

当前 Record API 从少量 metric/finding built-ins 反推公共模型：executable Check 预先声明 `recordTypes`、field descriptors、`identityFields` 与 policy metadata，每条 Record 固定携带 classification、message、location 和 fields，Product 还拥有 comparison/reference 关系。

这些概念不是 arbitrary custom Check 的共同义务。Repository summary、API health、performance sample、dependency fact 与 file finding 的 data shape、identity、presentation 和 comparison semantics 各不相同。继续维护共同 catalog 会让 Product 拥有没有共同消费者的类型、Schema、identity 和 relation 系统。

旧 Record shape 已进入 reporter、Core、policy/Gate、machine output、default Checks 与 package declarations，因此本 Change 必须同步迁移这些直接消费者。讨论中发现的 execution-input 归属、跨 Check typed output 和人读 presentation 都有独立目标与验收；把它们加入同一次 hard cut 只会扩大阻塞面，不会让 Record contract 更完整。

## Outcome

Custom/default Check 使用同一个最小 authoring surface：

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

Reporter scope 提供 `checkId`；author 提供 owning Check 内唯一的 `id`。Product 将 `data` materialize 为 detached、frozen canonical JSON object，并保存：

```ts
interface CoreRecord {
  readonly checkId: string;
  readonly id: string;
  readonly data: CanonicalJsonObject;
}
```

`RunResult` 保持 generic `data`。需要领域类型的 consumer 使用 producing Check 自己维护的普通 parser；Product 不注册 parser，也不从 `data` 恢复类型目录。

Machine contract 硬切到 v4，只发布 schema identity、`checkId`、author `id` 和 generic canonical `data`。Product-wide comparison/reference input 与 relation grammar 随旧 Record 模型删除；其它现有 execution-context 字段不在本 Change 中重新归属或迁移。

## Scope

纳入范围：

- 将 public reporter 收敛为 `records.report(identity, data)`；`identity` 是 closed `{ id: string }`，`data` 是 non-array canonical JSON object。
- 让 `id` 在 owning Check 内唯一，由 reporter scope 绑定 `checkId`；Product 不从 data、location、selector 或 hash 重算 author identity。
- 删除 public `recordTypes`、field descriptor vocabulary、`CheckRecordType` generic、`identityFields`、`identify` 与 `reportReference`。
- 让 Product 只验证 fixed identity、canonical JSON safety、ownership、duplicate/conflict、late write 与 reporter lifecycle；它不验证 custom data shape。
- 将 Core Record 收敛为 `{ checkId, id, data }`，保持 Check outcome 与 Record facts 相互独立。
- 删除由旧 Record 模型拥有的 common comparison/reference inputs，并将 Product-wide policy/Gate 收敛到 Product-owned Check facts。
- 将 machine publication 硬切到 v4，并同步 schemas、independent validators、fingerprints 与 examples。
- 迁移 default Checks、repository Project Definition、Project Gate、fixtures、直接 output consumers 与 package declarations。

不纳入范围：

- 为 custom `data` 建立 Product-owned TypeScript generic、Schema、codec、descriptor、registry 或 domain validator；Check-owned parser 可以自行选用 schema library。
- 保证 `RunResult.snapshot.records[].data` 自动恢复 producing Check 的 TypeScript type，或把 parser 注册到 Definition、Core、machine schema 或 Product runtime。
- 重新设计或迁移 `root`、`flags`、`changedFiles`、`files`、`cache` 等其它 execution inputs；保持现状不构成长期归属或兼容承诺。
- 实现 downstream Check 对 upstream settled output 的 typed access；该能力由 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 承接。
- 把 kind、level、subject、message、location 或 presentation semantics 加入 base Record；terminal/live presentation 由 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/) 承接。
- 保留 v3 reader/writer、legacy reporter adapter、dual machine contract 或其它 old/new compatibility path。
- 改变 `completed`、`not-applicable` 与 `unavailable` result grammar，或从 Record presence 推断 verdict。

## Success Criteria

1. Ancestry-external package consumer 可以定义没有 Record catalog 的 ordinary custom Check，并通过 `records.report({ id }, data)` 提交 nested canonical object。
2. Public declarations 不包含 `CheckRecordType`、Record tuple generic、`recordTypes`、field descriptor、identity extractor 或 reference reporter；options inference、plain object composition 与 direct result typing 保持成立。
3. Product 对 malformed identity、non-canonical data、duplicate/conflict 与 late write fail closed，但不验证 Check-local property、union 或业务 constraints。
4. Core snapshot 中每条 Record 只有 owning `checkId`、Check-local `id` 与 frozen `data`；不同 Checks 可以使用相同 `id`，同一 Check 不能提交冲突 identity。
5. Check owner 可以用 local interface/`satisfies` 获得 write-side typing，并用普通 local parser 从 generic `record.data` 恢复 read-side domain type，无需 Product registry。
6. Run Controls、execution context、Core facts 与 machine publication 不再包含 common comparison/reference vocabulary；本 Change 不重命名或迁移其它 execution inputs。
7. Product-wide policy 与 Gate 不读取 custom Record data；领域阻断结果由 producing Check verdict 表达。
8. Generic output 不把 arbitrary data 猜成 message/location；需要领域展示的 consumer 明确交给 presentation Change。
9. Machine v4 发布 `{ checkId, id, data }`，验证 canonical JSON、composite identity uniqueness、Check ownership、canonical order 与 complete Records set fingerprint，并拒绝 v3。
10. Default Checks、repository dogfood、Project Gate、docs examples、package declarations 与 isolated consumer 完成迁移并通过 required workspace gate。

## Affected Owners

- Public Check authoring：[`src/product/definition/custom-check.ts`](../../src/product/definition/custom-check.ts)、Record-related normalization 与 [`docs/configuration.md`](../../docs/configuration.md)。
- Record runtime、Core 与 policy：[`src/product/quality-core/check-record/`](../../src/product/quality-core/check-record/) 与 [`docs/quality-metrics.md`](../../docs/quality-metrics.md)。
- Comparison/reference removal：Record-related Run Controls、execution plumbing 与 Project Gate consumers；其它 execution-input ownership 不变。
- Machine publication：[`src/product/quality-core/output/`](../../src/product/quality-core/output/)、[`docs/output.md`](../../docs/output.md)、[`docs/schemas/`](../../docs/schemas/) 与 [`docs/examples/artifacts/`](../../docs/examples/artifacts/)。
- Built-in/project consumers：default Checks、[`scripts/quality/project-definition.ts`](../../scripts/quality/project-definition.ts)、[`scripts/quality/project-gate/`](../../scripts/quality/project-gate/)、annotation/output consumers 与相邻 fixtures。
- Public package：[`scripts/package-candidate/`](../../scripts/package-candidate/)、public-contract inventory、declaration emit、JSDoc 与 isolated installed consumer evidence。
- Downstream Changes：[`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 和 [`add-check-associated-result-presentation`](../add-check-associated-result-presentation/)；两者消费 minimal Record，不向本 Change 反向增加依赖读取或 presentation 字段。
- Long-term direction：[Check-local Record data](../../docs/decisions/report-check-owned-record-data-with-local-identities.md)、[Check-owned comparison](../../docs/decisions/keep-comparison-semantics-inside-producing-checks.md) 与 [直接 execution + 最小 reporting](../../docs/decisions/use-direct-check-execution-with-minimal-record-reporting.md)；实现完成前均为 `active + unaligned` future direction。
- 测试证据：Definition authoring、Record/Core、comparison/reference removal、policy/Gate、machine publication、default Checks、package declarations 与 external consumer tests。
