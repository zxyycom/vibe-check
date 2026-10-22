# 全量普查覆盖证明

2026-10-22，当前常规测试 **282 文件 / 766 实体全部审读**，与最新官方集合精确闭合，未审、未知、重复均为 0。本页记录形成时范围和核对方法；行为判断见[总结](summary.md)，逐项候选见各分区报告。它不是另一套 Case 或持久实体清单。

## 常规测试：11 个互斥完整分区

| 分区 | 文件 | 实体 | 完整审读依据 |
| --- | ---: | ---: | --- |
| Project Gate | 15 | 61 | [Gate](gate-review.md) |
| Package artifact / lifecycle / consumer / release | 22 | 41 | [Package](package-review.md) |
| Markdown link | 10 | 36 | [Markdown link](markdown-link-review.md) |
| Repository tooling | 29 | 79 | [Repository](repository-review.md) |
| Package tools / function-metrics 前门 / Markdown lint | 31 | 84 | [Package tools](package-tools-review.md) |
| Function analyzers | 26 | 82 | [Analyzers](analyzers-review.md) |
| Run outputs / progress / diagnostics | 23 | 63 | [Run outputs](run-outputs-review.md) |
| Scheduler / admission provider | 31 | 73 | [Scheduler](scheduler-review.md) |
| 其余 Run / Definition | 40 | 94 | [Run / Definition](run-definition-review.md) |
| Data / JSON / command / settlement / machine | 29 | 76 | [Data / JSON / command](data-json-command-review.md) |
| 其余 scanners / scope | 26 | 77 | [Scanners / scope](scanners-scope-review.md) |
| **总计** | **282** | **766** | **全部正文、矩阵及实际委托材料已读。** |

前三组 47 文件 / 138 实体复用同日完整读审。其输入 SHA 和受保护 tracked diff 均未变化，保持有效；本轮新增八组 235 / 628 的审读证据。分工批次只影响并行安排，交付范围是以上全部，不再留“下一批未审实体”。

## 补充入口与委托材料

下列材料另列，不重复加进 766。阅读范围和语义边界在 Repository / Package 报告中展开。

| 材料 | 实际审读范围 |
| --- | --- |
| 显式 package candidate integration | `scripts/package/candidate/candidate.integration.ts` 全部 6 个测试节点、integration-command 与实际故障注入/fixture。该非日常入口不在常规 runner profile。 |
| Test Evidence ast-grep rule fixtures | 4 份 rule-test YAML，7 valid + 7 invalid，共 14 个输入片段；对应规则与 runner 已读。 |
| Installed runtime / command 验收 | runtime.mjs 全 858 行、command-check-runtime.mjs 全 544 行、runtime-evidence assertions 和委托 child；沿用 Package 全读证据。 |
| Installed 类型与工程类型验收 | 全部 typecheck template contributions、public inventory 正负类型片段，以及 execa type compatibility 文件；读取不等于本轮运行 compiler。 |
| Documentation runtime 示例 | registry 全部 29 个 source、33 个 projection regions，region 外业务断言和 84 行 acceptance support；不只审 wrapper。 |
| Machine example | mixed-outcomes Definition 全 195 行、179 行 example execution 和固定 outcomes/messages/records assertions。 |
| 各组 helper / corpus / fixture | 每组直接委托及必要的传递 helper、参数矩阵、固定 expected、实际内联 child 均纳入该组报告；不把它们另造实体或 Case。 |

额外核对当前仓库的 test/spec/integration 命名候选：profile 外的 integration entry/command 与 Run facts helper 已被上述分区读取；另三份 integration-named Investigation 材料是历史调查，不是当前声明的测试。第三方上游未声明为项目验收的测试、普通 benchmark workload 不扩成当前测试义务。工具校验、类型编译和示例执行的证据性质保持区分，不用 Bun 数量代替这些材料的正文审查。

## 精确闭合方法与结果

