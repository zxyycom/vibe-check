# 测试策略

本文拥有 Vibe Check current test 分层、Case 账本和交付验证入口；产品语义仍以相应领域 owner 为准。

## 测试层级

| 层级 | 位置与证明 |
| --- | --- |
| Definition/Check facts | `src/project-definition/**`、`src/check-settlement/**` 的共置 tests：recursive Check validation、native default composition、direct callback result validation、terminal Check/Record facts。 |
| Product Run/Output/Scheduler | `src/project-run/**`、`src/machine-output/v4/**`、`src/project-run/task-scheduler/**` 的共置 tests：Run controls、dependency/mutex/cancellation、Run diagnostics、publication invariants/outputs 与 task admission。 |
| Default adapters | `src/package-checks/**` 的共置 tests：Check-owned scanner options、exact scope、cache、availability/process/parser failure 与 supplemental Records。 |
| Repository tooling | `scripts/**` 的共置 tests：process execution、repository-files、docs/package API、validation、package artifact/candidate、Project quality/Gate 与 Test Evidence behavior。 |
| Consumer and dogfood | `scripts/project/**` private consumer 证明 exact candidate import、repository Definition/Run binding；`scripts/validation/**` 独立验证 current v4 schema/example complete two-file set。 |

## 测试所有权

行为 owner 决定当前能力是否需要新增、修改或删除直接测试；Change、历史材料或已有 Case 本身不自动产生测试义务。测试
只有在能观察 owner 承诺的结果时才进入 current test surface 与 Case 账本；无法以稳定自动化方式证明的边界在 owner
验证说明或 Change 审查中记录为 `Manual CR:`，不创建名义 Case。

## Case 账本

`docs/testing/cases/**` 是 current semantic catalog。每个 Case 命名 stable owner、current Bun test entity 和可证伪的
`Proves` statement。Case 按 owner contract 与责任方可观察结果划分，不按测试数量、Project Gate lane、provider/consumer
执行 DAG 或性能特征划分；同一实体只有在它直接证明另一 owner 的独立结果时才可映射多个 Case。新增、删除、rename/move
test node，修改 test body，或修改 Case owner/proof 前后，都运行：

```bash
bun run test-evidence -- check --root .
```

该命令从完整 profile 加载并注册测试，以 static/JUnit identity 闭合 Case；它不执行测试正文。还必须运行受影响的
最窄测试，或由 Project Gate 对应 behavior 子 Check 执行。Case 描述 current owner 承诺且能由失败信号判定的行为，不描述已删除 helper、historical material 或 internal
scheduler identity；provider setup 的执行复用本身不产生 Case。Definition Cases 覆盖 recursive ordinary Check、`inherit`、direct default composition 和
fail-closed validation；runtime Cases 覆盖 direct execution、outcome/reason、dependency blocking、Check-facts Record
ownership、cancellation 和 Run diagnostic；output Cases 覆盖 v4 bytes/schema、complete-set fingerprint、publication
lifecycle 和独立 docs validation。

## 验证入口

文档、schema、example 或 Case 改动运行：

```bash
bun run validate -- docs
bun run test-evidence -- check --root .
```

产品或 scripts 改动先运行最窄 Bun test，再按 owner 运行 typecheck/lint。Project Gate 将 Test Evidence entity
closure 与按稳定 owner 分区的 behavior execution 分别结算；required 还保留同次 exact package candidate 的 typed
provider，但默认不选择 `package-tests` physical acceptance Checks。full 或 required 加 `--enable-tag package-tests`
才选择 candidate lifecycle、artifact、external-consumer provider 及其 types/docs/runtime consumer Checks。

跨 owner、quality、Gate 或 output contract 的日常交付运行：

```bash
bun run verify:vibe-check-workspace:required
```

涉及 package artifact、candidate、外部 consumer 或发布验收时运行 full；本地只需在 required 中加入这三项时，
使用 `--enable-tag package-tests`：

```bash
bun run verify:vibe-check-workspace:full
bun run verify:vibe-check-workspace -- --profile required --enable-tag package-tests
```

必须报告实际运行的检查和未运行项及影响。

## 一致性审计

1. 每个 current test entity 至少映射一个 current Case，且每个 Case entity 都存在。
2. Definition test 证明 authoring/validation，不证明偶然发生的 runtime behavior。
3. Check-facts test 证明 Check/Record facts；machine publication、Run outputs 和 scheduler 各有 observable evidence。
4. docs validator 独立于 Product runtime validator；接受 schema/example artifact set 前验证完整 v4 two-file set。
5. scanner fixture 只证明 private adapter protocol，不公开 scanner resolution 或 environment override contract。
