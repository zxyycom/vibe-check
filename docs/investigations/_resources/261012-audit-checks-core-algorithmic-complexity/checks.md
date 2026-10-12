# Check 切面：完整覆盖与算法复杂度审读

本资源属于 `261012-audit-checks-core-algorithmic-complexity`，不是独立调查报告。取证日期 2026-10-12。只调查，不实施优化；没有修改 Product、测试或 Case，没有安装依赖、写 Git 或写外部系统。

## 范围、证据等级与变量

盘点 `/workspace/vibe-check/src/package-checks/**` 的 **201 个生产 TypeScript 文件**，排除 `.test.ts`、`.type-test.ts`、`.test-support.ts`、`test-support/`、`fixtures/`。其中 **155 文件完成运行时体/边界审读**；FunctionMetrics analyzer 的 **46 文件仅 preliminary**，最终语义深审以同轮 `analyzer.md` / `analyzer-coverage.json` 为准，本资源不对它们重复编号。文件数不是语义证明；具体审读层级、分组、相关候选和依据见逐文件 `checks-coverage.json`。

先恢复 AGENTS、navigation、architecture、各 Check guide、scanner-dependencies、project-files、markdown-link-resolution 及 investigation-report/subagent-orchestration 规则。调用关系优先用 CodeGraph node；工具描述中的 explore 运行时不可调用，索引节点不足处使用限定路径的源码读取/rg。使用 TypeScript AST printer 阅读运行时体时不保留类型、import 和注释，疑似热点再核对原行号；不以类型声明文件数冒充算法分析。外部库仅核对直接调用边界，不宣称已审计其完整算法；markdownlint front-matter 特别核对了本地库的实际入口。

- **E1**：声明/文档或入口事实；不能证明引擎成本。
- **E2**：当前源码和实际调用链支持的操作量推导。
- **E3**：E2 加有界真实生产回调/属性/进程调用次数；不是时间基准或收益预测。
- **U**：外部引擎/运行时字符串与 RegExp 优化等未审计；明确未知。

变量：F=候选/选中文件数；A=area 数；P=有序 glob pattern 数；M=Σarea 文件数（含重叠）；B=读入字节数；D=路径分量数；n_d=目录 d 条目数；q_d=对 d 的名字查找次数；R=扫描器 fragment/finding/Record 数；L=每 fragment locations 数；a=一个路径匹配的 area 数；U=函数数；H=目标 heading 数；Q=对该目标的 anchor 查询数；J=JSON bindings 数；V=远程 schema URI 数；C=缓存文件字节数；b=一个 SCC batch 的文件数；r=reminder 数；k_i=第 i 个 reminder 的基线 first-parent 索引。Map/Set 的期望近似常数按常规模型使用；字符串处理成本另计字符数，绝不默认所有 regex 或第三方扫描器线性。

## 结论分级

| ID | 根因 | 分类/证据 | 触发维度 |
|---|---|---|---|
| K01 | collection 缓存目录数组但每次按名字全扫 | 当前、确认静态超线性，E3 | Σq_d n_d；平目录精确路径 N² |
| K02 | collection subtree pruner 重建每个路径前缀 | 当前、确认静态超线性，E2 | 每次咨询的 D² 分量/字符复制 ×政策 |
| K03 | Markdown containment 每步复制剩余路径分量 | 当前、确认静态超线性，E2 | 每次 walk 的 D² 数组复制 |
| K04 | duplicate area 交集 filter × some | 当前、确认静态超线性，E3 | R(L−1)a² 比较 |
| K05 | anchor 逐次线扫全部 headings | 当前、确认静态超线性，E3 | 同一目标 QH；Q≈H 时二次 |
| K06 | maintenance reminder 重复测量重叠历史 | 当前、确认结构性重复外部工作，E3 | 2+r+Σk_i 进程，当前逐条串行 |
| K07 | SCC argv 候选前缀反复复制/求和 | 固定 budget 内有界重算，E3；**不是无界总 F²** | Σbatch b²；28,000 code-unit ceiling |
| K08 | 同一 JSON instance 的多 schema binding 重读/严格解析 | 确认重复工作，E2；是否可复用须决定 freshness | Σbinding B_instance + 每 schema 必需验证 |
| K09 | 可选 Markdown parse cache 全量恢复历史 JSONL | 容量/跨 Run 增长风险，E2 | 每 Run O(C+历史 facts)；持续追加时累计可二次 |
| K10 | duplicate 在 cache disabled / <2 文件分支前仍 fingerprint 全内容 | 线性但可能大常数/峰值，E2 | O(B+F logF)，无 fingerprint 字节预算 |
| K11 | duplicate distinct locations 成对比较 + suffix slice | 静态 L²，但默认扫描器 L=2；潜在输入形状，E2 | trusted raw cache/private seam 多 location |
| K12 | markdownlint frontMatter 多行未闭合输入搜索 | **未确认运行时阶数**，E2+U；不称已证 ReDoS | 多个 `{` 开头、无闭合 `}` 的文档 |
| K13 | Markdown bounded read 每文件按上限预分配 | 有界配置常数/分配压力，E2 | Σread (maxBytes+1)，非实际文件大小 |
| K14 | MarkdownLint sort comparator 每次构造冻结 range DTO | output sort 内常数分配风险，E2 | O(R logR) comparator 级 DTO 分配 |

