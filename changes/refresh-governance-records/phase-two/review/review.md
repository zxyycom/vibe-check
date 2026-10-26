# 第二轮 AI-ready 独立审查（最终修复复核）

## 结论与实际范围

已审 active、archive 与 Investigation A/B/C 的本阶段 before→final，而非 HEAD 累计差异。先前发现的语义精度问题 R1 已定向修复并由本审查者复核闭合；B/C发现的独立算术边界遗漏（R2/R3）也已由原owner定向恢复，并由本审查者复核闭合。全部504对象已完成明确层级覆盖；没有未闭合实质发现，可进入root集成验证。此结论不证明正式项目校验通过，也不重新证明历史结论今天成立。

| 范围 | 样本身份核对 | 完整正文与阶段差异独立语义审查 | 机械等价覆盖 | 未声称的覆盖 |
| --- | ---: | ---: | ---: | --- |
| active | 127 | 22 | 105 字节未变 | 105 篇未改正文未独立重读 |
| archive | 251 | 9 | 71 仅空行；171 字节未变 | 171 篇未改正文未独立重读；71 篇以非空行序列相同证明纯格式 |
| Investigation A | 40 | 6 | 34 字节未变 | 34 篇未改正文未独立重读 |
| Investigation B | 43 | 11 | 32 字节未变 | 32 篇未改正文未独立重读 |
| Investigation C | 43 | 13 | 30 字节未变 | 30 篇未改正文未独立重读 |

本审查者不是上述修改的实施者。已阅读文档导航、知识治理、AI-ready skill 与完整原则，以及 Decision/Investigation 的身份、固定正文、历史保真和资源契约。详细对象、before/final SHA-256、阶段 patch SHA-256 与每项覆盖层级见 `coverage.json`。当前实际完整独立回读为61篇；71篇纯空行机械等价、372篇未改字节等价，不冒称全部504篇完整重新阅读。

## R1：源码相似度边界改写改变了判断方向（已修复并独立复核）

- 对象：`260903-permit-evidence-backed-host-primitive-optimization-in-lizard-port`，`docs/decisions/permit-evidence-backed-host-primitive-optimization-in-lizard-port.md`，“决策 → 语义与私有边界”第一项。
- before 明确“不以源码文本相似度否定已有 parity evidence 支持的优化”。after 改成“源码文本相似度和少量输出样例都不能替代完整 parity evidence”。
- 问题：前者限制**否决依据**（不能单因代码文本差异否决已获 parity 支持的优化），后者限制**证明依据**（相似文本不能证明 parity），两者并不逻辑等价。其余文本仍允许不同宿主原语，但此具体长期取舍不应依靠读者推导恢复。
- 最小修正：保留输出样例不足的限制，并明确保留“不因源码文本差异否定已有 parity evidence 支持的优化”；不改变候选采用门槛或当前授权。
- 状态：原实施者已定向修复，本审查者完整回读修后正文并核对原 stage before。原有“不得仅因源码相似度否定已有 parity 支持优化”的限制已明确恢复，少量输出样例不足以替代完整 token stream、生命周期、资源和分发验证的边界也保留。
- 变动隔离：以修后文件仅替回原审过的这一句，所得 SHA-256 精确等于此前独立审查记录的 `ad074a9f3a39922c033d2992179b120aef3eeee8df6e469000c08e5beb8ec6be`，证明相对此前审查版本只有该句变化；修后文件 SHA-256 为 `325e139f017cb7317b4264b37aae29656431074218ca6b5acab8812cc9d1dabf`。
- 更新后的 active stage.patch SHA-256 为 `9e859b1a583a59faee40e20581c32fb6f65bafdfaf6ce5c0fd73d9f73ace0be6`；127项before/final哈希及metadata/H2/链接检查再次通过。审查者没有写正式对象。

## R2：完整 Product 与 analyzer/tokenizer 之间的算术边界被删（已修复并独立复核）

