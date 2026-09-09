# Translated Source Mapping

此维护流程只处理 source-aligned Lizard port 的**来源到仓库 target**闭合；它不是上游代码更新、header 修复或 analyzer 行为验收。随包法律材料闭合由 [Package artifact](package-artifact.md#随包法律材料)拥有。

## 编辑 owner

维护者先区分下列 owner，不能从相邻 JSON 的格式推断写入权：

| Material | Owner / editable status | Purpose |
| --- | --- | --- |
| `licenses/lizard-1.24.0-provenance.json` | source/range/hash/SPDX→translated target inventory 的唯一人工编辑源 | 来源、范围和 translated target 改动时在此更新。 |
| `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/lizard-1.24-source-identity.json` | 单独人工维护的 identity evidence | 选择 source→symbol 或 named host seam，并保留 `classes`/`symbols` completeness signal；它不由 ledger 生成。 |
| `scripts/package/package-contract.ts` 的 `PACKAGE_TRANSLATED_ANALYZER_PROVENANCE_SHA256` | 由 ledger 字节派生的 package legal-material pin | package legal-material audit 消费该 pin；不要手改。 |

## 检查与同步

通常先运行只读检查：

```sh
bun run source-mapping
```

它解析 ledger 并核对 package-contract 中的精确 provenance SHA-256；只有摘要一致且 identity 不含旧派生计数后，才执行 source-identity AST audit。发现任一派生材料陈旧时失败而不写工作树。审阅 ledger 和 identity selection 后，才可显式运行：

```sh
bun run source-mapping -- sync
```

`sync` 只会把 provenance 的 SHA-256 投影到 package contract，并在遗留字段存在时从 identity JSON 删除派生的 `counts.entries` 与 `counts.targets`；它不生成或改写 source→symbol/host-seam 选择、上游 hash、SPDX、license、source header、oracle 或 analyzer 行为。

写入前会先完成 ledger/identity/package-pin 校验及 identity audit；验证拒绝时不改 curated files（包括缺失或重复的 package pin）。若之后的写入失败，流程尝试恢复本次尝试写入的每个文件的原内容；该恢复路径由目标测试覆盖，但不替代版本控制。

## 验证边界

来源 inventory/派生 pin 的维护测试、identity AST coverage、以及 source header/legal-material closure 是互补证据；它们不能证明 reader/oracle/parity 的翻译语义，后者仍由 analyzer owner 的行为测试证明。
