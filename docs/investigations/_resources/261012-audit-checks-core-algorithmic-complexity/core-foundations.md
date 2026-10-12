# Core foundations 逐模块算法调查

## 范围、来源与方法

基线为 `21777db37c0284308b8c69eb2cc92ab0b012cd9b`，2026-10-12 当次读取。覆盖五个 Core roots 的全部50生产模块与仅重导出的 `src/index.ts`；Project Run 由另一切面负责。生产排除规则依 `docs/tooling/workspace.md:33–35`，冻结清单及逐文件状态见同目录 `source-inventory.json`、`core-foundations-coverage.json`。CodeGraph 没有说明中提到的 explore 工具，但 node 文件/符号读取可用；使用该入口读取当前源码并以限定路径 rg 补充未返回的调用细节。

读取 owner：`docs/development/architecture.md`、`project-definition.md`、`check-results.md`、`output-maintenance.md`，以及公开数据工具/区域索引指南。读取近邻 recursive Definition 与 canonical-data 测试仅用于恢复已承诺语义，没有修改或审查测试义务。既有 `261011-project-file-region-index-readiness` 作为重建契约与历史量测边界背景，不将其旧时间样本作为本次收益证明。

符号：C=executable Checks；N=包含container的声明节点；m=单个关系数组的输入项；b=某个blocked reason引用数；K=动态closed字段数；F/R/E=文件/区域/实际关系边；V=展开JSON值树节点；B=序列化字节；D=深度。Map/Set 用通常散列均摊成本，字符串比较/扫描/编码还需计入字符长度；没有证明第三方 matcher 或宿主 JSON/regex 的一般最坏复杂度。

证据等级：**静态确认+计数** 是当前源码推导加有界操作计数；**静态推导** 未做该路径探针；**热点候选** 仅解释增长或重复pass，不证明真实瓶颈。所有建议尚未实施，未量测延迟、CPU、RSS、retained heap或收益。

## C01：关系数组逐项 includes 去重（正常合法大输入）

- Owner/符号：`src/project-definition/check-tree/collection-authoring.ts:4–12` `parseUniqueIdentifiers`；入口 `scheduling-authoring.ts:88–108` 的 dependsOn/observes/mutex exact 与 inherit.add/remove。
- 推导：m个互异非空字符串的 identifiers 数组逐项增长，includes累计 `m(m−1)/2`；时间Θ(m²)次元素比较，空间O(m)。重复很多且首项命中时通常较低，有限小关系表也未必重要；字段数固定不是m上界，m没有显式数量上限。
- 可达：mutex可以是任意非空资源名，不需要另造m个provider；dependsOn/observes只需项目中有足够有效providers。validation与normalization均会再解析，增加常数，不改变阶。
- 证据：静态确认+计数。m=8/16/32/64比较28/120/496/2016。
- 最小方向：独立seen Set +输出数组，保持首次出现次序、空项拒绝与closed dense输入边界；不因去重改成重排，实际排序仍由resolution拥有。收益待目标definition量测。

## C02：Session稳定目录没有索引并反复重建ID Set（正常Run共同成本）

- Owner/符号：`src/check-settlement/session.ts:185–193` `#slotFor`、`#checkIds`；调用点 `117–149` open/read，`202–235` author/product terminal。
- 推导：每个Check至少open一次，按全目录执行累计find比较 `C(C+1)/2`，全部terminal即使passed也各建C项knownSet，Θ(C²)迭代/分配。依赖get/list的Q次read再加O(QC)；保留完整known目录不是每次重新构造它的义务。按诊断已拒绝的terminal可能跳过knownSet，不取消普通成功路径结论。
- 可达：普通合法、无依赖、全部passed且data={}就成立；progress生命周期读取settledRecords也走同一find。`ready-check-execution.ts:31`、`execution-settlement.ts:96/183`证明实际调用，`dependencies.ts:86/144/200`证明reader放大。
- 证据：静态确认+计数。C=8/16/32/64，仅open+passed settle：find比较36/136/528/2080，knownSet元素64/256/1024/4096。未跑真实Run延迟基准。
- 最小方向：session构造时一次建private slot Map与known ID Set，仍保留sorted slots供freeze/cancellation输出；known Set不暴露可变引用、不跨session全局缓存，保留所有生命周期fatal错误。

## C03：Product blocker IDs 的重复扫描（合法失败图，非普通成功路径）