- 对象：`260903-remeasure-function-metrics-product-reader-fast-path`，结果节“边界与未获授权项”。
- before 的导航明确“本报告完整 Product time 不可与 direct analyzer、tokenizer 或旧 synthetic batch 的时间相减”。删除导航后，正文保留完整Product所含工作、未isolate各stage、不能将45% analyzer降幅外推Product等限制，但没有完整保留跨measurement layer不可相减这一独立边界。
- 不外推百分比与不能跨层相减毫秒并非同一命题；未来读者可能仍从相邻数据构造虚假的外围成本/可回收时间。最小修正是在结果边界恢复一句跨层不可相减，不恢复重复导航。
- 已由原B owner仅在“边界与未获授权项”恢复一句：完整Product time不可与direct analyzer、tokenizer或旧synthetic batch时间跨层相减。
- 独立复核：去掉该唯一补句可精确重建此前已审SHA-256 `13b0c15814b44ece06efcbce0aeb7adf2d9a374bfabd6c71042685866e14be1f`；修后SHA-256为`f58000c42d771795ad20776da128c0aac9a1a2a39d5de629dd64aec002c2cfd0`。限制恢复且未改变数字、历史结论或授权，R2闭合。审查者未改正式对象。

## B阶段五维与代表性独立阅读核对

B11实际修改均已完整回读改后正文和before→final差异；不是仅审摘要。B43的32项未改由本审查者以before-manifest与字节等价确认，不声称逐份重读。R2修复后没有未闭合实质发现。

- **重心/历史：** Lizard四篇保留其各自测量问题和结论，后继候选顺序另标为后续阅读，没有将staged-generic后继信号回填为原Oniguruma调查的证据；后者形成时仍首选Oniguruma实验。
- **负向边界：** SCC/jscpd删去的目的段被背景非授权、问题清单和行动表覆盖；SCC不能只改pin、jscpd必须直验5.1.1、wrapper skew/配置泄漏仍完整。persistent-library从条件性下一轮候选表达，未增加无条件实施义务。
- **长度/样式：** required Gate新增三阶段摘要与原1–8节一致：合法等待不等于低效、输入闭包修正后两次仍约20.5秒失败、后续优化尚未实施。增量Gate与SCC曲线只将原段首标签提升为H3，数字、完整表格、时间取得顺序及Windows未验边界保留。
- **风险/授权：** cold bootstrap的未引号heredoc事故完整移到实际范围，三次意外root Gate、主candidate可能受影响、缺事故前identity和停止执行均未隐藏；不把“调查原定不修改”说成实际主工作区未触及。
- **精确语法：** collection仅为原路径、globs、数组、probe补代码标记；`literal\name.ts`不同于`literal/name.ts`，`./`仅修候选而非真实名称，lossy byte/合法U+FFFD与Node/Bun Dirent差异未丢失。

| ID | 独立阅读任务与恢复结果 | 答案位置 |
| --- | --- | --- |
| 260901-assess-scc-and-jscpd-upgrade-readiness | 能否仅升SCC pin或选jscpd5.1.0？不能；SCC须独立major迁移与config隔离，jscpd须直验修复skew的5.1.1。 | 结论与行动顺序；SCC/jscpd各结果分节 |
| 260924-audit-incremental-project-gate-selection-and-cold-cost | 48.1秒通过能否抹去70秒失败？不能，后者失效candidate仍失败，随后31秒仅证明热复用。 | 08:38、08:58、09:00–09:01三个同层补测标题 |
| 260926-diagnose-required-gate-head-of-line-wait | 是否应该直接无条件admissible-first？不能；21/29秒竞争反例限制推断，当前待评估优化与已实施选择/指纹修正分开。 | 第1节反例、第7节最后复验、第8节当前建议 |
| 260903-evaluate-persistent-data-structure-libraries-for-admission-core | isolated immutable.List较快能否现在加production dependency？不能；仅继续generic vector时进入library baseline，须完整oracle/workload/retained branches/package验收。 | 结论与建议；隔离测量的含义 |
| 260903-explain-cpython-jsc-lizard-regex-performance-gap | raw8–10×是否因JS解释正则，能否减成Product收益？不是，两侧native；full2.35×层不同且Yarr具体机制未知。 | 双方engine实现；为什么raw/full比率不同；尚不能确认原因 |
| 260914-measure-scc-file-batch-transport-performance | 28,000选择是否Windows真验收？不是，由Linux预注册六ceiling曲线选出，runtime第18项只验证而不重选，Windows仍未验。 | ceiling曲线与选择；最终runtime复测；未验证边界 |
| 260907-recheck-cold-candidate-bootstrap-gate-import | 能否断言主工作区未触及且Bun缓存为唯一根因？不能，事故独立披露，observer反例未闭合唯一根因。 | 范围/实际执行中的边界例外；已确认事实第5项 |
| 260903-survey-lizard-host-acceleration-candidates | Onig真实TS raw parity是否27-reader/full Product采用证明？不是，compile与raw parity、推断和未验证资源/全reader边界分开；后继排序不倒写原轮。 | Oniguruma raw-scan spike；证据状态；后续阅读 |

