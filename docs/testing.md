# 测试策略

本文拥有 Vibe Check 当前测试分层、Case 账本和交付验证入口；具体产品语义仍以对应领域 owner 为准。

## 测试层级

| 层级 | 证明 |
| --- | --- |
| Definition/Core | recursive Check validation、native default composition、direct callback result validation、terminal Check/Record facts、policy 与 publication invariant |
| Product run | closed Definition/Run Controls validation、direct callback context、dependency/mutex/cancellation、`RunResult` diagnostic 与 definition warning |
| Default adapters | Check-owned scanner option、exact scope、cache、availability/process/parser failure 与 candidate reporting |
| Consumer | current schema/example acceptance，以及 annotation 对完整 v3 two-file set 的消费 |
| Dogfood | repository Definition/Run binding，以及无需 configuration discovery 的调用脚本 |

## Case 账本

`docs/testing/cases/**` 是当前 semantic catalog。每个 Case 命名一个 stable owner、current Bun test entity 与可证伪的
`Proves` statement。修改 test body、test node、Case owner 或 proof 前后，都运行
`bun run test-evidence -- check --root .` 以及受影响的最窄测试。

Case 描述 current public behavior，不描述已删除的 helper name、historical material 或 internal scheduler identity。
Definition Case 覆盖 recursive ordinary Check、`inherit`、direct default composition 与 fail-closed validation。Runtime
Case 覆盖 direct execution、`status`/`reason.code` outcome、dependency blocking、Core Record ownership、cancellation 与
Run diagnostic。Output Case 覆盖 v3 byte、schema、publication lifecycle 与实际 annotation consumer。

## 验证入口

文档、schema、example 或 Case 改动运行：

```bash
bun run validate -- docs
bun run test-evidence -- check --root .
```

跨边界交付还运行 `bun run verify:vibe-check-workspace:required`，它直接调用 Project Gate。Product 改动先运行最窄 Bun test，再按 owner 选择的
typecheck、lint 与 Project Gate 扩展。必须报告任何未运行检查及其影响。

## 一致性审计

1. 每个 current test entity 至少映射一个 current Case，且每个 Case entity 都存在。
2. Definition test 证明 authoring/validation，不证明偶然发生的 runtime behavior。
3. Core test 证明 Check/Record fact；policy、publication 与 effect 各有自己的 observable evidence。
4. Docs validation 独立于 production schema validation；annotation 在产生 output 前验证完整 two-file set。
5. Scanner fixture 只证明 private adapter protocol，不发布 scanner resolution 或 environment override contract。
