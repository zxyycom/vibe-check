# 测试策略

本文拥有 Vibe Check current test 分层、Case 账本和交付验证入口；产品语义仍以相应领域 owner 为准。

## 测试层级

| 层级 | 位置与证明 |
| --- | --- |
| Definition/Core | `src/definition/**`、`src/core/**` 的共置 tests：recursive Check validation、native default composition、direct callback result validation、terminal Check/Record facts。 |
| Product Run/Output/Scheduler | `src/run/**`、`src/output/machine-v4/**`、`src/scheduler/**` 的共置 tests：Run controls、dependency/mutex/cancellation、Run diagnostics、publication invariants/effects 与 task admission。 |
| Default adapters | `src/checks/**` 的共置 tests：Check-owned scanner options、exact scope、cache、availability/process/parser failure 与 supplemental Records。 |
| Repository tooling | `scripts/**` 的共置 tests：foundation、docs/package API、validation、package artifact/candidate、Project quality/Gate 与 Test Evidence behavior。 |
| Consumer and dogfood | `scripts/project/**` private consumer 证明 exact candidate import、repository Definition/Run binding；`scripts/validation/**` 独立验证 current v4 schema/example complete two-file set。 |

## Case 账本

`docs/testing/cases/**` 是 current semantic catalog。每个 Case 命名 stable owner、current Bun test entity 和可证伪的
`Proves` statement。新增、删除、rename/move test node，修改 test body，或修改 Case owner/proof 前后，都运行：

```bash
bun run test-evidence -- check --root .
```

并运行受影响的最窄测试。Case 描述 current public behavior，不描述已删除 helper、historical material 或 internal
scheduler identity。Definition Cases 覆盖 recursive ordinary Check、`inherit`、direct default composition 和
fail-closed validation；runtime Cases 覆盖 direct execution、outcome/reason、dependency blocking、Core Record
ownership、cancellation 和 Run diagnostic；output Cases 覆盖 v4 bytes/schema、complete-set fingerprint、publication
lifecycle 和独立 docs validation。

## 验证入口

文档、schema、example 或 Case 改动运行：

```bash
bun run validate -- docs
bun run test-evidence -- check --root .
```

产品或 scripts 改动先运行最窄 Bun test，再按 owner 运行 typecheck/lint。跨 owner、package candidate、quality、Gate
或 output contract 的交付运行：

```bash
bun run verify:vibe-check-workspace:required
```

必须报告实际运行的检查和未运行项及影响。

## 一致性审计

1. 每个 current test entity 至少映射一个 current Case，且每个 Case entity 都存在。
2. Definition test 证明 authoring/validation，不证明偶然发生的 runtime behavior。
3. Core test 证明 Check/Record facts；publication、effect 和 scheduler 各有 observable evidence。
4. docs validator 独立于 Product runtime validator；接受 schema/example artifact set 前验证完整 v4 two-file set。
5. scanner fixture 只证明 private adapter protocol，不公开 scanner resolution 或 environment override contract。
