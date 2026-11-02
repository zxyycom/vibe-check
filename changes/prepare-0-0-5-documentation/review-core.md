# Core 消费者独立审查

当前交接结论绑定 `0.0.0-local.eda819f36295`，见文末「Manual CR: 表达复审与最终候选复核」。
前两轮记录分别绑定初始 `9e89c50685bb` 和首轮收口 `3c1b2bcfd236` 候选；其中的运行 probes 与旧包身份保留为形成时证据，不冒充当前候选重跑结果。

## Manual CR: 初始候选完整阅读

- 审查者：独立非实施代理 `review_core_full`；日期：2026-11-02。
- 范围：`review-inventory.json` 中 `group: core` 的全部 12 篇 documents、41 个 declarations 和 5 个 machineExamples；不是 diff-only 或抽样审查。
- 初始包：`@zxyycom/vibe-check@0.0.0-local.9e89c50685bb`。
- 来源提交：`7c9c69e609a5d095e2c459923b321cb4925f0713`，含本 Change 的未提交候选材料。
- Tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.9e89c50685bb.tgz`。
- SHA-256：`a4a9533ffc8e3a643d5bc11fef9baa95030386db4c82d02c8c4d21f4a46f37b4`，已独立重算。
- 阅读位置：`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check`。该安装位置可被后续候选替换，初读身份以上述版本及摘要为准。
- 阅读顺序：先仅凭安装包 README、专题、示例和声明完成下表任务演练；范围内全文读完后，才以 owner、CodeGraph 源码及安装包运行核验。
- 初读闭合核验：12 文档共 2689 行、41 声明共 2156 行、5 机器材料共 472 行；各文件 SHA-256 与初始 inventory 一致。超长文档分段读取；截断的 API 机制内容已单独全文重读。

## 消费者任务与答案位置

| 代表任务 | 仅凭包内材料取得的答案位置与结论 |
| --- | --- |
| 首次集成并使 CI 失败 | README 安装/快速开始/运行配置，building-project-gate 最小入口，api-mechanics RunResult。Node >=24.18、包根 API，无 CLI；显式关闭 machine 可避免初次落盘。严格入口只接受 completed 且 aggregate passed。 |
| 定义带 options、prepare 和 context 的 Check | extending-check-lifecycle 定义 Check、callback 字段、prepare；callback-context；check/check、check/context-callback 和 define-context-callback 声明。options 是第一参数，框架字段须按 phase 声明；fallback 为 invocation-local canonical 值，block 不执行 callback。 |
| direct 依赖、观察与 handoff | check-dependencies 全篇、building-project-gate 场景 2/3、CheckDependencies。dependsOn 要求 passed，observes 仅等待终态；string get/list 限 direct union；provider get 额外要求 direct dependsOn 的 accepted handoff。资源由 caller 清理。 |
| flags、增量 Git 选择 | selecting-checks-by-git-changes 全篇、extending-check-lifecycle flag grammar、building-project-gate 场景 4/5。Controls 不能伪造保留 prefix；可信零命中和 unavailable evidence 不同；保守 flags 仍受完整条件求值约束；传播只扩展 dependsOn。 |
| 读取结果、Records 与 messages | api-mechanics terminal result/RunResult、output、RunResult/CoreSnapshot/CheckOutcome。先判别 Run，再按 outcome 读取 data；Records 与 messages 不决定 status；机器集合必须成对验证，消息/时长/aggregate 不在 v4 文件中。 |
| 输出失败、取消与 Promise rejection | run-outputs 失败处理、api-mechanics aggregation/RunResult、RunControls/run 声明。output 可仍带 passed aggregate；取消 execution 有 snapshot 但无 aggregate；aggregation 异常直接拒绝，不伪造成 output。 |
| command transcript 与 afterCommand | command-check 输入/输出/完成阶段/默认终态，building-project-gate 场景 1/9，command contract 声明。无 shell、exact-empty 默认；transcript 同时要求 mode 与 invocation artifact base；只有完整 numeric-exit 才进入 completion，非零也可进入；callback 返回值替代默认 mapping。 |
| 解释机器示例 | output 的材料与版本、mixed-outcomes definition/run/records、两份 schemas。5 个 executable rows、4 态、2 条 policy Records；container 不形成 row，fallback/preparation messages 不进入机器文件。 |
| 升级到 0.0.5 | changelog 完整版本历史。0.0.5 是相对 0.0.4 的净变化，未宣称发布成功；旧 callback/selection API 留在相应历史章节，不当作当前用法。 |

## 真实性核验

### Owner 与实现

完整消费者阅读后读取 check-results、project-run 和 human-output 的相关 owner 说明，并优先通过 CodeGraph 读取：

- `src/project-run/run.ts`、`invocation/run.ts`：Definition/Controls validation、早期取消、aggregation 原错误拒绝。
- `src/project-run/completion/completion.ts`、`outputs/status.ts`：facts 保留、输出闭合，以及 progress → machine → diagnostics → terminal effects 的失败优先级。
- `src/package-checks/command-check/{command-check,execution,transcript}.ts` 和 `host-environment/process/runner.ts`：context needs 并集/精确投影、完整结果资格、默认 mapping、transcript 写入时机与安全投影、Execa maxBuffer 接线。

这些内部材料仅用于核验，不作为消费者补足缺失说明的前提。

### 初始安装包定向运行

Node `v26.8.2`，通过 `scripts/project` 中的 package-root import，以 stdin 内存脚本执行断言；所有 machine/diagnostic/progress 输出关闭，不创建测试或临时文件：

- 最小 passed Run 与 failed/default aggregate；未选 flag 项保留 not-applicable、空有效集合默认 failed；保留 prefix Controls 拒绝。
- preparation fallback、冻结 options、精确 context keys、同 Run project identity。
- failed prerequisite 不进入 dependent callback，duration 为 null；observes 可读 failed data，Record 正确保留。
- handoff 保留 Map identity，canonical data 冻结，snapshot 不含 handoff。
- terminalEffect 抛错形成 output，仍保留 passed aggregate 与 facts；aggregation 抛错/Promise 返回直接拒绝。
- pre-work 和 execution cancellation，均无 aggregate。
- command 完整非零退出进入 afterCommand 并发布派生 Record；timeout、output limit、缺少 artifact capability 的 transcript 均不进入 completion。
- 机器示例 5 态行序、2 条 Records 与 canonical row-array fingerprint 独立重算匹配。
- 另一次只读 Git probe：以 HEAD 比较捕获当前 README 变化；不存在的本地 ref 得到 unavailable evidence、无 files，仍派生已声明 change flag。

上述两组运行均返回 PASS。不是全 Gate、最低 Node 版本验收或跨平台声明。没有在本审查中实际写 transcript/machine 文件或注入多 output 同时 I/O 失败；这些边界以实现核验及主代理的既有机械/候选验收为补充。

## 发现与处理

| ID | 初始发现及消费者影响 | 最小修正与状态 |
| --- | --- | --- |
| CORE-01 | `CheckDependencies.get(provider)` 和 `CheckBase.handoff` 的必要 JSDoc 只有英文，未满足中文主叙述规则。 | 已改中文，保留同 invocation、direct dependsOn、accepted passed 与 fail-closed 边界；最终安装包独立复核关闭。 |
| CORE-02 | `CoreRecord`、`CoreSnapshot`、`CheckDescriptor` 通过公开结果暴露，结构身份及 facts 边界说明只有英文。 | 已改中文，保留结构身份/metadata 归属；最终安装包独立复核关闭。 |
| CORE-03 | `ProgressRenderingFieldExpectation` 被公开 Controls diagnostic.expected 引用，说明只有英文。 | 已改中文并明确不含原始调用值；最终安装包独立复核关闭。 |
| CORE-04 | `RunResult` configuration 的局部说明还提到旧 aggregation selection，当前 API 没有该 selection 配置。 | 已删除失效短语，仍以 Definition/Controls 无效解释此 branch；最终安装包独立复核关闭。 |

保守 declaration 闭包包含实现用 Core session、Record store、execution plumbing、type inference/branding 等；这些文件均全文读过，但不把其 private 英文注释或函数当作公开 API，不要求无差别翻译。

初读未发现 core 指南、示例或输出字段语义的其它实质矛盾；最终差异复核结论见文末。

## 逐项全文阅读清单

路径相对初始安装包根。下列完整集合对应 inventory 的 core group；行数帮助核对边界，不以行数替代内容审查。

### Documents：12 项

| 文件 | 行数 | 阅读 |
| --- | --- | --- |
| `README.md` | 171 | 全文已读 |
| `docs/api-mechanics.md` | 214 | 全文已读 |
| `docs/changelog.md` | 491 | 全文已读 |
| `docs/guides/building-project-gate.md` | 705 | 全文已读 |
| `docs/guides/callback-context.md` | 53 | 全文已读 |
| `docs/guides/callbacks.md` | 40 | 全文已读 |
| `docs/guides/check-dependencies.md` | 180 | 全文已读 |
| `docs/guides/command-check.md` | 203 | 全文已读 |
| `docs/guides/extending-check-lifecycle.md` | 252 | 全文已读 |
| `docs/guides/run-outputs.md` | 205 | 全文已读 |
| `docs/guides/selecting-checks-by-git-changes.md` | 79 | 全文已读 |
| `docs/output.md` | 96 | 全文已读 |

### Declarations：41 项

| 文件 | 行数 | 阅读 |
| --- | --- | --- |
| `types/check-settlement/facts.d.ts` | 19 | 全文已读 |
| `types/check-settlement/record-store.d.ts` | 14 | 全文已读 |
| `types/check-settlement/session.d.ts` | 43 | 全文已读 |
| `types/check/check.d.ts` | 515 | 全文已读 |
| `types/check/context-callback.d.ts` | 77 | 全文已读 |
| `types/check/descriptor.d.ts` | 5 | 全文已读 |
| `types/check/flag-enablement.d.ts` | 46 | 全文已读 |
| `types/check/handoff-provider-identity.d.ts` | 12 | 全文已读 |
| `types/check/inherited-collection.d.ts` | 35 | 全文已读 |
| `types/check/project-changes.d.ts` | 20 | 全文已读 |
| `types/check/project-context.d.ts` | 10 | 全文已读 |
| `types/data-boundary/context-callback.d.ts` | 32 | 全文已读 |
| `types/index.d.ts` | 97 | 全文已读 |
| `types/package-checks/command-check/command-check.d.ts` | 54 | 全文已读 |
| `types/package-checks/command-check/contract.d.ts` | 131 | 全文已读 |
| `types/package-tools/context-callback/define-context-callback.d.ts` | 57 | 全文已读 |
| `types/project-definition/check-tree/authoring.d.ts` | 40 | 全文已读 |
| `types/project-definition/check-tree/check-fields-authoring.d.ts` | 30 | 全文已读 |
| `types/project-definition/check-tree/resolution.d.ts` | 32 | 全文已读 |
| `types/project-definition/check-tree/scheduling-authoring.d.ts` | 19 | 全文已读 |
| `types/project-definition/declarative-snapshot.d.ts` | 10 | 全文已读 |
| `types/project-definition/progress-rendering-output.d.ts` | 53 | 全文已读 |
| `types/project-definition/project-changes.d.ts` | 28 | 全文已读 |
| `types/project-definition/project-definition.d.ts` | 130 | 全文已读 |
| `types/project-run/check-execution/admitted-check-execution.d.ts` | 18 | 全文已读 |
| `types/project-run/check-execution/callback.d.ts` | 29 | 全文已读 |
| `types/project-run/check-execution/execution-settlement.d.ts` | 52 | 全文已读 |
| `types/project-run/check-execution/lifecycle.d.ts` | 24 | 全文已读 |
| `types/project-run/check-execution/resolved-checks.d.ts` | 51 | 全文已读 |
| `types/project-run/check-execution/resolved-execution-result.d.ts` | 21 | 全文已读 |
| `types/project-run/check-execution/static-execution-plan.d.ts` | 16 | 全文已读 |
| `types/project-run/check-execution/terminal-result.d.ts` | 39 | 全文已读 |
| `types/project-run/controls/contract.d.ts` | 48 | 全文已读 |
| `types/project-run/controls/validation-result.d.ts` | 22 | 全文已读 |
| `types/project-run/diagnostic-logging/diagnostic-detail-rendering.d.ts` | 11 | 全文已读 |
| `types/project-run/diagnostic-logging/logger.d.ts` | 63 | 全文已读 |
| `types/project-run/invocation/paths.d.ts` | 39 | 全文已读 |
| `types/project-run/outputs/status.d.ts` | 48 | 全文已读 |
| `types/project-run/project-context.d.ts` | 12 | 全文已读 |
| `types/project-run/result.d.ts` | 133 | 全文已读 |
| `types/project-run/run.d.ts` | 21 | 全文已读 |

### Machine materials：5 项

| 文件 | 行数 | 阅读 |
| --- | --- | --- |
| `docs/examples/artifacts/mixed-outcomes/definition.ts` | 195 | 全文已读 |
| `docs/examples/artifacts/mixed-outcomes/records.ndjson` | 2 | 全文已读 |
| `docs/examples/artifacts/mixed-outcomes/run.json` | 69 | 全文已读 |
| `docs/schemas/vibe-check-record.schema.json` | 33 | 全文已读 |
| `docs/schemas/vibe-check-run.schema.json` | 173 | 全文已读 |

机器材料已全文阅读人读说明、Definition、输出值和字段语义；schema/JSON 全部机械结构正确性不以本 Manual CR 冒充 schema acceptance。

## Manual CR: 首轮收口候选差异复核

- 最终包：`@zxyycom/vibe-check@0.0.0-local.3c1b2bcfd236`；源码提交仍为 `7c9c69e609a5d095e2c459923b321cb4925f0713`，含本 Change 修订。
- 最终 tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.3c1b2bcfd236.tgz`。
- SHA-256：`f67a014c7bb0292812150a8b153c67514c5e4ad5d1fcd0b9fd6839e6bda4575e`，已独立重算；安装 manifest version 一致。
- 独立重算全部 58 个 core 材料摘要：12 文档、36 个声明和 5 个机器材料与初读完全相同；仅下表 5 个声明变化，且均匹配当时的 inventory.finalComparison.finalSha256。当前 inventory 已更新到文末候选，本表保留首轮收口身份。
- 已对下表每个最终声明全文重读（不仅阅读 diff），并检查对应 5 个源码文件 diff，变化仅为所报 JSDoc；未改变 API 签名或执行代码。跨组源码去注释 AST 检查由主代理拥有，不冒充本分区独立执行。

