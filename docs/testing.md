# 测试策略

本文拥有 Vibe Check 当前测试分层、Case 账本和交付验证入口。行为规则仍以对应 stable owner 为准。

## 测试层级

| 层级 | 证明 |
| --- | --- |
| Core/unit | Definition normalization/Run resolution、static Task graph/engine、Product Check adapter、Core session capability、built-in adapter、policy、v3 publication schema/validator 的局部不变量 |
| Product entry | Project Definition/Run Controls validation、Package Run result、direct/TaskPlan mapping、project Run binding、console 与 artifacts 交叉边界 |
| Consumer | docs schema/example 独立 acceptance 与 actual annotation CLI 对完整 v3 two-file set 的消费 |
| Dogfood | wrapper 到 repository Project Run 的单向 routing，以及 workspace scripts adapter 对 shared engine 的复用 |

## Case 账本

`docs/testing/cases/**` 是 current semantic Case catalog。每个 Case 有一个 stable owner、current Bun test
entities 和可证伪的 Proves；测试 rename/split/merge/delete 或 Proves/Owner 修改前后运行
`bun run test-evidence:check`。Case 不引用 Change、历史材料或已删除 test entity，也不把 schema field 当 Case
inventory。

Check/Record Cases 覆盖 two-phase resolution、single static graph、generic engine/adapter boundary、scope cap、
Core Check 的三种 outcome、RecordSink ownership、exact-once terminal closure、dependency availability、partial
Record retention、trusted invariant failure 与 cancellation。generic engine 测试只证明 graph/admission/settlement；
Product adapter 测试证明 Check/Record 语义，不能把 Task identity、scope/capability implementation detail 或内部
settlement value 当作 machine-output assertion。

Output Cases 覆盖 v3 runtime schema、JSON/NDJSON grammar、two-file relationships、publication cleanup、readable
parity、structured Run Result 与 annotation consumer。历史 v2 schema bytes 只由专门 archival evidence 证明，
不形成 current reader/writer or consumer Case。

## 验证入口

文档/Cases 改动至少运行：

```bash
bun run validate:docs
bun run test-evidence:check
```

跨 output/schema/example/consumer 的交付还运行 `bun run verify:vibe-check-workspace:required`。产品实现再按
行为 owner 运行最窄 Bun tests、typecheck、lint 与必要的 full workspace verifier。无法运行的检查必须说明影响。

## 一致性审计

1. 每个 current test entity 至少映射一个真实 Case，Case entity 只指向现存测试。
2. Core 只证明 Check/Record facts；policy、readable projection、publication 与 effect result 各有独立可观察信号。
3. docs acceptance 不复用 production validator；actual consumer 必须经 shallow v3 machine boundary 验证完整
   two-file set。
4. scanner fixtures 只证明 adapter-private protocol，不成为 public contract。
5. 编排的 prerequisite 断言必须区分 `not-applicable`、completed quality `failed` 与 unavailable；前两者允许
   dependent，后者不得执行 dependent user function。取消断言还必须证明 admission cutoff、admitted drain、事实
   retention 与 late mutation rejection。
