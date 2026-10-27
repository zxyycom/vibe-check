# Gate repository quality

本文拥有 Project Gate 对五项直接仓库质量 Check 的私有配置；整体组合、调用和结果见 [Project Gate](project-gate.md)。

## Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics`、`markdown-lint` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们是同一 Project Definition 中可逐项审阅和选择的普通 package Checks，没有独立 quality command 或嵌套 Run。

### Finding 与状态

Gate 对 duplicate/file/function/Markdown Link 四项显式使用 `blocking` finding policy：

- 未被 owning Check 既有 waiver 或 selection exclusion 消除的 normal Finding 保留完整 final data / Records，并令 owning Check `failed`。
- zero Finding 仍令 Check `passed`。
- external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。

安全摘要由 owning Check 有上限地输出，超过摘要上限时只追加精确 omitted count。完整 Finding facts 以 machine Records 为准。

这四项按 changed 输入选择，也属于 `quality` preset，故其未豁免 normal Finding 会由 owning Check 结算为 failed，并通过默认 strict-all aggregate 阻断已选择它们的 invocation；`markdown-link-validation` 还是 `materials` preset 成员，因此同样阻断 `--materials`。Gate 不从 Finding、message 或 Record 重算这个结果。此处的 repository-private blocking policy 不改变 package constructor：duplicate detection、file metrics、function metrics 与 Markdown Link 在 consumer 省略 `findingPolicy` 时继续使用 `non-blocking` advisory default。

`markdown-lint` 是第五个、独立的 docs/changes Check，按 changed 输入选择，并属于 `materials` 与 `quality`。它固定八项默认规则而不启用 `link-fragments`，并显式保持 `non-blocking`：lint Finding 以 owning Check 的 Records、消息和 final data 输出，不使 owning Check 或 aggregate failed。空输入和 source/backend failure 仍按 package 的 `not-applicable` / `unavailable` 语义结算。

将 `markdown-lint` 改为 blocking 前，须按届时的仓库 Markdown corpus 审查其 Finding 与 rejected input；当前配置保持 non-blocking。

同一 `blocking` policy 适用于 changed、`--all` 和正式 release receipt 验证；它不新增 release-only reducer 或 waiver，既有 waiver/exclusion 仍只由 owning Check 解释。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自 owner 阻断。

### 精确 Finding waiver

**Gate manifest 的函数行数。**

`createProjectGateEntries` 保持一份顺序完整的声明清单，使 Check 顺序、selection metadata 和资源声明可以沿同一阅读路径恢复。该函数的 `function-code-density` Finding 来自清单行数，而非条件分支或失败恢复；把清单拆成组装函数会遮蔽这些关系。

`scripts/project/gate/checks/repository-quality.ts` 为这一 Finding 配置精确 waiver，identity 限定路径、函数名、起始行和指标。`functionMetrics` 仍发布原 Finding Record，并标记为非阻断；其它函数和指标继续按 `blocking` policy 结算。起始行变化或 Finding 消失时，Check 会发布 unused-waiver audit Record 和 warning，维护者据此重审 identity 与理由；该 audit 本身不使 Check 失败。

**单页 Gate 指南的文件行数。**

用户确认将[构建项目 Gate](../guides/building-project-gate.md)保留为单页九场景教程；十个独立受管片段与相邻的适用条件、预期结果和安全边界共同承接阅读路径，不为满足行数门限而压缩代码或删减说明。

`fileMetrics` 只为 `docs/guides/building-project-gate.md` 的 `code-lines` 配置一项精确 waiver，不排除该文件，也不提高全仓阈值。Check 继续发布实际行数、上限与原 Finding，并标记为非阻断；其它文件或指标仍按原 policy 结算。该例外不授权其它长文档自动豁免；后续扩展仍需审查是否保持同一任务边界。

### 仓库选择范围

Markdown lint 保持完整 corpus 与现有 non-blocking policy；Gate 显式启用 Product 的逐文件 findings 缓存，目录为本地可删除的 `.cache/vibe-check/markdown-lint-findings/`。当前 bytes、选择与终态每次重新核对；冷态可能增加缓存写入成本，缓存命中不是跳过 Check 的依据。

Markdown Link 显式启用[parse-facts cache](../checks/markdown-link-validation.md#parse-facts-cache)，目录为
`.cache/vibe-check/markdown-link-parse-facts/`。每次仍读取当前源文件、核对内容 identity 并验证链接目标；
命中只省去重复解析。缓存可能保存链接地址、标题 slug 和位置，由本地维护者管理或删除，默认 16 MiB 容量提醒沿用 Product 配置。

repository-private scope 只让 TypeScript、current Schemas 和 examples 进入 `duplicate-detection`；Markdown 由 file metrics
与 Markdown link validation 观察，不进入重复检测。`docs/schemas/historical/**` 不进入 duplicate/file maintainability
metrics，但仍由显式 documentation contract 严格验证。repository defaults 还排除 `**/archive/**`；这是本项目配置，不是
package 的公共默认值。

Markdown Link 保留完整的 `docs/**/*.md` / `changes/**/*.md` 正/负选择与既有安全边界；Gate 显式将
`limits.maxOccurrences` 和 `limits.maxTargetReads` 设为 `false`，不以总量预算阻断增长的完整文档。
节点观察在本次引用图内复用，每条引用仍独立判断与计数；Product 默认总量预算与单文件字节边界不变。
关闭总量预算不提供进程级资源隔离，源/目标失败与协作取消仍 unavailable，不降级放行。

三个 metrics Check 的 `product-source` area 具有一个共同排除范围和一项差异：

- **共同排除：** `src/package-checks/function-metrics/analyzer/**` 由 source-aligned port owner 整体维护，不生成 repository duplicate、file 或 function-metric Finding。
- **Function metrics 额外排除：** Product `*.test.ts` 与 `*.test-support.ts`。这只移除测试函数的复杂度与密度 Finding；duplicate detection 和 file metrics 仍选择这些文件，保留重复代码和超长文件的证据。

配置测试必须同时证明上述差异、共同 analyzer exclusion，以及目录外 Product implementation 仍被三项选择。
该范围不从 provenance ledger 动态生成，也不改变 package Check 的公共默认 selection。

### 分析器与环境绑定

Gate 只接受 mise 提供的绝对 SCC path；缺失或相对 `VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`，而让 file-metrics owner 按 scanner failure 结算。
`functionMetrics` 直接使用内置 analyzer，不读取 scanner command 或环境 binding。

整目录 metrics 排除不影响 analyzer 的 lint、format、typecheck、source identity、oracle/parity、deviation、provenance/license、
import-boundary 或行为测试。边界见 [Check-owned scanner dependencies](../development/scanner-dependencies.md)。
