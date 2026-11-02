# Checks 分区独立使用者审查

Manual CR: /root/review_checks_full；2026-11-02；非实施审查者。当前结论：checks 分区在 `0.0.0-local.eda819f36295` 通过使用者与表达/组织复审，无影响正确使用的遗留发现。首轮全量初审及 `0.0.0-local.3c1b2bcfd236` 复核关闭 C1–C4；随后对 14 篇页面、69 个声明重新完整进行第二遍审阅，并全文复核本轮最终候选的四项变化材料，见文末。本代理未修改被审文档、源码、candidate 或 Git index；唯一审查产物为本文。

## 包身份与范围

- 初审版本：`0.0.0-local.9e89c50685bb`；source commit：`7c9c69e609a5d095e2c459923b321cb4925f0713`。
- 实际读取目录：`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check`。
- tarball：`/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.9e89c50685bb.tgz`。
- 已用 sha256sum 核对：`a4a9533ffc8e3a643d5bc11fef9baa95030386db4c82d02c8c4d21f4a46f37b4`。
- 完整范围为 [review-inventory.json](review-inventory.json) 的 documents / declarations 中 `group=checks`：14 篇、2,432 行；69 个声明文件、2,271 行。下方逐项清单均完整读取，不是 grep 命中或 diff 抽样。
- 额外只为调用核对读取实际包的 Run/Controls/result 声明、package manifest；其它分区由相应独立审查者负责。
- 先仅凭安装包材料演练任务，再用 CodeGraph、owner 与本地固定依赖核验。未依赖未发布 owner 来补齐消费者缺失说明。

## 代表性消费者任务与答案位置

| 任务 | 从实际包恢复的答案与位置 |
| --- | --- |
| 选择文件级、函数级或重复指标 | 各 Check 指南「用途」「参数与默认配置」「工作原理」：fileMetrics 使用 SCC 4.0.0，functionMetrics 为内置多语言启发式 analyzer，duplicateDetection 为随包 jscpd / 明确 custom executable；普通 findings 默认 non-blocking，area 可继承/覆盖。 |
| 理解阈值与重叠 | file-metrics「单个区域的有效上限」及 function-metrics「参数与默认配置」：按 allowance 得到有效上限，再取匹配 area 的严格值；duplicate-detection「工作原理」：所有 locations 至少共享一个 area，按共同 area 的最大阈值过滤。公开 JSDoc 的两处局部阈值措辞发现见 C1。 |
| JSON 完整性与 Schema 分工 | json-validation「工作原理」「效果与结果」：严格 UTF-8/完整 JSON/对象局部解码后重复键；小写 .json eligibility，rejected 本身不阻断。json-schema-validation「最小用法」「根身份规则」「引用解析规则」：显式 registry/bindings、默认 require-match/offline，无 bindings 为 N/A，domain issues 为 failed，transport 为 unavailable。 |
| Markdown 结构与链接分工 | markdown-lint「规则 catalog」八项默认规则，link-fragments 显式选用；markdown-link-validation「识别的引用」「执行阶段、计费与首错」只检查本地目标/heading、不检网络可达性。两者默认 non-blocking；链接 targetReadCount 是 logical occurrences，不是 syscall 数。 |
| 维护提醒与 secret coverage | maintenance-reminders「工作原理」「效果与结果」：committed first-parent history，严格超过阈值才 due；advisory 与 enforcing 对 due/entry unavailable 解释不同。secret-detection「参数与默认配置」「效果与结果」：必须完整 files，PEM 私钥单规则，actionable findings 或 coverage gaps 失败，非全面 credential 扫描。 |
| 读取 final data、Records 与 parser | 九篇「效果与结果」及各 final-data / records 声明：先窄化 outcome，再使用返回 Check.parseData 或对应 parseXData；N/A/unavailable 无正常 final data。JSON Schema issue Records 最多 100，其他计数按 owning Check 定义；Run completed 不等于通过。 |
| waiver 对账与审计 | finding-waivers「identity 与 audit」「随包 Check 的采用边界」：0/1/>1 匹配为 unused/applied/overmatched；仅唯一匹配豁免，不删除证据。每篇 Check 规定 identity；Markdown lint 无 selected paths 不对账，其余四项可在 N/A 发布 unused audit。secret coverage gap 和 unavailable 不可豁免，reason 会公开。 |
| 选择范围和默认排除 | collecting-project-files「共享的 files 选择语义」「磁盘来源与访问范围」：完整 micromatch 列表、后续正规则可重包含、默认排除是最终独立层，只有 false 关闭；纯磁盘普通文件、no-follow、不读 ignore/Git。空数组与访问失败区分；结果冻结、去重排序，非原子快照。 |
| 区域索引与 change flag 调试 | file-region-index「来源与文件域」「只读双向结果」「追加与隔离」：members 将实际成员加入文件域，patterns 对已提供域计算；追加返回新视图。debugging-change-flags「报告与双向查询」「解释边界」：当前选中全集保留零命中，undefined 与 [] 不同；不是真实 Git delta 或 Check 覆盖证明，formatter 无自动 I/O。 |
| 有界呈现、失败与安全 | presenting-findings「输入与投影」：前 limit 项及独立 overflow summary，limit 0 非空仍 summary，messages 冻结，不决定 outcome。九篇失败/I/O 章节分别交代 closed reason、缓存、外部命令、网络授权、取消/部分证据边界；不把所有 Check 的 unavailable 或 waiver 行为统一化。 |