B阶段机械补查：43项frontmatter（含title/question）逐字保持；全部资源节逐字保持，固定前四H2与附件第五H2保持；现有表格行/顺序和代码围栏逐字保持（required Gate仅新增三阶段表）。普通导航链接可随去重收敛，资源引用不变。阶段patch SHA-256为`965556fe7e604761871d10ddeda1d4e772d0a47a1843f1b3c27e6eb04ed88313`。

## R3：跨实验算术边界被删（已修复并独立复核）

- 对象：`260903-diagnose-lizard-typescript-port-performance-gap`，原“不能比较或相减”导航条款。
- before明确 sampling inclusive time、独立family warmed observations、dispatch microbenchmark与正式ABBA wall samples不是同一实验，不得相加总差距或相减求其它阶段成本。删除后正文只在profile和family处分别限制相加，没有保留跨这些不同实验相减推导其它阶段的限制。
- 例如234.42ms dispatch microbenchmark与632.22ms正式operation不能据此相减得到剩余core成本；已有“不代表正式before/after”限制不能替代此具体算术边界。
- 原C owner已仅在方法末恢复一段：sampling inclusive time、独立family warmed observations、dispatch microbenchmark与正式ABBA wall samples不是同一实验，不得跨实验相加总差距或相减求其它阶段成本；没有恢复导航。
- 独立复核：去掉这一唯一新增段可精确重建此前已审SHA-256 `52a68c8af5d8b81e4047981485a2c1367fd2b14c08e098e9241585aafcf1756c`；修后SHA-256为`1fa7eebe738dae0dc5cc22fc708cdd961be35364f3df0a6fbb1a6f9f9c582f86`。完整独立边界恢复，未变更数值、历史判断或后续门槛，R3闭合。审查者未写正式对象。

## C阶段五维与代表性独立阅读核对

C13均已独立完整回读最终正文（含长表/代码/资源节）及全部before→final差异；C30未改由manifest/hash/字节等价闭合，不声称完整重读。R3定向修复复核后没有未闭合实质发现。

- **重心/历史状态：** admission state、extension和简单算法的通用owner/重复否定收敛后，复杂度条件、实测不足、未恢复默认、实际未采用与后续不确定性仍完整；没有将调查方案提升为当前采用方向。
- **授权与证据强度：** regex/backend报告原“不采用/不安装/switch/fallback”仍在“当轮停止事件与授权边界”逐项明确；该节还要求新动作由当前请求授权、Change承接。结果“形成时行动优先级”也重申两条路径不是采用/依赖/runtime变更授权。故删掉后段重复非授权句没有产生自动实施授权。
- **独立算术边界：** real-TS hot-path删掉的重复导航在stage observations仍明确不能相减/相加，Python profile处仍明确不可跨采样比较；real-TS analyzer复测在“为什么旧数值同量级”保留4,636.53ms与715.11ms不能相减归因。它们不同于R3的遗漏。
- **question保真：** Core/package-tools唯一question编辑不新增事实。旧question预设修复/正反证据尚未完成，但同一before正文已记载修复、import-equals补漏和独立正反fixture通过。新question询问原因、定向修复及独立性可支持程度，与原结果一致；完整Gate/Change/包/发布尚待主线的边界未变。
- **迁移与样式：** 删除读取让步报告root接纳/临时收尾/Git finalize接力没有删掉真实preliminary/final产物、资源重构、原始证据或未知；Markdown库报告删“形成时读取已完成Change”的后置修饰与背景“尚规划”一致。H3/H4分组和regex表格空格压缩保留既有数值、顺序、单元格及围栏。

