# 0.0.5 正式包独立文档确认

Manual CR: **通过，无文档发布阻断。** 独立非实施审查者：`/root/release_docs_confirm`；日期：2026-11-02（UTC）。
结论绑定下列正式 tarball：此前全包消费者阅读与表达复审可以复用，全部后续材料差异及关联阅读路径已闭合。
这不是重新逐篇、逐声明阅读全部 175 项的声明，也不表示已经发布。

## 正式包身份

| 项目 | 独立核对结果 |
| --- | --- |
| Package | `@zxyycom/vibe-check@0.0.5`；receipt tag 为 `latest` |
| 冻结提交 S | `a2737ff47b457e178f32fa1d89b435067c39ddf1`；核对时 frozen 工作区干净 |
| Input fingerprint | `1289550d018c7e720bfc5271c7505b0bc5ea1a49c7502362cb298c224648a9ec`（receipt 值；其构建重算由正式 verifier 负责） |
| Tarball | `/workspace/vibe-check-release-0-0-5-frozen/build/artifacts/zxyycom-vibe-check-0.0.5.tgz`；1,534,498 bytes |
| Tarball SHA-256 | `35578f8abf829dfd934544bf45cbaaaa885e7ce3c45b8a93c64e013e229c5c9f` |
| Receipt | `/workspace/vibe-check-release-0-0-5-frozen/build/releases/zxyycom-vibe-check-0.0.5.release.json` |
| Receipt SHA-256 | `16b33c49c840a1315acbcfbc76c7f2d509032f0400ef6c526a97a52e0e1b025d` |
| 实际阅读目录 | `/workspace/vibe-check-release-0-0-5/.cache/release-docs-confirm/formal/package`，从上述 tarball 独立解包 |

独立重算 tarball SHA-256、SHA-512 SRI 与 receipt SHA-256，全部吻合；SRI 保存于[逐项清单](review-final-inventory.json)。
实际 tar 的 1,559 项文件集合、排序后的清单与 receipt 完全一致，所有文件与 frozen staging 逐字相同。
Receipt 的 `files` 是 canonical 排序清单，不是 tar 物理头顺序；已通过当前 `isClosedFileInventory` owner 实现核实此区别。

## 阅读结论如何覆盖完整范围

从 Git 历史只读取得以下材料，没有恢复已经结项的 Change 目录。报告原有全文阅读、发现关闭及各次运行的包身份保持不变；
本次只将其在一致性证明成立的范围内重新绑定到正式包。各历史文件自身摘要保存在逐项清单。

| 审查链 | 已读取的证据及原有覆盖 |
| --- | --- |
| `fd930556:changes/prepare-0-0-5-documentation/` | `evidence.md`、`review-inventory.json`、`review-core.md`、`review-checks.md`、`review-tools.md` 全文。三位独立审查者合计 31 篇页面、139 个声明、5 个机器材料；第二遍再次全读页面与声明，并独立复核最终修正。最终候选为 `0.0.0-local.eda819f36295`。 |
| `90217c36:changes/rework-project-gate-guide/` | `review.md`、`review-ai-ready.md`、`review-design.md`、`review-design-ai-ready.md` 全文。覆盖指南重写、真实 JSON 入口、专题示例迁移、设计任务与最终表达收尾；各份记录保留其原候选身份。 |
| 本轮正式包确认 | 比较全部实际文件与材料摘要；重读 README 和最终主指南全文、changelog 的 0.0.5 章节，阅读其它后续差异及其关联片段；独立闭合 manifest、公开声明、导航和最低 Node 入口行为。 |

完整清单不是从本版本 diff 推定：

- 当前注册映射、正式包实际 README / `docs/**/*.md` 和原审清单均为同一 **31 篇**；5 个非 Markdown 机器材料的集合也完全相等。
- 以原 inventory 的初始摘要为基线，再用 `finalComparison.changedItems.finalSha256` 覆盖修正项；同时核对 `expressionReview` 与分区最终复核。
  正式包的 **21 篇页面、139 个声明、5 个机器材料，共 165 项**与该最终已审内容逐字相同。
