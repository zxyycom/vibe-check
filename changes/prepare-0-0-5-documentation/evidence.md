# 0.0.5 文档准备与审查证据

Manual CR: 0.0.5 文档准备的完整消费者审查，以及追加的 `ai-ready-docs` 表达与组织复审均通过。结论绑定下列当前本地候选包；不表示正式 release 验收或已经发布。记录日期：2026-11-02（UTC）。

## 授权与实际结果

- 用户最初授权按 0.0.5 收口发布文档、完成全包文档与公开 JSDoc 审查，并要求先不提交、不发布；审查完成后追加“先提交结项”。
- 在 main 保留本轮已有五篇文档修订，changelog 已从临时「未发布」改为 `0.0.5`，相对 v0.0.4 的净变化不变，未写发布成功声明。
- 全量阅读发现的十组问题已修正并独立关闭。新增改动为文档正文与 JSDoc，不改变 API 签名、执行逻辑、依赖或机器 schema。
- 用户追加要求复审重心、负向描述、迁移残留、篇幅与 Markdown 组织；第二遍重新完整阅读全部 31 篇页面与 139 个声明，修订 10 篇页面与 5 个源码 JSDoc 所属文件。
- 审查阶段未执行 Git 写操作。当前结项授权覆盖保存本任务完成态、当前 checkout 已启用的限域 post-commit auto-push，以及通过 finalize 删除本 Change；不覆盖 tag、npm 发布或发布工作区操作。

## 最终候选身份

| 项目 | 实际值 |
| --- | --- |
| 文档目标版本 | `0.0.5` |
| 实际本地候选版本 | `@zxyycom/vibe-check@0.0.0-local.eda819f36295` |
| 来源 | `main`，HEAD `7c9c69e609a5d095e2c459923b321cb4925f0713` 加本轮未提交的文档/JSDoc 修订 |
| tarball | `build/artifacts/zxyycom-vibe-check-0.0.0-local.eda819f36295.tgz` |
| SHA-256 | `b862e48cd41a55faecd0be11d20871328551d7ef72660cc0b3d6d2f2007acb08` |
| 实际查看位置 | `scripts/project/node_modules/@zxyycom/vibe-check` |

初始/当前文件摘要、分区、公开入口及差异保存在 [review-inventory.json](review-inventory.json)；`expressionReview` 另记录第二遍基线与本轮变化。候选由公开 `package:build` 入口生成并离线安装；没有把 local tarball 改名为正式 0.0.5。

初始候选 `0.0.0-local.9e89c50685bb` 完成首轮逐项阅读；首轮修正后的 `0.0.0-local.3c1b2bcfd236` 是第二遍完整阅读基线。正常 rebuild 替换可丢弃的旧产物，历史摘要与阅读结论仍保留在清单及分区记录中，当前候选是交接对象。

## 全部范围与独立结论

以实际包文件、[显式发布映射](../../docs/package-documents.json)、public inventory 和 `types/index.d.ts` 为入口，逐篇阅读全部用户 Markdown、示例，并沿本包类型引用建立保守声明文件闭包。

| 分区 | 独立审查者 | 全文阅读范围 | 最终结论 |
| --- | --- | --- | --- |
| [core](review-core.md) | `/root/review_core_full` | 12 篇页面、41 个声明文件、5 个机器材料 | 首轮及表达复审发现均已关闭；当前 7 项变化全文复核通过。 |
| [checks](review-checks.md) | `/root/review_checks_full` | 14 篇页面、69 个声明文件 | 首轮及表达复审发现均已关闭；当前 4 项变化全文复核通过。 |
| [tools](review-tools.md) | `/root/review_tools_full` | 5 篇页面、29 个声明文件 | 首轮及表达复审发现均已关闭；当前 4 项变化全文复核通过。 |

合计 **31 篇页面、139 个声明文件、5 个机器材料**，包括本版本未修改的内容。各记录保存逐项全文阅读清单、使用任务答案位置、真实性核验及定向实际包执行结果；不是只按 diff 或通过 grep 推定覆盖。

公开面经主代理与 tools 审查者分别核对：TypeScript AST 的本包 import/export/import-type 闭包为 139 个声明文件；独立核验的 392 条本地引用均可解析，无遗漏或额外项。包根 227 个导出符号与 public inventory 一致，其中 49 个 value 与实际运行时导出集合一致，manifest 不另开 subpath。

声明闭包包含必要辅助类型及少量附带内部声明；只对消费者正确使用所需的说明提出公开文档要求，不把全部物理随包源码当成额外 public API。第三方声明、法律原文、历史来源材料不属于本包 authored JSDoc 整改范围。

## 发现与修正

- core：补齐 handoff 读取/声明、Core facts/Record 身份、进度诊断辅助类型的中文说明；删除 configuration 分支中失效的 aggregation selection 表述。
- checks：阐明函数/文件指标按 allowance 后的有效上限结算；补齐必要公开字段与 Record 分支的中文说明；明确 secret location 的一基 UTF-16/end-exclusive/BOM 边界及每文件 ordinal；补足 functionMetrics 的 Worker 宿主条件与 `analysis-failed` 排障路径。
- tools：补齐 scheduler 单调时钟毫秒字段及 null 含义；区分已有缓存 parser 拒绝后的重算与新计算结果 parser 失败的传播。