前三类应分开看：K01/K04/K05 有自然输入轴和真实调用计数；K02/K03 受宿主路径长度制约；K06 主要是 process/I/O 重复，不知道 Git 单次复杂度；K07、K10、K13、K14 不应包装成“全流程二次算法”。没有测量完整 Check latency，也没有测量优化收益。默认 A=1、L=2、缓存关闭时，多个潜在维度不触发。

## 当前确认超线性与结构性重复候选

### K01 — 目录名查找对宽目录反复线扫

- 位置：`CollectionDirectoryAccess.targetEntry`，`/workspace/vibe-check/src/package-checks/project-files/filesystem-collection.ts:92-113`，核心 `:98`。由 adapter `lstatSync(:57-58)`、`readTarget(:84-90)`、`readEntries(:140)` 进入；`collectProjectFileSets` 调用实际 fast-glob 适配器。
- 事实/推导：目录条目缓存一次 readdir，但 `readEntries(parent).filter(candidate => candidate.name === part)` 每次扫描全部 n_d 条目。时间 Θ(Σq_d n_d) 名称比较，匹配后还有 fidelity 检查；数组/filter 分配量 O(Σq_d)，缓存空间 O(目录条目+名字字节)。N 个同目录显式普通文件会 q=N、n=N，Θ(N²)，不是“N 次磁盘读”。名称字符串比较长度可再乘常见比较前缀。
- E3：实际 `collectProjectFiles` 对32/64/128个空文件精确 patterns，分别32/64/128 selected，计数1024/4096/16384。没有替换 collection，也没有 fake scanner。
- 边界/规模：平目录成百上千文件、许多静态路径/目录起点；广泛 glob 的具体 q 由 fast-glob 调用策略决定，不外推每种 glob 都 N²。
- 最小方向：operation-local 目录名字索引（name→原始 entry 列表），而不是换一个 walker。必须保持同 spelling 的 raw byte/fidelity 校验、真正 U+FFFD 与有损 UTF-8 冲突、no-follow、必要 I/O 错误透明、lazy lstat 与每目录一次获取，不创建跨操作文件系统事实。

### K02 — subtree pruner 复制全部增长前缀

- 位置：`createSubtreePruner`，`/workspace/vibe-check/src/package-checks/project-files/filesystem-collection.ts:213-230`；`:226-228` 在每个 selection 内 `split` 后对每个 index 做 `parts.slice(0,index+1).join('/')` 再匹配 excludes。
- E2 推导：D 个等长分量、必须检查到末尾的路径，slice 总分量复制 D(D+1)/2，join 总字符量同阶；每次 consultation Θ(D²) 复制，加 Σprefix/政策/exclude 的 matcher 工作。峰值 O(路径字节+最长前缀+已编译 policies)，累计短命分配 Θ(D²)。policy `.every` / prefix `.some` 可短路，最坏边界是前面不命中且无法证明 prune。
- 规模：D约50–500的生成深目录/大量对应文件（仍受 OS 路径限制）；Node Dirent 与 Bun bare-byte entry 的 mayBeDirectory 分支影响 consultation 次数，不把深度成本错算成全 F²。
- 最小方向：迭代积累前缀或复用分量边界，至少避免每步复制前缀数组；若 JS 拼接最终仍 flatten，须实际量测，不宣称字符串拼接自动线性。保持末段否定 glob 的安全子树规则、默认固定 excludes、任一 selection 有需求即不能剪枝、native reinclude。