- 其余 **10 篇页面**为下节的九篇后续指南/入口材料和一篇正式 changelog；没有遗漏或新增材料。未变材料复用原有完整阅读，不冒称本轮再次全文阅读。
- 从正式包 `types/index.d.ts` 用 TypeScript AST 重新建立本地 import/export/import-type 闭包：**139 文件、392 条唯一 file/specifier 引用边**，与旧清单相等，未解析引用、遗漏和额外项均为零。
  本轮计数亦保留 446 次引用 occurrence；它与去重后的 392 条边不是范围差异。外部声明模块只有 `ajv`、`immutable`。
- TypeScript checker 得到 **227 个 root 导出、49 个 value**；导出名与旧清单一致，直接加载正式包 root 得到相同的 49 个 runtime exports。
  Manifest 仍只导出 `.`，没有 `bin` 或新 subpath；随包内部声明不会因此成为额外公开 API。
- 正式包全部 **381 个 `src/**` 文件**逐字匹配 `fd930556`。该提交到 S 的 Product 源码、根 manifest、lockfile、package 文档映射、public inventory 和 package 构建实现均无 diff。
  因此不只验证文档 bytes，也核对了相关执行、类型、依赖与构建行为输入没有漂移。

## 后续差异与消费者路径

最新候选 `0.0.0-local.32eb3753d730` 仍可取得；独立重算其 tarball SHA-256 为
`138e0960747054908b85c29f411ee67310799043f54a4e4a828f0ebbef8fb45c`（1,534,428 bytes）。
正式包与该候选的 1,559 个文件集合相同；其中 **1,557 个文件逐字不变**，仅 `package.json` 和 `docs/changelog.md` 不同。

| 后续变化材料 | 独立确认与使用任务判断 |
| --- | --- |
| README | 两处主指南路由及严格出口锚点随重写更新；已重读正式全文。安装要求与 manifest 的 Node `>=24.18` 一致，包根程序化 API、无 CLI、Check 直链和升级入口清楚。 |
| `building-project-gate.md` | 正式全文 208 行已读；摘要与最后表达复审一致。主线从质量证据、独立判决、执行图到入口/CI，再到成本与失败对照；固定演示不冒充真实构建或性能证明。 |
| `command-check.md` | 正式摘要匹配最后表达复审；本轮读取完成阶段、迁入的两类诊断示例、独立运行尾部、默认终态/安全边界和已有命令接入。非零退出解释、完整结果资格、先验证整组再报告、敏感字段筛选与仅 Definition 的补入口规则均成立。 |
| `check-dependencies.md` | 摘要匹配设计复审最终版本；本轮复核共享准备与终态观察的完整新增段落及读取契约锚点。provider 成功不替代消费者判决，大小失败不阻断独立消费者，准备失败阻断下游，observes 不挽回失败、不传播选择。 |
| `extending-check-lifecycle.md` | 摘要匹配设计复审；新增任务选择片段自带入口，未选项不参加有效列表，未知任务由项目拒绝，`propagateDependsOn` 的授权范围明确；没有要求重复追加入口。 |
| `selecting-checks-by-git-changes.md` | 摘要匹配设计复审；完整新增片段说明真实输入、shared/lockfile、scratch 排除与 Schema 前提，明确 HEAD 与 PR 基准的区别；不可用 evidence 的保守选择和链接反向依赖边界保留。 |
| `cache-results.md` | 摘要匹配设计复审；新增段落缓存测量而非通过结论，key 绑定同一份源 bytes、实现/工具版本及参数，当前阈值每次判决；损坏缓存与失败不被当成通过。 |
| `scheduling.md` | 摘要匹配设计复审；新增并发段落区分总槽位、named resource 与 mutex，轻任务不占 runner claim；逻辑 units 不冒充 CPU 或性能承诺。原高级说明 bytes 未变，沿用全包审查。 |
| `run-outputs.md` | 相对全包已审版本只有一个链接目标替换为主指南“建立项目入口”；本轮直接复核该 diff 及目标，严格接受 completed + passed、output 仍可能失败的规则未变。 |
| `docs/changelog.md` | 相对最新候选只增加 4 行：三行指南说明（含空行）及一行提交追溯。0.0.5 章节已读，与正式版本一致；内容准确概括质量证据/独立判决/执行图/本地与 CI/成本和专题示例。`7df97a9e` 确为指南与接入示例提交，不误报新增 API、加速收益或发布成功。 |

