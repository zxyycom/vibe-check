# 独立语义审查

## 结论（最终语义审查通过；生命周期已独立回读）

本轮已实施的 19 份 Investigation 与 120 份 active、250 份 archived Decision 的实际编辑中，未发现改变真实历史采用方向、历史测量或 alignment 的正文改动。所有非标签改动均已反查正文/前置判断；不能把实施者的 503/503 全文阅读统计当作本独立审查者再次全读 503 份。

- **通过**：7 份 active 正文澄清、1 份 archived 条件纠误、Investigation 三个 question 收窄及历史/复测边界澄清。
- **通过**：Investigation 22 个 source / 24 条既有边补 summary、active 两条既有边补 summary、archived inherit 边纠正 summary。关系端点的正文而非提案自评支持这些判断；summary 没有新增拓扑。
- **不纳入**：`261022-tier-gate-validation → 260923-select-project-gate-required-checks-by-change` 新修订边。二者确实相关，但已有 `260924-select-gate-check-specific-change-regions` 真实修订及后来的分层维度，tier 正文未足以证明越过该中间判断仍以 260923 为**直接**前序。保留空关系，不为凑图新增普通引用。
- 本审查不证明历史版本/外部状态/性能数字今天正确，也没有执行任何历史 helper、网络复核、产品测试、生命周期/关系事务、Git stage/commit。

## 精确正文编辑核对

### Active 七条

1. `260818-use-tags-for-decision-classification`：将 basename 身份明确为形成时背景；保留五个 domain 的真实迁移，不把它们变成封闭词表。现行显式 ID 普通引用由 `260908-use-dated-governance-record-identities` 与记录规则支持，未造真实演进边。
2. `260827-make-package-build-evidence-discoverable`：旧布局文件名换为 archive 真实链接并标明形成时；没有把历史 Bun/ESM 布局替换成今天布局。
3. `260830-keep-format-aware-check-capabilities-independent` 与 `260830-share-strict-json-document-boundary-between-json-checks`：QualityRecords 改为 supplemental Records。形成前 `260821-use-core-check-record-facts-with-final-data` 已采用 minimal `{checkId,id,data}`；两条原记录均拒绝 generic Record catalog，属于词形纠误，不是从曾采用的 catalog 改向 minimal。
4. `260904-publish-project-gate-machine-facts-in-machine-namespace` 与 `260907-keep-run-diagnostics-independent-of-optional-strategies`：pair 级 atomic 改为完整集合指纹绑定。形成前 `260821-publish-fingerprint-bound-check-record-machine-v4` 明确“两路径没有 transaction”并拒绝 filesystem-atomic-snapshot；260904 原记录又明确目录移动不改变 publisher。新措辞保留双文件 owner、publisher、failure semantics，**没有否定单文件 temp→atomic rename**。当前 output owner 的两路径无原子可见性也一致，但当前 owner 只是交叉核对，形成前采用依据才支持原地纠误。
5. `260908-delete-completed-change-and-openspec-history`：Investigation 仍作为形成时依据可读，去掉“活动调查可作为当前事实”的歧义；不改删除完成 Change 的采用方向，也不继承历史实施授权。

### Archived 唯一正文改动

`260815-confirm-single-check-authoring-and-derivation-names-before-publication`：给 materialized Check 省略 checks 补“最终 children 为空时”。紧邻前条已明确保留非空 base、精确替换与空结果清除；无条件省略会使同节自相矛盾。补条件不把当时 base-value derivation 变成今天的 native composition，也没有修改历史 fail-closed add/remove 冲突政策。

### Investigation 正文与 question

- 三个 `260824` JSON 后继：新 question 分别恢复“整包/加载面与零依赖”“保留全部 duplicate 的极简比较”“已选 Momoa 的 spike 闭合”。完整正文与形成时动作分别支持，原选型结论、未采用/已执行边界均保留。
- `260904-diagnose-project-gate-candidate-timeout-under-contention`：明确标为非形成时阅读提示，指向同日修正报告；原假失败判断与数值仍完整留存，未用修正结论覆盖原正文。
- 三份 `260811` 选型报告：新增形成时阅读边界，不删除当时采用和旧目录/CLI/依赖事实。
- `261008-trace-typescript-metrics-upstream-origin`：明确未来另存新样本而非覆盖本轮资源；相等断言仍只复核保留结果，附件目标和资源字节未改。

