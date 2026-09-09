# Decision Tags 全量审计

本报告记录 316 条已建立 Decision 的 tags 全量审计与最终实施状态。权威 tags 由 Decision Markdown 保存；本报告说明分类判断，结构化前后值见相邻 JSON。

## 结论

- 保留现有 9 个 tag，不新增、删除或重命名 taxonomy 项。
- 13 条记录补入已有 tag：11 条增加 `documentation`，1 条增加 `testing`，1 条增加 `dependency-policy`。
- 其余 303 条保持原分类；没有 remove 或 replace。
- 13 项均已作为不改变采用方向的编辑性 frontmatter 修正写入，并已同步到索引。

## 审计契约与覆盖

1. tags 只表达有正文依据的记录级可检索主题，不承载 lifecycle、alignment 或 relation 语义。
2. 完整读取 316 份权威 Markdown 的 frontmatter、摘要和三个正文节；以 `decision` 摘要筛选后回读完整正文，不从索引反向补造分类理由。
3. 只有主题的 owner、边界、选择或长期约束本身是决策对象时才添加 tag。实现、验证、示例或普通引用仅涉及某主题时保持原分类。
4. 主题相似但缺少稳定独立消费者时不扩张 taxonomy；避免把一次性实现簇固化成长期分类。

审计输入的合并 SHA-256 为 `e132f63ba0cab51f02bcbf97db2a5932728385d6ace6e73b4775fb0b81e5e9a9`。该值只标识形成时覆盖材料，不代替当前 Markdown 与索引检查。

## 当前 Taxonomy

| tag | 当前记录数 | 本轮净变更 | 稳定检索边界 |
| --- | ---: | ---: | --- |
| `configuration` | 159 | 0 | Product/Project Definition 的 authoring grammar、options、binding 或选择规则。 |
| `dependency-policy` | 21 | +1 | 外部或上游依赖、版本、provenance、许可、vendor 或采用边界。 |
| `documentation` | 14 | +11 | 用户或维护者文档的受众、owner、信息架构、语言、材料或发布路径。 |
| `performance` | 3 | 0 | 性能预算、测量、优化或可复现性能评估。 |
| `product-contract` | 184 | 0 | 消费者可依赖的 Product、API、package、schema 或 output 行为边界。 |
| `product-priority` | 23 | 0 | 产品能力或发布的优先级、顺序与明确延后。 |
| `repository-automation` | 4 | 0 | 明确的仓库自动化政策，不等同于所有 Gate 或验证实现。 |
| `testing` | 18 | +1 | 测试实体、证据、选择或验收策略。 |
| `workflow-policy` | 115 | 0 | Change、治理、发布、维护或仓库工作方式。 |

## 已实施修正

| Decision ID | 新增 tag | 正文支持的分类对象 |
| --- | --- | --- |
| `260811-preinstall-selected-typescript-capabilities` | `dependency-policy` | 精确锁定第三方包及替代边界。 |
| `260824-use-chinese-as-primary-language-for-public-documentation` | `documentation` | consumer 文档的主要语言、范围与例外。 |
| `260826-make-package-lifecycle-gate-tests-explicit` | `testing` | package lifecycle 测试选择与验收边界。 |
| `260827-structure-package-documentation-around-one-readme` | `documentation` | README、Check 指南与机制页层级。 |
| `260828-author-package-markdown-at-published-paths` | `documentation` | Markdown 正文 owner、发布路径与受管片段。 |
| `260828-locate-package-examples-by-natural-markdown-headings` | `documentation` | Markdown heading 与示例定位边界。 |
| `260828-ship-current-machine-contract-materials-in-the-package` | `documentation` | output guide、schema 与 machine example 材料集合。 |
| `260829-keep-package-machine-docs-consumer-focused` | `documentation` | consumer 与 maintainer 说明的 owner 分流。 |
| `260829-ship-one-definition-backed-machine-example` | `documentation` | 面向 consumer 的 Definition 与输出示例设计。 |
| `260830-use-chinese-as-primary-language-for-package-consumer-documentation` | `documentation` | package consumer 文档语言与适用材料。 |
| `260905-organize-maintainer-documentation-by-responsibility` | `documentation` | 内部文档职责分组、导航与 owner 交接。 |
| `260905-review-documentation-impact-by-audience` | `documentation` | 用户与维护者文档的责任和审查方式。 |
| `260905-structure-package-documentation-by-user-task` | `documentation` | README、Check 指南和任务专题的信息架构。 |

每项 baseline tags、最终完整 tags、置信度、理由和实施状态保存在 [tag-audit-candidates.json](tag-audit-candidates.json)，并已逐项与当前索引核对。

## 未扩张的分类边界

- `repository-automation` 不泛化为所有 Project Gate 决策；现有正文和 owner 没有定义这一宽边界。
- `documentation` 不标记仅在验证、同步或路径引用中提及文档的 Product Decision。
- security、license、package-release 和 Lizard 等主题尚未证明有足够稳定、独立的检索消费者，因此不新增 taxonomy 项。

这些保留项是当前分类边界，不是待迁移清单。

## 验证

```sh
bun run decisions -- check
jq '[.entries[].tags[]] | group_by(.) | map({tag: .[0], count: length})' docs/decisions/decision-index.json
```