- Owner/符号：`src/check-settlement/outcome-normalization.ts:80–99` `normalizedSessionReasonCheckIds` 的 `checkIds.includes`；`src/project-run/check-execution/execution-finalization.ts:212–217` 形成prerequisite-unsatisfied reason。
- 推导：b个合法互异known IDs为Θ(b²)比较、O(b)空间；多Check合计Σbᵢ²。若O(C)个failed providers被O(C)个dependents直接依赖，输出理由边本来Θ(C²)，当前额外去重可Θ(C³)。b≤C；小直接依赖、passed或非product unavailable分支不发生这个量级。
- 证据：静态确认+计数，直接normalizer输入b=8/16/32/64比较31/123/499/2019，含fixed outcome/reason exact-field 3次比较，净去重28/120/496/2016。未跑密集失败真实Run。
- 最小方向：seen Set检测重复，继续拒绝而不是静默去重；保持authored reason不允许checkIds、known ownership、顺序与nonempty要求。与C02共用一次knownSet可组合但根因不是同一操作。

## C04：无效 recursive authoring 先展开再拒绝（健壮性，不是正常Run瓶颈）

- Owner/符号：`src/project-definition/check-tree/authoring.ts:77–126` `parseCheck/parseChildren`，没有ancestor/seen/object-budget/depth check；`project-definition-validation.ts:39–44/64–89`仅catch最终异常。
- 推导：深度d的共享二叉DAG仅d+1个不同Check对象，但parser重复访问/复制到 `2^(d+1)−1` 个parsed nodes；若共享leaf包含execute，展开后重复task ID，不能变成合法执行目录。cycle会消耗宿主stack直到异常；catch给出invalid不证明早拒绝。独立合法tree节点数本就代表实际输入工作量，不能把普通双分支树称指数bug。
- 证据：本切面的parse计数为不同对象5/7/9/11、Proxy ownKeys31/127/511/2047；另有下述独立public Run反例。没有运行巨大cycle。
- 相关性：调用方是可信本机项目代码；含共享executable leaf或循环的声明需要关注失败前成本，不外推网络DoS或日常吞吐问题。
- 独立反例收窄：`review-probe.ts`通过公开defineConfig/run观察d=4时，两种shared DAG均读取31次ownKeys；有execute的leaf返回planning/task-graph-invalid且不调用callback，无execute的leaf则completed、0 Checks、16条definition warnings。因此不能把所有共享container声明称为非法；后者本身交付指数数量warnings，按输出敏感成本处理，不计额外指数问题。
- 最小方向：ancestor cycle guard与可证明会重复的executable task ID早拒绝，明确deep tree是否预算/迭代；预算是新增契约，应先审查合法深输入，不凭报告收紧。不能用全局seen-object拒绝所有共享container，或丢失当前每出现位置的warnings。

## C05：动态 exact closed keys 的 includes 成本（公开可达）

- Owner/符号：`src/data-boundary/closed-values.ts:88–94/135–141` `snapshotExactClosedRecord/hasExactPlainRecordKeys`。公共 `src/index.ts:31` 导出snapshotExactClosedRecord；`src/package-tools/change-flag-debugging/change-flag-debugging.ts:184–191` 以Object.getOwnPropertyNames(regions)传入真实动态key表。
- 推导：K项互异完整key表、actualKeys相同顺序时累计 `K(K+1)/2`；任意排列也需逐key线性匹配，Θ(K²)元素比较。大多数Core callsite只有2–5固定schema字段，是固定常数，不能统称所有closed parser二次。debug的K就是真实用户regions数量，没有数量上限。
- 证据：静态确认+计数，共同public helper的K=8/16/32/64比较36/136/528/2080；未执行debug的磁盘collector，实际调用可达来自当前源码。
- 最小方向：K达到足够规模时建supported Set或统一用Set；仍比长度并匹配每个actual key，不调用getter、不变浅快照、同名symbol/额外descriptor拒绝规则。keys稳定无重复是公开调用方前提，不以优化改变该前提。

## C06：容器逐层inherit edit反复物化前缀（合法深定义，低于普通路径优先级）

- Owner/符号：`src/project-definition/check-tree/resolution.ts:98–109/152–164` `resolveScheduling/resolveCollection/canonicalize`。
- 推导：n个unique containers各inherit.add一个mutex，末端仅1个executable；每层filter/copy/Set接收k项，累计 `n(n+1)/2` 元素，仅最终leaf输出n项，确认额外Θ(n²)元素工作；comparison sort的常规上界ΣO(k log k)，不假定宿主对已排序序列必达这个比较数。省略字段直接共享inherited数组，扁平exact数组不发生前缀重建。
- 证据：静态确认+计数，n=8/16/32/64时Set输入36/136/528/2080，最终mutex8/16/32/64且只1 leaf。无延迟测量。
- 最小方向：先调查真实深度/edit workload；可按路径累计edits并只在有消费者的executable/分叉处物化、或使用持久集合。必须保持整表replacement、remove后add、排序去重、父子隔离和resource claims验证，不建议为了少见深链直接引入复杂框架。

