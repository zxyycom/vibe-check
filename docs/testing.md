# 测试策略

本文拥有 Vibe Check 当前测试分层、Case 账本和交付验证入口。行为规则仍以对应 stable owner 为准。

## 测试层级

| 层级 | 证明 |
| --- | --- |
| Core/unit | catalog/binding/schedule/TaskPlan、run/record manager、Check adapter、Product-owned runner、built-in adapter、policy、publication schema/validator 的局部不变量 |
| Product entry | 正式 CLI 的 config、flags、baseline、outcome、console 与 artifacts 交叉边界 |
| Consumer | docs schema/example 独立 acceptance 与 actual annotation CLI 对 two-file set 的消费 |
| Dogfood | wrapper 到同一正式入口的单向 routing |

## Case 账本

`docs/testing/cases/**` 是 current semantic Case catalog。每个 Case 有一个 stable owner、current Bun test entities 和可证伪的 Proves；测试 rename/split/merge/delete 或 Proves/Owner 修改前后运行 `bun run test-evidence:check`。Case 不引用 Change、历史材料或已删除 test entity，也不把 schema field 当 Case inventory。

Check/Record Cases 覆盖 public catalog/private binding/schedule freeze、generic runner preserved contract、closed
Check adapter、`requiresChecks` settled availability、run/result matrix、coverage、record
identity/conflict/retention、built-in exact inputs、reference evidence 和 policy。编排测试必须分别证明 generic
runner 不解释领域 value，以及 adapter 对 unavailable prerequisite 的 gating、每个 TaskPlan 的 exactly-one
completion、function-scoped ports 和 settlement；不得把 Task identity 或 capability event 当作 machine-output
断言。
Output Cases 覆盖 v2 runtime schema、JSON/NDJSON grammar、two-file relationships、publication cleanup、readable
parity、CLI outcome 与 annotation consumer。

## 验证入口

文档/Cases 改动至少运行：

```bash
bun run validate:docs
bun run test-evidence:check
```

跨 output/schema/example/consumer 的交付还运行 `bun run verify:vibe-check-workspace:required`。产品实现再按行为 owner 运行最窄 Bun tests、typecheck、lint 与必要的 full workspace verifier。无法运行的检查必须说明影响。

## 一致性审计

1. 每个 current test entity 至少映射一个真实 Case，Case entity 只指向现存测试。
2. Core 只证明 Core facts；policy、readable projection 与 publication 各有独立可观察信号。
3. docs acceptance 不复用 production validator；actual consumer 必须经 shallow machine boundary 验证完整 two-file set。
4. scanner fixtures 只证明 adapter-private protocol，不成为 public contract。
5. 编排的 prerequisite 断言必须区分合法 quality `failed` / `not-applicable` 与 execution、result、record、ack
   failure；前者允许 dependent，后者不得执行 dependent user function。