Manifest 相对最新候选只把 `version` 改为 `0.0.5`；exports、engine、dependencies、许可证和 publishConfig 不变。
本轮还对正式包全部 31 篇 Markdown 解析并核对 **313 个本地引用**：目标文件及 Markdown heading 均存在，README 对其余 30 篇的直链无遗漏。
这是本地阅读路径机械证据，不冒充远端 URL 可达性检查。

## 正式包实际入口演练

使用项目已配置的 **Node 24.18.0**，从正式包主指南直接提取第一个 TypeScript fence，代码不改写。
自有 fixture 的 package-root import 解析到上述正式解包目录的 `index.mjs`；仅复用实现工作区已有依赖，没有联网或另装依赖。

| 对照 | 实际结果 |
| --- | --- |
| 合法 `config/app.json` | Check passed，退出 0。 |
| 非法 `{"name": }` | Check failed，退出 1；Record 为 `config/app.json / invalid-json`。 |
| 从无输入的另一个 cwd 启动 | `not-applicable / no-eligible-input`，退出 1，未把空输入当成成功。 |
| 仅 import 入口 | 退出 0，无 Gate 输出；只打印解析后的正式 package root。 |

Fixture 中没有生成 machine 或 diagnostic 文件。结果保存在缓存的 `consumer-smoke-results.json`，并完整收入逐项清单。
这是正式包的定向消费者演练，不是第二次隔离安装验收；既有指南审查的其它对照仍标明原候选，不冒称全部在正式包重跑。

## 验证边界与留存

- 本次结论遵循文档 owner 的独立消费者方法和发布 owner 的正式包复用规则；语言、精确边界、导航与真实使用均已核对，没有以机械 Gate 替代语义审查。
- 未重复运行完整 Gate、consumer types、所有 Check 矩阵、远端 CI、联网安装或 benchmark。
  主线程另报告同 S / receipt 的第二轮正式 verify 通过，日志为
  `/workspace/vibe-check-release-0-0-5-frozen/.log/project-gate/2026-11-02T09-29-04.109Z-40071-6b13158f-c40d-494d-a1b3-d3d5e66739bb`；
  其首次冷运行、复验条件、性能结果及归档由主线程 current evidence 拥有，不是本审查者重复执行或独立审计的结论。
- 本轮不重新证明所有平台、版本、故障注入和性能；未查询 registry、publisher authority，也未 publish/tag/commit/push。
  正式发布及 Git 交接仍须按 owner 和实际授权分别完成。
- `file-lifecycle-hygiene`：本轮辅助物约于 2026-11-02T09:28Z 起形成，2026-11-02T09:36Z 完成状态确认：
  `/workspace/vibe-check-release-0-0-5/.cache/release-docs-confirm/`。其中 `formal/`、`latest-candidate/` 是可重建的解包副本，
  `consumer-smoke/` 是只含合成输入与提取示例的演练目录，`consumer-smoke-results.json` 是原始结果；暂留供本次发布审计。
  正式交接材料为本报告和逐项清单，不依赖这些缓存长期存在；发布证据归档核对后，可在获得清理授权时精确删除该缓存目录。
- 本代理仅写上述缓存及本报告、`review-final-inventory.json`，未修改 frozen、稳定文档、Product 或主线程其它 Change 文件。
  若 source、依赖、包内材料或正式 tarball 再变化，本结论不可自动沿用，须按发布流程重新绑定。