## 必要成本、待量测热点与未发现候选

1. **canonical JSON不是按distinct input对象数线性。** `canonical-data.ts:62–77/118–161` 与 `check/options-snapshot.ts:15–26/36–80`仅用ancestor集合拒绝cycle，非循环alias按每个值位置复制。d层共享左右引用会展开2^(d+1)−1对象，计数已确认；输出detached JSON树本身就是这个量级，所以归输出敏感V，不作为额外指数bug。没有体积/深度预算；极深合法值可能遭stack异常。以V为维度复制O(V+Σkey-sort)，canonical text/bytes还要处理B字符/UTF8。若讨论限制或共享必须先判断公开值隔离契约。
2. **递归字符串组装只列热点。** `canonical-data.ts:190–204` 和 `declarative-snapshot.ts:86–93`在每层map/join/模板拼接，抽象flat字符串总复制可达Σ子树文本长度=O(BD)；V8/JSC可能用rope/lazy flatten，没有量测/实现证据不能确认实际Θ(BD)延迟或内存。键排序、fingerprint对全部真实options/事实必须覆盖，不是可以漏掉payload的优化。
3. **区域关系是显式全集计算。** `project-file-region-index.ts:170–214` members按已给成员，patterns逐region对完整F文件batch micromatch；成本是path校验/去重/排序+Σmatcher(F,Pᵣ)+边E，存储O(F+R+E)。宽patterns可E=FR，这是必要关系输出。查询Map本身均摊O(1)，regionsForFile还扫描path字符。appendSources明确承诺独立全量重建：单批一次合理，连续n次微量追加可Σbuild(Fᵢ,Rᵢ,Eᵢ)，但这是调用模式与契约，当前真实消费者批量append一次。没有将micromatch regexp/brace一般最坏成本猜为O(FP)。
4. **machine publication多遍完整facts。** `publish.ts:13–22`先projection、fingerprint、serialize再validation bytes decode/parse/schema、Core canonical clone、fingerprint复算和freeze，最后写two-file set。主维度是真实JSON数据/输出B，records fingerprint重复canonicalize/sort和NDJSON整串/字节/parsed副本会提高常数与峰值内存；候选只有量测价值，validation/完整fingerprint/发布语义不能直接删掉。TypeBox内部、宿主parse/stringify、fs真实延迟没有审计。atomic-publication:90–109还扫描artifact directory并排序owned temps，目录条目与过期temp是独立维度；移除目录/文件的真实I/O不等于算法延迟。
5. **settlement Records已经结构索引。** record-store按checkId/local id两层Map，插入不线性扫描已接受Records；final freeze与settled read会排序records。每个Check正常一次read+final freeze只是常数倍排序，repeated read由caller/生命周期次数放大，不虚构随R增长的逐Record全量排序。冲突先canonicalize rawData再判duplicate属于失败常数/大payload候选，未证明性能瓶颈。
6. **其余生产模块。** descriptor/flags builders/provider identity/output defaults与closed fixed schema/changes parsing按实际字段/数组遍历，未发现新的超线性候选；flag AST正常接受限制16层/256节点，巨大children数组在bound rejection前仍浅snapshot，不能称所有输入固定O(256)。check.ts、facts、scheduler-policy、canonical-json、project-context等主要静态契约不计TypeScript compiler复杂度；src/index.ts仅重导出，无新增运行算法。

## 验证与边界

实跑同目录 `core-foundations-probe.ts`，保留JSON结果。它是一次性调查代码，不注册产品测试/Case；局部替换includes/find/Set后finally恢复，仅计安全small shapes，不是计时基准。首次当前shell Bun1.4.2结果在 `core-foundations-observations.json`，只作为辅助；随后用 `set -euo pipefail` 与 `mise exec -- bun run ...` 在正式locked Bun1.3.14复核，保留 `core-foundations-observations-locked.json`，所有计数完全一致。locked进程的process.versions.node兼容值24.3.0不是Node executable；没有证明最低Node、任一runtime的时间性能或跨runtime收益。当前HEAD源码静态推导不依赖时间性能差异。

未安装依赖、未联网、未修改prod/tests/Case、未stage/commit；不执行package Gate或完整测试来冒充算法收益验证。报告/资源的治理与材料检查由主代理统一执行。剩余行动首先是C02/C01/T01的真实规模与调用频率基线，再按收益最小化实现；C04按健壮性单独排序，C06按深度实际相关性排序。