## 九项 active issue 的建议 disposition

| ID | disposition | 两端/owner 依据与最小动作 |
| --- | --- | --- |
| 260812-keep-seven-distinct-project-skills | **用户已决，后继已独立通过并发布归档** | 采用明确固定七项，最后一条要求新的长期决策才能扩大。workspace 当前明确增加独立 test-design，testing strategy 已规定设计/证据分工；既有 Decision 文本搜索未找到 test-design 采用记录。不把“七”改成“八”伪装笔误，不归档独立职责原则。用户随后已明确批准保留八项并补后继、归档旧七项；新候选与事务已追加独立审查通过，本表记录问题为何不是文字纠错。 |
| 260822-require-check-owned-network-authorization | **普通引用既有后继即可** | 260915-default-effective-check-aggregation-with-caller-local-callback 已对全局调用方替换旧 policy/null 默认、明确不再要求 caller selector；check-results owner 采用默认严格聚合。网络 opt-in、安全 transport、四态事实仍是未来方向。引用后继限定当时 explicit aggregation 机制，不把网络权限改为共享 Run 授权，不标 aligned。 |
| 260830-reconcile-selected-files-with-check-eligibility | **普通引用澄清已演进机制** | 261010-unify-file-selection-with-default-excludes 明确拒绝 source/include/exclude，同时保留 Check 的 accepted/rejected、exact inputs 与结算。旧公开 default 对象/grammar 是真实曾采用的机制，保留其原文并加现行责任引用足够；不原地改成“当时已用 patterns”，不归档整条完整对账方向。 |
| 260903-adopt-selected-lizard-extensions-in-product-owned-analyzer | **保留形成时版本/计数，必要时普通引用当前来源 owner** | 1.24.0、27/55、17 legacy bodies 与当轮 selected pair 是形成时采用背景；采用要求固定 1.24 source identity、完整 mapping 与独立 adoption evidence，不等于永远禁止 1.24.1 patch sync。当前 scanner owner 明确1.24.1、CogC deferred；261008升级价值报告仍只建议，261011验证保存当轮验收。不能只凭版本数字变动宣称新长期方向缺失，也不能把调查建议当采用授权。维持原 selected pair/私有边界；如另有证据表明当初承诺永久锁死1.24.0，才需新判断，本次未取得该证据。 |
| 260904-publish-owner-structured-process-check-records | **普通引用现行 owner，保留历史 Core 措辞** | 形成前260830-separate-settlement-run-progress-and-machine-owners 已把 progress 定义为 project-run 子 owner；后来的260914 preview决策明确 Core只关闭facts、renderer拥有preview。原Core更像旧泛称，缺少当时实现证据时不直接将其改写为从未如此称谓。可引用现行human-output/260914，明确工具adapter不拥有preview这一主旨；gate-diagnostics同一页现有Product progress与Core两种称呼是普通术语清理项，不需再作方向决策。 |
| 260915-keep-package-quality-advisory-with-default-gate-aggregation | **普通后继引用限定旧required** | 261024-separate-routine-release-and-explicit-gate-selection采用fast/changed/all及routine义务；Package advisory、Gate四项blocking、默认strict aggregate均保留。旧“本次不改required配置”是形成时变更边界，不是冻结未来selection的方向。无需新增方向。 |
| 260922-adopt-project-gate-markdown-lint-advisory | **普通后继引用，历史数值保留** | 260924逐Check region与261024分层承接selection；当前Gate/Markdown lint owner拥有后续cache，原有260915-provide-bounded-markdown-lint-check正文已明确形成时首版不缓存不等于永久禁止。原“此次不改cache/后续独立Change”不是永久禁止cache；advisory、完整corpus仍保留。不要按今日数量/耗时覆盖503/59等形成时证据。 |
| 260924-select-gate-check-specific-change-regions | **普通后继引用限定preset/required** | 逐Check实际输入、shared dependency保守闭合继续有效；261024与Gate owner分离fast反馈/changed验收/all。链接“无条件required”的旧层级不等于今天default fast成员，不需要改变输入边界方向。 |
| 261017-validate-complete-gate-markdown-graph | **保留形成时验收，普通引用预算后继** | “当轮保留warning policy”是当次工作未改变性能政策；261022-enforce-gate-performance-budgets→261022-version-gate-performance-policy已采用硬失败并版本化。完整corpus、cache、关闭两项总量budget不因此退出依据，不为warning-only旧措辞新建同义决策。 |