## 发现及处理

| ID | 影响、位置与最小建议 | 当前处理 |
| --- | --- | --- |
| C1 | function-metrics/options.ts 的 codeLines.maximum 称超过该值就产生 Finding，忽略 lowComplexityAllowance；file-metrics/options.ts 的类似措辞也可能把常规值误作最终值。改为「常规上限，按 allowance 后有效上限严格超限」。 | 最终包完整重读通过，关闭。 |
| C2 | 必要 public/supporting JSDoc 存在英文独占说明：check-authoring 三字段；function-metrics/records 的 complexityContributors；secret-detection/records 的三分支；secret-detection/classification 的 coverage-gap reason；local-cache-options 的公开使用辅助类型。依据文档 owner 的中文主叙述规则，只改这些，不机械翻译私有 helpers。 | 最终包完整重读通过，关闭。 |
| C3 | secret-finding location 的行列单位、end 边界和 ordinal 范围缺失，consumer 无法可靠高亮与理解 identity。补一基 UTF-16、end-exclusive、解码后 detector text（BOM 剥离）及每文件一基 ordinal；不得根据惯例猜测。 | 已用固定依赖源码及 synthetic smoke 证明；最终包 Record JSDoc 与 guide 完整重读且实际执行复核通过，关闭。 |
| C4 | functionMetrics 的 Worker 宿主前提未在指南说明，analysis-failed 恢复建议只有检查 source。实际 --input-type=module stdin 启动影响继承同参数的 Worker；普通 .mjs consumer 成功。建议补 Worker 权限/启动条件及失败归属，不改产品行为。 | 最终指南已补 Worker 权限、文件型 Worker 的 Node 参数要求、analysis-failed 恢复项及不回退边界；完整重读通过，关闭。 |

## 真实性证据

- CodeGraph 读取 public root 确认哪些声明为公开或必要 supporting；execution、measurement model、Worker transport、schema engine 等 incidental private 声明仍已读，但不因物理发布扩大 public API 或中文整改范围。
- `src/package-checks/file-metrics/records.ts` 的 effectiveFileRecordPolicy / fileCodeLineMaximum 与 `function-metrics/records.ts` 的 codeLinesMetricEvaluation / functionCodeLineMaximum 证明有效阈值、重叠严格值与 blocking 解释。
- 三个 metrics execution 的完整源码核对 exact selection、reconciliation 前置、N/A unused audit、失败 reason、完整 Records 和 final counts；functionMetrics 先发布 rejection，analysis 不完整时保留 rejection 而不发布 metric prefix。
- JSON 与 Schema 的 execution 入口/阶段、Markdown lint 的 executeResolvedMarkdownLint / publishMarkdownLintTraversal、Markdown link 的 executeMarkdownLinkValidation、secret 的 settleSecretDetectionFindings、maintenance 的 executeMaintenanceReminders 核对状态与数据语义。
- `src/package-tools/finding-waivers/reconciliation.ts` 的 reconcileFindingWaivers 核对 canonical identity、每配置匹配计数与原 finding 引用；finding-presentation 的完整实现核对 limit 0、overflow、冻结及不改结算。
- owner 核验使用 `docs/development/project-files.md`、`docs/development/scanner-dependencies.md` 的相应机制章节；消费者结论仍以随包指南为入口。
- secret 坐标证据来自实际安装的 `@secretlint/secretlint-rule-privatekey@13.0.5`（JS match.index / match.length）、`@secretlint/core@13.0.5`（rangeToLocation / 结果排序）及 `structured-source`（JS string index 减行首），再经产品 adapter 的 column +1。只读取本地依赖，未联网。

