# Decision 直接演进关系审计

本报告记录 316 条已建立 Decision 的直接演进关系审计，以及 223 条 relation summary 的最终实施状态。权威关系仍由 `docs/decisions/**/*.md` 保存；本报告和相邻 JSON 是本 Change 的审计证据，不是第二份关系来源。

## 结论

- 200 条 source 共包含 223 条直接边：修订 148、替代 25、归并 30、拆分 14、重划 6。
- 两端正文支持现有 type/target；未发现应新增、删除或改变身份的直接边。
- 223 条边现均有 source 视角的非空 summary，且每条不超过 40 个 Unicode 码点。
- 183 条 source / 203 条边通过 Decision CLI `evolve` 事务写入。
- 17 条 source / 20 条拆分或重划边按用户授权进行一次性手工 frontmatter 补写，再全量重建索引并严格检查。该例外没有修改 type/target、生命周期、alignment 或正文，也没有修改 Decision CLI 源码。

## 审计契约与覆盖

1. 完整读取 Decision Records v53 的记录边界、直接演进类型、summary 和后继集合闭合规则。
2. 从权威 Markdown 枚举全部 established records 与 relations；索引只用于交叉核对派生投影。
3. 对每条边读取 source 与 target 的 `decision` 摘要和 `## 决策` 正文，判断 source 是否真实承接 target、关系类型是否匹配、summary 是否准确描述该边。
4. 对完整图检查 target 可解析性、同 source target 唯一性、自环、环、拆分闭合与重划闭合。
5. tags、创建时间、主题相似或同一 Git 提交不单独构成演进证据。

| 覆盖项 | 结果 |
| --- | ---: |
| established Decisions | 316（active 110；archived 206） |
| 有直接关系的 source | 200 |
| 直接边 / 非空 summary | 223 / 223 |
| target 不可解析 / 重复 / 自环 / 环 | 0 / 0 / 0 / 0 |
| 拆分闭合集合 | 5 个，14 条边，均完整 |
| 重划闭合集合 | 1 个连通集合，3 个 successor / 3 个 predecessor / 6 条边，完整 |

逐 source 的审计基线、最终完整关系、置信度和实施路径保存在 [relationship-audit-candidates.json](relationship-audit-candidates.json)。JSON 明确区分 `baselineRelations` 与 `finalRelations`；最终值已逐项与当前索引核对。

## 实施路径

### Decision CLI 事务

不属于拆分或重划闭合事件的 183 条 source 逐 source 执行完整 `evolve` preflight 与正式事务。多边 source 为每个 target 保留不同 summary，并重传该 source 的完整关系集合。

### 一次性手工例外

现有 `evolve` 的全局 relation override 无法在一个完整 multi-successor 事务中表达每个 successor 各自不同的关系集合与 summary。用户明确授权不改工具源码，直接补写以下 6 个闭合事件中的 20 条 summary：

| 事件 | predecessor | successor 数 / 边数 |
| --- | --- | ---: |
| 拆分 A | `260806-use-versioned-npm-package-release-unit` | 3 / 3 |
| 拆分 B | `260826-refine-project-run-and-settlement-owners` | 4 / 4 |
| 拆分 C | `260830-reconcile-finding-waivers-with-caller-defined-identities` | 2 / 2 |
| 拆分 D | `260830-preserve-release-gate-readiness-with-invocation-creation-time` | 3 / 3 |
| 拆分 E | `260903-introduce-invocation-scoped-admission-strategy-lifecycle` | 2 / 2 |
| 重划 R | 3 个 predecessor 的完整重划集合 | 3 / 6 |

手工例外只把已审计 summary 插入匹配的 `(source, type, target)`；写入脚本要求每个匹配恰好出现一次。写入后运行无 selector 的 `sync-index --write`，再用严格 `check` 验证完整关系图与索引。

该例外只说明本次迁移怎样落地，不改变 v53 的正常维护契约。后续生命周期、alignment 与关系维护仍使用 Decision CLI；本 Change 不把工具能力扩展为新的产品或 skill 要求。

## 保持不变的边界

- 关系 type/target、边数与拓扑保持不变。
- 未创建、删除、合并或拆分 Decision，也未改变正文采用方向。
- 生命周期、alignment 与 tags 的判断分别由相邻审计切面承接。
- 结构化证据保存形成时 baseline 和最终值；权威当前状态只从 Decision Markdown 及其派生索引读取。

## 验证

以下命令用于核对当前集合；最终 Project Gate 结果由 Change 总体验证记录承接。

```sh
bun run decisions -- check
jq '[.entries[].relations[]?] | {relations: length, summaries: map(select(.summary != null and .summary != "")) | length}' docs/decisions/decision-index.json
```

期望计数为 `relations: 223`、`summaries: 223`。