以上 ordinary-reference 建议不代表本审查已经编辑；root 可在不复制后继规范的前提下取舍。不要将九项都当作阻塞或统一归档。

## 标签检索与新增主题抽核

**可用性改进有实际依据**：此前仅宽泛五类或 implementation-libraries 的记录，现在可按各 Check、scheduler、machine-output、project-files、来源/安全/治理能力找到。已读全部实际 tag 增删清单；active 120 条逐条反查目的/采用段落，正文高风险条目完整读取；archived 不冒充再次全文审查250条，抽核18条完整正文覆盖以下领域。

- `260825-allow-controlled-json-schema-reference-sources` 的 json-schema-validation、schema-references、security、package-release：正文确实既有受控远端引用与SSRF/输出边界，又有五项首发承诺；没有因今天首发已结束就去掉历史主题。
- 两条历史 Skill 例外：skills/test-evidence 表达真实上游分发与项目方法边界；不是因为文档碰巧由skill写成而贴体裁标签。
- `260805-use-static-check-task-plans-with-shared-scheduling` 的 scheduler/task-graph：历史采用确有静态TaskPlan；保留 unaligned 与历史模型，不为今天已删除该API而改成当前authoring。
- minimal Record public-surface、旧 semantic check ID、固定 config version：quality-records、finding-waivers、caching分别有实质讨论；标签不表示旧catalog/acceptedWarnings/version配置今天仍有效。
- Investigation 的 dependency-upgrades、node、algorithmic-complexity、cpu-profiling、utility-libraries、core/project-files、type-safety/typebox，分别由版本候选、宿主、增长推导/采样、函数/结构库、纯值双向索引及runtime/static schema比较支撑。未把“推荐候选”标签等同“已经安装/采用”。

### 唯一标签检索改进建议（低风险，不阻塞正文保真）

当前文件元数据查询显示：gate-selection 的9条Decision全在archive；change-selection只覆盖3条active（另2份Investigation）。词义可区分，**不用合并为一个词**：gate-selection表达Gate preset/义务，change-selection表达基于变更输入的选择。但跨生命周期存在漏标，使相同阅读任务断链。

最小建议保留原tag并补4处：

- `261024-separate-routine-release-and-explicit-gate-selection` 增 gate-selection：全篇主旨即fast/changed/all、routine/release-only/explicit-only义务。
- `260924-select-gate-check-specific-change-regions` 增 gate-selection：除输入region外也明确focused/all与required义务。
- `260923-select-project-gate-required-checks-by-change` 增 change-selection：其主旨就是Git snapshot与保守region选择。
- `260922-adopt-repository-material-change-selection` 增 change-selection：采用正文直接把材料Check接到changeFlag，保留强制preset。

这些是有正文依据的交叉分类，不把所有flags、scheduler有效选择或含Gate字样的记录都贴上change-selection。

## 代表性阅读任务结果

1. **检索Markdown cache并解释演进**：从markdown-link-validation可恢复严格串行缓存基线→同边界优化复查→storage-only packing补充；cold未过门槛与microbenchmark动机可分开。晚期节点图观察保留explicit exact-bytes cache但改变成功/缺失节点观察责任；两条active summary忠实表达此变化，不将targetReadCount偷换成物理I/O。
2. **解释真实采用冲突而不覆写历史**：inherit前序同identity add/remove fail closed；后继先remove后add、add wins。新摘要比原helper名更能恢复实际改变，前序正文与unaligned保留，不能在原文批量统一为add wins。
3. **区分历史与当前**：candidate timeout首篇的“假失败”解释原样保留；同日修正撤回该解释而不改数值，再后续lifecycle审计取得独立phase证据。新增非形成时提示帮助读者找到修正，不给今天Gate预算或代码作新证明。
4. **恢复Lizard性能研究**：representative27-family的dispatch热点、真实TS已命中fastpath后的regex热点、backend/运行时候选与当轮停止事件分别可恢复。24条summary不承诺Product加速，不把分层median相减成因果份额，不把当年建议转换成本轮执行授权。
5. **按Gate选择主题恢复义务**：现有标签已提高发现率，但上述gate-selection/change-selection交叉漏标会使按单标签查询只看到历史或当前一侧；建议4处最小交叉补标，不增加正式前序边。