## 实际包定向执行

1. Node public API smoke 在 `.tmp/review-checks-4uZTrS` 内使用 source.ts、缺失链接 Markdown、重复键 JSON、简单 Schema/instance、NUL 文件和非真实 PEM synthetic text。所有 Run-owned outputs 关闭，外部 metrics 给空 selection，duplicate cache 关闭；临时目录已由 finally 精确清理。
2. 结果：duplicate/file 为 no-eligible-input；JSON duplicate-key failed；Schema keyword type failed；maintenance [] passed；Markdown lint/link 默认 policy 为 passed 且各保留一条 Finding；secret 为 2 findings + 1 coverage gap 的 failed。六个正常结果通过对应 check.parseData。
3. secret synthetic 第一条前置 emoji：start=(1,3)，end=(3,26)，证明 UTF-16 与 end-exclusive；第二条 ordinal=2。输出仅安全 Records/计数，不输出 detector 文本或真实秘密。
4. functionMetrics 首次通过 stdin `--input-type=module` 启动收到 analysis-failed；随后普通 .mjs public consumer 在 `.tmp/review-checks-function-3pd1oi` 成功：parameter-count value=7、limit=6、findingCount=1、blockingFindingCount=0、passed，parser 成功。该临时目录已清理。
5. collector 完整正/负列表的重包含、debug 零命中 [] / 未知 undefined 与冻结报告、waiver 的 applied=1 / overmatched=2 / unused=0 均与指南一致。

这些是定向实际包语义证据，不是全量 Check 测试、全 Gate 或 release 验收；未运行外部 SCC/jscpd 完整扫描、远端 HTTPS、恶意文件系统竞态、全语言 analyzer 或所有取消故障矩阵。未添加永久测试，未暂存/提交/发布。

## 完整已读页面

以下路径均相对上述初审安装包；hash 绑定 inventory 的 checks entries。

1. `docs/checks/duplicate-detection.md`（264 行，完整）。
2. `docs/checks/file-metrics.md`（248 行，完整）。
3. `docs/checks/function-metrics.md`（231 行，完整）。
4. `docs/checks/json-schema-validation.md`（236 行，完整）。
5. `docs/checks/json-validation.md`（168 行，完整）。
6. `docs/checks/maintenance-reminders.md`（191 行，完整）。
7. `docs/checks/markdown-link-validation.md`（288 行，完整）。
8. `docs/checks/markdown-lint.md`（169 行，完整）。
9. `docs/checks/secret-detection.md`（152 行，完整）。
10. `docs/guides/collecting-project-files.md`（85 行，完整）。
11. `docs/guides/debugging-change-flags.md`（98 行，完整）。
12. `docs/guides/file-region-index.md`（103 行，完整）。
13. `docs/guides/finding-waivers.md`（145 行，完整）。
14. `docs/guides/presenting-findings.md`（54 行，完整）。

## 完整已读声明

以下 69 项均完整读取；import/re-export 闭包中的私有类型只承接阅读覆盖，不形成额外公共承诺。