### K03 — Markdown containment walk 复制剩余分量

- 位置：`advanceContainedPathProbe`，`/workspace/vibe-check/src/package-checks/markdown-link-validation/filesystem-probes.ts:53-75`，`:57` `[segment, ...remainingSegments] = state.pendingSegments`。source reader 和 link direct-target resolver 都调用 walk；MarkdownLint 也复用此安全读取。
- E2 推导：无 symlink 的 D 步 walk，rest 每次复制 D−1…0，Θ(D²) slot copies，峰值 O(D)，累计分配 Θ(D²)；每步构建绝对路径另有增长前缀字符串成本。真实 filesystem probe 至少 O(D) 必要；二次数组复制不是安全要求。symlink replacement 的 pending concatenation 另计，最多40次跟随预算；不能把 ignore/report 外部目标算为已执行 I/O。
- 规模：深 source 或许多 deep local links，Q 次授权仍按当前 live probe 契约独立检查。D受宿主路径长度约束。
- 最小方向：index/cursor 遍历，同一 state 持有分量数组，只在 symlink 重写边界重新组织；不得把“已解析 facts 的 memo”改成省略后续 filesystem authorization。保持项目 root containment、缺失/权限失败、symlink 类型与预算、目录最少一个 entry 的判断和 final-leaf 安全打开。

### K04 — 重叠 area 的相交二次

- 位置：`annotateFragment`，`/workspace/vibe-check/src/package-checks/duplicate-detection/area-policy.ts:67-103`；`:83-88` 的 `commonPolicies.filter(...pathPolicies.some(...))`。`buildPathPolicies(:45)` 已有 path→area数组，但没有 area-ID membership Set。
- E2/E3：L 个 locations、每个路径都在 a 个相同顺序 areas，后续 L−1次交集要 a(a+1)/2比较；R fragments 上界 O(R(L−1)a²)，加建索引 O(M)、结果 area 排序 O(Ra loga)。空间 O(M+RL+Ra)，短命相交数组每location O(a)。实际一个2-location fragment与32/64/128共享areas，比较528/2080/8256，完全保留 accepted fragment。
- 边界/规模：默认一个 project area无二次影响；50–500大范围重叠area、很多fragments才能放大。重复 findings 输出 R 本身不能消除。
- 最小方向：每 path 的 area-ID Set / Map求交，目标 O(M+RLa+Ra loga)；保持所有 locations 必须同时在共同 area、共同政策中的最严格 minimumLines/minimumTokens、sorted unique codeAreas、outside-common-area 排除和 exact input fail-closed。

### K05 — Anchor 查询重扫 headings

- 位置：`anchorResolution`，`/workspace/vibe-check/src/package-checks/markdown-link-validation/local-resolution.ts:206-214`，核心`:211` `headings.some`；`resolver-engine.ts` 的 same-document 与 memoized cross-document facts都进入。
- E2/E3：一个目标有H headings、Q个 missing/末项slug查询，Θ(QH) slug访问；balanced Q≈H形成二次。peak无需QH内存（O(H+Q)事实/结果），但 missing findings/Records仍O(Q)必要。实际H=Q=32/64/128 getter计数1024/4096/16384。
- 边界/规模：默认每文档1MiB、每Check maxOccurrences10,000；hard配置上限16MiB/100,000 occurrences。1,000 headings+1,000 same-doc links很容易小于1MiB，100万比较；10,000各约1亿。缺失 anchor /共同目标放大；良好最前slug命中短路。targetRead预算不限制same-doc lookup。
- 最小方向：对不可变 parsed facts建 invocation-local slug Set，一次O(H)再O(Q)查找；保留 GithubSlugger collision规则、same/crossdocument flags、URL fragment decoding、source ranges、findingreason及顺序。不需要改变持久 cache payload/API。

### K06 — Reminder 串行重测重叠历史