## 独立覆盖、证据与未证明范围

- 以HEAD `9a5be25bf02886e5271b96b31da35ae98c3ca680` 与实际工作树diff为准；精确503 ID/sourcePath、复核时SHA与独立读取级别见集成的 `../review-ledger.json` 与同目录 `coverage-summary.json`。它是临时审查快照，不是新治理索引或正文owner。
- 覆盖三实施切面的全部389份记录实际diff；其中非标签差异逐条读全文并核对前置采用依据。active全部120份新增tag逐条对照目的/采用段，另31条完整正文；archive18条完整正文抽核（含全部非标签变化/关系端点）。
- Investigation提案22sources/24edges的28个不同端点均读正文；另3份有正文编辑报告完整读取，总计31份完整Investigation，其他变动标签对读相关正文。详细接受边清单在investigation-relations-reviewed.json。未对未编辑且不为提案端点的报告宣称独立全文重审。
- 索引由root同步/机械check的结果属于root验证；本独立语义审查没有运行strict check或validate/test-evidence，不把读取或Git diff检查当作环境生效/测试通过证明。
- 一次过程中将已存在的provide-bounded-markdown-lint-check cache边界误认为root新增，随后以HEAD diff核对纠正：该文件本轮只有tag改动，不存在这项root正文写入。
- 没有读取/执行全部资源内容，不重验外部版本、历史测量、历史alignment或今天实现；资源执行尤其不在本次授权内。
- 本目录只保存本轮私有审查说明，交接后由root按tmp既有规则处理，不进入正式Decision/Investigation集合。

## 增量 A：关系摘要、交叉标签与 Skill 后继

### 已集成摘要与标签回读

- 已按实际来源回读22份Investigation的24个summary，均与独立批准proposal一致；两条active及inherit摘要的实际diff符合批准的summary-only变化，没有纳入被拒绝的tier新边。
- 四份跨切面tag已回读：260922/260923新增change-selection，260924/261024新增gate-selection；原tags均保留，目的与采用正文支撑，没有因归档/活动状态改分类语义。

### 新 Skill 后继候选独立审查：通过，随后按授权正式发布

- ID：`261026-maintain-distinct-project-skills-with-test-design`。
- 路径：`/workspace/vibe-check/docs/decisions/261026-maintain-distinct-project-skills-with-test-design.md`。
- 完整读取candidate、原260812及其直接前序260811、workspace adapter owner、testing strategy与两个测试skill入口，并独立列出实际8个项目skill目录。
- 保留旧方向：有限且职责独立的安装集合、避免同义通用编码skill、入口通用trigger与项目owner/验证路由分工、完整上游包/包外项目规则、两项本地方法层、OpenSpec退出不恢复、未来扩展仍需新长期决定。没有因“标准独立”自动授予扩展、安装、更新或实施权限。
- 授权内变化：保留原七项并加入test-design，当前8项有限基线；测试设计形成行为证明，证据审查核对最终证明与能力感知Case连续性/闭合。两者共同关注质量但输出责任不同，正文没有把test-evidence-review降格成机械账本工具。
- 分发：workspace明确六项完整上游包（含test-design）和performance-optimization/test-evidence-review两项本地方法层，候选逐项承接；test-design固定来源/version3、无普通指令依赖、更新防降级由现行owner承接。
- 关系：修订→260812，summary“保留独立职责边界并纳入测试设计”忠实；这是用户已批准的真实集合扩展，不是原地把历史七项改成八项。自包含后继足以支持旧记录归档。
- 拟aligned：本地8目录、两测试方法入口、owner分工与导航已存在，完整方向已具可核对的本地事实，支持aligned建立。不证明包字节与远端逐字相等、不证明任何runtime改动或测试通过，也未实际运行安装/更新。
- 本增量审查当时未执行Candidate发布、createdAt/alignment赋值或旧记录归档；它们随后由获授权integrator执行，最终状态已在增量C独立回读。