| ID | 独立阅读任务与恢复结果 | 答案位置 |
| --- | --- | --- |
| 260903-assess-admission-state-performance-and-selection-index | successor O(1)是否selection O(1)？不是，Q_select条件化公式及catalog/边界最坏组合仍在，index是未选未实施推断。 | 成本来源与适用复杂度；单一selection index推断 |
| 260903-assess-lizard-extension-adoption-value | nd是否天然替代ns，是否可直接恢复20项？不是，ND更广含条件复杂度，二选一是产品policy，默认不恢复且后续需consumer与明确授权。 | shortlist；逐项表；用户决定事项 |
| 260903-compare-lizard-regex-backends-and-analyzer-cost-allocation | Node5倍是否已切runtime或Onig已采用？没有；analyzer-only128.79/636.85ms与冷import99.20/26.34ms分开，当轮未启动go/no-go、未采用Onig；今天需新请求授权。 | 当轮停止事件与授权边界；bounded Node/V8 control |
| 260904-audit-project-gate-function-metrics-check-overhead | microtask control是否可直接改生产取消语义？不可以，只定位resource-test timer成本；默认真实yield/cancel/Worker证据是独立验收条件。 | 测试lane H4；P0建议与证据边界 |
| 260908-compare-simple-admission-algorithms | BnB无makespan退化是否已获采用？没有，成本失败且secondary未完整认证，LPT-seeded协议偏差明示。 | 核心结论；方案表；成本证据 |
| 260912-investigate-core-package-tools-boundary-validation-gap | 当前报告修复是否仍只在计划？不是，原正文已记载独立复核通过；只证明定向candidate边界，不证明完整Gate/发布。 | 定向修复与验证演进；独立复核与覆盖边界 |
| 260924-measure-and-cache-markdown-lint-findings | 热cache是否保证冷required达20秒？没有，两次失效candidate29,216.9/34,785.7ms失败保留，热通过不能覆盖。 | 第一次完整工作树复测；再次复测；剩余边界 |
| 261011-verify-function-metrics-admission-implementation | 删除root收尾声明是否删验收转折？没有，初步/最终exact产物、全部样本、FD/Worker与EOF探针、43Gate以及跨平台未知完整保留。 | 初步采用证据；最终精确产物与验收；未覆盖范围 |

C机械独立核对43项before/final哈希与共享manifest；仅Core/package-tools question允许变动，其余frontmatter全字节相同；四核心及所有H2名称/顺序、资源整节、inline链接目标顺序、fenced代码和表格单元格内容/顺序全部保持。C初审patch SHA-256为`7500288440b5b31824e108eef106763105a9d5487b1fc98d5fde6524950ff9ab`。

## 重点保真判断

1. `261026-maintain-distinct-project-skills-with-test-design` 的有限八项、六个完整上游/两个本地、扩大须新Decision、普通使用不新增安装及测试设计/证据审查互补仍可恢复。H3分组没有把附属条款降为可选建议。
2. `260909-select-admission-optimization-by-effective-opportunity` 的最后一项仍指**形成时那个 learned optimization Plan**，须先重基线/审阅再进入对应实施阶段；没有扩成所有未来Plan的通用门槛。
3. `260908-allow-channel-only-diagnostic-filenames-in-invocation-controls` 删除的固定全局名/布局/旁路/事后rename排除项分别被背景及采用条款覆盖；exclusive-create及调用方独占责任保留。默认聚合与0.0.x的删减同样未移除独立约束。
4. 三篇Scheduler长归档只加H3，去除H3和空行后非空条款完全不变；早期policy、measurement和strategy lifecycle没有倒写为后来API。
5. 首发Gate归档保留local candidate→完整Gate/partial/progress→公开发布顺序；计时不进入Record/aggregation的约束合并仍在。registry、凭据、publish非授权未被“正向描述”删掉。
6. cache packing 的question收窄仍以原调查的正式cold失败、direct API和storage microbenchmark三个不同层级回答；32未测、增长/并发未知和正式cold +34.26%未通过均保留。
7. Momoa的“已选/已安装/strict spike”与“尚未实现jsonValidation/工程未验收”分开；UTF16 10与UTF8 12及license text缺失不变。
8. Fortran删除的是重复导航，不是slice自身的scope、推断或停止理由；不可跨层加减已移入结果。local HEAD五次运行表的所有数量、耗时、目录和非严格配对限制逐项可对应。

## 代表性独立阅读任务