- 位置：`executeMaintenanceReminders`，`/workspace/vibe-check/src/package-checks/maintenance-reminders/maintenance-reminders.ts:266-299`，先2次HEAD/history command，再`:284`逐entry `await measureReminder`；`resolvedBaseCommit` / `measuredChangedLines`，`/workspace/vibe-check/src/package-checks/maintenance-reminders/measurement.ts:49-64,77-92`。
- E2事实：每reminder一次rev-parse，`history.commits.indexOf(baseCommit)` O(history length)，slice k_i，然后**每commit串行一次diff-tree**。没有本次Run/base/commit测量memo。进程数精确正常路径为 **2+r+Σk_i**；wrapper时间 O(history output+r*history length+Σk_i+Σ重复numstat字节)，实际process启动与Git计算未知。若r≈history长度且基线范围平均约history/2，进程数二次；固定r也会对所有共同commit重复r次。峰值 O(history length+最大stdout+assessments)，slice O(k_i)；每command stdout64MiB上限，非总Run预算，无独立超时，依赖caller signal。
- E3：fake Git、真实Check execute hook，history4项、3条相同baseIndex3：总14次process，9次diff-tree，每个新commit重复3次；执行顺序记录于observations。没有测真实Git历史，也没有任何Git写入。配置只有commits limit仍测changedLines，因最终data要求该字段；不能擅自省略其证据。
- 规模：10–50提醒、相同或相近数百/数千commit基线，无提醒数量/历史长度cap时放大明显。
- 最小方向：本次 invocation构建commit→index；按固定history计算一次每commit numstat与prefix sum，并memo相同base resolution，或有界lazy memo保留取消/failure传播。保持first-parent每commit `commit^` 语义、累积add+delete而非净diff、root/mergeGit失败映射、safeinteger溢出、声明order、advisory/enforcing与完整changedLines数据。一次Git范围命令替代有语义风险，不能未经验证当等价。

## 有界重算、重复读取与容量候选

### K07 — SCC batch 内增长 argv 反复计量（有界）

- 位置：`planSccBatches`，`/workspace/vibe-check/src/package-checks/file-metrics/scc/batch-planner.ts:24-55`，`:42`复制prefix，`:45`重建整个argv并由`:16-20`reduce累计。每文件还先检查单path是否超预算。
- E2/E3：一个b-file batch总复制/visits O(b²+fixedArgs*b)，峰值O(b)。32/64/128输入处于一个batch，真实reduce visits622/2270/8638。**ceiling固定28,000，单path最少消耗有限正codeunits，所以b_max固定；任意总F的上界是O(F*b_max)，不把整个F当无界二次。** 若私有测试seam改变ceiling，才另有budget轴。
- 规模/方向：短path很多的batch有数百/数千prefix visits；是否值得改需量测，不说明ms收益。滚动累计cost+push，保留保守UTF16双倍转义/引号/空格/NUL计量、path单独超限失败、稳定原序batch、exact coverage无交叠、不暴露scannerarguments。版本probe1次+每batch一个串行SCC进程是必要transport结构，外部扫描复杂度未知。

### K08 — 多 schema binding 的同 instance 重读

- 位置：`validateSchemaBindings`，`/workspace/vibe-check/src/package-checks/json-schema-validation/execution-stages.ts:108-145`，`:116`遍历bindings；每次`validateBoundDocument(:154)`在`:160-163`重新`readStrictJsonDocument`。options拒绝重复(path,schemaId)但允许同path多个schemaID。
- E2：s个schemas绑定同一B-byte instance，读/UTF8/Momoa strict parse/AST两遍materialization O(sB+ΣAST_s)，峰值单份document+validatorerrors；schema对每个binding的验证**必需**且Ajv复杂度未知。实例读重复确认，不等同bug：源码/owner未明确跨binding同一内容快照，当前逐次读取观察可变FS。
- 规模：10–100 schemas验证同一大instance（默认byteLimit1MiB，可配置）；如果B小或每path只一个schema没有放大。
- 最小方向/决策：先决定本次Check是否承诺coherent instance snapshot，再设计 invocation-local document memo或identity-checked读取复用。不能只加cache而默改并发修改下的行为；必须保持selected exact membership、schemaID pair唯一、duplicate-key/BOM/UTF8/byte-limit规范、required/optional binding处理、schema编译错误与issue count完整。

### K09 — 可选 parse-facts cache 跨Run容量增长