首轮修正包含 3 篇页面与 13 个声明文件，均已在首轮候选独立复核。加入第二遍后，相对初始清单累计变化为 13 篇页面与 16 个声明，146 项 bytes 未变；全部 175 项在当前 tarball 与实际安装包中均匹配期望摘要。源 Markdown/机器材料与安装包 bytes 一致。

## AI-ready-docs 表达与组织复审

| 关注点 | 实际处理 |
| --- | --- |
| 重心与阅读顺序 | 自定义 Check 先说明 context、prepare、execute 与取消，再展开 flags/quiet-pass；链接检查先说明识别对象；共同测量规则移到独立小节，在线与终态入口都可到达。 |
| 局部说明与责任 | `createAdmissionGraph` JSDoc 改为模拟任务与下一步；缓存 Options 说明从错误的辅助类型移到正确接口；明确 command parser 由 consumer 显式调用。 |
| 负向与重复描述 | 合并数据工具重复说明，将 command 结尾改为调用方接入责任；机器契约只摘要人读输出边界并引用其 owner。安全、权限、失败与精确规格的否定条款保留。 |
| 迁移残留 | 去掉“固定身份”“原有终态”“没有新增”等模糊历史指代，统一 terminal effect 术语；changelog 历史版本与文件收集迁移入口保留。 |
| 篇幅与 Markdown | 精简 SCC 私有分批细节，调整章节层级、中文小标题与表格，给长 changelog 增加版本导航。Gate 场景的完整可运行示例保留，不单按行数拆页或删规格。 |

本轮变化为 10 篇页面与 5 个声明，160 项材料与第二遍阅读基线 bytes 相同；代码示例与机器材料未改变。
三组独立审查者已分别全文复核最终变化材料、重演关联阅读任务并核对包摘要，均通过；详见上方分区报告。

## 机械验证与运行证据

| 实际检查 | 结果与证明边界 |
| --- | --- |
| `bun run package:build` | 最终候选构建、audit 与离线安装成功；不等于正式发布验收。 |
| `mise exec -- bun test scripts/package/candidate/external-consumer/documentation.test.ts scripts/package/candidate/external-consumer/type-acceptance.test.ts` | 最终候选 4 tests 通过；使用项目配置的 Node 24.18.0，覆盖真实安装后的文档示例与公开类型。 |
| `bun run docs:api` | checked-in Markdown/JSDoc 受管示例投影一致，无需写入投影。 |
| `bun run check` | 当前候选默认 fast 通过：11 项选中检查通过、32 项未选择；覆盖 Markdown lint/links、材料链接、format、Product/scripts typecheck/lint、selection tests 与 whitespace，不是完整 Gate。 |
| `bun run validate -- materials links` | 638 个 Markdown 文件的链接检查通过；最后的新增链接另由上述 fast Gate 覆盖。 |
| `bun run validate -- materials schema` | 首轮 5 个 schema 严格编译通过；本轮 schema bytes 未变，未重跑。 |
| `bun run validate -- materials examples` | 首轮 1 套 current machine 示例及命令包含的 4 个历史 report 示例通过；本轮机器示例 bytes 未变，未重跑。 |
| TypeScript AST 去注释比较 | 当前累计 16 个修改源码文件与 HEAD 的非注释 AST 相等；主代理核对，分区报告另注明独立检查范围。 |
| `git diff --check` 与完整本轮 diff 审阅 | 未发现空白错误；范围为本轮文档、JSDoc 与 Change 材料。 |
| `bun run change-plan -- check changes/prepare-0-0-5-documentation` | 计划结构与基线检查通过；不授予提交或删除权限。 |

首次直接用 `bun test` 运行文档验收因缺少 `VIBE_CHECK_NODE_CMD` 未通过；没有改动环境或绕过检查，改用项目 `mise exec` 后文档验收通过，最终候选的两个定向 target 全部重跑通过。各审查者的附加 smoke 及局限分别记录，不将它们合并表述成完整回归或跨平台保证。

本轮 fast Gate 日志：`.log/project-gate/2026-11-02T05-58-14.462Z-14608-d4681335-7f01-4fa7-969a-f468248c5f62`。

## 后续发布交接与限制

本轮未执行完整 Gate、正式 `package:release:prepare`/`verify` 或 registry 发布；提交结项不等于正式发布验收。用户选择的 0.0.5 是文档目标；正式 tarball 仍须从已授权保存、冻结的 clean source 按[发布流程](../../docs/tooling/package-release.md)形成。

后续 release Change 可引用本清单与独立结论；必须比较正式包与本次最终候选的页面、声明、示例及相关行为，复核版本和其它差异，再完成绑定同一正式 tarball 的完整验收。发现新的材料/行为变化时扩大相应复核，不能仅凭本证据或 candidate 成功直接发布。