| 完整重读的最终声明 | 最终 SHA-256 |
| --- | --- |
| `types/check-settlement/facts.d.ts` | `0c062b642ad36b76417ebe0a1e7b7a8e95df746d8c1aa94b07bcefec08f0f05d` |
| `types/check/check.d.ts` | `5feee250f12f399b9955f84a83fee45c9751e5aeccd3e59fda04abfeab7853d9` |
| `types/check/descriptor.d.ts` | `69a7f4f5a19d445d996eb82f50f1d90ddde5573b0da4cda3bb90e3b40af1b112` |
| `types/project-definition/progress-rendering-output.d.ts` | `ef2d41600d7a460666f65b2106bfe401c8802526d8362d46b7dffa7005a88743` |
| `types/project-run/result.d.ts` | `38c7f3d771ebb152ee0467ec25d630c5e49d0030e9c7a955012424210b773128` |

最终安装包另以无输出内存 smoke 重验 handoff identity、Records、completed/aggregate、snapshot 排除 handoff，以及非法 output override 的 configuration/expected readback，全部 PASS。前文更广的运行 probes 绑定初始包；最终变化为说明性注释，不将其表述成最终包重跑全部 probes。

**结论：core 声明范围的消费者独立语义审查通过，CORE-01～04 全部关闭，无影响正确使用的遗留问题。** 结论适用于上述最终本地候选；其它分区由对应审查者负责，schema acceptance、完整 Gate、最低版本/跨平台和正式发布验收不属于本结论。