- 位置：`MarkdownParseFactsCache.#restore` / `#publish`，`/workspace/vibe-check/src/package-checks/markdown-link-validation/parse-facts-cache.ts:77-123`。`:82`readFile整JSONL，`:100`split全行，逐行parse再map全部valid identities；`:119`append完整dirtyblock，没有总文件/版本/identity cap和compaction。
- E2：单Run O(C+历史facts验证/保留)时间与内存（整bytes、decodedtext、lines、facts可同存）；如果一个文档每Run变更产生固定大小record，C_v∝v，V次Run累计恢复量Σv≈V²。**不是一次Run内相对当前document大小二次**；默认disabled，trusted caller目录容量是owner边界，不是已证明安全漏洞。每payload约束facts上限100,000/文档文本16MiB，不限定文件总量。
- 规模：长寿命CI/developer cache、频繁内容digest变化、大docs；即当前输入很小也可能恢复大量过时身份。低磁盘/巨大JSONL是资源风险，不宣称已发生故障。
- 最小方向：显式admission/容量策略或compaction/latest保留（需owner定有效性）；保持last-valid-line-wins、identity绑定当前bytes和policy、malformed/version/partial-tail隔离、one awaited append block、取消不能发布、best-effort cache不改变settlement。缓存命中仍需当前bytes读取和live authorization，这是必要安全工作。

### K10 — Duplicate 关闭cache仍读取全输入fingerprint

- 位置：`prepareExactInputSet`，`/workspace/vibe-check/src/package-checks/duplicate-detection/execution.ts:126-144`，`:132`调用`fingerprintProjectFiles`；执行`:59`在 `<2` 分支与cache检查前。`/workspace/vibe-check/src/package-checks/project-files/file-fingerprint.ts:12-47`稳定sort后逐文件readFileSync UTF8+LF normalize+SHA256（只把returned fileList截断200，不截断hash输入）。同时每次getGitSha。
- E2：O(FlogF+B)必要于启用cache的exactcontentidentity，关闭cache时仍发生；peak至少最大文件bytes/string/normalizedstring，未设fingerprint byte budget。这里只是多一遍线性读取和git，非二次。外部jscpd随后再读取文件，可能IO重复。
- 边界/方向：大binary/大文本集合、cache disabled、仅一个很大selectedfile都会发生；1–100MiB级单文件即可造成分配，实际吞吐未知。考虑无cache分支不构造仅用于cache的identity，先查DTO/private scanner输入是否仍需fingerprint/commit；保持exact selection、LF规则、不可读sentinel和后续scanner fail-closed，不能把不可读解释成成功空。

### K11 — 多location distinct检查的潜在二次形状

- 位置：`locationsAreDistinct`，`/workspace/vibe-check/src/package-checks/duplicate-detection/records.ts:147-152`；每location slicesuffix并逐对比较，validation在cacheacceptance、areapolicy、conversion等多处调用。
- E2：Ldistinctlocations，L(L−1)/2比较，suffix复制同阶，peakO(L)，累计Θ(L²)，Rfragments按ΣL²。正常jscpd `parseJscpdLocations` (`/workspace/vibe-check/src/package-checks/duplicate-detection/jscpd/json-report.ts:79-89`) **固定firstFile+secondFile，L=2**，含custom command仍走该grammar。trusted localraw-cache grammar/private seam可接受任意≥2，因此仅潜在generalizedinput，不作为当前默认扫描瓶颈。
- 规模/方向：缓存或未来真实多locationadapter有数百/数千locations时放大；可Set精确三元组或一次稳定排序+邻项distinct，保留同path不同lines可合法、duplicate拒绝整fragment、精确line一致性、既有stableRecord/waiver身份。不要把其他已按排序邻项检查的waiver identity误报为同问题。

### K12 — MarkdownLint front-matter regex：未确认引擎阶数

- 位置：`FRONT_MATTER`，`/workspace/vibe-check/src/package-checks/markdown-lint/adapter.ts:6-7`；`lintMarkdownString(:28-41)`传给markdownlint。额外限定本地依赖入口 `/workspace/vibe-check/node_modules/markdownlint/lib/markdownlint.mjs:123-136`：先`content.match(frontMatter)`，匹配后才判断`!frontMatterMatch.index`。
- E2事实：regex以`m`多行flag、`^`不是absolute-start guard，JSONfrontmatter分支有`^\{...$[\s\S]+?^\}`，多个开头`{`、没有闭合`}`的合法markdown文本可构成逐候选start扫remainingtail的传统backtracking模型。模型上存在O(N²)字符尝试解释，**未做regexengine operation instrumentation/计时，Bun/Node可能有优化，因此不确认运行时Θ或ReDoS结论**。markdownlint其它rule算法也未知。
- 边界：默认maxMarkdownBytes1MiB，hardmax16MiB；限制字节不等于证实regex时间预算，adapter异步Promise不等于CPU可抢占。没有称任何生产hang已观察。
- 下一步：单独隔离本表达式，在lockedBun/Node验证未闭合fixture的增长，再确认完整backend路径。若成立，absolute document-start前置检查/anchoring最小化候选start；需保留3种frontmatter、行尾/空白、closure和“不从后面行移除frontmatter”现有语义。此轮不修改pattern。