1. `types/data-boundary/project-file-region-index.d.ts`（70 行，完整）。
2. `types/package-checks/check-authoring.d.ts`（45 行，完整）。
3. `types/package-checks/code-quality-findings/finding-waiver-evidence.d.ts`（34 行，完整）。
4. `types/package-checks/code-quality-findings/policy.d.ts`（24 行，完整）。
5. `types/package-checks/duplicate-detection/constructor.d.ts`（14 行，完整）。
6. `types/package-checks/duplicate-detection/execution.d.ts`（11 行，完整）。
7. `types/package-checks/duplicate-detection/final-data.d.ts`（5 行，完整）。
8. `types/package-checks/duplicate-detection/measurement-model.d.ts`（29 行，完整）。
9. `types/package-checks/duplicate-detection/options.d.ts`（83 行，完整）。
10. `types/package-checks/duplicate-detection/records.d.ts`（39 行，完整）。
11. `types/package-checks/file-metrics/constructor.d.ts`（14 行，完整）。
12. `types/package-checks/file-metrics/execution.d.ts`（11 行，完整）。
13. `types/package-checks/file-metrics/final-data.d.ts`（5 行，完整）。
14. `types/package-checks/file-metrics/measurement-model.d.ts`（12 行，完整）。
15. `types/package-checks/file-metrics/options.d.ts`（76 行，完整）。
16. `types/package-checks/file-metrics/records.d.ts`（39 行，完整）。
17. `types/package-checks/function-metrics/analysis.d.ts`（10 行，完整）。
18. `types/package-checks/function-metrics/analyzer-adapter.d.ts`（26 行，完整）。
19. `types/package-checks/function-metrics/analyzer-worker-contract.d.ts`（5 行，完整）。
20. `types/package-checks/function-metrics/analyzer-worker-port.d.ts`（24 行，完整）。
21. `types/package-checks/function-metrics/constructor.d.ts`（14 行，完整）。
22. `types/package-checks/function-metrics/execution.d.ts`（10 行，完整）。
23. `types/package-checks/function-metrics/final-data.d.ts`（5 行，完整）。
24. `types/package-checks/function-metrics/measurement-model.d.ts`（38 行，完整）。
25. `types/package-checks/function-metrics/measurement.d.ts`（43 行，完整）。
26. `types/package-checks/function-metrics/options.d.ts`（90 行，完整）。
27. `types/package-checks/function-metrics/records.d.ts`（56 行，完整）。
28. `types/package-checks/json-document/strict-document.d.ts`（35 行，完整）。
29. `types/package-checks/json-schema-validation/constructor.d.ts`（14 行，完整）。
30. `types/package-checks/json-schema-validation/final-data.d.ts`（23 行，完整）。
31. `types/package-checks/json-schema-validation/json-schema-validation.d.ts`（42 行，完整）。
32. `types/package-checks/json-schema-validation/options.d.ts`（93 行，完整）。
33. `types/package-checks/json-schema-validation/schema-engine.d.ts`（33 行，完整）。
34. `types/package-checks/json-validation/constructor.d.ts`（14 行，完整）。
35. `types/package-checks/json-validation/final-data.d.ts`（15 行，完整）。
36. `types/package-checks/json-validation/json-validation.d.ts`（28 行，完整）。
37. `types/package-checks/json-validation/options.d.ts`（14 行，完整）。
38. `types/package-checks/local-cache-options.d.ts`（9 行，完整）。
39. `types/package-checks/maintenance-reminders/final-data.d.ts`（65 行，完整）。
40. `types/package-checks/maintenance-reminders/maintenance-reminders.d.ts`（120 行，完整）。
41. `types/package-checks/markdown-link-validation/constructor.d.ts`（43 行，完整）。
42. `types/package-checks/markdown-link-validation/execution.d.ts`（10 行，完整）。
43. `types/package-checks/markdown-link-validation/final-data.d.ts`（15 行，完整）。
44. `types/package-checks/markdown-link-validation/local-resolution.d.ts`（106 行，完整）。
45. `types/package-checks/markdown-link-validation/local-resolver.d.ts`（6 行，完整）。
46. `types/package-checks/markdown-link-validation/markdown-parser.d.ts`（37 行，完整）。
47. `types/package-checks/markdown-link-validation/options.d.ts`（63 行，完整）。
48. `types/package-checks/markdown-link-validation/records.d.ts`（41 行，完整）。
49. `types/package-checks/markdown-link-validation/unavailable-reasons.d.ts`（4 行，完整）。
50. `types/package-checks/markdown-lint/adapter.d.ts`（12 行，完整）。
51. `types/package-checks/markdown-lint/constructor.d.ts`（38 行，完整）。
52. `types/package-checks/markdown-lint/execution.d.ts`（24 行，完整）。
53. `types/package-checks/markdown-lint/final-data.d.ts`（8 行，完整）。
54. `types/package-checks/markdown-lint/options.d.ts`（68 行，完整）。
55. `types/package-checks/markdown-lint/records.d.ts`（39 行，完整）。
56. `types/package-checks/markdown-lint/unavailable-reasons.d.ts`（3 行，完整）。
57. `types/package-checks/project-files/configuration.d.ts`（32 行，完整）。
58. `types/package-checks/project-files/public-collection.d.ts`（18 行，完整）。
59. `types/package-checks/secret-detection/classification.d.ts`（12 行，完整）。
60. `types/package-checks/secret-detection/constructor.d.ts`（16 行，完整）。
61. `types/package-checks/secret-detection/execution.d.ts`（14 行，完整）。
62. `types/package-checks/secret-detection/final-data.d.ts`（15 行，完整）。
63. `types/package-checks/secret-detection/input-preparation.d.ts`（24 行，完整）。
64. `types/package-checks/secret-detection/options.d.ts`（33 行，完整）。
65. `types/package-checks/secret-detection/records.d.ts`（35 行，完整）。
66. `types/package-checks/secret-detection/secretlint/adapter.d.ts`（28 行，完整）。
67. `types/package-tools/change-flag-debugging/change-flag-debugging.d.ts`（90 行，完整）。
68. `types/package-tools/finding-presentation/finding-presentation.d.ts`（34 行，完整）。
69. `types/package-tools/finding-waivers/reconciliation.d.ts`（66 行，完整）。