| ID | 任务与恢复结果 | 答案位置 |
| --- | --- | --- |
| 261026-maintain-distinct-project-skills-with-test-design | 能否因第九项职责独立就安装？不能，须新长期Decision，独立性不等于安装授权。 | 决策/有限集合与独立职责；来源与更新 |
| 260903-permit-evidence-backed-host-primitive-optimization-in-lizard-port | profiler高占比是否支持直接切WASM？不支持，尚未预选引擎，须独立候选语义/资源/打包/同workload证据和当前授权。 | 每个候选的采用门槛；未来方向与实施授权 |
| 260903-introduce-invocation-scoped-admission-strategy-lifecycle | complete能否反向改变同次decide或再次调度？不能；Scheduler terminal delivery后才调用，prepare/complete在外层。 | 单次策略准备与纯选择；终态交付与learned状态 |
| 260902-extend-invocation-local-scheduler-performance-summary | 三类peak能否相加为total peak？不能，不同时点；fingerprint相同也不证明host/callback相同。 | 队列压力与采样边界；比较身份与诊断边界 |
| 260903-analyze-markdown-link-cache-packing | microbenchmark是否通过formal cold gate？没有；只有正式Check历史基线可判断，仍+34.26%。 | 调查范围与依据/正式Check历史基线；调查结果/确认事实 |
| 260824-confirm-momoa-with-bun-and-candidate-spike | parser spike是否证明public jsonValidation已交付？没有，产品实现与完整工程验收列为未覆盖。 | 未覆盖的产品与工程验收 |
| 261024-diagnose-gate-p95-test-discovery | 后续all通过是否证明发现器独自造成全部P95改善？没有，局部同树收益与随后一次all分别给出且保留归因限制。 | 局部验证与归因边界；同轮后续完整验收 |
| 260924-review-local-head-gate-selection-and-document-inputs | 五次Gate耗时能否支持稳定收益？不能，热候选/工作树/选择/负载非配对。 | 顺序运行观察与验证表及紧随限制 |

## 机械检查与边界

本审查者运行自有 `build-coverage.py`、`build-b-coverage.py` 与 `build-c-coverage.py`，核对504项before哈希及writer final哈希与当时稳定文件一致；Decision frontmatter全字节保持；A40除title/question允许字段外metadata保持；固定H2顺序保持；Decision/A/C的Markdown链接目标及顺序保持，B的普通导航链接可随去重收敛而资源整节与链接保持。71项空行修改用非空行序列比较，不以writer的“仅格式”声明代替证明。

没有运行历史分析脚本、联网重验、产品/代码测试、安装依赖、正式索引同步、项目全集校验、Git暂存/提交/推送。资源链接保持不等于独立复核所有资源字节或历史实验。正式项目验证由root集成执行。

全部504对象已有明确覆盖层级，R1/R2/R3均已修复并独立闭合。正式项目机械验收及资源全池字节保护仍由root承担。

## 最终证据收口与集成边界

- 将全部504份当前SHA与此前独立coverage比对：仅R2/R3两个目标变化；分别去掉新增句/段后精确恢复原审过的SHA，未发生其它正式正文漂移。
- 重新执行三个自有coverage脚本与`final-check.py`，504份before哈希仍匹配原manifest与审计，当前哈希匹配更新后的五分区audit。before没有被修复过程重建。
- 五份stage.patch均由本审查者解析并在内存中应用到对应before全文，结果逐字节等于当前正式对象；不是只接受作者的反向检查声明。五分区计数仍为active22、archive80、A6、B11、C13，共132修改；其中61篇语义/标题修改已完整独立回读，71篇纯空行机械等价，372篇未改字节等价。
- B新增五维字段43/43均为非空显式`focus/negative/migration/length/style`；已逐项阅读并与各项原具体no-change理由/保真关键对照，无矛盾或改成新采用方向。11篇改动项还与本审查者已完整读取正文核对；32篇未改项仅复核审计描述与字节保持，不把writer逐篇判断冒称自己的全文复审。

| 分区 | 最终stage.patch SHA-256 |
| --- | --- |
| active | `9e859b1a583a59faee40e20581c32fb6f65bafdfaf6ce5c0fd73d9f73ace0be6` |
| archive | `d65905843aca047a4731090d63f61ff6f29293060c8f800ec261984acb558eaa` |
| Investigation A | `86450211f7c7ca417fa8957e5bd9f502350642033afdbfd879d4da845b99f91e` |
| Investigation B | `6f95e7215a741f470607559046c9fcbcb8cd6a4a004b2dbb93136c8a7e43cb78` |
| Investigation C | `d558479f299c9157c2f9ff1abee59908624bcac905ea491361d22fcd675a1777` |

独立审查结论：可进入集成；没有未闭合实质发现。完整对象哈希及修复状态见`coverage.json`，内存patch验证结果见`final-verification.json`，三处实际定向变化分别保存在`r1/r2/r3-correction.patch`。

未覆盖边界不因上述通过而消失：372篇未改正文及71篇纯空行篇章没有被本审查者重新全文语义审阅；未重验历史事实、上游状态、资源内容真实性或全部附件字节；没有执行历史代码、产品/工程测试、安装依赖、联网、索引同步、正式Decision/Investigation/materials/Test Evidence验证、Gate或Git写入。当前owner/实现一致性、正式投影及全资源池保真由root集成工作另行证明。本审查只保证本阶段所实际覆盖的表达调整及修复保真，不构成新的方向、任务或实施授权。