### K13 — Markdown bounded read 的maxBytes分配

- 位置：`readBoundedBytes`，`/workspace/vibe-check/src/package-checks/markdown-link-validation/filesystem-probes.ts:159-171`，`:163`分配`new Uint8Array(maxBytes+1)`，成功再slice实际bytes。sourceLink/targetLink/MarkdownLint共用。
- E2：每tinyfile仍分配limit+1，Θ(limit+actualbytes)分配模型（宿主物理页/zeroing可能懒实现，实际CPU未知）；peak一个fullbudgetbuffer+copiedactualbytes，累计F个tinyfile约F*limit分配。默认1MiB、hard16MiB，10,000tinyreads按构造byteLength累计约10GiB（非峰值/非实测RAM）。不同于Secret/strictJSON按identitycheckedsize分配。
- 最小方向：chunked bounded增长/identitycheckedsize预读，必须retain maxBytes+1溢出证据、read-to-EOF、并发增长/替换、安全open、无follow、原因映射。不得为减少buffer而重新引入无界readFile；实际页压力须量测。

### K14 — MarkdownLint 排序期间重复DTO冻结

- 位置：`compareFindings`，`/workspace/vibe-check/src/package-checks/markdown-lint/records.ts:110-124`，每comparison`:115-116`调用`publicRange(:125)`，创建range与两个point对象并freeze；最终发布`:77`再创建一次。
- E2：Rfindings稳定sort O(RlogR)合理，额外O(RlogR)组rangeDTO短命分配而不是O(R)；peak依sort/GC行为未知。规则catalog9项固定，因此其他`.includes`/`.find`不是可扩张rules×R二次；maxFindings10,000默认是在backend结果后检查，不证明backendrawresult≤limit。
- 最小方向：comparator直接比较raw line/range数值，DTO只在最终Recordmaterialization一次；保留当前nullrange fallback、line/column/规则rank/path顺序、ordinal、waiveridentity。低优先待量测常数，不把sort本身列作bug。

## 所有 Check 的实际调用与必要成本