## 首轮最终候选复核

Manual CR: 首轮最终复核通过，审查者仍为 /root/review_checks_full，2026-11-02。

- 最终版本：`0.0.0-local.3c1b2bcfd236`；安装目录同上，source commit 未变。
- 最终 tarball：`/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.3c1b2bcfd236.tgz`。
- 独立 sha256sum：`f67a014c7bb0292812150a8b153c67514c5e4ad5d1fcd0b9fd6839e6bda4575e`，首轮复核时与 inventory.finalCandidate 一致；该候选身份现保存在 inventory.expressionReview.baselineCandidate。
- 首轮独立逐文件 hash 核对本分区全部 83 项：74 项与已完整读取的初始 bytes 相同；9 项变化，与当时 inventory.finalComparison 的 final hashes 一致，无范围增减。
- 已完整重读这 9 项：function-metrics / secret-detection 两篇指南；check-authoring、file-metrics/options、function-metrics/options、function-metrics/records、local-cache-options、secret-detection/classification、secret-detection/records 七个声明。不是仅看修订行。
- 独立检查本分区七个源码文件的 Git diff，全部为 JSDoc 修改；最终包相应 src bytes 与工作区一致，未引入 API signature 或行为更改。其它分区源码的机械证据由主代理拥有，本报告不扩张为全仓源码审查。
- 最终实际包从普通 .mjs consumer 在 `.tmp/review-checks-final-lByGOF` 运行：70 条低复杂度语句的函数未因普通 60 NLOC 上限误报；唯一函数 Finding 为另一个函数的 7 > 6 parameter-count，默认 non-blocking passed。secret synthetic text 前置 BOM + emoji，start=(1,3)、end=(3,26)、ordinal=1，证实 BOM 不计入、UTF-16 一基/end-exclusive 与最终正文一致。两项正常 final data 均通过 parser。临时目录已清理，Run-owned outputs 全关闭。
- 本报告自身检查 LF、单个 trailing LF、无行末空白与清单计数；未运行全 Gate 或发布验证。
- 初始 tarball 已由主代理通过公开候选重建生命周期替换，本文保留当时实测 hash、完整阅读与初审 smoke；本节最终 tarball 是首轮交接对象，不要求恢复 disposable 初始产物。

候选版本不是正式 0.0.5 发布。本节记录首轮材料结论；最新候选及表达/组织复审结论见下节。后续正式 tarball 仍须确认与已审材料一致，并完成同包正式验收。

## 第二遍表达与组织复审及本轮最终候选

Manual CR: /root/review_checks_full；2026-11-02；第二遍全量表达/组织审阅与本轮最终差异复核通过，四组发现已关闭，无新增正确使用阻塞。审查使用 `ai-ready-docs`，重点为主承诺与重心、负向表述、迁移残留、篇幅和 Markdown 组织；不是重跑首轮 C1–C4。

### 覆盖与包身份

- 第二遍基线为 `0.0.0-local.3c1b2bcfd236`。已重新完整读取上方逐项清单的全部 **14 篇页面、69 个声明**，并独立核对 83 项 hash；没有用首轮通过结论、grep 命中或 diff 抽样替代本轮阅读。声明闭包中的私有内容只承接覆盖，不扩大公共 API 或中文整改范围。
- 本轮最终版本为 `0.0.0-local.eda819f36295`；source commit 仍为 `7c9c69e609a5d095e2c459923b321cb4925f0713`；实际读取目录为 `/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check`。
- 最终 tarball 为 `/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.eda819f36295.tgz`；独立 `sha256sum` 为 `b862e48cd41a55faecd0be11d20871328551d7ef72660cc0b3d6d2f2007acb08`，与 inventory.finalCandidate 一致。
- 独立逐文件核对最终本分区全部 83 项，均匹配 inventory：79 项与第二遍完整读取的基线相同，4 项变化。最终四项均已**全文**复核，不只读取修改行：