初始 disposable tarball 已由主代理的正常候选重建流程替换；其身份、逐项初始摘要与阅读记录仍保留，最终候选才是交接对象。本审查只创建/更新此证据文件，未暂存、提交、发布、重建包或修改被审对象。

## Manual CR: 表达复审与最终候选复核

### 范围与身份

- 审查者仍为独立非实施代理 `review_core_full`；日期：2026-11-02。依据 `ai-ready-docs` 和文档 owner，复审重心、负向描述、迁移残留、篇幅与 Markdown 组织。
- 第二遍完整阅读以 `0.0.0-local.3c1b2bcfd236` 为基线，逐篇、逐声明重读本报告清单中的全部 12 篇页面和 41 个声明；不是以关键词扫描或 diff 代替内容阅读。两次输出截断处均补读完成。5 个机器材料沿用首轮全文阅读及真实性证据，本轮核对摘要不变，不声称再次全文阅读。
- 当前最终包：`@zxyycom/vibe-check@0.0.0-local.eda819f36295`；来源提交仍为 `7c9c69e609a5d095e2c459923b321cb4925f0713`，包含本 Change 未提交修订。
- Tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.eda819f36295.tgz`；独立重算 SHA-256 为 `b862e48cd41a55faecd0be11d20871328551d7ef72660cc0b3d6d2f2007acb08`，与 inventory 一致。
- 最终阅读位置：`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check`；已核对安装 manifest version。
- 以初始 inventory 加本报告首轮收口的 5 个声明摘要恢复表达复审基线，独立重算全部 58 项 core 材料：恰好 7 项变化、51 项不变，与 `expressionReview.changedItems` 的 baseline/final 摘要逐项吻合。7 项变化的 tarball/installed bytes 一致，12 篇 Markdown 的 source/installed bytes 全部一致。

### 最终变化材料全文复核

下列 7 项共 1439 行均从最终安装包全文重读；未变材料不重复第三遍全读。

| 文件 | 行数 | 最终 SHA-256 |
| --- | --- | --- |
| `docs/api-mechanics.md` | 214 | `fd99cfc26aca613ee977eef915ca1729cc696eece3ef3f5003aab8816e15b84f` |
| `docs/changelog.md` | 493 | `86b92d338c607844dec233690a0e7bffd563f138b766df7ba53be78d00bb997e` |
| `docs/guides/command-check.md` | 206 | `086968516b062a57b73d22c60eb600dc9151b0054f96ef1db7399702bbcca73d` |
| `docs/guides/extending-check-lifecycle.md` | 250 | `f9e3fc9fc42e6a5e7ca5fbaba0a59a6233fa3fd434fba73db995bce5efd40ddf` |
| `docs/output.md` | 95 | `710277a4f05e018eef948b4e19398618b8dc2084569290534b3cdd3edea6a960` |
| `types/project-run/outputs/status.d.ts` | 48 | `4d55fa9cf195ca94fde1dd41f4c357881093464941df3f3aa5e9bc82256f2d85` |
| `types/project-run/result.d.ts` | 133 | `4dde49c807356ae6af7090ac8ffb02a3f29f2efc1779ca2c2b1d5e686afed5cd` |

同时查看这两个声明所属源码的局部 diff，只有说明性注释变化，无签名或执行逻辑改动；全任务源码 AST 等价性及机械验收由主代理负责。

### 发现、修正与闭合

| ID | 阅读障碍 | 最终修正与复核 |
| --- | --- | --- |
| CORE-EXPR-01 | 自定义 Check 示例后先展开 quiet-pass 与 flags，打断 options/context → prepare → execute → 取消的主任务。 | lifecycle 说明前移；flags 随后展开，quiet-pass 成为独立 H2；改用「调用边界」及两个中文小标题，收敛重复措辞。完整语法、只读选项、direct 关系和取消边界保留，关闭。 |
| CORE-EXPR-02 | API 机制的「没有新增节点数或深度上限」依赖读者知道过去版本。 | 改为当前契约「不设置额外的节点数或深度上限」，循环/重复 ID 拒绝和共享容器规则保留，关闭。 |
| CORE-EXPR-03 | 机器输出字段说明重复 quiet-pass 的编号和计数细节，偏离 machine consumer 任务。 | 保留 machine 字段排除边界，以摘要链接 Run 输出 owner；未删完整集合、fingerprint、并发读取与安全约束，关闭。 |
| CORE-EXPR-04 | 当前 `RunResult` / `RunOutputStatus` JSDoc 残留 scheduler-measurement、measurement participant 和 hook failure 用语。 | 统一到 terminal effect / terminal-effect participant / callback failure，与现行字段及指南一致，关闭。 |
| CORE-EXPR-05 | command 指南的 parser 表述可能被局部读取为 Product 自动验证 completion data。 | 明确 consumer 读取 final data 后显式调用，Product 不自动调用，并直链 Provider 解析 owner；与未变 `CheckDataParser` 及依赖指南一致，关闭。 |

主代理补充的两项表达调整也已独立复核：changelog 只增加版本导航，不改历史事实；command 结尾从重复列出不支持项改为 executable、workflow 与退出码的调用方责任，并链接完整接入任务。开头及输入节仍明确无 shell 和独立 arguments。

### 关联阅读任务与保留判断

| 阅读任务 | 最终材料能恢复的路径与结果 |
| --- | --- |
| 从最小 Check 扩展 options、context、准备和取消 | 示例后可连续定位 callback 字段、三种 preparation 结果、execution 输入/终态及协作取消；不必先学习呈现策略。 |
| 接入外部命令并消费类型化 data | command 默认 mapping、完整结果资格、completion 替代结论和 consumer 显式 parser 分工清楚；关联依赖 owner 说明 canonical 输入及 parser 抛错边界。 |
| 解释输出失败并区分机器事实与人读呈现 | `RunResult` 和 output statuses 使用现行 terminal-effect 术语；machine 指南仍完整说明两文件验证，progress 细节可沿链接找到，quiet-pass 不会被误作 machine 筛选。 |
| 从旧版本升级到 0.0.5 | 版本导航可定位四个版本；0.0.5 净变化与旧 callback/selection 迁移各有版本范围，未增加已发布声明。 |

- 保留 direct dependency / handoff 权限、精确 descriptor、canonical data、取消清理、输出失败与非原子发布等负向描述：它们限制真实误用或安全风险，不是待删的措辞冗余。
- 保留 changelog 的旧名称、迁移表、追溯及明确标为维护者的历史说明；它们服务跨版本升级与事实恢复，不能当作当前 API，也不宜为了缩短篇幅重写历史。
- 保留 building-project-gate 的长示例：各场景有任务索引、前提、操作和预期结果，篇幅来自可独立采用的完整路径；没有发现需要再拆页面或新增抽象的阅读障碍。
- 保留内部声明闭包中的私有说明与实现类型，不将其物理随包等同于公开 API，也不以统一语言或去否定为由机械改写。

**结论：core 的消费者语义与表达审查在 `0.0.0-local.eda819f36295` 通过；CORE-01～04 及 CORE-EXPR-01～05 均关闭，无影响正确使用的遗留问题。** 本轮证据是实际包全文阅读、关联任务复核、摘要/bytes 核对和局部源码 diff；未重新运行行为 probes、完整 Gate、最低 Node/跨平台或正式发布验收。前文运行结果继续绑定其各自候选，机械验证由主代理记录，不冒充本代理执行。

本轮仅更新本审查文件；未修改用户文档、源码、inventory 或其它报告，未暂存、提交、发布或重建候选包。