| Check /生产文件数 | 实际work链与当前成本 | 不应省略的边界/未知 |
|---|---|---|
| duplicateDetection /25 | authoring→options→batcharea collection→union→fullfingerprint+git→jscpd availability→raw cache或一次union scan→exactSet验证→commonareapolicy→canonical identities+stableRecordsort→waiver→records/messages。wrapper O(M+FlogF+B+RlogR+Σlocation/stringwork)，额外K04/K10/K11。 | jscpd扫描/候选产生/worker算法U；scanunion后filterarea可能先产大量crossarea candidates，输出敏感；stdout64MiB/600s不限制JSONreport文件整体readFile+JSONparse。缓存只是省scanner，不省当前bytesfingerprint/availability/area annotation。stableStringify的当前identity浅且fileList≤200，不把通用任意深树最坏情况误套。 |
| fileMetrics /15 | authoring→area collection→Core file-region pureindex/exactunion→oneavailability→SCC argv batches按shared deadline串行→每CSVparse+sort→merge/exactSetguard→每path匹配areas阈值→records/waiver。额外K07。 | SCC4.0.0实际扫描U；每batch+finalsort Σb logb+FlogF，不是反复wholeprefix merge。300s shareddeadline、累计stdout/stderr各64MiB。backend可不为不支持的已批准文件产row，不能自动判rejection；Regions直接恢复area而非每metric扫描全部F。 |
| functionMetrics /63 (17完整+46初读) | selectedareas→eligibility→union→perfile有界安全read/decode→每≤32KiB非空chunk setImmediate→onceBuffer.concat→一次Worker结构化clone全batch→adapter→analyzer→metric验证→按file+namegroup canonicalordinal→每funcareapolicy→waiver/Records。 | 默认每file8MiB、aggregate64MiB只界定输入；parenttext+Workerclone+tokens+contributors/results可并存，不保证metriccount/serializationmemory线性低常数。analyzer最终Axx资源为准。旧setTimeout已不存在，不重报。wrappergroup排序 O(Σgroup ulogu)，ties时比较contributors有outputprefix成本；每函数复制/排序同fileareaIDs O(U*a loga)，可共享不变policy但function特定mincodeLines仍需逐func计算，未独立升为热点。 |
| jsonValidation /6 +strictdocument1 | collection→suffixeligibility→每JSONboundedfile一次→fatalUTF8/Momoa→duplicatekeywalk→materialize/freeze严格value→结果。product treewalk线性AST+keybytes；sourceperfilebytecap默认1MiB。 | Momoa内部解析U；深recursiveJSON可能栈溢出转unavailable，bytecap不等于depthcap。两个完整treewalk是不同义务：duplicatekeys与detachedstrictvalue，不直接当重复bug；UTF8/byte/identity检查必要。 |
| jsonSchemaValidation /12 | selectedfiles→显式schemas读取/注册→allowlistedlocal/remoteref resolver URI memo→Ajvadd/compile→每bindingstrictread+validate→fullAjverrors normalize+sort→collector仅first100Records但完整count。额外K08。 | Ajvcompile/cache/recursive$ref/allErrors组合复杂度U，不按instancebytes假定线性；每binding必要。错误E全部materialize/sort O(ElogE)且rawerrors不受100reportedcap限制，output-sensitive memory；remote单URI5s/1MiB，URI memo O(Vdocumentbytes)，没有总URIcap；allowlist `.some` O(V*allowlist entries)，合法政策成本。 |
| maintenanceReminders /6 | once HEAD+firstparenthistory→serialreminders→baseparse/index→percommitnumstat→orderedassessments/messages。K06。 | processCPU/IO U；同head固定history保留完整累计numstat，不是净变化。limits只commits不省changedLines finalevidence；失败可对单条unavailable，不能以共享失败泄漏改变其他条。 |
| markdownLinkValidation /19 | collection→eligibility→serialboundedsource→mdast/GFM/frontmatterfacts→occurrences→destinationclassify→每localtargetliveauthorize→targetfacts Promise memo→anchorquery→Records；cachefinalize awaited。K03/K05/K09/K13。 | mdast/GithubSlugger内部算法U；AST两次walk各O(AST)（definitions Map与occurrences/headings），固定shapecache canonicalization并非任意递归二次。heading markdownText递归map/join在极深nestedinlineAST可O(payload*depth)复制，尚未证明parser可产生该规模，保留风险不是confirmedcandidate。maxOccurrences检查在sourcefacts完整构造后，maxTargetReads限制directreads不限制source数/same-doc查询；memo不取消filesystem权限检查。 |
| markdownLint /12 | collection→eligibility→serialboundedread→currentbytehash+可选payloadcache→markdownlint固定9rulecatalog→safeDTO转换→limitcheck→globalstablefindingsort/ordinals→waiver/Record/messages。K03/K12/K13/K14。 | backend各rule/U；allselectedsources无总bytebound。rawfinding达到后才checkmaxFindings（默认10,000/hard100,000），不能说输出cap使backend工作constant。rules固定9所以nestedcataloglookup仅常数；缓存命中仍read/auth当前bytes。 |
| secretDetection /11 | collectallselectedpaths→identitycheckedboundedregularreads/classification→seriallintSource fixedprivatekeyrule→allowlistedissueDTO→waiver→safeRecords与每gapRecord。 | defaults file1MiB/total8MiB/filecount2048；limits可配置positive safeinteger。选中collection本身先完成，超limit仍为所有remainingpaths产生coveragegap（O(F)必要），不是limit后无限重复scan。safeclassify NUL+UTF8固定passes，sourceinputs累计bytebounded；Secretlint privatekey matchingU，没有阅读其regex就不能承诺线性。不要复制rawsource或secretmessage进报告/Records。 |
| commandCheck /5（generic authoring，不是第十种专项检查器） | closedoptions/ordinaryfields→prepare再验证→environmentcallback→onceprocess→before/aftercallback→optionalrunning/closedtranscript→ordinary result。 | trustedcallercommand/callbackworkU；args/env拷贝O(entries+textbytes)，常数次重validation。stdout/stderr受explicitoutputByteLimit/timeoutMs，discardmode仍capture以支持callbacks；onechild、noShell、atomictranscript必要，不按usercommand工作推导package算法。 |