| 最终变化材料（相对实际包） | 完整读取范围 | SHA-256 |
| --- | --- | --- |
| `docs/checks/file-metrics.md` | 248 行 | `7bbe3bed3da09a84d8d293911d57b2ce443437932a4c77a557bf300ad3e967e9` |
| `docs/checks/markdown-link-validation.md` | 288 行 | `c984e9e2cd77cf2e195cc7c92a7f81a0fa719969b1a6fd8bd6f2c3f5bbc8e4de` |
| `docs/checks/markdown-lint.md` | 169 行 | `11266630bcfa6ccaa7a53b465d83cd1c4e434935cf11ca311965b18bad7a2259` |
| `types/package-checks/check-authoring.d.ts` | 45 行 | `7060618d625b4fb8920f0b2a6246265f36a28ee19a8e320ad714082c6843aaae` |

### 发现闭合与关联阅读任务

| 发现 | 最终处理与使用者复核 |
| --- | --- |
| E1：项目声明总注释仍称“固定身份”，与 `checkId` override 不协调。 | 已删除“固定身份”。完整声明及最终 API 机制的构造器项目声明章节均可恢复：省略时用默认 ID，显式 ID 用于实例身份，项目字段不进入领域 options。关闭。 |
| E2：Markdown lint 的“原有终态”“继续 N/A”“保持既有输出”依赖未说明的历史基线。 | 改为当前 `unavailable` 契约链接、直接说明空 selection 返回 `not-applicable`，删除重复的历史输出句。重新演练缓存不可用、空 selection 与全 rejected 三种阅读任务，仍能区分重新计算、whole-Check unavailable 和正常无 lint 输入；waiver 对账、计数和安全边界未丢失。关闭。 |
| E3：fileMetrics 使用主线展开私有 Windows argv 分批细节，并含重复措辞。 | 已精简为一次逻辑扫描、内部精确路径批次及全量验收后统一发布；删除重复 execution 字样，并简化有效上限表格排版。使用者仍能从本页配置 SCC、理解 allowance 与重叠区域最严格上限、判断失败时无部分 measurement；不必先理解私有 argv 预算。内部细节已由 scanner owner 保留。关闭。 |
| E4：Markdown link 在定义受支持引用之前先展开计费、首错和取消。 | “识别的引用”已前移到工作原理的执行细节之前，正文语义完整保留。先判断本地链接、anchor 与不检查的引用，再读取 logical occurrence 计费、首错及完整发布边界，阅读顺序可恢复。关闭。 |

关联复核还全文读取了最终包 API 机制的“随包 Check 的构造器项目声明”和“RunControls 与 Check aggregation”两节，确认当前引用能解释自定义 ID、项目字段分流和 `completed` 不等于通过。本项仅为 checks 阅读任务的依赖核对，不扩张为 core 分区复审。

### 保留判断

- 保留 secret 的检测范围、敏感材料隔离和文件系统竞态边界；这些否定说明承担独立安全职责，不应为减少负向句式而删除。
- 保留 waiver 不可豁免范围、完整结果前不审计，以及空结果与 unavailable 的区分；这些限制防止把缺乏证据当成通过。
- 保留文件收集指南末尾明确标记的迁移链接：它把升级任务导向 changelog，并非旧配置继续参与当前规则。
- 保留 functionMetrics 的语言特定计量与函数边界，它们解释当前结果，不是退场方案。其分项组织可继续微调，但不影响正确使用，不要求本轮扩大修改。
- 独立 Check 指南中的最小用法、结果读取与共同规则摘要服务直接进入该页的读者；不为消除表面重复而移除必要上下文。

### 证据与限制

- 已检查上述三篇指南及 `src/package-checks/check-authoring.ts` 的局部 Git diff；本分区源码仅改 JSDoc，没有 API signature 或行为改动。三篇指南与该源码的实际安装包 bytes 均与工作区一致。
- 第二遍基线 14 页的 LF、单个 trailing LF 和行末空白检查通过；最终变化材料和本文的同项检查通过。标题移动没有更名，Markdown lint 新增的同页链接指向已全文读取的当前不可用章节。
- 本轮以阅读任务和材料身份提供语义证据，未重跑功能 smoke、外部 SCC/jscpd、链接工具、示例执行、全 Gate 或正式发布验收；机械验证由主代理单独汇总。首轮实际执行证据仍保留其原候选身份，不冒充本轮运行结果。
- 本轮只更新本文，没有编辑用户文档、源码、inventory 或其它报告，没有暂存、提交或发布。当前结论绑定本分区最终候选材料，不等于全包或正式 `0.0.5` 发布验收。