## 增量 B：八项 ordinary-reference 澄清

**通过。** 已完整读 ordinary-reference.patch 和正式八份正文，逐个核对16个本地链接 target，并对读既有后继和对应owner的实际段落。新增引用指向真实机制owner，带fragment的标题可定位；它们不是新的正式演进边。

- 网络：原显式aggregation作为形成时机制保留，后继承接默认聚合；网络opt-in未来方向未自动实施或aligned。
- 文件：旧source/include/exclude及default对象真实采用原文保留，当前patterns/default-excludes从已采用后继恢复；accepted/rejected主旨未减损。
- Lizard：1.24.0、corpus与计数仍为当轮范围；固定来源/完整mapping/独立采用证据不被读成永久禁止patch同步，调查建议仍不是adoption授权。
- Preview：保留历史Core措辞而将现行职责路由到260914与human-output；不直接将原采用句改成历史从未说过的owner。
- Package quality：原required及“本轮不改required”被限定为形成时scope，四项blocking、Package advisory和默认strict聚合未变。
- Gate Markdown lint：原region/required读后继，cache限制限定首次接入，不改完整corpus/advisory或历史测量。
- 逐Checkregion：保留真实输入/共享依赖/保守回退；不把无条件required误当今日default fast。
- 完整Markdown图：warning-only是当次保留政策，后继已有硬失败；完整corpus、parse cache、关闭两项逻辑总量budget方向保留。

此次实际diff仅新增阅读段落，未替换原采用句、历史数字、metadata或正式关系；与原实现者提供的普通链接清单一致。本审查另实际运行`git diff --check -- docs/decisions docs/investigations`通过，但这只证明当次局部whitespace，不替代root最终validate/test-evidence/领域check。

## 最终范围说明

原三内容代理的全量语义阅读覆盖原503份；本独立审查覆盖其全部实际diff、全部非标签编辑及关系提案，并按上文明确的31 active/18 archive/31 Investigation全文与其余相关段落/标签抽核边界交付，**不宣称独立重读原503份全文**。另新增Skill后继1份已完整独立审查，因此总身份边界为原503 + 新1；`../review-ledger.json` 对每个身份逐项保留实际读取层级、baseline与终态事实；`coverage-summary.json` 汇总覆盖和最终生命周期回读。

当前语义发现已全部处置：拒绝tier新前序边，批准27条既有边summary，4处交叉tag补漏已回读，8处普通引用已审，新Skill后继已获用户批准且独立通过。正式发布/归档已由获授权integrator执行，并完成增量C的独立回读。独立机械验收随后全部通过，逐项结果见 `verification.json`。


## 增量 C：最终生命周期独立回读（完成）

- 新 `261026-maintain-distinct-project-skills-with-test-design` 已为 `active / aligned`，具有正式createdAt；修订目标和summary保持批准版本。将status/alignment/createdAt机械还原为candidate/null/null后，完整文件SHA与本审查批准候选一致，证明没有夹带新的采用条款变化。
- 旧 `260812-keep-seven-distinct-project-skills` 已移动到 `/workspace/vibe-check/docs/decisions/archive/keep-seven-distinct-project-skills.md`，状态archived、alignment仍aligned；旧active路径不存在。只将status还原为active后，完整文件SHA与发布前审查快照一致，正文、tags、createdAt及原关系均保留。
- 本审查只读取实际文件并比较既有审查哈希，没有执行publish/archive等写入事务；最终领域check、validate与test-evidence由独立机械验证者另行执行并全部通过，详情见 `verification.json`。

**最终语义结论：通过，无未处置实质发现。** 原503份维护与授权新增1份后继的边界、实际独立全文/相关段落/抽核范围、27条summary通过与1条新拓扑拒绝、4处tag补漏、8普通引用及唯一真实集合演进均已记录。最终 coverage 的 `lifecycleReadbackPending` 为 `false`；生命周期比对通过，详见 `coverage-summary.json`。