### 共有模块覆盖与乘法轴

- **project-files9**：一次Check本次batch共享目录获取，但**每selection仍单独有序匹配**，Core `selectConfigPaths` work至少按A×F×P matcher调用轴理解，加default20patterns和每area稳定sort。短路/native列表语义/通配长度影响具体成本；matcher编译/cache等根因归Core资源，不在这里复制编号。M是全部area membership的必要materialization，不等于F。不同Check独立收集不是漏掉的globalcache，owner明确没有Product-wide scan scope。
- **host-environment11**：path transforms、errorprojection、git stdoutparse、CSVparse/cellvalidation、processresult都固定pass/输出敏感；execa process64MiB默认cap，只约束输出不约束外部CPU。environment snapshot O(变量条目和文本)，filesystem JSON cache读/parse/writewhole文件无额外字节cap。原生CSV/JSON/execa算法U。
- **check-authoring1**：closed descriptor-safe输入→ordinaryfields→Checkdefinition，每字段数固定，dependsOn/checks/resourceClaims等列表按输入规模由Core normalize；不把Definition的工作漏掉或重复成Check rootcause。
- **code-quality-findings3**：namedareas验证 O(A+各areaoptions)，blockingpolicy fixed2catalog；settle findings两次filter是O(R)且有不同count义务。waiver authoring/evidence线性投影，实际 reconciliation/identity canonicalization归 **Non-Core package-tools**，见tools资源。
- **final-data-parsing1/local-cache-options1**：闭合fixedschema计数/数据校验和cacheoptions resolution；固定数量字段，string/array成员按其文本/长度。没有发现独立超线性rootcause。
- 生产只有type/interface的contract/model/options文件逐项标注type-only，没有runtimecomplexity；MarkdownLint options例外拥有固定9rulecatalog运行时const，已读。

### Non-Core 依赖边界（不是 Core 漏审）

实际跨Check `package-tools` imports：duplicate/file/function/lint/secret 使用 finding-waivers reconciliation；quality共享作者与evidence使用 waiver materialization/audit；MarkdownLint findings-cache消费 local-payload-cache；多种findingmessages使用check-messages与findingpresentation。它们是 **Non-Core tools**，由同轮 `tools.md` / `tools-coverage.json` 独立拥有具体算法结论，不在本资源把缓存恢复/waiver matcher的同一根因重计。Check仍负担identity生成、结果物化和presentation前全finding映射：展示details通常10条**不是底层Records上限**，O(R+W)投影/计数/必要完整审计仍存在。

## 验证与未覆盖边界

有界probe运行于 **`mise exec -- bun` 1.3.14**；观察中`process.version=v24.3.0`是Bun的Node compatibility报告，**不是原生Node24.18.0测试**。执行入口、输入、counter筛选、non-zero/assertions与exacttemp cleanup在`checks-probe.ts`；结果在`checks-observations.json`。只测操作次数，sourcefixture为空文本不测scanner；Maintenance使用私有owned fake-Git文件，实际普通Check execute hook，不访问真实history。没有完整latencybenchmark、fullGate、prodtests、安装consumer验收，也没有remote网络/schema/真实scanner运行；审计不是环境优化生效证据。

资源可复核性检查：coverage201条唯一source、其中46preliminary、155runtime/type审读；候选皆链接当前行号与路径、变量、触发范围、证据等级、最小方向和行为约束。source清单冻结并不替代语义审读。外部fast-glob/micromatch/mdast/Momoa/Ajv/SCC/jscpd/Secretlint完整算法未读；本地markdownlint只额外核对frontMatter入口。无“没看到循环就线性”、无泛称“所有算法都安全”，也不把boundedchunk取消历史问题当当前重复问题。

下一步建议是按自然workload验证K01/K04/K05/K06；K02/K03可先确认真实深度分布；K07/K10/K13/K14待profiling说明常数是否值得改变；K08要先定freshness；K09先定cache容量ownership；K11等待真实多location输入；K12先完成lockedruntime隔离验证。此轮未批准其中任何实现或公共行为变更。