本地证据目录为 `/workspace/vibe-check/.log/test-quality-audit/20261022-full-02N0Mb/`，由以下不同事实联合核对：

1. 官方 `test-evidence list --limit 100 --offset 0/100 --root .` 的起点与终点两页内容一致，共 190 Cases，entity keys 去重为 766。
2. 前后 `bun run test-evidence -- check --root .` 都通过：766 static/current 与 766 Bun registration 身份相等、全部映射到 190 Cases / 16 topics。它只注册，不执行正文。
3. `prior-scope.json` 的 138 keys 加八组 `coverage.json.reviewedEntityKeys` 的 628 keys：各组精确等于对应 scope、组内无重复、组间实体与文件均互斥，八组 `unreviewedEntityKeys` 皆空。
4. 审读并集 **766/766** 等于最新官方集合，其路径集合 **282/282** 相等。未知、遗漏、重复全部为 0；全部 282 个当前测试源码 SHA-256 与派发 scope 相等。
5. `check-full-coverage.py` 产生本地 `final-coverage.json`，保留计数、零差异和 hash 结果；不提交完整 keys 或构建新的实体账本。前三组的完整报告与未变输入提供复用依据，不将“scope 中存在”独自等同于“已阅读”。
6. 保护性 binary diff 与审计起点逐字相同（排除本任务拥有的协调页）；既有源码、测试、Case 改动均保留。本地 Gate 预算数据 `.cache/vibe-check/project-gate/performance-baseline.json` 的 SHA-256 仍为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`；这是 ignored 数据文件，不是 `scripts/project/gate/runtime/performance-baseline.ts` 源码的摘要，两者本轮均未更改。

精确并集证明没有遗漏当前实体；逐组正文审读与独立结论复核支撑质量判断。两者均不能证明所有可能回归都被捕获、每个断言都正确或正文当前执行通过。

## 交付检查

全量范围与主要候选已由主代理交叉复核，另由独立代理重新核对集合、哈希、profile 文件、补充材料和关键 source。独立审查发现并纠正 G4 合并条件：除 exact keys，还须保留特殊 runtime lane 的 raw required metadata。最终汇总与 11 份报告的剩余结论未发现阻断问题。

| 实际检查 | 结果与证明边界 |
| --- | --- |
| 前后 Test Evidence 全树 check、最终官方查询与精确并集/hash | 766 实体 / 190 Cases；282 文件 hash 匹配，未知/遗漏/重复为 0；只证明注册身份、映射与输入一致。 |
| `bun run validate` | 通过：496 JSON、5 current schemas、1 current example set、历史 schema/examples、605 Markdown links，以及 layout/tracked whitespace。材料 scope 不包含本 Change 的全部新增报告，不能用这个数字冒领新报告链接验证。 |
| 新增审计 Markdown 的定向检查 | 16 份 Markdown 无 trailing whitespace/缺末尾换行；73 个本地 Markdown 链接目标及其 fragment 均可解析，包含 untracked 报告。另按 ai-ready-docs 核对汇总主承诺、分区阅读路径与事实/建议边界。 |
| `bun run change-plan -- check-all changes --json` | 23/23 valid，无根级或成员错误；当前 Change 保持 plan，不执行 finalize。 |
| `bun run decisions -- check` | 通过现有 Decision checker；本轮未修改 Decision 内容。 |
| 保护性 diff / 本地预算数据 | 与起点一致；仅本 Change 材料和协调入口属于此次审计写入，没有 Git stage/commit。 |

验证日志、精确核对脚本和独立反证均留在上述 ignored 本地目录。人工全读、集合闭合、机械材料检查与正文执行是不同证据，分别按本页范围解释。

本轮没有运行原始全量 Bun 正文、完整 Gate、typecheck、build/install、上游 oracle 或联网验收。只执行了一项隔离复制测试的断言失效反证；其它具体反事实保留静态判断边界。后续清理仍须按实际 owner 跑最窄行为测试、完整 Test Evidence 和范围匹配验收，不以本报告免除实施后验证。
